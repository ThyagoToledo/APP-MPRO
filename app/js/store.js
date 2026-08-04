/* Estado persistente do app. Tudo é escopado pela conta ativa (demonstração / nova),
   como exige a RF-01 em doc/02-requisitos.md. */
window.MPRO = window.MPRO || {};

MPRO.store = (function () {
  var listeners = [];

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* modo privado / cota cheia: o app segue funcionando em memória */
    }
  }

  var state = {
    theme: read('mpro.theme', null),
    account: read('mpro.account', 'demo'),
    authenticated: read('mpro.authenticated', true)
  };

  if (!state.theme) {
    state.theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'escuro'
      : 'claro';
  }

  function scoped(name) {
    return 'mpro.' + state.account + '.' + name;
  }

  function emit() {
    listeners.forEach(function (fn) { fn(); });
  }

  function collection(name) {
    var seed = state.account === 'demo' ? (MPRO.demo[name] || []) : [];
    var itens = {};
    seed.forEach(function (item) { itens[item.id] = item; });
    read(scoped(name), []).forEach(function (item) {
      if (item._deleted) delete itens[item.id];
      else itens[item.id] = Object.assign({}, itens[item.id] || {}, item);
    });
    var lista = Object.keys(itens).map(function (id) { return itens[id]; });

    if (name === 'clients') {
      var ajustes = read(scoped('clientStatus'), {});
      lista = lista.map(function (cliente) {
        var ajuste = ajustes[cliente.id];
        return ajuste ? Object.assign({}, cliente, ajuste) : cliente;
      });
    }

    if (name === 'visits') lista.sort(function (a, b) { return String(b.data || '').localeCompare(String(a.data || '')); });
    if (name === 'drafts') lista.sort(function (a, b) { return String(b.salvoEm || '').localeCompare(String(a.salvoEm || '')); });

    return lista;
  }

  function push(name, item) {
    var own = read(scoped(name), []);
    own.unshift(item);
    write(scoped(name), own);
    emit();
    return item;
  }

  function replace(name, id, patch) {
    var own = read(scoped(name), []);
    var index = own.findIndex(function (it) { return it.id === id; });
    if (index === -1) {
      own.unshift(Object.assign({ id: id }, patch));
    } else {
      own[index] = Object.assign({}, own[index], patch);
    }
    write(scoped(name), own);
    emit();
  }

  function remove(name, id) {
    var own = read(scoped(name), []).filter(function (it) { return it.id !== id; });
    own.push({ id: id, _deleted: true });
    write(scoped(name), own);
    emit();
  }

  return {
    onChange: function (fn) { listeners.push(fn); },

    get theme() { return state.theme; },
    get account() { return state.account; },
    get isDemo() { return state.account === 'demo'; },
    get isAuthenticated() { return state.authenticated; },

    setTheme: function (theme) {
      state.theme = theme;
      write('mpro.theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
      emit();
    },

    toggleTheme: function () {
      this.setTheme(state.theme === 'escuro' ? 'claro' : 'escuro');
    },

    setAccount: function (account) {
      state.account = account;
      write('mpro.account', account);
      state.authenticated = true;
      write('mpro.authenticated', true);
      emit();
    },

    logout: function () {
      state.authenticated = false;
      write('mpro.authenticated', false);
      emit();
    },

    user: function () {
      var padrao = state.account === 'demo'
        ? { nome: 'Thiago Toledo', email: 'thiago.toledo@mpro.agr.br', iniciais: 'TT', modo: 'CONTA DEMONSTRAÇÃO' }
        : { nome: 'Marina Alves', email: 'marina.alves@mpro.agr.br', iniciais: 'MA', modo: 'CONTA NOVA' };
      return Object.assign(padrao, read(scoped('profile'), {}));
    },

    updateUser: function (patch) {
      var atual = Object.assign({}, this.user(), patch);
      atual.iniciais = atual.nome.split(/\s+/).slice(0, 2).map(function (parte) { return parte[0]; }).join('').toUpperCase();
      write(scoped('profile'), atual);
      emit();
      return atual;
    },

    settings: function () {
      return Object.assign({ notificacoes: true, sincronizacao: true, unidadeArea: 'ha', tema: state.theme }, read(scoped('settings'), {}));
    },

    saveSettings: function (patch) {
      var atuais = Object.assign({}, this.settings(), patch);
      write(scoped('settings'), atuais);
      if (patch.tema) this.setTheme(patch.tema);
      emit();
      return atuais;
    },

    clients: function () { return collection('clients'); },
    drafts: function () { return collection('drafts'); },
    visits: function () { return collection('visits'); },
    equipments: function () { return collection('equipments'); },

    client: function (id) {
      return this.clients().find(function (c) { return c.id === id; }) || null;
    },

    draft: function (id) {
      return this.drafts().find(function (d) { return d.id === id; }) || null;
    },

    addClient: function (client) { return push('clients', client); },
    updateClient: function (id, patch) { replace('clients', id, patch); },
    removeClient: function (id) { remove('clients', id); },
    saveDraft: function (draft) { replace('drafts', draft.id, draft); },
    removeDraft: function (id) { remove('drafts', id); },
    addVisit: function (visit) { return push('visits', visit); },
    removeVisit: function (id) { remove('visits', id); },
    addEquipment: function (equipment) { return push('equipments', equipment); },
    saveEquipment: function (equipment) { replace('equipments', equipment.id, equipment); },
    removeEquipment: function (id) { remove('equipments', id); },

    /* Coordenada em string "lat, lng" → par numérico, ou null se inválida. */
    parseCoords: function (texto) {
      if (!texto) return null;
      var partes = String(texto).split(',');
      if (partes.length !== 2) return null;
      var lat = parseFloat(partes[0].trim().replace(',', '.'));
      var lng = parseFloat(partes[1].trim().replace(',', '.'));
      if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
      return { lat: lat, lng: lng };
    },

    /* O laudo mais recente é que define o status do cliente na lista e no mapa. */
    setClientStatus: function (id, status, data) {
      var ajustes = read(scoped('clientStatus'), {});
      ajustes[id] = { status: status, ultimaVisita: data };
      write(scoped('clientStatus'), ajustes);
      emit();
    },

    newId: function (prefix) {
      return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }
  };
})();
