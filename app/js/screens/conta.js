/* Perfil, edição local e preferências da conta. */
window.MPRO = window.MPRO || {};
MPRO.screens = MPRO.screens || {};

(function () {
  var ui = MPRO.ui;
  var h = ui.h;

  function avatar(user, classe) {
    return user.foto
      ? h('img', { class: 'profile-avatar ' + (classe || ''), src: user.foto, alt: 'Foto de ' + user.nome })
      : h('div', { class: 'profile-avatar ' + (classe || ''), text: user.iniciais });
  }

  MPRO.screens.perfil = {
    grupo: 'B', titulo: 'Perfil',
    acao: { icone: 'edit', rotulo: 'Editar perfil', onClick: function () { location.hash = '#/perfil/editar'; } },
    render: function () {
      var user = MPRO.store.user();
      return h('div', { class: 'profile-page' }, [
        h('section', { class: 'profile-hero' }, [
          avatar(user),
          h('div', { class: 'profile-hero__body' }, [h('span', { class: 'badge', text: user.modo }), h('h2', { text: user.nome }), h('p', { text: (user.cargo || 'Engenheiro agrônomo') + ' · ' + (user.empresa || 'M-PRO') }), h('a', { href: 'mailto:' + user.email, text: user.email })]),
          h('button', { class: 'btn btn--outline', type: 'button', onclick: function () { location.hash = '#/perfil/editar'; } }, [ui.icon('edit'), 'Editar'])
        ]),
        h('div', { class: 'summary-grid' }, [
          h('div', { class: 'keyvalue' }, [h('span', { text: 'Visitas finalizadas' }), h('strong', { class: 'mono', text: String(MPRO.store.visits().length) })]),
          h('div', { class: 'keyvalue' }, [h('span', { text: 'Clientes ativos' }), h('strong', { class: 'mono', text: String(MPRO.store.clients().length) })]),
          h('div', { class: 'keyvalue' }, [h('span', { text: 'Rascunhos locais' }), h('strong', { class: 'mono', text: String(MPRO.store.drafts().length) })])
        ]),
        h('div', { class: 'card-list' }, [
          h('button', { class: 'listtile', type: 'button', onclick: function () { location.hash = '#/configuracoes'; } }, [h('span', { class: 'listtile__icon' }, [ui.icon('settings')]), h('span', { class: 'listtile__body' }, [h('strong', { text: 'Configurações' }), h('span', { text: 'Tema, sincronização e unidades' })]), ui.icon('chevron_right')]),
          h('button', { class: 'listtile', type: 'button', onclick: function () { MPRO.ui.confirmSheet({ titulo: 'Sair da conta', texto: 'Os rascunhos permanecem salvos neste aparelho.', confirmar: 'Sair', onConfirm: function () { MPRO.store.logout(); location.hash = '#/login'; } }); } }, [h('span', { class: 'listtile__icon' }, [ui.icon('logout')]), h('span', { class: 'listtile__body' }, [h('strong', { text: 'Sair' }), h('span', { text: 'Encerrar a sessão neste aparelho' })]), ui.icon('chevron_right')])
        ])
      ]);
    }
  };

  MPRO.screens.editarPerfil = {
    grupo: 'B', titulo: 'Editar perfil',
    render: function () {
      var user = MPRO.store.user();
      var foto = user.foto || '';
      var nome = h('input', { class: 'input', value: user.nome, 'aria-label': 'Nome completo' });
      var cargo = h('input', { class: 'input', value: user.cargo || 'Engenheiro agrônomo', 'aria-label': 'Cargo' });
      var empresa = h('input', { class: 'input', value: user.empresa || 'M-PRO', 'aria-label': 'Empresa' });
      var email = h('input', { class: 'input', type: 'email', value: user.email, 'aria-label': 'E-mail' });
      var preview = h('div', { id: 'avatar-preview' }, [avatar(user, 'profile-avatar--edit')]);
      var inputFoto = h('input', { type: 'file', accept: 'image/*', class: 'sr-only' });

      inputFoto.addEventListener('change', function () {
        var arquivo = inputFoto.files && inputFoto.files[0];
        if (!arquivo) return;
        var leitor = new FileReader();
        leitor.onload = function () {
          foto = leitor.result;
          preview.innerHTML = '';
          preview.appendChild(h('img', { class: 'profile-avatar profile-avatar--edit', src: foto, alt: 'Nova foto de perfil' }));
        };
        leitor.readAsDataURL(arquivo);
      });

      return h('form', { class: 'profile-form', onsubmit: function (event) {
        event.preventDefault();
        if (!nome.value.trim() || !email.value.trim()) { ui.snack('Nome e e-mail são obrigatórios.'); return; }
        MPRO.store.updateUser({ nome: nome.value.trim(), cargo: cargo.value.trim(), empresa: empresa.value.trim(), email: email.value.trim(), foto: foto });
        ui.snack('Perfil atualizado.');
        location.hash = '#/perfil';
      } }, [
        h('div', { class: 'profile-photo-editor' }, [preview, inputFoto, h('button', { class: 'btn btn--outline', type: 'button', onclick: function () { inputFoto.click(); } }, [ui.icon('add_a_photo'), 'Alterar foto']), h('span', { class: 'dim', text: 'A imagem é pré-visualizada e salva somente neste aparelho.' })]),
        h('div', { class: 'form-grid' }, [
          h('label', { class: 'field field--wide' }, [h('span', { class: 'field__label', text: 'Nome completo *' }), nome]),
          h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Cargo' }), cargo]),
          h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Empresa' }), empresa]),
          h('label', { class: 'field field--wide' }, [h('span', { class: 'field__label', text: 'E-mail *' }), email])
        ]),
        h('div', { class: 'detail-actions' }, [h('button', { class: 'btn btn--filled', type: 'submit' }, [ui.icon('save'), 'Salvar alterações']), h('button', { class: 'btn btn--text', type: 'button', onclick: function () { location.hash = '#/perfil'; } }, 'Cancelar')])
      ]);
    }
  };

  function linhaToggle(rotulo, texto, icone, ativo, onChange) {
    var input = h('input', { type: 'checkbox', checked: ativo, onchange: function (event) { onChange(event.target.checked); } });
    return h('label', { class: 'settings-row' }, [h('span', { class: 'listtile__icon' }, [ui.icon(icone)]), h('span', { class: 'listtile__body' }, [h('strong', { text: rotulo }), h('span', { text: texto })]), h('span', { class: 'switch' }, [input, h('i')])]);
  }

  MPRO.screens.configuracoes = {
    grupo: 'B', titulo: 'Configurações',
    render: function (ctx) {
      var settings = MPRO.store.settings();
      var preferencia = settings.temaPreferencia || MPRO.store.theme;
      function salvar(patch, mensagem) { MPRO.store.saveSettings(patch); ui.snack(mensagem); }
      return h('div', { class: 'settings-page' }, [
        ui.section('Aparência', null, h('div', { class: 'settings-card' }, [
          h('div', { class: 'settings-row settings-row--stack' }, [h('span', { class: 'listtile__icon' }, [ui.icon('contrast')]), h('span', { class: 'listtile__body' }, [h('strong', { text: 'Tema da interface' }), h('span', { text: 'Escolha a leitura mais confortável em campo.' })]), h('div', { class: 'segmented segmented--theme', role: 'group', 'aria-label': 'Tema' }, [['claro', 'light_mode', 'Claro'], ['escuro', 'dark_mode', 'Escuro'], ['sistema', 'brightness_auto', 'Sistema']].map(function (opcao) { return h('button', { class: 'segmented__opt', type: 'button', 'aria-pressed': preferencia === opcao[0] ? 'true' : 'false', onclick: function () { var temaReal = opcao[0] === 'sistema' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro') : opcao[0]; MPRO.store.saveSettings({ temaPreferencia: opcao[0] }); MPRO.store.setTheme(temaReal); ctx.rerender(); } }, [ui.icon(opcao[1]), opcao[2]]); }))])
        ])),
        ui.section('Campo e sincronização', null, h('div', { class: 'settings-card' }, [
          linhaToggle('Notificações de pendência', 'Avisar sobre laudos e manutenções vencidas.', 'notifications', settings.notificacoes, function (valor) { salvar({ notificacoes: valor }, 'Preferência de notificações atualizada.'); }),
          linhaToggle('Sincronização automática', 'Enviar rascunhos quando a conexão voltar.', 'sync', settings.sincronizacao, function (valor) { salvar({ sincronizacao: valor }, 'Preferência de sincronização atualizada.'); }),
          h('label', { class: 'settings-row' }, [h('span', { class: 'listtile__icon' }, [ui.icon('square_foot')]), h('span', { class: 'listtile__body' }, [h('strong', { text: 'Unidade de área' }), h('span', { text: 'Usada em clientes e relatórios.' })]), h('select', { class: 'select-compact', 'aria-label': 'Unidade de área', onchange: function (event) { salvar({ unidadeArea: event.target.value }, 'Unidade de área atualizada.'); } }, [h('option', { value: 'ha', selected: settings.unidadeArea === 'ha', text: 'Hectares (ha)' }), h('option', { value: 'm2', selected: settings.unidadeArea === 'm2', text: 'Metros²' })])])
        ])),
        ui.section('Sobre', null, h('div', { class: 'settings-card' }, [h('div', { class: 'settings-row' }, [h('span', { class: 'listtile__icon' }, [ui.icon('info')]), h('span', { class: 'listtile__body' }, [h('strong', { text: 'M-PRO Campo' }), h('span', { text: 'Interface local · versão de validação 0.2' })]), ui.brand({ markOnly: true })])]))
      ]);
    }
  };
})();
