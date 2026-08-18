/* Contrato de plataforma. O core é neutro: quem decide se existe login, onde fica o
   banco e para qual servidor sincronizar é o alvo (mobile/ ou web/), que carrega este
   arquivo e depois chama MPRO.configurarPlataforma().

   Nenhum campo aqui aceita chave, token ou segredo. As credenciais de IA e de banco
   ficam no servidor; o front só conhece URLs públicas de endpoint. */
window.MPRO = window.MPRO || {};

MPRO.platform = {
  /* 'mobile' | 'web' — usado em textos, telas exclusivas e no id do espaço de trabalho. */
  alvo: 'web',
  nome: 'M-PRO Campo',
  versao: '0.4.0',

  auth: {
    /* 'local'  → sem tela de login; a identidade é um perfil escolhido no aparelho.
       'gated'  → só entra quem já está cadastrado e aprovado no banco do servidor. */
    modo: 'gated',
    /* Endpoint do servidor de autenticação. */
    endpoint: null
  },

  db: {
    /* 'auto' tenta IndexedDB e cai para localStorage quando indisponível. */
    driver: 'auto',
    nome: 'mpro'
  },

  /* Arquitetura híbrida: a gravação é sempre local primeiro; a nuvem recebe depois,
     drenando a fila de sincronização quando houver internet. Sem baseUrl, o app opera
     em modo somente-local e diz isso na interface — nunca finge ter sincronizado. */
  nuvem: {
    baseUrl: null,
    intervaloMs: 60000
  },

  ia: {
    /* 'local'  → recuperação sobre o banco do aparelho, sem modelo de linguagem.
       'remoto' → o mesmo contexto local é enviado a um servidor intermediário. */
    modo: 'local',
    endpoint: null
  },

  recursos: {
    onboarding: false,
    instalavel: false,
    landing: true
  }
};

MPRO.configurarPlataforma = function (patch) {
  Object.keys(patch || {}).forEach(function (chave) {
    var valor = patch[chave];
    if (valor && typeof valor === 'object' && !Array.isArray(valor) && MPRO.platform[chave]) {
      MPRO.platform[chave] = Object.assign({}, MPRO.platform[chave], valor);
    } else {
      MPRO.platform[chave] = valor;
    }
  });
  return MPRO.platform;
};
