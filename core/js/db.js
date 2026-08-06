/* Banco local do aparelho.

   Regra da arquitetura híbrida: toda escrita entra aqui primeiro e só depois é oferecida
   à nuvem (ver sync.js). O app nunca depende de rede para gravar.

   O IndexedDB é o driver preferido — comporta fotos e milhares de registros. Como as telas
   leem de forma síncrona, o banco é hidratado em memória no boot (MPRO.db.abrir) e cada
   escrita atualiza o cache na hora e persiste em segundo plano. O localStorage é o fallback
   para navegadores em modo restrito. */
window.MPRO = window.MPRO || {};

MPRO.db = (function () {
  var COLECOES = ['clients', 'visits', 'drafts', 'equipments', 'photos', 'outbox', 'meta'];
  var VERSAO = 1;

  var driver = 'memoria';
  var idb = null;
  var cache = {};
  var escopo = 'local';
  var listeners = [];

  function chaveLocal(colecao) {
    return 'mpro.' + escopo + '.' + colecao;
  }

  function vazio() {
    var mapa = {};
    COLECOES.forEach(function (nome) { mapa[nome] = {}; });
    return mapa;
  }

  function emitir() {
    listeners.forEach(function (fn) { fn(); });
  }

  function agora() {
    return new Date().toISOString();
  }

  /* ---------- driver IndexedDB ---------- */

  function abrirIndexedDB() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('sem indexedDB')); return; }
      var req = indexedDB.open(MPRO.platform.db.nome, VERSAO);
      req.onupgradeneeded = function () {
        var banco = req.result;
        COLECOES.forEach(function (nome) {
          if (!banco.objectStoreNames.contains(nome)) banco.createObjectStore(nome, { keyPath: '_pk' });
        });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('falha ao abrir indexedDB')); };
    });
  }

  function lerTudoIDB(banco) {
    return new Promise(function (resolve, reject) {
      var dados = vazio();
      var tx = banco.transaction(COLECOES, 'readonly');
      COLECOES.forEach(function (nome) {
        tx.objectStore(nome).openCursor().onsuccess = function (event) {
          var cursor = event.target.result;
          if (!cursor) return;
          var registro = cursor.value;
          if (registro._escopo === escopo) dados[nome][registro.id] = registro;
          cursor.continue();
        };
      });
      tx.oncomplete = function () { resolve(dados); };
      tx.onerror = function () { reject(tx.error); };
    });
  }

  function gravarIDB(colecao, registro) {
    if (!idb) return;
    try {
      var tx = idb.transaction([colecao], 'readwrite');
      tx.objectStore(colecao).put(Object.assign({ _pk: escopo + ':' + registro.id, _escopo: escopo }, registro));
    } catch (e) {
      /* transação recusada (aba fechando, cota): o cache em memória segue íntegro
         e a próxima gravação persiste de novo */
    }
  }

  function apagarIDB(colecao, id) {
    if (!idb) return;
    try {
      idb.transaction([colecao], 'readwrite').objectStore(colecao).delete(escopo + ':' + id);
    } catch (e) { /* idem */ }
  }

  /* ---------- driver localStorage ---------- */

  function lerTudoLocal() {
    var dados = vazio();
    COLECOES.forEach(function (nome) {
      try {
        var bruto = localStorage.getItem(chaveLocal(nome));
        (bruto ? JSON.parse(bruto) : []).forEach(function (registro) { dados[nome][registro.id] = registro; });
      } catch (e) {
        /* json corrompido: a coleção recomeça vazia em vez de derrubar o boot */
      }
    });
    return dados;
  }

  function gravarLocal(colecao) {
    try {
      var lista = Object.keys(cache[colecao]).map(function (id) { return cache[colecao][id]; });
      localStorage.setItem(chaveLocal(colecao), JSON.stringify(lista));
    } catch (e) {
      /* modo privado ou cota cheia: o app segue em memória até o fim da sessão */
    }
  }

  function persistir(colecao, registro) {
    if (driver === 'indexeddb') gravarIDB(colecao, registro);
    else if (driver === 'localstorage') gravarLocal(colecao);
  }

  /* ---------- API ---------- */

  function abrir(novoEscopo) {
    escopo = novoEscopo || 'local';
    cache = vazio();

    var preferido = MPRO.platform.db.driver;
    var tentaIDB = preferido === 'auto' || preferido === 'indexeddb';

    return (tentaIDB ? abrirIndexedDB() : Promise.reject(new Error('driver fixo')))
      .then(function (banco) {
        idb = banco;
        driver = 'indexeddb';
        return lerTudoIDB(banco);
      })
      .catch(function () {
        idb = null;
        driver = typeof localStorage !== 'undefined' ? 'localstorage' : 'memoria';
        return driver === 'localstorage' ? lerTudoLocal() : vazio();
      })
      .then(function (dados) {
        cache = dados;
        return { driver: driver, escopo: escopo };
      });
  }

  function trocarEscopo(novoEscopo) {
    return abrir(novoEscopo).then(function (info) { emitir(); return info; });
  }

  function todos(colecao) {
    var mapa = cache[colecao] || {};
    return Object.keys(mapa)
      .map(function (id) { return mapa[id]; })
      .filter(function (registro) { return !registro._removido; });
  }

  function obter(colecao, id) {
    var registro = (cache[colecao] || {})[id];
    return registro && !registro._removido ? registro : null;
  }

  function salvar(colecao, registro, opts) {
    opts = opts || {};
    var anterior = (cache[colecao] || {})[registro.id] || {};
    var completo = Object.assign({}, anterior, registro, {
      _atualizadoEm: agora(),
      _rev: (anterior._rev || 0) + 1,
      _pendente: true
    });
    delete completo._removido;
    cache[colecao][completo.id] = completo;
    persistir(colecao, completo);
    if (!opts.semFila && MPRO.sync) MPRO.sync.enfileirar(colecao, 'upsert', completo);
    emitir();
    return completo;
  }

  /* Remoção lógica: o registro vira lápide para que a nuvem também aprenda a exclusão.
     A lápide some do banco assim que a fila confirma o envio. */
  function remover(colecao, id, opts) {
    opts = opts || {};
    var anterior = (cache[colecao] || {})[id];
    if (!anterior) return;
    var lapide = { id: id, _removido: true, _atualizadoEm: agora(), _rev: (anterior._rev || 0) + 1, _pendente: true };
    cache[colecao][id] = lapide;
    persistir(colecao, lapide);
    if (!opts.semFila && MPRO.sync) MPRO.sync.enfileirar(colecao, 'delete', { id: id });
    emitir();
  }

  function descartar(colecao, id) {
    delete (cache[colecao] || {})[id];
    if (driver === 'indexeddb') apagarIDB(colecao, id);
    else if (driver === 'localstorage') gravarLocal(colecao);
  }

  function marcarSincronizado(colecao, id) {
    var registro = (cache[colecao] || {})[id];
    if (!registro) return;
    if (registro._removido) { descartar(colecao, id); return; }
    registro._pendente = false;
    persistir(colecao, registro);
  }

  function limpar() {
    var alvos = COLECOES.slice();
    alvos.forEach(function (colecao) {
      Object.keys(cache[colecao] || {}).forEach(function (id) { descartar(colecao, id); });
      cache[colecao] = {};
    });
    emitir();
  }

  function pendentes() {
    return COLECOES.reduce(function (total, colecao) {
      return total + Object.keys(cache[colecao] || {}).filter(function (id) {
        return cache[colecao][id]._pendente;
      }).length;
    }, 0);
  }

  return {
    colecoes: COLECOES,
    abrir: abrir,
    trocarEscopo: trocarEscopo,
    aoMudar: function (fn) { listeners.push(fn); },
    todos: todos,
    obter: obter,
    salvar: salvar,
    remover: remover,
    descartar: descartar,
    marcarSincronizado: marcarSincronizado,
    limpar: limpar,
    pendentes: pendentes,
    info: function () { return { driver: driver, escopo: escopo }; }
  };
})();
