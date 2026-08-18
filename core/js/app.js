/* Bootstrap. A ordem importa: tema (síncrono, evita piscar) → sessão → banco local →
   fila de sincronização → primeira renderização. Nada é desenhado antes do banco abrir,
   para que a primeira tela já mostre os dados reais do aparelho. */
(function () {
  document.documentElement.setAttribute('data-theme', MPRO.store.theme);
  MPRO.session.carregar();

  function ligaEventos() {
    window.addEventListener('hashchange', MPRO.router.render);
    window.addEventListener('online', MPRO.router.render);
    window.addEventListener('offline', function () {
      MPRO.router.render();
      MPRO.ui.snack('Você está offline. O que for salvo fica no aparelho.');
    });

    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape') MPRO.ui.closeDrawer();
    });

    MPRO.sync.aoMudar(function () {
      var drawer = document.getElementById('drawer');
      if (drawer && !drawer.hidden) MPRO.ui.renderDrawer(location.hash);
    });
  }

  function registraServiceWorker() {
    if (!MPRO.platform.recursos.instalavel || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/mobile/sw.js', { scope: '/mobile/' }).catch(function () {
      /* sem service worker o app ainda funciona online; só perde o cache offline */
    });
  }

  MPRO.db.abrir(MPRO.session.espaco())
    .catch(function () { return { driver: 'memoria' }; })
    .then(function () {
      MPRO.sync.iniciar();
      ligaEventos();
      registraServiceWorker();
      if (!location.hash) location.hash = '#/';
      MPRO.router.render();
    });
})();
