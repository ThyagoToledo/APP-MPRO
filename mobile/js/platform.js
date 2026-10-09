/* Mesmas contas e APIs do site. Segredos ficam no servidor. */
(function () {
  var runtime = window.MPRO_RUNTIME || {};
  var api = (runtime.backendUrl || '').replace(/\/$/, '') + '/api';
  MPRO.configurarPlataforma({
    alvo: 'mobile', nome: 'M-PRO Campo', versao: runtime.versionName || '0.5.0',
    auth: { modo: 'gated', endpoint: api + '/auth' },
    db: { driver: 'auto', nome: 'mpro-campo' },
    nuvem: { baseUrl: api, intervaloMs: 30000 },
    ia: { modo: 'remoto', endpoint: api + '/ia' },
    recursos: { onboarding: false, instalavel: !window.MPRO_NATIVE, landing: false }
  });
})();
