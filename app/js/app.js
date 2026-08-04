/* Bootstrap. */
(function () {
  document.documentElement.setAttribute('data-theme', MPRO.store.theme);

  window.addEventListener('hashchange', MPRO.router.render);
  window.addEventListener('online', MPRO.router.render);
  window.addEventListener('offline', function () {
    MPRO.router.render();
    MPRO.ui.snack('Você está offline. O que for salvo fica no aparelho.');
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') MPRO.ui.closeDrawer();
  });

  if (!location.hash) location.hash = '#/';
  MPRO.router.render();
})();
