(function () {
  'use strict';

  var root = 'stitch_monitoramento_mpro';
  var destinations = {
    dashboard: 'in_cio_dashboard_refinado',
    login: 'login_m_pro_fundo_planta_o',
    register: 'registro_m_pro_fundo_floresta',
    clients: 'clientes',
    map: 'mapa_de_clientes_e_planta_es',
    visit: 'nova_visita_formul_rio',
    evidence: 'evid_ncias_multim_dia',
    photos: 'registro_fotogr_fico',
    transcription: 'transcri_o_e_estrutura_o',
    review: 'revis_o_e_finaliza_o',
    ai: 'assistente_ia_agron_mico',
    equipment: 'gest_o_de_equipamentos',
    profile: 'perfil_do_usu_rio',
    editProfile: 'editar_perfil',
    settings: 'configura_es_do_sistema'
  };

  // Destino de reserva para botões de voltar quando não há histórico (tela aberta direto).
  var BACK_FALLBACK = {};
  BACK_FALLBACK[destinations.editProfile] = 'profile';
  BACK_FALLBACK[destinations.photos] = 'evidence';
  BACK_FALLBACK[destinations.transcription] = 'evidence';

  function appRoot() {
    var path = window.location.pathname;
    var marker = '/' + root + '/';
    var index = path.indexOf(marker);
    if (index >= 0) return path.slice(0, index + marker.length);

    // The .bat serves this directory as the HTTP root, so the root name is
    // intentionally absent from the URL (for example /in_cio_dashboard_refinado/code.html).
    var parts = path.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[parts.length - 1] === 'code.html') {
      // Drop the screen folder + code.html. An empty prefix must stay '/', not
      // '//', or navigate() would build a protocol-relative URL (//screen/...).
      var prefix = parts.slice(0, -2).join('/');
      return prefix ? '/' + prefix + '/' : '/';
    }
    return '/';
  }

  function currentFolder() {
    var parts = window.location.pathname.split('/').filter(Boolean);
    var markerIndex = parts.indexOf(root);
    if (markerIndex >= 0) return parts[markerIndex + 1];
    // Servido como raiz pelo .bat: /<pasta-da-tela>/code.html
    if (parts.length >= 2 && parts[parts.length - 1] === 'code.html') return parts[parts.length - 2];
    return '';
  }

  function navigate(screen) {
    if (!destinations[screen]) return;
    window.location.href = appRoot() + destinations[screen] + '/code.html';
  }

  // Injeta o tema novo (tokens + fontes) o quanto antes, antes do primeiro paint,
  // e esconde os menus nativos antigos para reduzir o "flash de duas interfaces" no reload.
  (function injectThemeEarly() {
    try {
      var folder = currentFolder();
      if (document.getElementById('mpro-theme-css')) return;
      var link = document.createElement('link');
      link.id = 'mpro-theme-css';
      link.rel = 'stylesheet';
      link.href = appRoot() + 'mpro-theme.css';
      document.head.appendChild(link);

      var fontLinks = [
        'https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600;700;800&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap',
        'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=block'
      ];
      fontLinks.forEach(function (href) {
        var l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = href;
        document.head.appendChild(l);
      });

      try {
        var theme = localStorage.getItem('mpro_theme');
        if (theme === 'claro' || theme === 'escuro') document.documentElement.setAttribute('data-theme', theme);
      } catch (e) {}

      if (folder !== destinations.login && folder !== destinations.register) {
        var st = document.createElement('style');
        st.textContent = 'aside{display:none!important}' +
          'nav[class*="md:flex"][class*="w-8"],nav[class*="md:flex"][class*="w-7"],nav[class*="md:flex"][class*="w-6"]{display:none!important}';
        (document.head || document.documentElement).appendChild(st);
      }
    } catch (e) {}
  })();

  // ---------- Cliente de dados (API serverless /api sobre Neon) ----------
  var API = {
    request: function (path, opts) {
      opts = opts || {};
      var ctrl = new AbortController();
      var t = window.setTimeout(function () { ctrl.abort(); }, 7000);
      return fetch('/api/' + path, {
        method: opts.method || 'GET',
        headers: opts.body ? { 'content-type': 'application/json' } : undefined,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: ctrl.signal
      }).then(function (r) {
        window.clearTimeout(t);
        return r.text().then(function (txt) {
          var data = txt ? JSON.parse(txt) : null;
          if (!r.ok) throw Object.assign(new Error((data && data.error) || ('HTTP ' + r.status)), { status: r.status, data: data });
          return data;
        });
      }).catch(function (e) { window.clearTimeout(t); throw e; });
    },
    get: function (path) { return API.request(path); },
    post: function (path, body) { return API.request(path, { method: 'POST', body: body }); },
    patch: function (path, body) { return API.request(path, { method: 'PATCH', body: body }); },
    del: function (path) { return API.request(path, { method: 'DELETE' }); }
  };
  window.MPRO = { api: API, navigate: navigate, toast: null };

  function fieldValue(scope, selector) {
    var el = scope.querySelector(selector);
    return el ? (el.value || '').trim() : '';
  }
  function textInputs(scope) {
    return Array.prototype.slice.call(scope.querySelectorAll('input[type="text"], input:not([type])'));
  }
  function escHtml(t) {
    return (t == null ? '' : String(t)).replace(/[&<>"]/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m];
    });
  }
  function fmtDate(d) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || '');
    return m ? m[3] + '/' + m[2] + '/' + m[1] : (d || '');
  }
  var STATUS_META = {
    adequado: { label: 'Adequado', icon: 'check_circle' },
    monitorar: { label: 'Monitorar', icon: 'warning' },
    corrigir: { label: 'Corrigir', icon: 'error' }
  };

  function textOf(element) {
    var icon = element.querySelector('.material-symbols-outlined');
    return ((element.innerText || element.getAttribute('aria-label') || '') + ' ' +
      (icon ? icon.textContent : '')).toLowerCase();
  }

  function destinationFor(label) {
    if (/nova visita|iniciar visita|iniciar relat|criar visita|visita t/.test(label)) return 'visit';
    if (/^mapa$|\bmapa\b/.test(label)) return 'map';
    if (/cliente|fazenda|talh[aã]o/.test(label)) return 'clients';
    if (/assistente|intelig[eê]ncia|perguntar|chat/.test(label)) return 'ai';
    if (/evid[eê]ncia|m[ií]dia|upload/.test(label)) return 'evidence';
    if (/registro fotogr/.test(label)) return 'photos';
    if (/transcr|estrutur/.test(label)) return 'transcription';
    if (/revis|finaliz|gerar pdf|publicar/.test(label)) return 'review';
    if (/equipamento|sensor/.test(label)) return 'equipment';
    if (/configura/.test(label)) return 'settings';
    if (/editar perfil/.test(label)) return 'editProfile';
    if (/perfil|account_circle|person$/.test(label)) return 'profile';
    if (/sair|logout/.test(label)) return 'login';
    if (/criar conta|cadastre-se|registro/.test(label)) return 'register';
    if (/voltar para o login|login|entrar|google/.test(label)) return 'login';
    if (/dashboard|in[ií]cio|home|relat[oó]rio|m-pro/.test(label)) return 'dashboard';
    return null;
  }

  function showToast(message) {
    var toast = document.getElementById('mpro-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'mpro-toast';
      toast.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:100;background:var(--primary,#002d1d);color:#fff;padding:12px 18px;border-radius:999px;font:600 14px var(--font-body,Inter,sans-serif);box-shadow:0 8px 24px rgba(0,0,0,.22);transition:opacity .2s';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(function () { toast.style.opacity = '0'; }, 2400);
  }

  // API indisponível (404/rede/timeout) → modo protótipo. 401/409 são respostas reais.
  function apiIndisponivel(e) {
    return !e || e.status === undefined || e.status === 404 || e.status === 405 || e.status >= 500;
  }

  function submitLogin(form) {
    var senha = fieldValue(form, 'input[type="password"]');
    var email = (fieldValue(form, 'input[type="email"]') || (textInputs(form)[0] && textInputs(form)[0].value) || '').trim();
    if (!email || !senha) { showToast('Informe e-mail e senha.'); return; }
    showToast('Entrando…');
    API.post('auth?action=login', { email: email, senha: senha }).then(function (user) {
      try {
        localStorage.setItem('mpro_session', JSON.stringify({ name: user.nome, email: user.email }));
        if (readMode() !== 'clean') localStorage.setItem('mpro_mode', 'user');
      } catch (e) {}
      showToast('Bem-vindo, ' + (user.nome || email) + '.');
      navigate('dashboard');
    }).catch(function (e) {
      if (apiIndisponivel(e)) { navigate('dashboard'); return; } // sem back-end: fluxo do protótipo
      showToast(e.status === 401 ? 'E-mail ou senha inválidos.' : (e.message || 'Falha ao entrar.'));
    });
  }

  function submitRegister(form) {
    var ins = textInputs(form);
    var payload = {
      nome: (ins[0] && ins[0].value || '').trim(),
      empresa: (ins[1] && ins[1].value || '').trim(),
      email: fieldValue(form, 'input[type="email"]'),
      senha: fieldValue(form, 'input[type="password"]')
    };
    if (!payload.email || !payload.senha) { showToast('Preencha e-mail e senha.'); return; }
    showToast('Criando conta…');
    // Conta nova → entra direto no app, em modo limpo (HUD sem dados de teste).
    function entraLimpo(user) {
      try {
        localStorage.setItem('mpro_mode', 'clean');
        localStorage.setItem('mpro_session', JSON.stringify({ name: (user && user.nome) || payload.nome || payload.email, email: payload.email }));
      } catch (e) {}
      navigate('dashboard');
    }
    API.post('auth?action=register', payload).then(function (user) {
      showToast('Conta criada. Bem-vindo!');
      entraLimpo(user);
    }).catch(function (e) {
      if (apiIndisponivel(e)) { showToast('Conta criada (offline).'); entraLimpo(null); return; }
      showToast(e.status === 409 ? 'E-mail já cadastrado. Faça login.' : (e.message || 'Falha ao criar conta.'));
    });
  }

  function bindFormFeedback() {
    document.querySelectorAll('form').forEach(function (form) {
      if (form.dataset.mproOwnSubmit) return; // formulários das telas novas (ex.: sheet de cliente) se cuidam sozinhos
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var folder = currentFolder();
        var body = document.body.innerText.toLowerCase();
        if (folder === destinations.register || /criar conta|nome completo/.test((form.innerText || '').toLowerCase())) {
          submitRegister(form);
        } else if (folder === destinations.login || (/login|entrar/.test(body) && form.querySelector('input[type="password"]'))) {
          submitLogin(form);
        } else {
          showToast('Alterações salvas no protótipo.');
        }
      });
    });
  }

  function bindPrototypeInteractions() {
    document.querySelectorAll('input[type="password"]').forEach(function (input) {
      var wrapper = input.parentElement;
      var toggle = wrapper && wrapper.querySelector('button');
      if (!toggle) toggle = wrapper && wrapper.querySelector('svg') && wrapper.querySelector('svg').parentElement;
      if (!toggle || toggle.dataset.mproBound) return;
      toggle.dataset.mproBound = '1';
      toggle.addEventListener('click', function () {
        input.type = input.type === 'password' ? 'text' : 'password';
        showToast(input.type === 'text' ? 'Senha visível' : 'Senha protegida');
      });
    });

    var chat = document.getElementById('chat-container');
    var prompt = document.querySelector('textarea[placeholder*="pergunta"], textarea[placeholder*="Pergunta"]');
    var send = document.getElementById('send-btn');
    if (chat && prompt && send) {
      send.addEventListener('click', function () {
        var value = prompt.value.trim();
        if (!value) return showToast('Digite uma pergunta primeiro.');
        var user = document.createElement('div');
        user.className = 'self-end max-w-[85%] rounded-2xl rounded-br-md bg-secondary-container px-4 py-3 text-on-secondary-container';
        user.textContent = value;
        chat.appendChild(user);
        prompt.value = '';
        var answer = document.createElement('div');
        answer.className = 'max-w-[90%] rounded-2xl rounded-bl-md bg-surface-container-low px-4 py-3 text-on-surface';
        answer.innerHTML = '<strong>Assistente M-PRO</strong><br><span>Resposta demonstrativa do protótipo. A resposta final será baseada nos relatórios e evidências do cliente selecionado.</span>';
        window.setTimeout(function () { chat.appendChild(answer); chat.scrollTop = chat.scrollHeight; }, 350);
      });
    }

    document.querySelectorAll('button').forEach(function (button) {
      if (button.closest('[data-action],[data-close],.mpro-sheet,.mpro-header')) return;
      var label = textOf(button);
      if (/fotos|v[ií]deos|[aá]udios|transcri/.test(label)) {
        button.addEventListener('click', function () {
          button.parentElement && button.parentElement.querySelectorAll('button').forEach(function (sibling) {
            sibling.classList.remove('text-primary', 'border-primary', 'font-semibold');
          });
          button.classList.add('text-primary', 'border-primary', 'font-semibold');
          showToast('Filtro aplicado: ' + button.innerText.trim());
        });
      }
      if (/salvar|guardar|aplicar|confirmar/.test(label)) {
        button.addEventListener('click', function () {
          var f = currentFolder();
          if (f === destinations.transcription && /confirmar/.test(label)) {
            return navigate('review');
          }
          showToast('Alterações salvas no protótipo.');
        });
      }
    });
  }

  function readMode() { try { return localStorage.getItem('mpro_mode') || ''; } catch (e) { return ''; } }
  function readSession() { try { return JSON.parse(localStorage.getItem('mpro_session') || 'null'); } catch (e) { return null; } }
  function logout() {
    try { ['mpro_mode', 'mpro_session', 'mpro_cliente_sel'].forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    navigate('login');
  }
  // Dono dos dados (escopo por usuário): e-mail da sessão; demo usa a conta de demonstração.
  function currentOwner() {
    var s = readSession();
    if (s && s.email) return s.email;
    return readMode() === 'demo' ? 'demo@mpro.app' : '';
  }
  function initials(name) {
    var parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'MP';
    return (parts[0][0] + (parts[1] ? parts[1][0] : parts[0][1] || '')).toUpperCase();
  }

  // ---------- Shell: header (reskin), drawer, bottom-nav + FAB, rail de desktop ----------
  function setupShell() {
    var folder = currentFolder();
    if (folder === destinations.login || folder === destinations.register) return;
    document.body.classList.add('mpro-shell-body', 'mpro-has-shell');

    // Esconde qualquer menu/drawer nativo remanescente das telas antigas (Stitch),
    // para existir um único sistema de navegação em todas as telas.
    ['navigation-drawer', 'drawer-overlay'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.style.display = 'none';
    });
    Array.prototype.forEach.call(document.querySelectorAll('aside'), function (a) { a.style.display = 'none'; });
    Array.prototype.forEach.call(document.querySelectorAll('nav'), function (n) {
      if (n.classList.contains('mpro-bottomnav') || n.classList.contains('mpro-rail')) return;
      var c = n.getAttribute('class') || '';
      if (/md:flex/.test(c) && /w-(56|60|64|72|80)/.test(c)) n.style.display = 'none';
    });
    // Telas novas já trazem o botão de menu embutido no próprio header (.mpro-header) —
    // nesse caso ele é religado ao drawer abaixo, sem duplicar com o botão flutuante.
    var headerMenuBtn = null;
    Array.prototype.forEach.call(document.querySelectorAll('.mpro-header button, .mpro-header a'), function (b) {
      var s = b.querySelector && b.querySelector('.material-symbols-outlined');
      if (s && s.textContent.trim() === 'menu') headerMenuBtn = b;
    });
    Array.prototype.forEach.call(document.querySelectorAll('button, a'), function (b) {
      if (b.closest('.mpro-header')) return; // tratado acima
      var s = b.querySelector && b.querySelector('.material-symbols-outlined');
      if (s && s.textContent.trim() === 'menu') b.style.display = 'none';
    });
    // Centraliza a marca do header (h1/h2/div) entre o menu e a conta, sem ficar sob o botão.
    Array.prototype.forEach.call(document.querySelectorAll('header'), function (hdr) {
      Array.prototype.forEach.call(hdr.children, function (ch) {
        if (ch.tagName !== 'BUTTON' && (ch.textContent || '').trim()) {
          ch.style.flex = '1';
          ch.style.textAlign = 'center';
          ch.style.margin = '0';
        }
      });
    });

    var mode = readMode(), sess = readSession();
    var subtitle = mode === 'demo' ? 'Conta demonstração' : mode === 'clean' ? 'Conta nova' : 'Monitoramento agronômico';
    var name = (sess && (sess.name || sess.email)) || 'Técnico de campo';
    var email = (sess && sess.email) || '';

    // ---- Drawer (itens secundários; navegação principal fica no bottom-nav/rail) ----
    var drawerItems = [
      { icon: 'folder_open', text: 'Evidências', screen: 'evidence' },
      { icon: 'photo_camera', text: 'Registro fotográfico', screen: 'photos' },
      { icon: 'graphic_eq', text: 'Transcrição', screen: 'transcription' },
      { icon: 'fact_check', text: 'Revisão e finalização', screen: 'review' },
      { icon: 'precision_manufacturing', text: 'Equipamentos', screen: 'equipment' },
      { icon: 'smart_toy', text: 'Assistente IA', screen: 'ai' },
      { sep: true },
      { icon: 'person', text: 'Perfil', screen: 'profile' },
      { icon: 'manage_accounts', text: 'Editar perfil', screen: 'editProfile' },
      { icon: 'settings', text: 'Configurações', screen: 'settings' }
    ];
    var overlay = document.createElement('div');
    overlay.className = 'mpro-drawer-overlay';
    var drawer = document.createElement('nav');
    drawer.className = 'mpro-drawer';
    drawer.innerHTML =
      '<div class="mpro-drawer-head">' +
      '<div class="mpro-drawer-user">' +
      '<div class="mpro-drawer-avatar">' + escHtml(initials(name)) + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:1px;min-width:0;flex:1">' +
      '<span class="mpro-drawer-name">' + escHtml(name) + '</span>' +
      (email ? '<span class="mpro-drawer-email">' + escHtml(email) + '</span>' : '') + '</div>' +
      '<button type="button" class="mpro-drawer-close" data-close="1" aria-label="Fechar"><span class="material-symbols-outlined">close</span></button>' +
      '</div><span class="mpro-drawer-badge">' + escHtml(subtitle.toUpperCase()) + '</span></div>' +
      '<div class="mpro-drawer-nav">' + drawerItems.map(function (it) {
        if (it.sep) return '<div class="mpro-drawer-sep"></div>';
        var active = destinations[it.screen] === folder;
        return '<a href="#" class="mpro-drawer-link' + (active ? ' active' : '') + '" data-screen="' + it.screen + '">' +
          '<span class="material-symbols-outlined">' + it.icon + '</span>' + it.text + '</a>';
      }).join('') + '</div>' +
      '<div class="mpro-drawer-foot"><a href="#" class="mpro-drawer-link logout" data-screen="login">' +
      '<span class="material-symbols-outlined">logout</span>Sair</a></div>';

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    function toggleDrawer(open) {
      var willOpen = open === undefined ? !drawer.classList.contains('open') : open;
      drawer.classList.toggle('open', willOpen);
      overlay.classList.toggle('open', willOpen);
      document.body.classList.toggle('overflow-hidden', willOpen);
    }
    overlay.addEventListener('click', function () { toggleDrawer(false); });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) { e.preventDefault(); return toggleDrawer(false); }
      var link = e.target.closest('a[data-screen]');
      if (!link) return;
      e.preventDefault();
      toggleDrawer(false);
      var scr = link.getAttribute('data-screen');
      if (scr === 'login') return logout();
      navigate(scr);
    });

    // Botão que abre o drawer: reaproveita o botão do header nas telas novas; nas
    // telas antigas (Stitch), cria um botão flutuante único, igual em todas.
    if (headerMenuBtn) {
      headerMenuBtn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); toggleDrawer(true); });
    } else {
      var hasBack = Array.prototype.some.call(document.querySelectorAll('button, a'), function (b) {
        var s = b.querySelector && b.querySelector('.material-symbols-outlined');
        return s && /arrow_back/.test(s.textContent.trim()) && !b.closest('.mpro-drawer');
      });
      var menuBtn = document.createElement('button');
      menuBtn.className = 'mpro-menu-btn';
      menuBtn.type = 'button';
      menuBtn.setAttribute('aria-label', 'Abrir menu');
      menuBtn.innerHTML = '<span class="material-symbols-outlined">menu</span>';
      menuBtn.style.cssText = 'position:fixed;top:12px;left:' + (hasBack ? '60px' : '12px') +
        ';z-index:59;width:44px;height:44px;border-radius:12px;border:none;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.28);cursor:pointer';
      menuBtn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); toggleDrawer(true); });
      document.body.appendChild(menuBtn);
    }

    // ---- Bottom-nav (mobile) + FAB ----
    var navItems = [
      { icon: 'home', text: 'Início', screen: 'dashboard' },
      { icon: 'groups', text: 'Clientes', screen: 'clients' },
      { icon: 'map', text: 'Mapa', screen: 'map' },
      { icon: 'assignment', text: 'Visitas', screen: 'visit' }
    ];
    var bottomNav = document.createElement('nav');
    bottomNav.className = 'mpro-bottomnav';
    bottomNav.innerHTML = navItems.map(function (it) {
      var active = destinations[it.screen] === folder;
      return '<button type="button" class="mpro-nav-item' + (active ? ' active' : '') + '" data-screen="' + it.screen + '">' +
        '<span class="material-symbols-outlined">' + it.icon + '</span>' + it.text + '</button>';
    }).join('');
    document.body.appendChild(bottomNav);
    bottomNav.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-screen]');
      if (btn) navigate(btn.getAttribute('data-screen'));
    });

    if (folder !== destinations.visit) {
      var fab = document.createElement('button');
      fab.type = 'button';
      fab.className = 'mpro-fab';
      fab.innerHTML = '<span class="material-symbols-outlined">add</span>Nova visita';
      fab.addEventListener('click', function () { navigate('visit'); });
      document.body.appendChild(fab);
    }

    // ---- Rail (desktop, ≥900px): substitui bottom-nav + botão de menu ----
    var railItems = navItems.concat([
      { icon: 'precision_manufacturing', text: 'Equip.', screen: 'equipment' },
      { icon: 'smart_toy', text: 'IA', screen: 'ai' }
    ]);
    var rail = document.createElement('nav');
    rail.className = 'mpro-rail';
    rail.innerHTML = '<div class="mpro-rail-brand">M-PRO</div>' +
      railItems.map(function (it, i) {
        var active = destinations[it.screen] === folder;
        var sep = i === 3 ? '<div class="mpro-rail-sep"></div>' : '';
        return sep + '<button type="button" class="mpro-rail-item' + (active ? ' active' : '') + '" data-screen="' + it.screen + '">' +
          '<span class="material-symbols-outlined">' + it.icon + '</span>' + it.text + '</button>';
      }).join('') +
      '<button type="button" class="mpro-rail-avatar" data-open-drawer="1" aria-label="Conta">' + escHtml(initials(name)) + '</button>';
    document.body.appendChild(rail);
    rail.addEventListener('click', function (e) {
      if (e.target.closest('[data-open-drawer]')) return toggleDrawer(true);
      var btn = e.target.closest('[data-screen]');
      if (btn) navigate(btn.getAttribute('data-screen'));
    });
  }

  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-action],[data-close],.mpro-sheet')) return; // telas novas cuidam da própria interação
    var control = event.target.closest('a,button,[role="button"],.cursor-pointer');
    if (!control || control.closest('.mpro-drawer,.mpro-bottomnav,.mpro-rail,.mpro-menu-btn,.mpro-header')) return;
    var label = textOf(control);
    var folder = currentFolder();
    // Login com Google → entra na conta de demonstração (dados de teste).
    if (folder === destinations.login && /continuar com google/.test(label)) {
      event.preventDefault();
      try {
        localStorage.setItem('mpro_mode', 'demo');
        localStorage.setItem('mpro_session', JSON.stringify({ name: 'Conta demonstração', email: 'demo@mpro.app', demo: true }));
      } catch (e) {}
      return navigate('dashboard');
    }
    // Botões de submit dentro de <form> são tratados pelo handler de submit (login/cadastro reais).
    if (control.tagName === 'BUTTON' && control.form && (control.type === 'submit' || control.type === '')) return;
    var destination = destinationFor(label);
    var isCard = control.getAttribute('role') === 'button' || /(^|\s)cursor-pointer(\s|$)/.test(control.className || '');
    if (folder === destinations.transcription && /descartar/.test(label)) destination = 'evidence';
    if (folder === destinations.transcription && /confirmar|integrar/.test(label)) destination = 'review';
    if (folder === destinations.review) {
      if (/gerar|pdf|publicar/.test(label)) {
        event.preventDefault();
        return showToast('Relatório PDF gerado no protótipo.');
      }
      if (/editar dados/.test(label)) destination = 'visit';
    }
    if (folder === destinations.login && /esqueci/.test(label)) {
      event.preventDefault();
      return showToast('Recuperação de senha disponível no app final.');
    }
    // Botões de voltar/cancelar: volta no histórico, com destino de reserva.
    if (!destination && /arrow_back|(^|\s)voltar(\s|$)|(^|\s)cancelar(\s|$)/.test(label)) {
      event.preventDefault();
      if (window.history.length > 1) return window.history.back();
      return navigate(BACK_FALLBACK[folder] || 'dashboard');
    }
    if (destination === 'login' && /(^|\s)sair(\s|$)|logout/.test(label)) {
      event.preventDefault();
      return logout();
    }
    if (destination && (control.getAttribute('href') === '#' || control.tagName === 'BUTTON' || isCard)) {
      event.preventDefault();
      navigate(destination);
    } else if (control.getAttribute('href') === '#') {
      event.preventDefault();
      showToast('Ação disponível no próximo fluxo do protótipo.');
    }
  });

  // ---------- Dashboard: dados reais (por dono) ----------
  function setupDashboard() {
    if (currentFolder() !== destinations.dashboard) return;
    var owner = currentOwner();
    var sess = readSession(), mode = readMode();
    var firstName = ((sess && sess.name) || '').trim().split(/\s+/)[0];

    var greetEl = document.querySelector('[data-role="dashboard-greeting"]');
    if (greetEl) greetEl.textContent = (mode === 'clean' ? 'Bem-vindo' : 'Bom dia') + (firstName ? ', ' + firstName : '');
    var dateEl = document.querySelector('[data-role="dashboard-date"]');
    if (dateEl) {
      var d = new Date();
      var dias = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
      var dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0');
      dateEl.textContent = dias[d.getDay()] + ' · ' + dd + '/' + mm + '/' + d.getFullYear() + (mode === 'clean' ? ' · CONTA NOVA' : '');
    }

    Promise.all([
      API.get('visitas?owner=' + encodeURIComponent(owner)).catch(function () { return null; }),
      API.get('clientes?owner=' + encodeURIComponent(owner)).catch(function () { return null; })
    ]).then(function (res) {
      var erro = res[0] === null && res[1] === null;
      var visitas = res[0] || [], clientes = res[1] || [];
      var nome = {}; clientes.forEach(function (c) { nome[c.id] = c.nome; });
      var finalizadas = visitas.filter(function (v) { return v.status === 'finalizado'; });
      var rascunhos = visitas.filter(function (v) { return v.status === 'rascunho'; });

      var statEl = document.querySelector('[data-role="dashboard-stats"]');
      if (statEl) {
        var corrigirCount = finalizadas.filter(function (v) { return v.situacao === 'corrigir'; }).length;
        statEl.innerHTML =
          statNum(visitas.length, 'visitas<br>no mês') +
          statNum(clientes.length, 'clientes<br>ativos') +
          statNum(corrigirCount, 'laudos a<br>finalizar', corrigirCount > 0);
      }

      var draftBadge = document.querySelector('[data-role="dashboard-draft-badge"]');
      if (draftBadge) draftBadge.textContent = rascunhos.length + ' PENDENTE' + (rascunhos.length === 1 ? '' : 'S');
      var draftList = document.querySelector('[data-role="dashboard-drafts"]');
      if (draftList) {
        if (erro) {
          draftList.innerHTML = errorRow('Não foi possível carregar os rascunhos.');
        } else if (!rascunhos.length) {
          draftList.innerHTML = '<div class="mpro-empty"><span class="material-symbols-outlined">edit_note</span>' +
            '<div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:600">Nenhum rascunho</span>' +
            '<span style="font-size:13px;color:var(--on-surface-variant);line-height:1.4">Visitas iniciadas ficam aqui até você finalizar o laudo.</span></div></div>';
        } else {
          draftList.innerHTML = rascunhos.slice(0, 6).map(function (v) {
            return '<div class="mpro-list-row" data-go="visit" style="cursor:pointer">' +
              '<div style="width:4px;border-radius:2px;background:var(--monitorar);align-self:stretch;flex:none"></div>' +
              '<div style="flex:1;display:flex;flex-direction:column;gap:2px;min-width:0">' +
              '<span style="font-size:15px;font-weight:600;line-height:1.25">' + escHtml(nome[v.cliente_id] || 'Cliente') + '</span>' +
              '<span style="font-family:var(--font-mono);font-size:12px;color:var(--on-surface-variant)">salvo ' + escHtml(fmtDate(v.data_visita) || 'hoje') + '</span></div>' +
              '<span class="material-symbols-outlined" style="color:var(--outline);align-self:center">chevron_right</span></div>';
          }).join('');
          Array.prototype.forEach.call(draftList.querySelectorAll('[data-go]'), function (el) {
            el.addEventListener('click', function () { navigate('visit'); });
          });
        }
      }

      var recentList = document.querySelector('[data-role="dashboard-recent"]');
      if (recentList) {
        if (erro) {
          recentList.innerHTML = errorRow('Não foi possível carregar as visitas recentes.');
        } else if (!finalizadas.length) {
          recentList.innerHTML = '<span style="font-size:15px;line-height:1.45;color:var(--on-surface-variant)">Nenhuma visita registrada. A primeira aparece aqui com o status nutricional do laudo.</span>';
        } else {
          recentList.innerHTML = finalizadas.slice(0, 8).map(function (v) {
            var st = STATUS_META[v.situacao] || { label: v.situacao || '—', icon: 'remove' };
            return '<div class="mpro-list-row">' +
              '<div style="width:4px;border-radius:2px;background:var(--' + (v.situacao || 'outline') + ',var(--outline));align-self:stretch;flex:none"></div>' +
              '<div style="flex:1;display:flex;flex-direction:column;gap:3px;min-width:0">' +
              '<span style="font-size:15px;font-weight:600;line-height:1.2">' + escHtml(nome[v.cliente_id] || 'Cliente') + '</span>' +
              '<div style="display:flex;align-items:center;gap:8px"><span style="font-family:var(--font-mono);font-size:12px;color:var(--on-surface-variant)">' + escHtml(fmtDate(v.data_visita)) + '</span>' +
              '<span class="mpro-status ' + escHtml(v.situacao || '') + '"><span class="material-symbols-outlined">' + st.icon + '</span>' + st.label.toUpperCase() + '</span></div></div>' +
              '<a href="#" data-action="ver-visita" data-go="review" style="align-self:center;font-size:13px;font-weight:700;color:var(--secondary)">Ver</a></div>';
          }).join('');
          Array.prototype.forEach.call(recentList.querySelectorAll('[data-go]'), function (a) {
            a.addEventListener('click', function (e) { e.preventDefault(); navigate(a.getAttribute('data-go')); });
          });
        }
      }
    });

    function statNum(n, label, danger) {
      return '<div class="mpro-stat"><span style="font:800 36px/1 var(--font-display);letter-spacing:-.03em' +
        (danger ? ';color:var(--corrigir)' : '') + '">' + n + '</span>' +
        '<span style="font-size:12px;font-weight:500;color:var(--on-surface-variant);line-height:1.2">' + label + '</span></div>';
    }
    function errorRow(msg) {
      return '<div class="mpro-error-box"><div style="display:flex;gap:10px;align-items:flex-start">' +
        '<span class="material-symbols-outlined" style="color:var(--error)">error</span>' +
        '<span style="font-size:14px;color:var(--on-surface-variant)">' + escHtml(msg) + '</span></div>' +
        '<button type="button" class="mpro-btn-primary" data-retry="1" style="height:44px;font-size:14px">' +
        '<span class="material-symbols-outlined" style="font-size:18px">refresh</span>Tentar novamente</button></div>';
    }
    document.addEventListener('click', function (e) { if (e.target.closest('[data-retry]')) setupDashboard(); });
  }

  // ---------- Tela Clientes: lista real, busca, filtro por status, cadastro em bottom sheet ----------
  function statusColorVar(s) { return s === 'adequado' ? 'var(--adequado)' : s === 'monitorar' ? 'var(--monitorar)' : s === 'corrigir' ? 'var(--corrigir)' : 'var(--outline)'; }

  function ultimaSituacaoPorCliente(visitas) {
    var out = {};
    (visitas || []).filter(function (v) { return v.status === 'finalizado'; }).forEach(function (v) {
      var atual = out[v.cliente_id];
      if (!atual || (v.data_visita || '') > atual.data) out[v.cliente_id] = { data: v.data_visita, situacao: v.situacao };
    });
    var map = {};
    Object.keys(out).forEach(function (k) { map[k] = out[k].situacao; });
    return map;
  }

  function setupClientesScreen() {
    if (currentFolder() !== destinations.clients) return;
    var listEl = document.querySelector('[data-role="clientes-list"]');
    var chipsEl = document.querySelector('[data-role="clientes-chips"]');
    var searchEl = document.querySelector('[data-role="clientes-search"]');
    if (!listEl) return;
    var todos = [], statusPorCliente = {}, filtroAtivo = 'todos';

    function card(c) {
      var situacao = statusPorCliente[c.id];
      var st = STATUS_META[situacao];
      return '<div class="mpro-list-row" data-cid="' + c.id + '" style="cursor:pointer">' +
        '<div style="width:4px;border-radius:2px;background:' + statusColorVar(situacao) + ';align-self:stretch;flex:none"></div>' +
        '<div style="flex:1;display:flex;flex-direction:column;gap:4px;min-width:0">' +
        '<span style="font-size:16px;font-weight:600;line-height:1.25;text-wrap:pretty">' + escHtml(c.nome) + '</span>' +
        '<span style="font-family:var(--font-mono);font-size:12px;color:var(--on-surface-variant)">' + escHtml(c.contato_email || c.contato_telefone || 'sem contato cadastrado') + '</span>' +
        (st ? '<span class="mpro-status ' + situacao + '"><span class="material-symbols-outlined">' + st.icon + '</span>' + st.label.toUpperCase() + '</span>' :
          '<span class="mpro-status" style="color:var(--on-surface-variant)"><span class="material-symbols-outlined">remove</span>SEM VISITA</span>') +
        '</div><span class="material-symbols-outlined" style="color:var(--outline);align-self:center">chevron_right</span></div>';
    }

    function render() {
      var q = ((searchEl && searchEl.value) || '').trim().toLowerCase();
      var list = todos.filter(function (c) {
        if (filtroAtivo !== 'todos' && statusPorCliente[c.id] !== filtroAtivo) return false;
        if (!q) return true;
        return (c.nome || '').toLowerCase().indexOf(q) >= 0 || (c.contato_email || '').toLowerCase().indexOf(q) >= 0;
      });
      if (!list.length) {
        listEl.innerHTML = '<div class="mpro-empty" style="margin:16px"><span class="material-symbols-outlined">group_off</span>' +
          '<div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:600">Nenhum cliente encontrado</span>' +
          '<span style="font-size:13px;color:var(--on-surface-variant)">' + (q || filtroAtivo !== 'todos' ? 'Ajuste a busca ou o filtro.' : 'Cadastre o primeiro cliente com o botão acima.') + '</span></div></div>';
        return;
      }
      listEl.innerHTML = list.map(card).join('');
      Array.prototype.forEach.call(listEl.querySelectorAll('[data-cid]'), function (row) {
        row.addEventListener('click', function () {
          try { localStorage.setItem('mpro_cliente_sel', row.getAttribute('data-cid')); } catch (e) {}
          navigate('visit');
        });
      });
    }

    function renderChips() {
      if (!chipsEl) return;
      var counts = { todos: todos.length, adequado: 0, monitorar: 0, corrigir: 0 };
      todos.forEach(function (c) { var s = statusPorCliente[c.id]; if (s && counts[s] != null) counts[s]++; });
      var defs = [
        { key: 'todos', label: null },
        { key: 'adequado', label: 'Adequado' },
        { key: 'monitorar', label: 'Monitorar' },
        { key: 'corrigir', label: 'Corrigir' }
      ];
      chipsEl.innerHTML = defs.map(function (d) {
        var active = filtroAtivo === d.key;
        var dot = d.key === 'todos' ? '' : '<span style="width:8px;height:8px;border-radius:50%;background:' + statusColorVar(d.key) + '"></span>';
        return '<button type="button" class="mpro-chip' + (active ? ' active' : '') + '" data-filter="' + d.key + '">' +
          dot + (d.label || '') + ' <span style="font-family:var(--font-mono);font-size:12px;opacity:.75">' + counts[d.key] + '</span></button>';
      }).join('');
      Array.prototype.forEach.call(chipsEl.querySelectorAll('[data-filter]'), function (b) {
        b.addEventListener('click', function () { filtroAtivo = b.getAttribute('data-filter'); renderChips(); render(); });
      });
    }

    function carregar() {
      var owner = currentOwner();
      Promise.all([
        API.get('clientes?owner=' + encodeURIComponent(owner)),
        API.get('visitas?owner=' + encodeURIComponent(owner)).catch(function () { return []; })
      ]).then(function (res) {
        todos = res[0] || [];
        statusPorCliente = ultimaSituacaoPorCliente(res[1]);
        renderChips(); render();
      }).catch(function () {
        listEl.innerHTML = '<div class="mpro-error-box" style="margin:16px"><span style="font-size:14px;color:var(--on-surface-variant)">Clientes indisponíveis (sem conexão com a API).</span></div>';
      });
    }
    carregar();
    if (searchEl) searchEl.addEventListener('input', render);

    // ---- Bottom sheet: novo cliente ----
    var sheet = document.querySelector('[data-role="clientes-sheet"]');
    var backdrop = document.querySelector('[data-role="clientes-sheet-backdrop"]');
    function openSheet(open) {
      if (!sheet || !backdrop) return;
      sheet.classList.toggle('open', open);
      backdrop.classList.toggle('open', open);
      if (open) { var f = sheet.querySelector('input'); if (f) window.setTimeout(function () { f.focus(); }, 200); }
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-action="novo-cliente"]'), function (b) {
      b.addEventListener('click', function () { openSheet(true); });
    });
    if (backdrop) backdrop.addEventListener('click', function () { openSheet(false); });
    if (sheet) {
      sheet.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) openSheet(false); });
      var form = sheet.querySelector('form');
      if (form) {
        form.dataset.mproOwnSubmit = '1';
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var nome = fieldValue(form, '[name="nome"]');
          if (!nome) { showToast('Informe o nome do cliente.'); return; }
          var payload = {
            nome: nome,
            documento: fieldValue(form, '[name="documento"]'),
            contato_email: fieldValue(form, '[name="email"]'),
            contato_telefone: fieldValue(form, '[name="telefone"]'),
            owner: currentOwner()
          };
          var municipio = fieldValue(form, '[name="municipio"]'), uf = fieldValue(form, '[name="uf"]');
          if (municipio || uf) payload.nome = payload.nome; // município/UF ficam para a propriedade (fora do escopo deste formulário rápido)
          API.post('clientes', payload).then(function () {
            showToast('Cliente cadastrado.');
            form.reset();
            openSheet(false);
            carregar();
          }).catch(function (err) {
            if (apiIndisponivel(err)) { showToast('Cliente salvo (offline).'); form.reset(); openSheet(false); return; }
            showToast(err.message || 'Falha ao cadastrar cliente.');
          });
        });
      }
    }
  }

  // ---------- Tela Mapa: marcadores por status + sheet do cliente ----------
  function hashPercent(id, salt) {
    var s = String(id) + salt, h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return 15 + (h % 71); // 15%–85%, evita colar nas bordas
  }
  var MAP_BOUNDS = { latMin: -20, latMax: -14, lonMin: -50, lonMax: -44 };
  function posicaoNoMapa(prop, clienteId) {
    var lat = prop && prop.latitude != null ? Number(prop.latitude) : null;
    var lon = prop && prop.longitude != null ? Number(prop.longitude) : null;
    if (lat != null && lon != null && !isNaN(lat) && !isNaN(lon)) {
      var x = ((lon - MAP_BOUNDS.lonMin) / (MAP_BOUNDS.lonMax - MAP_BOUNDS.lonMin)) * 100;
      var y = ((MAP_BOUNDS.latMax - lat) / (MAP_BOUNDS.latMax - MAP_BOUNDS.latMin)) * 100;
      return { x: Math.max(6, Math.min(94, x)), y: Math.max(10, Math.min(90, y)), real: true };
    }
    return { x: hashPercent(clienteId, 'x'), y: hashPercent(clienteId, 'y'), real: false };
  }

  function setupMapaScreen() {
    if (currentFolder() !== destinations.map) return;
    var canvas = document.querySelector('[data-role="mapa-canvas"]');
    var countEl = document.querySelector('[data-role="mapa-count"]');
    var sheet = document.querySelector('[data-role="mapa-sheet"]');
    var backdrop = document.querySelector('[data-role="mapa-sheet-backdrop"]');
    if (!canvas) return;
    var owner = currentOwner();

    function abrirSheet(c, situacao) {
      if (!sheet || !backdrop) return;
      var st = STATUS_META[situacao];
      sheet.innerHTML =
        '<div class="mpro-sheet-handle"><span></span></div>' +
        '<div class="mpro-sheet-body">' +
        '<div style="display:flex;gap:12px;align-items:flex-start">' +
        '<div style="width:4px;align-self:stretch;border-radius:2px;background:' + statusColorVar(situacao) + ';flex:none"></div>' +
        '<div style="flex:1;display:flex;flex-direction:column;gap:4px">' +
        '<h3 style="margin:0;font:800 24px/1.05 var(--font-display);letter-spacing:-.01em">' + escHtml(c.nome) + '</h3>' +
        '<span style="font-family:var(--font-mono);font-size:12px;color:var(--on-surface-variant)">' + escHtml(c.contato_email || c.contato_telefone || 'sem contato') + '</span>' +
        (st ? '<span class="mpro-status ' + situacao + '"><span class="material-symbols-outlined">' + st.icon + '</span>' + st.label.toUpperCase() + '</span>' : '') +
        '</div><button type="button" class="mpro-header-btn" data-close="1" style="color:var(--on-surface-variant)"><span class="material-symbols-outlined">close</span></button>' +
        '</div>' +
        '<div style="display:flex;gap:8px;padding:16px 0 4px">' +
        '<button type="button" class="mpro-btn-secondary" style="flex:1" data-action="ver-detalhes">Ver detalhes</button>' +
        '<button type="button" class="mpro-btn-primary" style="flex:1.2" data-action="iniciar-visita" data-cid="' + c.id + '">' +
        '<span class="material-symbols-outlined">add</span>Iniciar visita</button></div></div>';
      sheet.classList.add('open'); backdrop.classList.add('open');
    }
    function fecharSheet() { if (sheet) sheet.classList.remove('open'); if (backdrop) backdrop.classList.remove('open'); }
    if (backdrop) backdrop.addEventListener('click', fecharSheet);
    if (sheet) sheet.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) return fecharSheet();
      var visitBtn = e.target.closest('[data-action="iniciar-visita"]');
      if (visitBtn) { try { localStorage.setItem('mpro_cliente_sel', visitBtn.getAttribute('data-cid')); } catch (er) {} return navigate('visit'); }
      if (e.target.closest('[data-action="ver-detalhes"]')) showToast('Detalhes completos do cliente no próximo fluxo do protótipo.');
    });

    Promise.all([
      API.get('clientes?owner=' + encodeURIComponent(owner)),
      API.get('visitas?owner=' + encodeURIComponent(owner)).catch(function () { return []; }),
      API.get('propriedades').catch(function () { return []; })
    ]).then(function (res) {
      var clientes = res[0] || [], statusPorCliente = ultimaSituacaoPorCliente(res[1]), propriedades = res[2] || [];
      var propPorCliente = {};
      propriedades.forEach(function (p) { if (!propPorCliente[p.cliente_id]) propPorCliente[p.cliente_id] = p; });
      if (countEl) countEl.textContent = clientes.length + ' cliente' + (clientes.length === 1 ? '' : 's');
      if (!clientes.length) {
        canvas.innerHTML += '<div class="mpro-empty" style="position:absolute;left:16px;right:16px;top:16px;background:var(--surface)">' +
          '<span class="material-symbols-outlined">location_off</span>' +
          '<div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:15px;font-weight:600">Nenhum cliente para mostrar</span>' +
          '<span style="font-size:13px;color:var(--on-surface-variant)">Cadastre um cliente na tela Clientes.</span></div></div>';
        return;
      }
      var pins = document.createElement('div');
      pins.style.cssText = 'position:absolute;inset:0';
      clientes.forEach(function (c) {
        var situacao = statusPorCliente[c.id];
        var pos = posicaoNoMapa(propPorCliente[c.id], c.id);
        var st = STATUS_META[situacao] || { label: 'Sem visita', icon: 'help' };
        var bg = situacao ? statusColorVar(situacao) : 'var(--outline)';
        var fg = situacao === 'monitorar' ? '#231400' : (situacao === 'adequado' ? '#08130c' : '#fff');
        var pin = document.createElement('button');
        pin.type = 'button';
        pin.setAttribute('data-cid', c.id);
        pin.setAttribute('data-action', 'abrir-cliente-mapa');
        pin.style.cssText = 'position:absolute;left:' + pos.x + '%;top:' + pos.y + '%;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;border:none;background:none;cursor:pointer;padding:0;filter:drop-shadow(0 4px 8px rgba(0,0,0,.3))';
        pin.innerHTML = '<span style="display:flex;align-items:center;gap:4px;height:32px;padding:0 10px;border-radius:999px;background:' + bg + ';color:' + fg + ';font-size:12px;font-weight:800;border:2px solid #fff;white-space:nowrap"><span class="material-symbols-outlined" style="font-size:16px">' + st.icon + '</span>' + escHtml(c.nome.split(' ')[0] === 'Fazenda' || c.nome.split(' ')[0] === 'Sítio' ? c.nome.split(' ').slice(0, 2).join(' ') : c.nome.split(' ')[0]) + '</span>' +
          '<span style="width:2px;height:8px;background:#fff"></span>';
        pin.addEventListener('click', function () { abrirSheet(c, situacao); });
        pins.appendChild(pin);
      });
      canvas.appendChild(pins);
    }).catch(function () {
      canvas.innerHTML += '<div class="mpro-error-box" style="position:absolute;left:16px;right:16px;top:16px;background:var(--surface)">' +
        '<span style="font-size:14px;color:var(--on-surface-variant)">Não foi possível carregar os clientes no mapa.</span></div>';
    });
  }

  // "Alterar Foto" (editar perfil): abre seletor de imagem e mostra a prévia no avatar.
  function setupEditProfile() {
    if (currentFolder() !== destinations.editProfile) return;
    var trig = Array.prototype.slice.call(document.querySelectorAll('.cursor-pointer, button, div, label')).filter(function (el) {
      var t = (el.textContent || '').trim();
      return /alterar foto/i.test(t) && t.length < 30;
    })[0];
    if (!trig) return;
    var input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.style.display = 'none';
    document.body.appendChild(input);
    trig.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); input.click(); });
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      var url = URL.createObjectURL(file);
      var img = document.querySelector('main img') || document.querySelector('img');
      if (img) { img.src = url; return showToast('Foto atualizada (prévia).'); }
      var bg = document.querySelector('[style*="background-image"]');
      if (bg) { bg.style.backgroundImage = "url('" + url + "')"; return showToast('Foto atualizada (prévia).'); }
      showToast('Foto selecionada (prévia).');
    });
  }

  // Equipamentos: lista real (por dono) + filtros por status com contagem viva.
  function setupEquipamentos() {
    if (currentFolder() !== destinations.equipment) return;
    var grid = document.querySelector('[class*="xl:grid-cols-3"]') ||
      document.querySelector('[class*="md:grid-cols-2"]');
    if (!grid) return;
    var ST = {
      adequado: { label: 'Adequado', bg: '#e0f2e6', fg: '#1e7a44' },
      monitorar: { label: 'Monitorar', bg: '#fdf1d6', fg: '#9a6a05' },
      manutencao: { label: 'Manutenção', bg: '#fde3e0', fg: '#b3261e' }
    };
    function card(e) {
      var st = ST[e.status] || { label: e.status || '—', bg: '#eef3ef', fg: '#33453b' };
      return '<div class="mpro-eq-card" data-status="' + (e.status || '') + '" style="background:#fff;border:1px solid #e3ebe4;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:6px">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
        '<h3 style="font:700 15px Inter,sans-serif;color:#0b1f16;margin:0">' + escHtml(e.nome) + '</h3>' +
        '<span style="font:700 11px Inter,sans-serif;padding:3px 8px;border-radius:999px;white-space:nowrap;background:' + st.bg + ';color:' + st.fg + '">' + st.label + '</span></div>' +
        '<p style="font:500 12px Inter,sans-serif;color:#5b6b60;margin:0">' + escHtml(e.tipo || 'Equipamento') + '</p>' +
        '<p style="font:500 12px Inter,sans-serif;color:#5b6b60;margin:0">Próx. manutenção: ' + escHtml(fmtDate(e.proxima_manutencao) || '—') + '</p></div>';
    }
    var filtros = Array.prototype.slice.call(document.querySelectorAll('button')).filter(function (b) {
      return /todos|adequado|monitorar|manuten/i.test(b.innerText || '') && (b.innerText || '').length < 24;
    });
    var todos = [];
    function atualizaContagens() {
      var c = { adequado: 0, monitorar: 0, manutencao: 0 };
      todos.forEach(function (e) { if (c[e.status] != null) c[e.status]++; });
      filtros.forEach(function (b) {
        var t = (b.innerText || '').toLowerCase();
        var n = /todos/.test(t) ? todos.length : /adequado/.test(t) ? c.adequado : /monitorar/.test(t) ? c.monitorar : c.manutencao;
        b.innerHTML = b.innerHTML.replace(/\(\d+\)/, '(' + n + ')');
      });
    }
    function render(status) {
      var list = (!status || status === 'todos') ? todos : todos.filter(function (e) { return e.status === status; });
      if (!list.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;background:#fff;border:1px solid #e3ebe4;border-radius:12px;padding:22px;text-align:center;font:500 14px Inter,sans-serif;color:#5b6b60">Nenhum equipamento' + (status && status !== 'todos' ? ' neste status' : ' cadastrado') + '.</div>';
        return;
      }
      grid.innerHTML = list.map(card).join('');
    }
    filtros.forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var t = (b.innerText || '').toLowerCase();
        var status = /adequado/.test(t) ? 'adequado' : /monitorar/.test(t) ? 'monitorar' : /manuten/.test(t) ? 'manutencao' : 'todos';
        filtros.forEach(function (x) { x.style.opacity = '0.55'; });
        b.style.opacity = '1';
        render(status);
      });
    });
    API.get('equipamentos?owner=' + encodeURIComponent(currentOwner())).then(function (list) {
      todos = list || []; atualizaContagens(); render('todos');
    }).catch(function () {
      grid.innerHTML = '<div style="grid-column:1/-1;padding:22px;text-align:center;color:#5b6b60;font:500 14px Inter,sans-serif">Equipamentos indisponíveis.</div>';
    });
  }

  // ---------- Nova Visita: wizard de 2 etapas, ligado à API ----------
  function setupNovaVisita() {
    if (currentFolder() !== destinations.visit) return;
    var steps = Array.prototype.slice.call(document.querySelectorAll('[data-step]'));
    if (!steps.length) return;
    var stepIndex = 0;
    var owner = currentOwner();
    var estado = { cliente_id: null, clienteNome: '', unidade: '', cultura: '', responsavel: '', situacao: {}, medicoes: [] };

    var clienteSel = document.querySelector('[data-role="visita-cliente"]');
    if (clienteSel) {
      API.get('clientes?owner=' + encodeURIComponent(owner)).then(function (list) {
        list = list || [];
        if (!list.length) {
          clienteSel.innerHTML = '<option value="">Nenhum cliente — cadastre um antes</option>';
          return;
        }
        clienteSel.innerHTML = '<option value="">Selecionar cliente</option>' +
          list.map(function (c) { return '<option value="' + c.id + '">' + escHtml(c.nome) + '</option>'; }).join('');
        try {
          var pre = localStorage.getItem('mpro_cliente_sel');
          if (pre) { clienteSel.value = pre; localStorage.removeItem('mpro_cliente_sel'); }
        } catch (e) {}
      }).catch(function () { clienteSel.innerHTML = '<option value="">(indisponível offline)</option>'; });
    }

    Array.prototype.forEach.call(document.querySelectorAll('[data-role="visita-cultura"] [data-chip]'), function (chip) {
      chip.addEventListener('click', function () {
        Array.prototype.forEach.call(chip.parentElement.querySelectorAll('[data-chip]'), function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        estado.cultura = chip.getAttribute('data-chip');
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-role^="visita-situacao-"]'), function (group) {
      var bloco = group.getAttribute('data-role').replace('visita-situacao-', '');
      Array.prototype.forEach.call(group.querySelectorAll('[data-chip]'), function (chip) {
        chip.addEventListener('click', function () {
          var val = chip.getAttribute('data-chip');
          var already = chip.classList.contains('active');
          Array.prototype.forEach.call(group.querySelectorAll('[data-chip]'), function (c) {
            c.classList.remove('active'); c.style.background = ''; c.style.color = ''; c.style.borderColor = '';
          });
          if (!already) {
            chip.classList.add('active');
            var bg = val === 'adequado' ? 'var(--adequado)' : val === 'monitorar' ? 'var(--monitorar)' : 'var(--corrigir)';
            var fg = val === 'monitorar' ? '#231400' : val === 'adequado' ? '#08130c' : '#fff';
            chip.style.background = bg; chip.style.color = fg; chip.style.borderColor = bg;
            estado.situacao[bloco] = val;
          } else {
            delete estado.situacao[bloco];
          }
        });
      });
    });

    var medicoesList = document.querySelector('[data-role="visita-medicoes"]');
    var addMedicaoBtn = document.querySelector('[data-action="add-medicao"]');
    function renderMedicoes() {
      if (!medicoesList) return;
      medicoesList.innerHTML = estado.medicoes.map(function (m, i) {
        return '<div style="display:flex;align-items:center;gap:12px;border-top:1px solid var(--outline-variant);padding-top:8px">' +
          '<div style="width:4px;height:44px;border-radius:2px;background:var(--medicao);flex:none"></div>' +
          '<div style="flex:1;display:flex;flex-direction:column;gap:1px"><input placeholder="Rótulo (ex.: pressão de irrigação)" value="' + escHtml(m.rotulo) + '" data-med="rotulo" data-i="' + i + '" style="border:none;background:none;font-size:14px;font-weight:600;color:var(--on-surface);width:100%;padding:0" /></div>' +
          '<input placeholder="valor" value="' + escHtml(m.valor) + '" data-med="valor" data-i="' + i + '" style="width:56px;border:none;border-bottom:1px solid var(--outline-variant);background:none;font-family:var(--font-mono);font-size:16px;text-align:right;padding:2px" />' +
          '<input placeholder="un." value="' + escHtml(m.unidade) + '" data-med="unidade" data-i="' + i + '" style="width:44px;border:none;background:none;font-size:13px;color:var(--on-surface-variant)" />' +
          '<button type="button" data-remove-med="' + i + '" style="border:none;background:none;color:var(--outline);cursor:pointer"><span class="material-symbols-outlined">close</span></button></div>';
      }).join('');
      Array.prototype.forEach.call(medicoesList.querySelectorAll('[data-med]'), function (inp) {
        inp.addEventListener('input', function () {
          estado.medicoes[Number(inp.getAttribute('data-i'))][inp.getAttribute('data-med')] = inp.value;
        });
      });
      Array.prototype.forEach.call(medicoesList.querySelectorAll('[data-remove-med]'), function (b) {
        b.addEventListener('click', function () { estado.medicoes.splice(Number(b.getAttribute('data-remove-med')), 1); renderMedicoes(); });
      });
    }
    if (addMedicaoBtn) addMedicaoBtn.addEventListener('click', function () {
      estado.medicoes.push({ rotulo: '', valor: '', unidade: '' });
      renderMedicoes();
    });

    function showStep(i) {
      stepIndex = Math.max(0, Math.min(steps.length - 1, i));
      steps.forEach(function (s, idx) { s.style.display = idx === stepIndex ? 'flex' : 'none'; });
      var pct = Math.round(((stepIndex + 1) / steps.length) * 100);
      var bar = document.querySelector('[data-role="visita-progress-bar"]');
      var label = document.querySelector('[data-role="visita-progress-label"]');
      if (bar) bar.style.width = pct + '%';
      if (label) label.textContent = 'ETAPA ' + (stepIndex + 1) + ' DE ' + steps.length;
      var pctEl = document.querySelector('[data-role="visita-progress-pct"]');
      if (pctEl) pctEl.textContent = pct + '%';
      var nextBtn = document.querySelector('[data-action="visita-avancar"]');
      if (nextBtn) nextBtn.textContent = stepIndex === steps.length - 1 ? 'Salvar visita' : 'Avançar';
    }

    function validarEtapa1() {
      var erros = false;
      if (clienteSel && !clienteSel.value) { marcarErro(clienteSel, true); erros = true; } else if (clienteSel) marcarErro(clienteSel, false);
      var unidadeEl = document.querySelector('[data-role="visita-unidade"]');
      if (unidadeEl && !(unidadeEl.value || '').trim()) { marcarErro(unidadeEl, true); erros = true; } else if (unidadeEl) marcarErro(unidadeEl, false);
      if (erros) showToast('Preencha os campos obrigatórios (*) antes de avançar.');
      return !erros;
    }
    function marcarErro(el, on) {
      var wrap = el.closest('[data-field]') || el;
      wrap.classList.toggle('error', on);
      var err = wrap.parentElement && wrap.parentElement.querySelector('.mpro-field-error');
      if (err) err.style.display = on ? 'flex' : 'none';
    }

    function gravar(finalizar) {
      if (!clienteSel || !clienteSel.value) { showToast('Selecione um cliente primeiro.'); return; }
      var payload = {
        cliente_id: clienteSel.value,
        status: finalizar ? 'finalizado' : 'rascunho',
        owner: owner,
        cultura: estado.cultura || null,
        responsavel: fieldValue(document, '[data-role="visita-responsavel"]') || null,
        condicao_geral: estado.situacao.geral || null,
        irrigacao: estado.situacao.irrigacao || null,
        nutricao: estado.situacao.nutricao || null,
        situacao: estado.situacao.geral || estado.situacao.nutricao || estado.situacao.irrigacao || null
      };
      API.post('visitas', payload).then(function (v) {
        var reqs = (estado.medicoes || []).filter(function (m) { return m.rotulo; }).map(function (m) {
          return API.post('medicoes', { visita_id: v.id, rotulo: m.rotulo, valor: m.valor || null, unidade: m.unidade || null }).catch(function () {});
        });
        Promise.all(reqs).then(function () {
          showToast(finalizar ? 'Visita registrada no banco.' : 'Rascunho salvo.');
          navigate(finalizar ? 'photos' : 'dashboard');
        });
      }).catch(function (e) {
        if (apiIndisponivel(e)) { showToast(finalizar ? 'Visita salva (offline).' : 'Rascunho salvo (offline).'); navigate(finalizar ? 'photos' : 'dashboard'); return; }
        showToast(e.message || 'Falha ao salvar a visita.');
      });
    }

    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-action="visita-avancar"]')) {
        if (stepIndex === 0 && !validarEtapa1()) return;
        if (stepIndex < steps.length - 1) return showStep(stepIndex + 1);
        gravar(true);
      }
      if (e.target.closest('[data-action="visita-voltar-etapa"]')) {
        if (stepIndex > 0) return showStep(stepIndex - 1);
        if (window.history.length > 1) return window.history.back();
        navigate('dashboard');
      }
      if (e.target.closest('[data-action="visita-salvar-rascunho"]')) gravar(false);
    });

    renderMedicoes();
    showStep(0);
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindFormFeedback();
    bindPrototypeInteractions();
    setupShell();
    setupDashboard();
    setupClientesScreen();
    setupMapaScreen();
    setupNovaVisita();
    setupEditProfile();
    setupEquipamentos();
  });
})();
