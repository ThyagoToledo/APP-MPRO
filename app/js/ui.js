/* Blocos visuais compartilhados. Tudo aqui é DOM real: nenhuma tela monta HTML por string. */
window.MPRO = window.MPRO || {};

MPRO.ui = (function () {
  function h(tag, props, children) {
    var node = document.createElement(tag);
    props = props || {};

    Object.keys(props).forEach(function (key) {
      var value = props[key];
      if (value === null || value === undefined || value === false) return;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'html') node.innerHTML = value;
      else if (key === 'style') node.setAttribute('style', value);
      else if (key.slice(0, 2) === 'on') node.addEventListener(key.slice(2).toLowerCase(), value);
      else node.setAttribute(key, value === true ? '' : value);
    });

    append(node, children);
    return node;
  }

  function append(node, children) {
    if (children === null || children === undefined || children === false) return;
    if (Array.isArray(children)) {
      children.forEach(function (child) { append(node, child); });
      return;
    }
    node.appendChild(children.nodeType ? children : document.createTextNode(String(children)));
  }

  function icon(name, extra) {
    return h('span', { class: 'ms' + (extra ? ' ' + extra : ''), 'aria-hidden': 'true', text: name });
  }

  function brand(opts) {
    opts = opts || {};
    return h('span', { class: 'brand-lockup' + (opts.className ? ' ' + opts.className : '') }, [
      h('span', {
        class: 'brand-mark',
        html: '<svg viewBox="0 0 512 512" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M182 102h250a6 6 0 0 1 6 6v194c0 11-4 20-12 28l-76 75c-7 7-15 10-25 10H76V211c0-12 4-21 12-29l75-73c5-5 11-7 19-7Zm-31 68v181h58V204l-58-34Zm75 0v85l59 34v-85l-59-34Zm77 0v181h20l38-38V204l-58-34Z"/></svg>'
      }),
      opts.markOnly ? null : h('span', { class: 'brand-word', text: 'M-PRO' })
    ]);
  }

  var STATUS = {
    adequado: { rotulo: 'ADEQUADO', icone: 'check_circle', cor: 'var(--adequado)' },
    monitorar: { rotulo: 'MONITORAR', icone: 'warning', cor: 'var(--monitorar)' },
    corrigir: { rotulo: 'CORRIGIR', icone: 'error', cor: 'var(--corrigir)' }
  };

  function status(key) {
    return STATUS[key] || { rotulo: 'SEM LAUDO', icone: 'help', cor: 'var(--outline)' };
  }

  function statusTag(key, sufixo) {
    var meta = status(key);
    return h('span', { class: 'statustag', style: 'color:' + meta.cor }, [
      icon(meta.icone),
      meta.rotulo + (sufixo ? ' · ' + sufixo : '')
    ]);
  }

  function formatDate(iso) {
    if (!iso) return '—';
    var parts = String(iso).slice(0, 10).split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  function formatSavedAt(iso) {
    if (!iso) return 'não salvo';
    var d = new Date(iso);
    if (isNaN(d)) return String(iso);
    var hoje = new Date();
    var hora = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    var mesmoDia = d.toDateString() === hoje.toDateString();
    return mesmoDia ? hora : String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + ' ' + hora;
  }

  function todayLabel() {
    var dias = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    var d = new Date();
    return dias[d.getDay()] + ' · ' + String(d.getDate()).padStart(2, '0') + '/' +
      String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }

  function greetingWord() {
    var hora = new Date().getHours();
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  /* Linha de dado: trilha de status de 4px + título + meta. É a unidade base do app. */
  function dataRow(opts) {
    var node = h(opts.onClick ? 'button' : 'div', {
      class: 'datarow' + (opts.variant === 'bordered' ? ' datarow--bordered' : ''),
      type: opts.onClick ? 'button' : null,
      'aria-label': opts.onClick ? [opts.title, opts.meta, 'Abrir detalhes'].filter(Boolean).join('. ') : null,
      onclick: opts.onClick
    }, [
      h('div', { class: 'datarow__track', style: 'background:' + status(opts.status).cor }),
      h('div', { class: 'datarow__body' }, [
        h('span', { class: 'datarow__title', text: opts.title }),
        opts.meta ? h('span', { class: 'datarow__meta', text: opts.meta }) : null,
        opts.tag || null
      ]),
      opts.trailing === 'cta'
        ? h('span', { class: 'datarow__cta', text: 'Ver' })
        : icon('chevron_right', 'datarow__chev')
    ]);
    return node;
  }

  function section(titulo, extra, children) {
    return h('section', { class: 'section' }, [
      h('div', { class: 'section__head' }, [
        h('h2', { class: 'section__title', text: titulo }),
        extra || null
      ]),
      children
    ]);
  }

  function skeletonRows(n) {
    var rows = [];
    for (var i = 0; i < n; i++) rows.push(h('div', { class: 'skel skel--row' }));
    return h('div', { class: 'section', 'aria-busy': 'true' }, [
      h('div', { class: 'skel skel--line', style: 'width:40%' }),
      h('div', { class: 'skel skel--block' }),
      rows
    ]);
  }

  function emptyState(opts) {
    return h('div', { class: 'empty' }, [
      icon(opts.icone || 'inbox', 'empty__icon'),
      h('h3', { text: opts.titulo }),
      h('p', { text: opts.texto }),
      opts.acao ? h('button', { class: 'btn btn--filled', type: 'button', onclick: opts.acao.onClick }, [
        opts.acao.icone ? icon(opts.acao.icone) : null,
        opts.acao.rotulo
      ]) : null
    ]);
  }

  function errorState(mensagem, onRetry) {
    return h('div', { class: 'notice', style: 'border-color:var(--corrigir)' }, [
      icon('cloud_off', null),
      h('div', { class: 'notice__body' }, [
        h('strong', { text: 'Não deu para carregar' }),
        h('p', { text: mensagem }),
        h('button', { class: 'btn btn--text', type: 'button', style: 'padding:0;height:auto', onclick: onRetry }, 'Tentar de novo')
      ])
    ]);
  }

  var snackTimer = null;

  function snack(mensagem) {
    var host = document.getElementById('snackbar');
    var falha = /^(não|sem|informe|escolha|avalie|medição|este aparelho)|obrigat/i.test(mensagem);
    host.innerHTML = '';
    host.className = 'snackbar' + (falha ? ' snackbar--error' : '');
    host.setAttribute('role', falha ? 'alert' : 'status');
    host.setAttribute('aria-live', falha ? 'assertive' : 'polite');
    host.appendChild(icon(falha ? 'error' : 'check_circle'));
    host.appendChild(h('span', { text: mensagem }));
    host.hidden = false;
    clearTimeout(snackTimer);
    snackTimer = setTimeout(function () { host.hidden = true; }, 3200);
  }

  /* ----- bottom sheet ----- */

  var sheetHost = null;
  var sheetPreviousFocus = null;

  function closeSheet() {
    sheetHost = document.getElementById('sheet-host');
    sheetHost.hidden = true;
    sheetHost.innerHTML = '';
    document.removeEventListener('keydown', onSheetKey);
    if (sheetPreviousFocus && document.contains(sheetPreviousFocus)) sheetPreviousFocus.focus();
    sheetPreviousFocus = null;
  }

  function onSheetKey(event) {
    if (event.key === 'Escape') {
      closeSheet();
      return;
    }
    if (event.key !== 'Tab') return;
    var sheet = sheetHost && sheetHost.querySelector('.sheet');
    if (!sheet) return;
    var focaveis = sheet.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!focaveis.length) return;
    var primeiro = focaveis[0];
    var ultimo = focaveis[focaveis.length - 1];
    if (event.shiftKey && document.activeElement === primeiro) {
      event.preventDefault();
      ultimo.focus();
    } else if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault();
      primeiro.focus();
    }
  }

  function openSheet(opts) {
    sheetHost = document.getElementById('sheet-host');
    sheetPreviousFocus = document.activeElement;
    sheetHost.innerHTML = '';
    sheetHost.hidden = false;

    var sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.titulo }, [
      h('div', { class: 'sheet__grab' }),
      h('div', { class: 'sheet__head' }, [
        h('h3', { text: opts.titulo }),
        h('button', { class: 'iconbtn iconbtn--ghost', type: 'button', 'aria-label': 'Fechar', onclick: closeSheet }, [
          icon('close')
        ])
      ]),
      h('div', { class: 'sheet__body' }, opts.body),
      opts.footer ? h('div', { class: 'sheet__foot' }, opts.footer) : null
    ]);

    sheetHost.appendChild(h('div', { class: 'scrim', onclick: closeSheet }));
    sheetHost.appendChild(sheet);
    document.addEventListener('keydown', onSheetKey);

    var focusable = sheet.querySelector('input, button, select, textarea');
    if (focusable) focusable.focus();
    return sheet;
  }

  function confirmSheet(opts) {
    var destrutiva = /^(excluir|sair|remover|apagar)$/i.test(opts.confirmar || '');
    openSheet({
      titulo: opts.titulo,
      body: [h('p', { style: 'margin:0;font-size:15px;line-height:1.45;color:var(--on-surface-variant)', text: opts.texto })],
      footer: [
        h('button', { class: 'btn btn--text', type: 'button', onclick: closeSheet }, opts.cancelar || 'Cancelar'),
        h('button', {
          class: 'btn btn--filled btn--grow' + (destrutiva ? ' btn--destructive' : ''), type: 'button',
          onclick: function () { closeSheet(); opts.onConfirm(); }
        }, opts.confirmar || 'Confirmar')
      ]
    });
  }

  /* ----- navegação global ----- */

  var DESTINOS = [
    { rota: '#/', icone: 'home', rotulo: 'Início', chave: 'inicio' },
    { rota: '#/clientes', icone: 'groups', rotulo: 'Clientes', chave: 'clientes' },
    { rota: '#/mapa', icone: 'map', rotulo: 'Mapa', chave: 'mapa' },
    { rota: '#/visitas', icone: 'assignment', rotulo: 'Visitas', chave: 'visitas' }
  ];

  var DRAWER_ITENS = [
    { rota: '#/evidencias', icone: 'folder_open', rotulo: 'Evidências' },
    { rota: '#/fotos', icone: 'photo_camera', rotulo: 'Registro fotográfico' },
    { rota: '#/transcricao', icone: 'graphic_eq', rotulo: 'Transcrição' },
    { rota: '#/revisao', icone: 'fact_check', rotulo: 'Revisão e finalização' },
    { rota: '#/equipamentos', icone: 'precision_manufacturing', rotulo: 'Equipamentos' },
    { rota: '#/assistente', icone: 'smart_toy', rotulo: 'Assistente IA' },
    { separador: true },
    { rota: '#/perfil', icone: 'person', rotulo: 'Perfil' },
    { rota: '#/perfil/editar', icone: 'manage_accounts', rotulo: 'Editar perfil' },
    { rota: '#/configuracoes', icone: 'settings', rotulo: 'Configurações' }
  ];

  var RAIL_ITENS = DESTINOS.concat([
    { separador: true },
    { rota: '#/equipamentos', icone: 'precision_manufacturing', rotulo: 'Equip.', chave: 'equipamentos' },
    { rota: '#/assistente', icone: 'smart_toy', rotulo: 'IA', chave: 'assistente' }
  ]);

  var drawerPreviousFocus = null;

  function onDrawerKey(event) {
    var drawer = document.getElementById('drawer');
    if (drawer.hidden) return;
    if (event.key === 'Escape') {
      closeDrawer();
      return;
    }
    if (event.key !== 'Tab') return;
    var focaveis = drawer.querySelectorAll('a[href], button:not([disabled])');
    if (!focaveis.length) return;
    var primeiro = focaveis[0];
    var ultimo = focaveis[focaveis.length - 1];
    if (event.shiftKey && document.activeElement === primeiro) {
      event.preventDefault();
      ultimo.focus();
    } else if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault();
      primeiro.focus();
    }
  }

  function closeDrawer() {
    document.getElementById('drawer').hidden = true;
    document.getElementById('scrim').hidden = true;
    var menu = document.querySelector('[data-menu-trigger]');
    if (menu) menu.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onDrawerKey);
    if (drawerPreviousFocus && document.contains(drawerPreviousFocus)) drawerPreviousFocus.focus();
    drawerPreviousFocus = null;
  }

  function openDrawer() {
    var drawer = document.getElementById('drawer');
    var scrim = document.getElementById('scrim');
    drawerPreviousFocus = document.activeElement;
    drawer.hidden = false;
    scrim.hidden = false;
    var menu = document.querySelector('[data-menu-trigger]');
    if (menu) menu.setAttribute('aria-expanded', 'true');
    scrim.onclick = closeDrawer;
    document.addEventListener('keydown', onDrawerKey);
    var first = drawer.querySelector('button, a');
    if (first) first.focus();
  }

  function renderDrawer(rotaAtual) {
    var drawer = document.getElementById('drawer');
    var user = MPRO.store.user();
    drawer.innerHTML = '';

    drawer.appendChild(h('div', { class: 'drawer__head' }, [
      brand({ className: 'drawer__brand' }),
      h('div', { class: 'drawer__id' }, [
        h('div', { class: 'avatar', text: user.iniciais }),
        h('div', { class: 'drawer__name' }, [
          h('strong', { text: user.nome }),
          h('span', { text: user.email })
        ])
      ]),
      h('span', { class: 'badge', text: user.modo })
    ]));

    var lista = h('nav', { class: 'drawer__list' }, DRAWER_ITENS.map(function (item) {
      if (item.separador) return h('div', { class: 'drawer__sep' });
      return h('a', {
        class: 'drawer__item',
        href: item.rota,
        'aria-current': rotaAtual === item.rota ? 'page' : null,
        onclick: closeDrawer
      }, [icon(item.icone), h('span', { text: item.rotulo })]);
    }));

    lista.appendChild(h('div', { class: 'drawer__sep' }));
    lista.appendChild(h('button', {
      class: 'drawer__item', type: 'button',
      onclick: function () { MPRO.store.toggleTheme(); renderDrawer(rotaAtual); }
    }, [
      icon(MPRO.store.theme === 'escuro' ? 'light_mode' : 'dark_mode'),
      h('span', { text: MPRO.store.theme === 'escuro' ? 'Tema claro' : 'Tema escuro' })
    ]));

    drawer.appendChild(lista);
    drawer.appendChild(h('div', { class: 'drawer__foot' }, [
      h('button', {
        class: 'drawer__item', type: 'button', style: 'color:var(--error);font-weight:700',
        onclick: function () { closeDrawer(); sairSheet(); }
      }, [icon('logout'), h('span', { text: 'Sair' })])
    ]));
  }

  function sairSheet() {
    confirmSheet({
      titulo: 'Sair da conta',
      texto: 'Seus rascunhos continuam salvos neste aparelho e estarão disponíveis no próximo acesso.',
      confirmar: 'Sair',
      onConfirm: function () {
        MPRO.store.logout();
        location.hash = '#/login';
      }
    });
  }

  function renderBottomNav(chaveAtiva) {
    var nav = document.getElementById('bottomnav');
    nav.innerHTML = '';
    nav.className = 'bottomnav bottomnav--hidden-desktop';
    DESTINOS.forEach(function (destino) {
      nav.appendChild(h('a', {
        class: 'navitem',
        href: destino.rota,
        'aria-current': destino.chave === chaveAtiva ? 'page' : null
      }, [icon(destino.icone), h('span', { text: destino.rotulo })]));
    });
  }

  function renderRail(chaveAtiva) {
    var rail = document.getElementById('rail');
    var user = MPRO.store.user();
    rail.innerHTML = '';
    rail.appendChild(h('a', { class: 'rail__brand', href: '#/', 'aria-label': 'M-PRO — Início' }, [brand()]));
    RAIL_ITENS.forEach(function (item) {
      if (item.separador) { rail.appendChild(h('div', { class: 'rail__sep' })); return; }
      rail.appendChild(h('a', {
        class: 'rail__item',
        href: item.rota,
        'aria-current': item.chave === chaveAtiva ? 'page' : null
      }, [icon(item.icone), h('span', { text: item.rotulo })]));
    });
    rail.appendChild(h('a', { class: 'avatar rail__avatar', href: '#/perfil', text: user.iniciais, 'aria-label': 'Perfil' }));
  }

  return {
    h: h,
    icon: icon,
    brand: brand,
    status: status,
    statusTag: statusTag,
    formatDate: formatDate,
    formatSavedAt: formatSavedAt,
    todayLabel: todayLabel,
    greetingWord: greetingWord,
    dataRow: dataRow,
    section: section,
    skeletonRows: skeletonRows,
    emptyState: emptyState,
    errorState: errorState,
    snack: snack,
    openSheet: openSheet,
    closeSheet: closeSheet,
    confirmSheet: confirmSheet,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    renderDrawer: renderDrawer,
    renderBottomNav: renderBottomNav,
    renderRail: renderRail,
    destinos: DESTINOS
  };
})();
