/* Identidade, controle de acesso e administração.
   Suporta solicitação de acesso, aprovação por administradores e atribuição de cargos. */
window.MPRO = window.MPRO || {};

MPRO.session = (function () {
  var CHAVE = 'mpro.sessao';
  var CHAVE_USUARIOS = 'mpro.usuarios_cadastrados';
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

  function leUsuarios() {
    try {
      var bruto = localStorage.getItem(CHAVE_USUARIOS);
      return bruto ? JSON.parse(bruto) : [];
    } catch (e) {
      return [];
    }
  }

  function gravaUsuarios(lista) {
    try {
      localStorage.setItem(CHAVE_USUARIOS, JSON.stringify(lista || []));
    } catch (e) {
      /* cota excedida */
    }
  }

  function modo() {
    return MPRO.platform.auth.modo;
  }

  function carregar() {
    sessao = le();
    return sessao;
  }

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
      cargo: salvo.cargo || doServidor.cargo || (doServidor.papel === 'admin' ? 'Administrador' : 'Engenheiro agrônomo'),
      empresa: salvo.empresa || doServidor.empresa || 'M-PRO',
      papel: doServidor.papel || 'tecnico',
      foto: salvo.foto || null
    };
    base.iniciais = iniciais(base.nome);
    base.modo = modo() === 'local' ? 'ESTE APARELHO' : (base.papel === 'admin' ? 'ADMINISTRADOR' : 'ACESSO AUTORIZADO');
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

  function pronta() {
    if (modo() === 'local') return !!(perfil().nome || '').trim();
    return !!(sessao && sessao.token && sessao.usuario);
  }

  function isAdmin() {
    var u = sessao && sessao.usuario;
    if (!u) return false;
    return u.papel === 'admin' || (u.cargo && u.cargo.toLowerCase().indexOf('admin') !== -1);
  }

  /* Solicitar acesso ao sistema (novo cadastro pendente de aprovação) */
  function solicitarAcesso(dados) {
    var nome = (dados.nome || '').trim();
    var email = (dados.email || '').trim().toLowerCase();
    var senha = dados.senha || '';
    var empresa = (dados.empresa || '').trim();
    var cargo = (dados.cargo || '').trim();

    if (!nome || !email || !senha) {
      return Promise.reject(new Error('Nome, e-mail e senha são obrigatórios.'));
    }

    var endpoint = MPRO.platform.auth.endpoint;
    if (endpoint) {
      return fetch('/api/auth?action=solicitar-acesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome, email: email, senha: senha, empresa: empresa, cargo: cargo })
      }).then(function (res) {
        if (!res.ok) {
          return res.json().then(function (d) { throw new Error(d.error || 'Erro ao registrar solicitação.'); });
        }
        return res.json();
      });
    }

    // Persistência local/offline
    var usuarios = leUsuarios();
    var existente = usuarios.find(function (u) { return u.email === email; });
    if (existente) {
      if (existente.status === 'pendente') {
        return Promise.reject(new Error('Já existe uma solicitação de acesso pendente para este e-mail. Aguarde a aprovação do administrador.'));
      }
      return Promise.reject(new Error('Este e-mail já possui cadastro no sistema. Tente fazer login ou fale com o administrador.'));
    }

    var novo = {
      id: 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      nome: nome,
      email: email,
      senha: senha,
      empresa: empresa || 'M-PRO',
      cargo: cargo || 'Engenheiro agrônomo',
      papel: 'tecnico',
      status: 'pendente',
      criadoEm: new Date().toISOString()
    };

    usuarios.push(novo);
    gravaUsuarios(usuarios);
    return Promise.resolve(novo);
  }

  function entrar(email, senha) {
    var emailNormalizado = (email || '').trim().toLowerCase();
    var endpoint = MPRO.platform.auth.endpoint;

    if (endpoint) {
      return fetch('/api/auth?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailNormalizado, senha: senha })
      }).then(function (resposta) {
        if (resposta.status === 403) {
          return resposta.json().then(function (d) {
            throw new Error(d.error || 'Seu cadastro foi recebido e está aguardando aprovação pelo administrador.');
          }).catch(function (e) {
            throw new Error(e.message || 'Seu cadastro foi recebido e está aguardando aprovação pelo administrador.');
          });
        }
        if (resposta.status === 401) {
          throw new Error('E-mail ou senha incorretos.');
        }
        if (!resposta.ok) throw new Error('Não foi possível falar com o servidor agora.');
        return resposta.json();
      }).then(function (dados) {
        if (!dados || !dados.token || !dados.usuario) throw new Error('Resposta de login inválida.');
        grava({ token: dados.token, usuario: dados.usuario, criadaEm: new Date().toISOString() });
        return MPRO.db.trocarEscopo(espaco());
      });
    }

    // Validação local
    var usuarios = leUsuarios();
    var usuario = usuarios.find(function (u) { return u.email === emailNormalizado; });

    if (!usuario) {
      return Promise.reject(new Error('Credencial não encontrada. Se você ainda não tem conta, clique em "Solicitar acesso".'));
    }

    if (usuario.status === 'pendente') {
      return Promise.reject(new Error('Seu cadastro foi recebido e está aguardando aprovação pelo administrador.'));
    }

    if (usuario.status === 'bloqueado') {
      return Promise.reject(new Error('Este acesso foi desativado pela administração.'));
    }

    if (usuario.senha !== senha) {
      return Promise.reject(new Error('E-mail ou senha incorretos.'));
    }

    var sessaoData = {
      token: 'tok_' + Date.now().toString(36),
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        empresa: usuario.empresa,
        cargo: usuario.cargo,
        papel: usuario.papel || 'tecnico'
      },
      criadaEm: new Date().toISOString()
    };

    grava(sessaoData);
    return MPRO.db.trocarEscopo(espaco());
  }

  function sair() {
    grava(null);
    return MPRO.db.trocarEscopo(espaco());
  }

  /* Funções do Painel de Administração */
  function listarUsuarios() {
    var endpoint = MPRO.platform.auth.endpoint;
    if (endpoint) {
      return fetch('/api/admin?action=usuarios', {
        headers: cabecalhos()
      }).then(function (res) { return res.json(); });
    }
    return Promise.resolve(leUsuarios());
  }

  function listarSolicitacoes() {
    return listarUsuarios().then(function (lista) {
      return (lista || []).filter(function (u) { return u.status === 'pendente'; });
    });
  }

  function aprovarSolicitacao(id, papelDefinido) {
    var endpoint = MPRO.platform.auth.endpoint;
    if (endpoint) {
      return fetch('/api/admin?action=aprovar', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, cabecalhos()),
        body: JSON.stringify({ id: id, papel: papelDefinido || 'tecnico' })
      }).then(function (res) { return res.json(); });
    }

    var usuarios = leUsuarios();
    var idx = usuarios.findIndex(function (u) { return u.id === id; });
    if (idx === -1) return Promise.reject(new Error('Usuário não encontrado.'));
    usuarios[idx].status = 'aprovado';
    usuarios[idx].papel = papelDefinido || usuarios[idx].papel || 'tecnico';
    usuarios[idx].aprovadoEm = new Date().toISOString();
    usuarios[idx].aprovadoPor = (sessao && sessao.usuario && sessao.usuario.nome) || 'Admin';
    gravaUsuarios(usuarios);
    return Promise.resolve(usuarios[idx]);
  }

  function recusarSolicitacao(id) {
    var endpoint = MPRO.platform.auth.endpoint;
    if (endpoint) {
      return fetch('/api/admin?action=recusar', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, cabecalhos()),
        body: JSON.stringify({ id: id })
      }).then(function (res) { return res.json(); });
    }

    var usuarios = leUsuarios();
    usuarios = usuarios.filter(function (u) { return u.id !== id; });
    gravaUsuarios(usuarios);
    return Promise.resolve(true);
  }

  function alterarCargo(id, novoPapel) {
    var endpoint = MPRO.platform.auth.endpoint;
    if (endpoint) {
      return fetch('/api/admin?action=cargo', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, cabecalhos()),
        body: JSON.stringify({ id: id, papel: novoPapel })
      }).then(function (res) { return res.json(); });
    }

    var usuarios = leUsuarios();
    var idx = usuarios.findIndex(function (u) { return u.id === id; });
    if (idx === -1) return Promise.reject(new Error('Usuário não encontrado.'));
    usuarios[idx].papel = novoPapel;
    gravaUsuarios(usuarios);

    // Se alterou o próprio usuário logado, atualiza a sessão
    if (sessao && sessao.usuario && sessao.usuario.id === id) {
      sessao.usuario.papel = novoPapel;
      grava(sessao);
    }
    return Promise.resolve(usuarios[idx]);
  }

  function banirUsuario(id) {
    var endpoint = MPRO.platform.auth.endpoint;
    if (endpoint) {
      return fetch('/api/admin?action=banir', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, cabecalhos()),
        body: JSON.stringify({ id: id })
      }).then(function (res) { return res.json(); });
    }

    var usuarios = leUsuarios();
    var idx = usuarios.findIndex(function (u) { return u.id === id; });
    if (idx === -1) return Promise.reject(new Error('Usuário não encontrado.'));
    usuarios[idx].status = 'bloqueado';
    gravaUsuarios(usuarios);
    return Promise.resolve(usuarios[idx]);
  }

  function reativarUsuario(id) {
    var endpoint = MPRO.platform.auth.endpoint;
    if (endpoint) {
      return fetch('/api/admin?action=reativar', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, cabecalhos()),
        body: JSON.stringify({ id: id })
      }).then(function (res) { return res.json(); });
    }

    var usuarios = leUsuarios();
    var idx = usuarios.findIndex(function (u) { return u.id === id; });
    if (idx === -1) return Promise.reject(new Error('Usuário não encontrado.'));
    usuarios[idx].status = 'aprovado';
    gravaUsuarios(usuarios);
    return Promise.resolve(usuarios[idx]);
  }

  function definirAdmin(email, senha, nome) {
    var emailNorm = (email || '').trim().toLowerCase();
    var usuarios = leUsuarios();
    var idx = usuarios.findIndex(function (u) { return u.email === emailNorm; });
    if (idx !== -1) {
      usuarios[idx].papel = 'admin';
      usuarios[idx].status = 'aprovado';
      if (senha) usuarios[idx].senha = senha;
      if (nome) usuarios[idx].nome = nome;
    } else {
      usuarios.push({
        id: 'usr_admin_' + Date.now().toString(36),
        nome: nome || 'Administrador',
        email: emailNorm,
        senha: senha || '123456',
        empresa: 'M-PRO',
        cargo: 'Administrador',
        papel: 'admin',
        status: 'aprovado',
        criadoEm: new Date().toISOString()
      });
    }
    gravaUsuarios(usuarios);
    return true;
  }

  function cabecalhos() {
    if (sessao && sessao.token) return { Authorization: 'Bearer ' + sessao.token };
    return {};
  }

  // Seed inicial local do admin Thyago
  definirAdmin('thyago10a2007@gmail.com', 'Thyago13', 'Thyago');

  return {
    carregar: carregar,
    modo: modo,
    espaco: espaco,
    pronta: pronta,
    isAdmin: isAdmin,
    perfil: perfil,
    salvarPerfil: salvarPerfil,
    solicitarAcesso: solicitarAcesso,
    entrar: entrar,
    sair: sair,
    listarUsuarios: listarUsuarios,
    listarSolicitacoes: listarSolicitacoes,
    aprovarSolicitacao: aprovarSolicitacao,
    recusarSolicitacao: recusarSolicitacao,
    removerUsuario: recusarSolicitacao,
    banirUsuario: banirUsuario,
    reativarUsuario: reativarUsuario,
    alterarCargo: alterarCargo,
    definirAdmin: definirAdmin,
    cabecalhos: cabecalhos,
    usuario: function () { return sessao && sessao.usuario; },
    aoMudar: function (fn) { listeners.push(fn); }
  };
})();

