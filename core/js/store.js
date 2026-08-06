/* Estado de domínio. Não guarda nada por conta própria: lê e escreve no banco local
   (db.js), que por sua vez alimenta a fila de sincronização (sync.js).

   As telas continuam lendo de forma síncrona porque o banco mantém a coleção inteira em
   memória depois do boot. Tema é a única exceção — fica no localStorage do aparelho para
   ser aplicado antes de qualquer render, evitando o piscar de tela clara. */
window.MPRO = window.MPRO || {};

MPRO.store = (function () {
  var listeners = [];
  var tema = null;

  function leTema() {
    try {
      return localStorage.getItem('mpro.tema');
    } catch (e) {
      return null;
    }
  }

  tema = leTema() || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro');

  function emitir() {
    listeners.forEach(function (fn) { fn(); });
  }

  function porData(campo) {
    return function (a, b) { return String(b[campo] || '').localeCompare(String(a[campo] || '')); };
  }

  return {
    aoMudar: function (fn) { listeners.push(fn); },
    onChange: function (fn) { listeners.push(fn); },

    get theme() { return tema; },

    setTheme: function (valor) {
      tema = valor;
      try { localStorage.setItem('mpro.tema', valor); } catch (e) { /* sessão sem armazenamento */ }
      document.documentElement.setAttribute('data-theme', valor);
      emitir();
    },

    toggleTheme: function () {
      this.setTheme(tema === 'escuro' ? 'claro' : 'escuro');
    },

    user: function () { return MPRO.session.perfil(); },
    updateUser: function (patch) { var p = MPRO.session.salvarPerfil(patch); emitir(); return p; },

    settings: function () {
      return Object.assign(
        { notificacoes: true, sincronizacao: true, unidadeArea: 'ha', temaPreferencia: tema },
        MPRO.db.obter('meta', 'settings') || {}
      );
    },

    saveSettings: function (patch) {
      var atuais = Object.assign({}, this.settings(), patch, { id: 'settings' });
      MPRO.db.salvar('meta', atuais, { semFila: true });
      if (patch.tema) this.setTheme(patch.tema);
      emitir();
      return atuais;
    },

    clients: function () {
      return MPRO.db.todos('clients').sort(function (a, b) {
        return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
      });
    },
    visits: function () { return MPRO.db.todos('visits').sort(porData('data')); },
    drafts: function () { return MPRO.db.todos('drafts').sort(porData('salvoEm')); },
    equipments: function () {
      return MPRO.db.todos('equipments').sort(function (a, b) {
        return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
      });
    },

    client: function (id) { return MPRO.db.obter('clients', id); },
    draft: function (id) { return MPRO.db.obter('drafts', id); },
    visit: function (id) { return MPRO.db.obter('visits', id); },
    equipment: function (id) { return MPRO.db.obter('equipments', id); },

    addClient: function (cliente) { var r = MPRO.db.salvar('clients', cliente); emitir(); return r; },
    updateClient: function (id, patch) { MPRO.db.salvar('clients', Object.assign({ id: id }, patch)); emitir(); },
    removeClient: function (id) { MPRO.db.remover('clients', id); emitir(); },

    saveDraft: function (rascunho) { MPRO.db.salvar('drafts', rascunho); emitir(); },
    removeDraft: function (id) { MPRO.db.remover('drafts', id); emitir(); },

    addVisit: function (visita) { var r = MPRO.db.salvar('visits', visita); emitir(); return r; },
    removeVisit: function (id) { MPRO.db.remover('visits', id); emitir(); },

    addEquipment: function (equipamento) { var r = MPRO.db.salvar('equipments', equipamento); emitir(); return r; },
    saveEquipment: function (equipamento) { MPRO.db.salvar('equipments', equipamento); emitir(); },
    removeEquipment: function (id) { MPRO.db.remover('equipments', id); emitir(); },

    /* Coordenada em string "lat, lng" para par numérico, ou null se inválida. */
    parseCoords: function (texto) {
      if (!texto) return null;
      var partes = String(texto).split(',');
      if (partes.length !== 2) return null;
      var lat = parseFloat(partes[0].trim().replace(',', '.'));
      var lng = parseFloat(partes[1].trim().replace(',', '.'));
      if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
      return { lat: lat, lng: lng };
    },

    /* O laudo mais recente define o status do cliente na lista e no mapa. */
    setClientStatus: function (id, status, data) {
      if (!MPRO.db.obter('clients', id)) return;
      MPRO.db.salvar('clients', { id: id, status: status, ultimaVisita: data });
      emitir();
    },

    newId: function (prefixo) {
      return prefixo + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    },

    /* Apaga o espaço de trabalho deste aparelho. Usado em Configurações. */
    apagarTudo: function () { MPRO.db.limpar(); emitir(); }
  };
})();
