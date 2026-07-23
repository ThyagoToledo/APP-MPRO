(function () {
  'use strict';

  var root = 'stitch_monitoramento_mpro';
  var destinations = {
    dashboard: 'in_cio_dashboard_refinado',
    login: 'login_m_pro_fundo_planta_o',
    register: 'registro_m_pro_fundo_floresta',
    clients: 'mapa_de_clientes_e_planta_es',
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

  function textOf(element) {
    return ((element.innerText || element.getAttribute('aria-label') || '') + ' ' +
      (element.querySelector('.material-symbols-outlined') || {}).textContent).toLowerCase();
  }

  function destinationFor(label) {
    if (/nova visita|iniciar visita|iniciar relat|criar visita|visita t/.test(label)) return 'visit';
    if (/cliente|fazenda|talh[aã]o|mapa/.test(label)) return 'clients';
    if (/assistente|intelig[eê]ncia|perguntar|chat/.test(label)) return 'ai';
    if (/evid[eê]ncia|m[ií]dia|upload/.test(label)) return 'evidence';
    if (/foto|registro fotogr/.test(label)) return 'photos';
    if (/transcr|estrutur/.test(label)) return 'transcription';
    if (/revis|finaliz|gerar pdf|publicar/.test(label)) return 'review';
    if (/equipamento|sensor/.test(label)) return 'equipment';
    if (/configura/.test(label)) return 'settings';
    if (/editar perfil/.test(label)) return 'editProfile';
    if (/perfil|account_circle|person/.test(label)) return 'profile';
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
      toast.style.cssText = 'position:fixed;left:50%;bottom:88px;transform:translateX(-50%);z-index:100;background:#002d1d;color:#fff;padding:12px 18px;border-radius:999px;font:600 14px Inter,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.22);transition:opacity .2s';
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
    API.post('auth?action=register', payload).then(function () {
      showToast('Conta criada. Faça login para continuar.');
      navigate('login');
    }).catch(function (e) {
      if (apiIndisponivel(e)) { showToast('Conta criada no protótipo. Faça login.'); navigate('login'); return; }
      showToast(e.status === 409 ? 'E-mail já cadastrado.' : (e.message || 'Falha ao criar conta.'));
    });
  }

  function bindFormFeedback() {
    document.querySelectorAll('form').forEach(function (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var folder = currentFolder();
        var body = document.body.innerText.toLowerCase();
        if (folder === destinations.register || /criar conta|nome completo/.test((form.innerText || '').toLowerCase())) {
          submitRegister(form);
        } else if (folder === destinations.login || (/login|entrar/.test(body) && form.querySelector('input[type="password"]'))) {
          submitLogin(form);
        } else if (folder === destinations.visit) {
          showToast('Visita salva. Seguindo para o registro fotográfico.');
          navigate('photos');
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
          if (f === destinations.visit && /continuar/.test(label)) {
            showToast('Visita salva. Seguindo para o registro fotográfico.');
            return navigate('photos');
          }
          if (f === destinations.transcription && /confirmar/.test(label)) {
            return navigate('review');
          }
          showToast('Alterações salvas no protótipo.');
        });
      }
    });
  }

  function setupDrawer() {
    var hamburger = document.getElementById('menu-btn') ||
      Array.prototype.slice.call(document.querySelectorAll('button')).filter(function (b) {
        var s = b.querySelector('.material-symbols-outlined');
        return s && s.textContent.trim() === 'menu';
      })[0];
    if (!hamburger) return;
    // Menu unificado em TODAS as telas: esconde qualquer drawer nativo (o dashboard
    // refinado tinha o seu) e clona o botão para remover listeners inline nativos.
    ['navigation-drawer', 'drawer-overlay'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    if (hamburger.parentNode) {
      var fresh = hamburger.cloneNode(true);
      hamburger.parentNode.replaceChild(fresh, hamburger);
      hamburger = fresh;
    }
    hamburger.id = 'menu-btn'; // o handler global de clique ignora esse id

    var items = [
      { icon: 'home', text: 'Início', screen: 'dashboard' },
      { icon: 'groups', text: 'Clientes e Plantações', screen: 'clients' },
      { icon: 'add_task', text: 'Nova Visita', screen: 'visit' },
      { icon: 'photo_camera', text: 'Registro Fotográfico', screen: 'photos' },
      { icon: 'perm_media', text: 'Evidências', screen: 'evidence' },
      { icon: 'smart_toy', text: 'Assistente IA', screen: 'ai' },
      { icon: 'agriculture', text: 'Equipamentos', screen: 'equipment' },
      { icon: 'person', text: 'Perfil', screen: 'profile' },
      { icon: 'settings', text: 'Configurações', screen: 'settings' },
      { icon: 'logout', text: 'Sair', screen: 'login' }
    ];
    var current = currentFolder();

    var overlay = document.createElement('div');
    overlay.id = 'mpro-drawer-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:60;opacity:0;pointer-events:none;transition:opacity .2s';

    var panel = document.createElement('nav');
    panel.style.cssText = 'position:fixed;top:0;left:0;height:100%;width:80%;max-width:300px;background:#f7fbf7;z-index:61;transform:translateX(-105%);transition:transform .25s ease;box-shadow:2px 0 24px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow-y:auto';
    var header = '<div style="padding:22px 20px;background:#0a3d2a;color:#fff">' +
      '<div style="font:700 18px Inter,sans-serif">M-PRO</div>' +
      '<div style="font:500 13px Inter,sans-serif;opacity:.85">Monitoramento agronômico</div></div>';
    var links = items.map(function (it) {
      var active = destinations[it.screen] === current;
      return '<a href="#" data-screen="' + it.screen + '" style="' + (active ? 'background:#dbeede;' : '') +
        'display:flex;align-items:center;gap:14px;padding:14px 20px;color:#0b1f16;text-decoration:none;font:' +
        (active ? '700' : '500') + ' 15px Inter,sans-serif"><span class="material-symbols-outlined">' +
        it.icon + '</span>' + it.text + '</a>';
    }).join('');
    panel.innerHTML = header + '<div style="padding:8px 0;flex:1">' + links + '</div>';

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    function toggle(open) {
      var willOpen = open === undefined ? panel.style.transform !== 'translateX(0px)' : open;
      panel.style.transform = willOpen ? 'translateX(0px)' : 'translateX(-105%)';
      overlay.style.opacity = willOpen ? '1' : '0';
      overlay.style.pointerEvents = willOpen ? 'auto' : 'none';
      document.body.classList.toggle('overflow-hidden', willOpen);
    }
    hamburger.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); toggle(); });
    overlay.addEventListener('click', function () { toggle(false); });
    panel.addEventListener('click', function (e) {
      var link = e.target.closest('a[data-screen]');
      if (!link) return;
      e.preventDefault();
      e.stopPropagation();
      toggle(false);
      navigate(link.getAttribute('data-screen'));
    });
  }

  document.addEventListener('click', function (event) {
    var control = event.target.closest('a,button');
    if (!control || control.id === 'menu-btn' || control.id === 'drawer-overlay') return;
    // Botões de submit dentro de <form> são tratados pelo handler de submit (login/cadastro reais).
    if (control.tagName === 'BUTTON' && control.form && (control.type === 'submit' || control.type === '')) return;
    var label = textOf(control);
    var folder = currentFolder();
    var destination = destinationFor(label);
    if (folder === destinations.login && /continuar com google/.test(label)) destination = 'dashboard';
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
    if (destination && (control.getAttribute('href') === '#' || control.tagName === 'BUTTON')) {
      event.preventDefault();
      navigate(destination);
    } else if (control.getAttribute('href') === '#') {
      event.preventDefault();
      showToast('Ação disponível no próximo fluxo do protótipo.');
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    bindFormFeedback();
    bindPrototypeInteractions();
    setupDrawer();
  });
})();
