/* 05 · Mapa de clientes e plantações — grupo B.
   Mapa real com Leaflet + OpenStreetMap (vendor local, sem chave). Os marcadores
   vêm de MPRO.store.clients() e refletem cadastro, edição e exclusão. */
window.MPRO = window.MPRO || {};
MPRO.screens = MPRO.screens || {};

MPRO.screens.mapa = (function () {
  var ui = MPRO.ui;
  var h = ui.h;

  /* Estado que sobrevive entre renders (o container Leaflet é recriado a cada rota). */
  var visao = null;              // { center: [lat,lng], zoom }
  var camada = 'mapa';           // 'mapa' | 'satelite'
  var filtro = 'todos';
  var busca = '';
  var gpsNegado = false;
  var minhaPosicao = null;       // { lat, lng }
  var mapaAtual = null;          // instância L.Map viva
  var avisoTiles = false;

  var CENTRO_PADRAO = [-16.35, -47.25]; // GO/MG — região da carteira de demonstração
  var ZOOM_PADRAO = 7;

  function normaliza(texto) {
    return String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function clientesNoMapa() {
    var termo = normaliza(busca);
    return MPRO.store.clients().map(function (cliente) {
      return { cliente: cliente, pos: MPRO.store.parseCoords(cliente.coordenadas) };
    }).filter(function (item) {
      if (!item.pos) return false;
      if (filtro !== 'todos' && item.cliente.status !== filtro) return false;
      if (!termo) return true;
      var c = item.cliente;
      return normaliza(c.nome + ' ' + c.municipio + ' ' + c.uf + ' ' + c.cultura).indexOf(termo) !== -1;
    });
  }

  function corStatus(status) {
    return status === 'adequado' ? 'var(--adequado)'
      : status === 'monitorar' ? 'var(--monitorar)'
      : status === 'corrigir' ? 'var(--corrigir)' : 'var(--outline)';
  }

  function iconeCliente(cliente) {
    var meta = ui.status(cliente.status);
    var texto = cliente.status === 'corrigir' ? 'var(--on-corrigir)'
      : cliente.status === 'monitorar' ? 'var(--on-monitorar)' : 'var(--on-adequado)';
    var htmlPin =
      '<span class="leafpin" style="background:' + corStatus(cliente.status) + ';color:' + texto + '">' +
      '<span class="ms" aria-hidden="true">' + meta.icone + '</span>' +
      '<span class="leafpin__label">' + cliente.municipio + '</span></span>' +
      '<span class="leafpin__stem"></span>';
    return L.divIcon({ className: 'leafpin-wrap', html: htmlPin, iconSize: [0, 0], iconAnchor: [0, 40] });
  }

  /* ----- sheet de detalhe (compartilhado com a lista de clientes) ----- */

  function abrirDetalhe(cliente) {
    var pos = MPRO.store.parseCoords(cliente.coordenadas);
    ui.openSheet({
      titulo: cliente.nome,
      body: [
        h('div', { class: 'detail__head' }, [
          h('div', { style: 'width:4px;align-self:stretch;border-radius:2px;background:' + corStatus(cliente.status) }),
          h('div', { style: 'flex:1;display:flex;flex-direction:column;gap:4px' }, [
            h('h3', { text: cliente.nome }),
            h('span', { class: 'mono dim', style: 'font-size:12px', text: cliente.municipio + '/' + cliente.uf + (cliente.coordenadas ? ' · ' + cliente.coordenadas : ' · sem coordenada') }),
            ui.statusTag(cliente.status, cliente.ultimaVisita ? 'laudo ' + ui.formatDate(cliente.ultimaVisita) : 'sem laudo')
          ])
        ]),
        h('div', { class: 'detail__stats' }, [
          h('div', { class: 'detail__stat' }, [h('b', { text: cliente.hectares || '—' }), h('span', { text: 'hectares' })]),
          h('div', { class: 'detail__stat' }, [h('b', { text: cliente.unidades.length }), h('span', { text: cliente.unidades.length === 1 ? 'unidade' : 'unidades' })]),
          h('div', { class: 'detail__stat' }, [h('b', { style: 'color:var(--medicao)', text: cliente.phMedio || '—' }), h('span', { text: 'pH médio' })])
        ]),
        cliente.recomendacao ? h('div', { class: 'section' }, [
          h('h4', { class: 'section__title', text: 'Recomendação em aberto' }),
          h('p', { style: 'margin:0;font-size:15px;line-height:1.45;text-wrap:pretty', text: cliente.recomendacao })
        ]) : null,
        pos ? h('a', {
          class: 'btn btn--outline', style: 'align-self:flex-start;height:48px',
          href: 'https://www.google.com/maps/dir/?api=1&destination=' + pos.lat + ',' + pos.lng,
          target: '_blank', rel: 'noopener'
        }, [ui.icon('alt_route'), 'Traçar rota no app de mapas']) : null
      ],
      footer: [
        h('button', {
          class: 'btn btn--outline btn--grow', type: 'button',
          onclick: function () { ui.closeSheet(); location.hash = '#/cliente?id=' + cliente.id; }
        }, [ui.icon('person'), 'Abrir cliente']),
        h('button', {
          class: 'btn btn--filled', style: 'flex:1.2', type: 'button',
          onclick: function () { ui.closeSheet(); location.hash = '#/visitas/nova?cliente=' + cliente.id; }
        }, [ui.icon('add'), 'Iniciar visita'])
      ]
    });
  }

  /* ----- geolocalização ----- */

  function localizar(ctx) {
    if (!navigator.geolocation) {
      gpsNegado = true;
      ctx.rerender();
      return;
    }
    navigator.geolocation.getCurrentPosition(function (posicao) {
      gpsNegado = false;
      minhaPosicao = { lat: posicao.coords.latitude, lng: posicao.coords.longitude };
      if (mapaAtual) {
        desenhaMinhaPosicao(mapaAtual);
        mapaAtual.setView([minhaPosicao.lat, minhaPosicao.lng], Math.max(mapaAtual.getZoom(), 12));
        ui.snack('Mapa centralizado na sua posição.');
      }
    }, function () {
      gpsNegado = true;
      ctx.rerender();
    }, { timeout: 8000, enableHighAccuracy: true });
  }

  var camadaMinhaPosicao = null;

  function desenhaMinhaPosicao(mapa) {
    if (camadaMinhaPosicao) { camadaMinhaPosicao.remove(); camadaMinhaPosicao = null; }
    if (!minhaPosicao) return;
    camadaMinhaPosicao = L.circleMarker([minhaPosicao.lat, minhaPosicao.lng], {
      radius: 8, color: '#ffffff', weight: 3, fillColor: '#2563eb', fillOpacity: 1
    }).addTo(mapa).bindTooltip('Você está aqui');
  }

  /* ----- montagem do Leaflet ----- */

  function criaCamadaBase() {
    if (camada === 'satelite') {
      return L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
        attribution: 'Imagens © Esri'
      });
    }
    return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    });
  }

  function montaMapa(container, ctx) {
    if (mapaAtual) { try { mapaAtual.remove(); } catch (e) { /* container antigo já saiu do DOM */ } }
    camadaMinhaPosicao = null;

    var itens = clientesNoMapa();
    var mapa = L.map(container, { zoomControl: false, attributionControl: true });
    mapaAtual = mapa;

    var tiles = criaCamadaBase().addTo(mapa);
    tiles.once('tileerror', function () {
      if (avisoTiles) return;
      avisoTiles = true;
      ui.snack('Não deu para baixar os blocos do mapa — verifique a conexão.');
    });
    tiles.once('load', function () { avisoTiles = false; });

    L.control.zoom({ position: 'topright', zoomInTitle: 'Aumentar zoom', zoomOutTitle: 'Diminuir zoom' }).addTo(mapa);

    if (visao) {
      mapa.setView(visao.center, visao.zoom);
    } else if (itens.length) {
      var limites = L.latLngBounds(itens.map(function (item) { return [item.pos.lat, item.pos.lng]; }));
      if (minhaPosicao) limites.extend([minhaPosicao.lat, minhaPosicao.lng]);
      mapa.fitBounds(limites, { paddingTopLeft: [56, 88], paddingBottomRight: [56, 56], maxZoom: 12 });
    } else {
      mapa.setView(minhaPosicao ? [minhaPosicao.lat, minhaPosicao.lng] : CENTRO_PADRAO, ZOOM_PADRAO);
    }

    mapa.on('moveend zoomend', function () {
      visao = { center: [mapa.getCenter().lat, mapa.getCenter().lng], zoom: mapa.getZoom() };
    });

    itens.forEach(function (item) {
      L.marker([item.pos.lat, item.pos.lng], {
        icon: iconeCliente(item.cliente),
        keyboard: true,
        alt: item.cliente.nome + ' — ' + ui.status(item.cliente.status).rotulo
      }).addTo(mapa).on('click', function () { abrirDetalhe(item.cliente); });
    });

    desenhaMinhaPosicao(mapa);
    setTimeout(function () { mapa.invalidateSize(); }, 60);
  }

  /* ----- pedaços de interface ----- */

  function avisoGps(ctx) {
    return h('div', { class: 'notice' }, [
      ui.icon('location_disabled', null),
      h('div', { class: 'notice__body' }, [
        h('strong', { text: 'Localização desativada' }),
        h('p', { text: 'Sem GPS não é possível centralizar o mapa nem preencher coordenadas na visita. Libere a permissão do navegador e tente de novo.' }),
        h('button', {
          class: 'btn btn--text', type: 'button', style: 'padding:0;height:auto',
          onclick: function () { gpsNegado = false; localizar(ctx); ctx.rerender(); }
        }, 'Tentar de novo')
      ])
    ]);
  }

  function chips(ctx) {
    var todos = MPRO.store.clients().filter(function (c) { return MPRO.store.parseCoords(c.coordenadas); });
    var opcoes = [['todos', null], ['adequado', 'Adequado'], ['monitorar', 'Monitorar'], ['corrigir', 'Corrigir']];
    return h('div', { class: 'chiprow', role: 'group', 'aria-label': 'Filtrar clientes no mapa' }, opcoes.map(function (par) {
      var total = par[0] === 'todos' ? todos.length : todos.filter(function (c) { return c.status === par[0]; }).length;
      return h('button', {
        class: 'chip', type: 'button', 'aria-pressed': filtro === par[0] ? 'true' : 'false',
        onclick: function () { filtro = par[0]; ctx.rerender(); }
      }, [
        par[1] ? h('span', { class: 'chip__dot', style: 'background:' + corStatus(par[0]) }) : null,
        par[1] || 'Todos',
        h('span', { class: 'chip__count', text: total })
      ]);
    }));
  }

  function resumo() {
    var itens = clientesNoMapa();
    var total = MPRO.store.clients().filter(function (c) { return MPRO.store.parseCoords(c.coordenadas); }).length;
    if (!total) return 'Nenhum cliente com coordenada cadastrada.';
    if (itens.length === total) return total + (total === 1 ? ' cliente no mapa.' : ' clientes no mapa.');
    return itens.length + ' de ' + total + ' clientes visíveis com o filtro atual.';
  }

  return {
    grupo: 'B',
    chave: 'mapa',
    titulo: 'Mapa',
    carrega: true,
    abrirDetalhe: abrirDetalhe,

    get busca() {
      return {
        placeholder: 'Buscar cliente, município ou cultura',
        valor: busca,
        onInput: function (valor) {
          busca = valor;
          var host = document.getElementById('mapa-leaflet');
          if (host && window.MPRO && MPRO.router) {
            montaMapa(host, { rerender: MPRO.router.render });
            var resumo = document.getElementById('mapa-resumo');
            if (resumo) resumo.textContent = resumoTexto();
          }
        }
      };
    },

    acao: {
      icone: 'my_location',
      rotulo: 'Minha localização',
      onClick: function (ctx) { localizar(ctx); }
    },

    deskHead: function (ctx) {
      return [
        h('div', { class: 'deskhead__id' }, [
          h('span', { class: 'mono', text: 'GEOGRAFIA DA CARTEIRA' }),
          h('strong', { text: 'Mapa' })
        ]),
        h('div', { class: 'deskhead__tools' }, [
          h('input', {
            class: 'deskhead__search', type: 'search', value: busca,
            placeholder: 'Buscar cliente no mapa', 'aria-label': 'Buscar cliente no mapa',
            oninput: function (event) {
              busca = event.target.value;
              var host = document.getElementById('mapa-leaflet');
              if (host) montaMapa(host, ctx);
              var resumo = document.getElementById('mapa-resumo');
              if (resumo) resumo.textContent = resumoTexto();
            }
          }),
          h('button', { class: 'btn btn--filled', type: 'button', onclick: function () { location.hash = '#/visitas/nova'; } }, [
            ui.icon('add'), 'Nova visita'
          ])
        ])
      ];
    },

    render: function (ctx) {
      var todosClientes = MPRO.store.clients();

      if (!todosClientes.length) {
        return ui.emptyState({
          icone: 'map',
          titulo: 'Mapa sem clientes',
          texto: 'Cadastre clientes com coordenada para vê-los aqui, agrupados por status do último laudo.',
          acao: { rotulo: 'Ir para Clientes', icone: 'groups', onClick: function () { location.hash = '#/clientes'; } }
        });
      }

      var itens = clientesNoMapa();
      var semCoordenada = todosClientes.filter(function (c) { return !MPRO.store.parseCoords(c.coordenadas); }).length;

      var container = h('div', { id: 'mapa-leaflet', class: 'map map--leaflet', role: 'application', 'aria-label': 'Mapa de clientes' });

      var barraCamadas = h('div', { class: 'map__layers map__layers--float', role: 'group', 'aria-label': 'Camada do mapa' }, [
        h('button', {
          class: 'layerbtn', type: 'button', 'aria-pressed': camada === 'mapa' ? 'true' : 'false',
          onclick: function () { camada = 'mapa'; ctx.rerender(); }
        }, 'Mapa'),
        h('button', {
          class: 'layerbtn', type: 'button', 'aria-pressed': camada === 'satelite' ? 'true' : 'false',
          onclick: function () { camada = 'satelite'; ctx.rerender(); }
        }, 'Satélite')
      ]);

      var botaoGps = h('button', {
        class: 'maptool maptool--float', type: 'button', 'aria-label': 'Centralizar na minha posição',
        onclick: function () { localizar(ctx); }
      }, [ui.icon('my_location')]);

      var moldura = h('div', { class: 'map-frame' }, [container, barraCamadas, botaoGps]);

      setTimeout(function () {
        var vivo = document.getElementById('mapa-leaflet');
        if (vivo) montaMapa(vivo, ctx);
      }, 0);

      return h('div', { style: 'display:flex;flex-direction:column;gap:12px;flex:1;min-height:0' }, [
        !navigator.onLine ? h('div', { class: 'notice' }, [
          ui.icon('cloud_off', null),
          h('div', { class: 'notice__body' }, [
            h('strong', { text: 'Sem conexão' }),
            h('p', { text: 'Os blocos do mapa podem não carregar offline. Os clientes e coordenadas continuam disponíveis.' })
          ])
        ]) : null,
        gpsNegado ? avisoGps(ctx) : null,
        chips(ctx),
        moldura,
        h('p', { id: 'mapa-resumo', class: 'dim', style: 'margin:0;font-size:13px', text: resumoTexto() }),
        semCoordenada ? h('button', {
          class: 'btn btn--text', type: 'button', style: 'align-self:flex-start;padding:0;height:auto;font-size:13px',
          onclick: function () { location.hash = '#/clientes'; }
        }, [
          ui.icon('location_off'),
          semCoordenada + (semCoordenada === 1 ? ' cliente sem coordenada — cadastre em Clientes' : ' clientes sem coordenada — cadastre em Clientes')
        ]) : null
      ]);

      function resumoTexto() { return resumo(); }
    }
  };
})();
