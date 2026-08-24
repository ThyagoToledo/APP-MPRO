/* Fila de sincronização da arquitetura híbrida.

   O aparelho é a fonte de verdade enquanto o dado não sobe. Cada escrita no banco local
   gera uma operação idempotente nesta fila; quando há internet e servidor configurado, a
   fila é drenada em ordem e cada confirmação limpa a marca de pendência do registro.

   Sem `MPRO.platform.nuvem.baseUrl` o app fica em modo somente-local: a fila continua
   acumulando (nada se perde), mas a interface diz exatamente isso em vez de fingir que
   sincronizou. */
window.MPRO = window.MPRO || {};

MPRO.sync = (function () {
  var listeners = [];
  var estado = 'somente-local';
  var ultimoEnvio = null;
  var ultimoErro = null;
  var drenando = false;
  var timer = null;

  function configurado() {
    return !!(MPRO.platform.nuvem && MPRO.platform.nuvem.baseUrl);
  }

  function emitir() {
    listeners.forEach(function (fn) { fn(status()); });
  }

  function fila() {
    return MPRO.db.todos('outbox').sort(function (a, b) {
      return String(a.criadoEm).localeCompare(String(b.criadoEm));
    });
  }

  function enfileirar(colecao, operacao, payload) {
    if (colecao === 'outbox' || colecao === 'meta') return;
    MPRO.db.salvar('outbox', {
      id: 'op-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      colecao: colecao,
      operacao: operacao,
      alvoId: payload.id,
      payload: payload,
      criadoEm: new Date().toISOString(),
      tentativas: 0
    }, { semFila: true });
    calcula();
  }

  function calcula() {
    var pendentes = fila().length;
    if (!configurado()) estado = 'somente-local';
    else if (!navigator.onLine) estado = 'offline';
    else if (drenando) estado = 'enviando';
    else if (ultimoErro) estado = 'erro';
    else estado = pendentes ? 'pendente' : 'sincronizado';
    emitir();
  }

  function status() {
    return {
      estado: estado,
      pendentes: fila().length,
      ultimoEnvio: ultimoEnvio,
      ultimoErro: ultimoErro,
      configurado: configurado(),
      driver: MPRO.db.info().driver
    };
  }

  function rotulo() {
    var s = status();
    if (!s.configurado) return s.pendentes
      ? 'Somente neste aparelho · ' + s.pendentes + ' registro(s) na fila'
      : 'Somente neste aparelho';
    if (s.estado === 'offline') return 'Offline · ' + s.pendentes + ' na fila';
    if (s.estado === 'enviando') return 'Enviando ' + s.pendentes + '…';
    if (s.estado === 'erro') return 'Falha ao sincronizar · nova tentativa em breve';
    return s.pendentes ? s.pendentes + ' aguardando envio' : 'Tudo sincronizado';
  }

  function envia(operacao) {
    var base = MPRO.platform.nuvem.baseUrl.replace(/\/$/, '');
    return fetch(base + '/sync', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, MPRO.session.cabecalhos()),
      body: JSON.stringify({
        operacao: operacao.operacao,
        colecao: operacao.colecao,
        id: operacao.alvoId,
        rev: operacao.payload._rev || 0,
        dados: operacao.payload
      })
    }).then(function (resposta) {
      if (!resposta.ok) throw new Error('HTTP ' + resposta.status);
      return resposta.json().catch(function () { return {}; });
    });
  }

  /* Drena em série: a ordem importa (um cliente precisa existir antes da visita dele). */
  function drenar() {
    if (drenando) return Promise.resolve(status());
    if (!configurado()) { calcula(); return Promise.resolve(status()); }
    if (!navigator.onLine) { calcula(); return Promise.resolve(status()); }

    var pendentes = fila();
    if (!pendentes.length) { ultimoErro = null; calcula(); return Promise.resolve(status()); }

    drenando = true;
    ultimoErro = null;
    calcula();

    return pendentes.reduce(function (corrente, operacao) {
      return corrente.then(function () {
        return envia(operacao).then(function () {
          MPRO.db.descartar('outbox', operacao.id);
          MPRO.db.marcarSincronizado(operacao.colecao, operacao.alvoId);
        });
      });
    }, Promise.resolve())
      .then(function () { ultimoEnvio = new Date().toISOString(); })
      .catch(function (erro) { ultimoErro = erro.message || String(erro); })
      .then(function () {
        drenando = false;
        calcula();
        return status();
      });
  }

  /* Puxa todos os registros da nuvem (download / sync pull) para o aparelho local */
  function puxar() {
    if (!configurado()) return Promise.resolve(status());
    if (!navigator.onLine) return Promise.resolve(status());
    var cabecalhoAuth = MPRO.session.cabecalhos();
    if (!cabecalhoAuth.Authorization && MPRO.platform.auth.modo === 'gated') {
      return Promise.resolve(status());
    }

    var base = MPRO.platform.nuvem.baseUrl.replace(/\/$/, '');
    return fetch(base + '/sync', {
      method: 'GET',
      headers: Object.assign({ 'Content-Type': 'application/json' }, cabecalhoAuth)
    }).then(function (res) {
      if (!res.ok) return null;
      return res.json();
    }).then(function (dados) {
      if (!dados || !dados.registros) return status();
      var colecoes = Object.keys(dados.registros);
      colecoes.forEach(function (col) {
        var lista = dados.registros[col] || [];
        lista.forEach(function (item) {
          if (item && item.id) {
            MPRO.db.salvar(col, item, { semFila: true });
          }
        });
      });
      calcula();
      return status();
    }).catch(function (e) {
      console.warn('Falha ao baixar dados da nuvem:', e);
      return status();
    });
  }

  /* Varre todas as coleções locais e assegura que qualquer registro pré-existente seja enviado para a nuvem */
  function enviarTudoLocal() {
    if (!configurado()) return Promise.resolve(status());
    if (!navigator.onLine) return Promise.resolve(status());
    var cabecalhoAuth = MPRO.session.cabecalhos();
    if (!cabecalhoAuth.Authorization && MPRO.platform.auth.modo === 'gated') {
      return Promise.resolve(status());
    }

    var colecoes = ['clients', 'visits', 'drafts', 'equipments', 'photos', 'meta'];
    var filaAtual = fila();
    colecoes.forEach(function (col) {
      var itens = MPRO.db.todos(col);
      itens.forEach(function (item) {
        if (item && item.id && !item._removido) {
          var jaNaFila = filaAtual.some(function (op) { return op.alvoId === item.id; });
          if (!jaNaFila) {
            enfileirar(col, 'upsert', item);
          }
        }
      });
    });

    return drenar();
  }

  function sincronizarTudo() {
    // 1. Envia registros locais pré-existentes ou pendentes
    return enviarTudoLocal().then(function () {
      // 2. Puxa os dados atualizados da nuvem
      return puxar();
    });
  }

  function iniciar() {
    calcula();
    window.addEventListener('online', sincronizarTudo);
    window.addEventListener('offline', calcula);
    if (timer) clearInterval(timer);
    if (configurado()) timer = setInterval(sincronizarTudo, MPRO.platform.nuvem.intervaloMs);
    if (configurado() && navigator.onLine) sincronizarTudo();
  }

  return {
    iniciar: iniciar,
    enfileirar: enfileirar,
    enviarTudoLocal: enviarTudoLocal,
    drenar: drenar,
    puxar: puxar,
    sincronizarTudo: sincronizarTudo,
    status: status,
    rotulo: rotulo,
    configurado: configurado,
    aoMudar: function (fn) { listeners.push(fn); }
  };
})();
