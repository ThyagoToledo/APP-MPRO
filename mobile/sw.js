/* Service worker do módulo Android.

   O app precisa abrir sem rede. O shell (HTML, CSS, JS, Leaflet, ícones) é pré-cacheado na
   instalação; o resto é servido do cache com revalidação em segundo plano.

   Os blocos do mapa e as fontes vêm de outra origem e só existem offline depois de terem
   sido vistos ao menos uma vez com internet — é o único conteúdo que degrada sem sinal.
   Nenhuma resposta de API é cacheada: dado de trabalho vive no IndexedDB, não aqui. */
var VERSAO = 'mpro-campo-v2';
var SHELL = VERSAO + '-shell';
var RUNTIME = VERSAO + '-runtime';

var PRE_CACHE = [
  '/mobile/',
  '/mobile/index.html',
  '/mobile/manifest.webmanifest',
  '/mobile/js/platform.js',
  '/mobile/icons/icon-192.png',
  '/mobile/icons/icon-512.png',
  '/mobile/icons/icon-maskable-512.png',
  '/core/css/tokens.css',
  '/core/css/app.css',
  '/core/css/polish.css',
  '/core/vendor/leaflet/leaflet.css',
  '/core/vendor/leaflet/leaflet.js',
  '/core/assets/mpro-app-icon.svg',
  '/core/assets/mpro-mark.svg',
  '/core/js/platform.js',
  '/core/js/catalogo.js',
  '/core/js/db.js',
  '/core/js/sync.js',
  '/core/js/session.js',
  '/core/js/ia.js',
  '/core/js/store.js',
  '/core/js/ui.js',
  '/core/js/router.js',
  '/core/js/app.js',
  '/core/js/screens/dashboard.js',
  '/core/js/screens/clientes.js',
  '/core/js/screens/mapa.js',
  '/core/js/screens/visitas.js',
  '/core/js/screens/nova-visita.js',
  '/core/js/screens/detalhes.js',
  '/core/js/screens/recursos-visita.js',
  '/core/js/screens/equipamentos.js',
  '/core/js/screens/assistente.js',
  '/core/js/screens/conta.js',
  '/core/js/screens/auth.js',
  '/core/js/screens/placeholder.js'
];

self.addEventListener('install', function (evento) {
  evento.waitUntil(
    caches.open(SHELL).then(function (cache) {
      /* addAll falha inteiro se um item falhar; aqui cada item é independente para que
         uma fonte fora do ar não impeça a instalação do app. */
      return Promise.all(PRE_CACHE.map(function (url) {
        return cache.add(new Request(url, { cache: 'reload' })).catch(function () { return null; });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (evento) {
  evento.waitUntil(
    caches.keys().then(function (chaves) {
      return Promise.all(chaves.filter(function (chave) {
        return chave.indexOf(VERSAO) !== 0;
      }).map(function (chave) { return caches.delete(chave); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function limita(nomeCache, maximo) {
  return caches.open(nomeCache).then(function (cache) {
    return cache.keys().then(function (chaves) {
      if (chaves.length <= maximo) return null;
      return Promise.all(chaves.slice(0, chaves.length - maximo).map(function (chave) {
        return cache.delete(chave);
      }));
    });
  });
}

self.addEventListener('fetch', function (evento) {
  var req = evento.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  var mesmaOrigem = url.origin === self.location.origin;

  /* Navegação: o app é uma página só. Offline, devolve o shell em vez de erro de rede. */
  if (req.mode === 'navigate') {
    evento.respondWith(
      fetch(req).catch(function () {
        return caches.match('/mobile/index.html', { ignoreSearch: true });
      })
    );
    return;
  }

  if (mesmaOrigem) {
    evento.respondWith(
      caches.match(req, { ignoreSearch: true }).then(function (cacheado) {
        var rede = fetch(req).then(function (resposta) {
          if (resposta && resposta.ok) {
            var copia = resposta.clone();
            caches.open(SHELL).then(function (cache) { cache.put(req, copia); });
          }
          return resposta;
        }).catch(function () { return cacheado; });
        return cacheado || rede;
      })
    );
    return;
  }

  /* Terceiros (blocos do mapa, fontes): cache-first com teto, para não estourar o espaço. */
  evento.respondWith(
    caches.match(req).then(function (cacheado) {
      if (cacheado) return cacheado;
      return fetch(req).then(function (resposta) {
        if (resposta && (resposta.ok || resposta.type === 'opaque')) {
          var copia = resposta.clone();
          caches.open(RUNTIME).then(function (cache) {
            cache.put(req, copia);
            limita(RUNTIME, 400);
          });
        }
        return resposta;
      }).catch(function () {
        return new Response('', { status: 504, statusText: 'sem conexão' });
      });
    })
  );
});
