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
  var ciclo = null;
  var midiasEnviadas = new Map();

  async function prepararMidias(valor, headers) {
    if (!valor || typeof valor !== 'object') return valor;
    if (Array.isArray(valor)) {
      var lista = [];
      for (var item of valor) lista.push(await prepararMidias(item, headers));
      return lista;
    }
    var copia = Object.assign({}, valor);
    var origem = typeof copia.dataUrl === 'string' && copia.dataUrl.startsWith('data:') ? copia.dataUrl : copia.url;
    if (typeof origem === 'string' && /^data:(image|audio)\//.test(origem)) {
      var url = midiasEnviadas.get(origem);
      if (!url) {
        var res = await fetch(MPRO.apiUrl('upload'), { method: 'POST', headers: headers, body: JSON.stringify({ arquivo: origem, pasta: 'evidencias', nome: copia.nome || copia.id || 'evidencia' }) });
        var dados = await res.json();
        if (!res.ok || !dados.url || !dados.url.startsWith('https://')) throw new Error(dados.error || 'Armazenamento de mídia indisponível. O arquivo continua salvo no aparelho.');
        url = dados.url; midiasEnviadas.set(origem, url);
      }
      copia.url = url;
      delete copia.dataUrl; delete copia.blob;
    }
    for (var chave of Object.keys(copia)) if (copia[chave] && typeof copia[chave] === 'object') copia[chave] = await prepararMidias(copia[chave], headers);
    return copia;
  }

  function autorizado() {
    return MPRO.session.modo() !== 'gated' || !!MPRO.session.cabecalhos().Authorization;
  }

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
    var scope = MPRO.db.info().escopo;
    var headers = Object.assign({ 'Content-Type': 'application/json' }, MPRO.session.cabecalhos());
    return prepararMidias(operacao.payload, headers).then(function (payload) {
      if (MPRO.db.info().escopo !== scope) throw new Error('Sessão alterada durante a sincronização.');
      operacao.payload = payload;
      MPRO.db.salvar('outbox', operacao, { semFila: true });
      return fetch(base + '/sync', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        operacao: operacao.operacao,
        colecao: operacao.colecao,
        id: operacao.alvoId,
        rev: operacao.payload._rev || 0,
        dados: operacao.payload
      })
      });
    }).then(function (resposta) {
      if (!resposta.ok) throw new Error('HTTP ' + resposta.status);
      return resposta.json().catch(function () { return {}; });
    });
  }

  /* Drena em série: a ordem importa (um cliente precisa existir antes da visita dele). */
  function drenar() {
    if (drenando) return Promise.resolve(status());
    if (!configurado()) { calcula(); return Promise.resolve(status()); }
    if (!autorizado()) return Promise.resolve(status());
    if (!navigator.onLine) { calcula(); return Promise.resolve(status()); }

    var pendentes = fila();
    var scope = MPRO.db.info().escopo;
    if (!pendentes.length) { ultimoErro = null; calcula(); return Promise.resolve(status()); }

    drenando = true;
    ultimoErro = null;
    calcula();

    return pendentes.reduce(function (corrente, operacao) {
      return corrente.then(function () {
        if (MPRO.db.info().escopo !== scope) throw new Error('Sessão alterada durante a sincronização.');
        return envia(operacao).then(function () {
          if (MPRO.db.info().escopo !== scope) return;
          MPRO.db.descartar('outbox', operacao.id);
          if (!fila().some(function (op) { return op.colecao === operacao.colecao && op.alvoId === operacao.alvoId; })) MPRO.db.marcarSincronizado(operacao.colecao, operacao.alvoId);
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
    var scope = MPRO.db.info().escopo;
    if (!cabecalhoAuth.Authorization && MPRO.platform.auth.modo === 'gated') {
      return Promise.resolve(status());
    }

    var base = MPRO.platform.nuvem.baseUrl.replace(/\/$/, '');
    return fetch(base + '/sync', {
      method: 'GET',
      headers: Object.assign({ 'Content-Type': 'application/json' }, cabecalhoAuth)
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (dados) {
      if (MPRO.db.info().escopo !== scope) return status();
      if (!dados || !dados.registros) return status();
      (dados.removidos || []).forEach(function (item) {
        if (!fila().some(function (op) { return op.colecao === item.colecao && op.alvoId === item.id; })) MPRO.db.descartar(item.colecao, item.id);
      });
      var colecoes = Object.keys(dados.registros);
      colecoes.forEach(function (col) {
        var lista = dados.registros[col] || [];
        lista.forEach(function (item) {
          if (item && item.id && MPRO.db.colecoes.indexOf(col) !== -1 && !fila().some(function (op) { return op.colecao === col && op.alvoId === item.id; })) {
            MPRO.db.receber(col, item);
          }
        });
      });
      calcula();
      return status();
    }).catch(function (e) {
      console.warn('Falha ao baixar dados da nuvem:', e);
      ultimoErro = e.message; calcula();
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
        if (item && item.id && item._pendente && !item._removido) {
          var jaNaFila = filaAtual.some(function (op) { return op.colecao === col && op.alvoId === item.id; });
          if (!jaNaFila) {
            enfileirar(col, 'upsert', item);
          }
        }
      });
    });

    return drenar();
  }

  function sincronizarTudo() {
    if (ciclo) return ciclo;
    ciclo = enviarTudoLocal().then(function () {
      return ultimoErro ? status() : puxar();
    }).finally(function () { ciclo = null; midiasEnviadas.clear(); });
    return ciclo;
  }

  function iniciar() {
    calcula();
    window.addEventListener('online', automaticamente);
    window.addEventListener('offline', calcula);
    if (timer) clearInterval(timer);
    if (configurado()) timer = setInterval(automaticamente, MPRO.platform.nuvem.intervaloMs);
    if (configurado() && navigator.onLine) automaticamente();
  }

  function automaticamente() {
    if (MPRO.store && MPRO.store.settings().sincronizacao === false) return Promise.resolve(status());
    return sincronizarTudo();
  }

  return {
    iniciar: iniciar,
    enfileirar: enfileirar,
    enviarTudoLocal: enviarTudoLocal,
    drenar: drenar,
    puxar: puxar,
    sincronizarTudo: sincronizarTudo,
    automaticamente: automaticamente,
    status: status,
    rotulo: rotulo,
    configurado: configurado,
    aoMudar: function (fn) { listeners.push(fn); }
  };
})();
