/* Roteador por hash + montagem do "chrome" (appbar, navegação, rodapé) conforme o
   grupo da tela — ver doc/03-sistema-de-telas.md, seção 3.2. */
window.MPRO = window.MPRO || {};

MPRO.router = (function () {
  var ui = MPRO.ui;
  var h = ui.h;
  var carregadas = {};

  function isDesktop() {
    return window.matchMedia('(min-width: 900px)').matches;
  }

  function parse() {
    var hash = location.hash.replace(/^#/, '') || '/';
    var partes = hash.split('?');
    var caminho = partes[0];
    var query = {};
    (partes[1] || '').split('&').forEach(function (par) {
      if (!par) return;
      var kv = par.split('=');
      query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    return { caminho: caminho, query: query };
  }

  function resolve(caminho) {
    var s = MPRO.screens;
    var rotas = {
      '/login': s.login,
      '/registro': s.registro,
      '/': s.dashboard,
      '/clientes': s.clientes,
      '/cliente': s.clienteDetalhe,
      '/mapa': s.mapa,
      '/visitas': s.visitas,
      '/visita': s.visitaDetalhe,
      '/visitas/nova': s.novaVisita,
      '/fotos': s.fotos,
      '/evidencias': s.evidencias,
      '/transcricao': s.transcricao,
      '/revisao': s.revisao,
      '/equipamentos': s.equipamentos,
      '/assistente': s.assistente,
      '/perfil': s.perfil,
      '/perfil/editar': s.editarPerfil,
      '/configuracoes': s.configuracoes
    };
    return rotas[caminho] || s.placeholder(caminho);
  }

  function montaAppbar(tela, ctx) {
    var appbar = document.getElementById('appbar');
    var bannerAntigo = document.querySelector('.viewport > .banner');
    if (bannerAntigo) bannerAntigo.remove();
    appbar.innerHTML = '';
    appbar.hidden = tela.grupo === 'A';
    if (appbar.hidden) return;
    appbar.className = 'appbar' + (tela.grupo === 'B' ? ' appbar--hidden-desktop' : '');

    var esquerda;
    if (tela.grupo === 'C') {
      esquerda = h('button', {
        class: 'iconbtn', type: 'button',
        'aria-label': tela.voltar ? 'Voltar' : 'Fechar',
        onclick: function () { (tela.onSair || function () { history.back(); })(ctx); }
      }, [ui.icon(tela.voltar ? 'arrow_back' : 'close')]);
    } else {
      esquerda = h('button', {
        class: 'iconbtn', type: 'button', 'aria-label': 'Abrir menu', 'aria-controls': 'drawer',
        'aria-expanded': 'false', 'data-menu-trigger': true, onclick: ui.openDrawer
      }, [ui.icon('menu')]);
    }

    var acao = tela.acao
      ? h('button', {
          class: 'iconbtn', type: 'button', 'aria-label': tela.acao.rotulo,
          'data-badge': tela.acao.badge ? '' : null,
          onclick: function () { tela.acao.onClick(ctx); }
        }, [ui.icon(tela.acao.icone)])
      : h('span');

    appbar.appendChild(h('div', { class: 'appbar__row' }, [
      esquerda,
      h('h1', { class: 'appbar__title' + (tela.marca ? ' appbar__title--brand' : '') }, [
        tela.marca ? ui.brand() : tela.titulo
      ]),
      acao
    ]));

    if (tela.busca) {
      appbar.appendChild(h('div', { class: 'appbar__search' }, [
        h('div', { class: 'searchbox' }, [
          ui.icon('search'),
          h('input', {
            class: 'searchfield', type: 'search', placeholder: tela.busca.placeholder,
            'aria-label': tela.busca.placeholder, value: tela.busca.valor || '',
            oninput: function (event) { tela.busca.onInput(event.target.value); }
          })
        ])
      ]));
    }

    if (tela.progresso) {
      appbar.appendChild(h('div', { class: 'appbar__progress' }, [
        h('div', { class: 'appbar__progress-label' }, [
          h('span', { text: tela.progresso.rotulo }),
          h('span', { text: tela.progresso.percentual + '%' })
        ]),
        h('div', { class: 'progresstrack', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': tela.progresso.percentual }, [
          h('i', { style: 'width:' + tela.progresso.percentual + '%' })
        ])
      ]));
    }

    if (tela.banner) appbar.insertAdjacentElement('afterend', tela.banner);
  }

  function montaChrome(tela, ctx) {
    var rail = document.getElementById('rail');
    var deskhead = document.getElementById('deskhead');
    var bottomnav = document.getElementById('bottomnav');
    var fab = document.getElementById('fab');
    var actionbar = document.getElementById('actionbar');

    rail.hidden = tela.grupo !== 'B';
    if (!rail.hidden) ui.renderRail(tela.chave);

    deskhead.innerHTML = '';
    deskhead.hidden = !(tela.grupo === 'B' && isDesktop());
    if (!deskhead.hidden) {
      if (tela.deskHead) {
        tela.deskHead(ctx).forEach(function (node) { deskhead.appendChild(node); });
      } else {
        deskhead.appendChild(h('div', { class: 'deskhead__id' }, [
          h('span', { class: 'mono', text: tela.eyebrow || 'M-PRO CAMPO' }),
          h('strong', { text: tela.titulo })
        ]));
        if (tela.acao) {
          deskhead.appendChild(h('div', { class: 'deskhead__tools' }, [
            h('button', { class: 'btn btn--filled', type: 'button', onclick: function () { tela.acao.onClick(ctx); } }, [
              ui.icon(tela.acao.icone), tela.acao.rotulo
            ])
          ]));
        }
      }
    }

    bottomnav.hidden = tela.grupo !== 'B';
    if (!bottomnav.hidden) ui.renderBottomNav(tela.chave);

    fab.hidden = tela.grupo !== 'B';
    if (!fab.hidden) {
      fab.className = 'fab fab--hidden-desktop';
      fab.innerHTML = '';
      fab.appendChild(ui.icon('add'));
      fab.appendChild(document.createTextNode('Nova visita'));
      fab.onclick = function () { location.hash = '#/visitas/nova'; };
    }

    actionbar.innerHTML = '';
    actionbar.hidden = !tela.rodape;
    if (tela.rodape) tela.rodape(ctx).forEach(function (node) { actionbar.appendChild(node); });

    ui.renderDrawer('#' + ctx.caminho);
  }

  function pinta(tela, ctx, conteudo) {
    var view = document.getElementById('view');
    view.innerHTML = '';
    view.setAttribute('data-group', tela.grupo);
    view.appendChild(conteudo);
  }

  function render() {
    var rota = parse();
    if (!MPRO.store.isAuthenticated && rota.caminho !== '/login' && rota.caminho !== '/registro') {
      location.hash = '#/login';
      return;
    }
    var tela = resolve(rota.caminho);
    var ctx = {
      caminho: rota.caminho,
      query: rota.query,
      desktop: isDesktop(),
      recarregar: function () { delete carregadas[rota.caminho]; render(); },
      rerender: render
    };

    ui.closeSheet();
    ui.closeDrawer();
    if (tela.prepare) tela.prepare(ctx);
    montaAppbar(tela, ctx);
    montaChrome(tela, ctx);

    if (tela.carrega && !carregadas[rota.caminho]) {
      pinta(tela, ctx, ui.skeletonRows(3));
      setTimeout(function () {
        if (parse().caminho !== rota.caminho) return;
        if (!navigator.onLine) {
          pinta(tela, ctx, ui.errorState(
            'Sem conexão agora. Os rascunhos salvos no aparelho continuam disponíveis.',
            ctx.recarregar
          ));
          return;
        }
        carregadas[rota.caminho] = true;
        pinta(tela, ctx, tela.render(ctx));
      }, 420);
      return;
    }

    pinta(tela, ctx, tela.render(ctx));
    document.getElementById('view').scrollTop = 0;
  }

  var mq = window.matchMedia('(min-width: 900px)');
  (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(function () { render(); });

  return { render: render, isDesktop: isDesktop };
})();
