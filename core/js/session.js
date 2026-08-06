/* Identidade e controle de acesso.

   Dois modos, decididos pela plataforma:

   - 'local'  (mobile): não existe tela de login. Quem usa o aparelho escolhe um nome no
     primeiro uso e o banco fica em um espaço de trabalho único. Quando o login for ligado,
     o mesmo espaço é reaproveitado e a fila sobe vinculada à conta.

   - 'gated'  (web): só entra quem já está cadastrado e aprovado no banco do servidor.
     Não há autocadastro: o app não cria conta, apenas apresenta uma credencial ao servidor
     e aceita a resposta. Sem endpoint configurado, nenhum acesso é liberado. */
window.MPRO = window.MPRO || {};

MPRO.session = (function () {
  var CHAVE = 'mpro.sessao';
  var sessao = null;
  var listeners = [];

  function le() {
    try {
      var bruto = localStorage.getItem(CHAVE);
      return bruto ? JSON.parse(bruto) : null;
    } catch (e) {
      return null;
    }
  }

  function grava(valor) {
    try {
      if (valor) localStorage.setItem(CHAVE, JSON.stringify(valor));
      else localStorage.removeItem(CHAVE);
    } catch (e) {
      /* sem armazenamento: a sessão vale só enquanto a aba estiver aberta */
    }
    sessao = valor;
    listeners.forEach(function (fn) { fn(); });
  }

  function modo() {
    return MPRO.platform.auth.modo;
  }

  function carregar() {
    sessao = le();
    return sessao;
  }

  /* No modo local o espaço é único e não depende de conta. No modo gated ele é do usuário
     autenticado, para que dois logins no mesmo navegador nunca vejam os dados um do outro. */
  function espaco() {
    if (modo() === 'local') return 'local';
    return sessao && sessao.usuario ? 'u-' + sessao.usuario.id : 'anon';
  }

  function iniciais(nome) {
    return String(nome || '')
      .split(/\s+/).filter(Boolean).slice(0, 2)
      .map(function (parte) { return parte[0]; }).join('').toUpperCase() || 'M';
  }

  function perfil() {
    var salvo = MPRO.db.obter('meta', 'perfil') || {};
    var doServidor = (sessao && sessao.usuario) || {};
    var base = {
      nome: doServidor.nome || salvo.nome || '',
      email: doServidor.email || salvo.email || '',
      cargo: salvo.cargo || doServidor.cargo || '',
      empresa: salvo.empresa || doServidor.empresa || '',
      foto: salvo.foto || null
    };
    base.iniciais = iniciais(base.nome);
    base.modo = modo() === 'local' ? 'ESTE APARELHO' : 'ACESSO AUTORIZADO';
    return base;
  }

  function salvarPerfil(patch) {
    var atual = Object.assign({}, perfil(), patch);
    MPRO.db.salvar('meta', {
      id: 'perfil',
      nome: atual.nome,
      email: atual.email,
      cargo: atual.cargo,
      empresa: atual.empresa,
      foto: atual.foto
    }, { semFila: true });
    return perfil();
  }

  /* Pronto = pode usar o app. No mobile basta ter nome escolhido; na web, sessão válida. */
  function pronta() {
    if (modo() === 'local') return !!(perfil().nome || '').trim();
    return !!(sessao && sessao.token && sessao.usuario);
  }

  function entrar(email, senha) {
    var endpoint = MPRO.platform.auth.endpoint;
    if (!endpoint) {
      return Promise.reject(new Error(
        'Este ambiente ainda não tem servidor de autenticação. O acesso é liberado apenas para ' +
        'cadastros já aprovados no banco M-PRO — fale com o administrador para receber o seu.'
      ));
    }
    return fetch(endpoint.replace(/\/$/, '') + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, senha: senha })
    }).then(function (resposta) {
      if (resposta.status === 401 || resposta.status === 403) {
        throw new Error('Credencial não reconhecida ou cadastro ainda não aprovado.');
      }
      if (!resposta.ok) throw new Error('Não foi possível falar com o servidor agora.');
      return resposta.json();
    }).then(function (dados) {
      if (!dados || !dados.token || !dados.usuario) throw new Error('Resposta de login inválida.');
      grava({ token: dados.token, usuario: dados.usuario, criadaEm: new Date().toISOString() });
      return MPRO.db.trocarEscopo(espaco());
    });
  }

  function sair() {
    grava(null);
    return MPRO.db.trocarEscopo(espaco());
  }

  /* Cabeçalho de autorização usado pela fila de sincronização. No modo local não há token:
     o servidor identifica o aparelho quando o vínculo de conta for implantado. */
  function cabecalhos() {
    if (sessao && sessao.token) return { Authorization: 'Bearer ' + sessao.token };
    return {};
  }

  return {
    carregar: carregar,
    modo: modo,
    espaco: espaco,
    pronta: pronta,
    perfil: perfil,
    salvarPerfil: salvarPerfil,
    entrar: entrar,
    sair: sair,
    cabecalhos: cabecalhos,
    usuario: function () { return sessao && sessao.usuario; },
    aoMudar: function (fn) { listeners.push(fn); }
  };
})();
