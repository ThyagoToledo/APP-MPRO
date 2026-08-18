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
          MPRO.session.modo() === 'gated' ? h('button', { class: 'listtile', type: 'button', onclick: function () { MPRO.ui.confirmSheet({ titulo: 'Sair da conta', texto: 'Os registros deste navegador permanecem salvos.', confirmar: 'Sair', onConfirm: function () { MPRO.session.sair().then(function () { location.hash = '#/login'; MPRO.router.render(); }); } }); } }, [h('span', { class: 'listtile__icon' }, [ui.icon('logout')]), h('span', { class: 'listtile__body' }, [h('strong', { text: 'Sair' }), h('span', { text: 'Encerrar a sessão neste navegador' })]), ui.icon('chevron_right')]) : null
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

  /* O usuário precisa enxergar onde o dado está e o que ainda não saiu do aparelho. */
  function blocoDados(ctx) {
    var s = MPRO.sync.status();
    var registros = ['clients', 'visits', 'drafts', 'equipments'].reduce(function (total, colecao) {
      return total + MPRO.db.todos(colecao).length;
    }, 0);

    var enviar = h('button', {
      class: 'btn btn--outline', type: 'button', disabled: !s.configurado,
      onclick: function () {
        ui.snack('Enviando registros pendentes…');
        MPRO.sync.drenar().then(function (novo) {
          ui.snack(novo.estado === 'sincronizado' ? 'Tudo sincronizado.' : MPRO.sync.rotulo());
          ctx.rerender();
        });
      }
    }, [ui.icon('cloud_upload'), 'Sincronizar agora']);

    return h('div', { class: 'settings-card' }, [
      h('div', { class: 'settings-row settings-row--stack' }, [
        h('span', { class: 'listtile__icon' }, [ui.icon('database')]),
        h('span', { class: 'listtile__body' }, [
          h('strong', { text: 'Armazenamento local' }),
          h('span', { text: registros + ' registro(s) neste aparelho · ' + (s.driver === 'indexeddb' ? 'IndexedDB' : s.driver) })
        ]),
        ui.syncPill()
      ]),
      h('div', { class: 'settings-row settings-row--stack' }, [
        h('span', { class: 'listtile__icon' }, [ui.icon('cloud_sync')]),
        h('span', { class: 'listtile__body' }, [
          h('strong', { text: 'Envio para a nuvem M-PRO' }),
          h('span', { text: s.configurado
            ? 'A fila sobe automaticamente quando há internet.'
            : 'Ainda não configurado nesta instalação. Tudo é gravado localmente e nada é perdido: a fila sobe assim que o servidor for ligado.' })
        ]),
        enviar
      ]),
      h('div', { class: 'settings-row settings-row--stack' }, [
        h('span', { class: 'listtile__icon' }, [ui.icon('delete_forever')]),
        h('span', { class: 'listtile__body' }, [
          h('strong', { text: 'Apagar dados deste aparelho' }),
          h('span', { text: 'Remove clientes, visitas, rascunhos e equipamentos gravados localmente. Não há como desfazer.' })
        ]),
        h('button', {
          class: 'btn btn--outline', type: 'button',
          onclick: function () {
            ui.confirmSheet({
              titulo: 'Apagar dados locais',
              texto: 'Todos os registros gravados neste aparelho serão removidos, inclusive os que ainda não foram enviados.',
              confirmar: 'Excluir',
              onConfirm: function () {
                MPRO.store.apagarTudo();
                ui.snack('Dados locais apagados.');
                location.hash = '#/';
                MPRO.router.render();
              }
            });
          }
        }, [ui.icon('delete'), 'Apagar'])
      ])
    ]);
  }

  MPRO.screens.configuracoes = {
    grupo: 'B', titulo: 'Configurações',
    render: function (ctx) {
      var settings = MPRO.store.settings();
      var preferencia = settings.temaPreferencia || MPRO.store.theme;
      function salvar(patch, mensagem) { MPRO.store.saveSettings(patch); ui.snack(mensagem); }
      var secoes = [];

      if (MPRO.session.isAdmin()) {
        secoes.push(ui.section('Administração', null, h('div', { class: 'settings-card', style: 'border: 1px solid color-mix(in srgb, var(--secondary) 40%, var(--outline-variant)); background: var(--surface-tint)' }, [
          h('div', { class: 'settings-row settings-row--stack' }, [
            h('span', { class: 'listtile__icon', style: 'color:var(--secondary)' }, [ui.icon('admin_panel_settings')]),
            h('span', { class: 'listtile__body' }, [
              h('strong', { text: 'Painel do Administrador' }),
              h('span', { text: 'Aprovar solicitações de acesso e definir cargos da equipe' })
            ]),
            h('button', {
              class: 'btn btn--filled',
              type: 'button',
              onclick: function () { location.hash = '#/admin'; }
            }, [ui.icon('manage_accounts'), 'Gerenciar acessos'])
          ])
        ])));
      }

      secoes.push(ui.section('Aparência', null, h('div', { class: 'settings-card' }, [
        h('div', { class: 'settings-row settings-row--stack' }, [h('span', { class: 'listtile__icon' }, [ui.icon('contrast')]), h('span', { class: 'listtile__body' }, [h('strong', { text: 'Tema da interface' }), h('span', { text: 'Escolha a leitura mais confortável em campo.' })]), h('div', { class: 'segmented segmented--theme', role: 'group', 'aria-label': 'Tema' }, [['claro', 'light_mode', 'Claro'], ['escuro', 'dark_mode', 'Escuro'], ['sistema', 'brightness_auto', 'Sistema']].map(function (opcao) { return h('button', { class: 'segmented__opt', type: 'button', 'aria-pressed': preferencia === opcao[0] ? 'true' : 'false', onclick: function () { var temaReal = opcao[0] === 'sistema' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro') : opcao[0]; MPRO.store.saveSettings({ temaPreferencia: opcao[0] }); MPRO.store.setTheme(temaReal); ctx.rerender(); } }, [ui.icon(opcao[1]), opcao[2]]); }))])
      ])));

      secoes.push(ui.section('Campo e sincronização', null, h('div', { class: 'settings-card' }, [
        linhaToggle('Notificações de pendência', 'Avisar sobre laudos e manutenções vencidas.', 'notifications', settings.notificacoes, function (valor) { salvar({ notificacoes: valor }, 'Preferência de notificações atualizada.'); }),
        linhaToggle('Sincronização automática', 'Enviar rascunhos quando a conexão voltar.', 'sync', settings.sincronizacao, function (valor) { salvar({ sincronizacao: valor }, 'Preferência de sincronização atualizada.'); }),
        h('label', { class: 'settings-row' }, [h('span', { class: 'listtile__icon' }, [ui.icon('square_foot')]), h('span', { class: 'listtile__body' }, [h('strong', { text: 'Unidade de área' }), h('span', { text: 'Usada em clientes e relatórios.' })]), h('select', { class: 'select-compact', 'aria-label': 'Unidade de área', onchange: function (event) { salvar({ unidadeArea: event.target.value }, 'Unidade de área atualizada.'); } }, [h('option', { value: 'ha', selected: settings.unidadeArea === 'ha', text: 'Hectares (ha)' }), h('option', { value: 'm2', selected: settings.unidadeArea === 'm2', text: 'Metros²' })])])
      ])));

      secoes.push(ui.section('Dados e sincronização', null, blocoDados(ctx)));
      secoes.push(ui.section('Sobre', null, h('div', { class: 'settings-card' }, [h('div', { class: 'settings-row' }, [h('span', { class: 'listtile__icon' }, [ui.icon('info')]), h('span', { class: 'listtile__body' }, [h('strong', { text: MPRO.platform.nome }), h('span', { text: 'Módulo ' + MPRO.platform.alvo + ' · versão ' + MPRO.platform.versao })]), ui.brand({ markOnly: true })])])));

      return h('div', { class: 'settings-page' }, secoes);
    }
  };

  /* Painel do Administrador: aprova solicitações e gerencia cargos dos usuários */
  MPRO.screens.painelAdmin = {
    grupo: 'B', titulo: 'Painel do Administrador', eyebrow: 'ADMINISTRAÇÃO',
    render: function (ctx) {
      var root = h('div', { class: 'admin-page' }, [
        h('div', { style: 'padding:16px', text: 'Carregando usuários…' })
      ]);

      MPRO.session.listarUsuarios().then(function (usuarios) {
        root.innerHTML = '';
        var lista = usuarios || [];
        var pendentes = lista.filter(function (u) { return u.status === 'pendente'; });
        var ativos = lista.filter(function (u) { return u.status !== 'pendente'; });
        var totalAdmins = ativos.filter(function (u) { return u.papel === 'admin'; }).length;

        // Header de métricas
        var metricas = h('div', { class: 'summary-grid', style: 'margin-bottom:24px' }, [
          h('div', { class: 'keyvalue' }, [
            h('span', { text: 'Solicitações pendentes' }),
            h('strong', { class: 'mono', style: pendentes.length ? 'color:var(--monitorar)' : '', text: String(pendentes.length) })
          ]),
          h('div', { class: 'keyvalue' }, [
            h('span', { text: 'Usuários ativos' }),
            h('strong', { class: 'mono', text: String(ativos.length) })
          ]),
          h('div', { class: 'keyvalue' }, [
            h('span', { text: 'Administradores' }),
            h('strong', { class: 'mono', text: String(totalAdmins) })
          ])
        ]);

        root.appendChild(metricas);

        // Seção 1: Solicitações de acesso pendentes
        var corpoPendentes;
        if (!pendentes.length) {
          corpoPendentes = h('div', { class: 'settings-card', style: 'padding:24px;text-align:center' }, [
            h('div', { style: 'width:48px;height:48px;border-radius:50%;background:var(--surface-container);color:var(--secondary);display:grid;place-items:center;margin:0 auto 12px' }, [
              ui.icon('task_alt')
            ]),
            h('strong', { style: 'display:block;font-size:16px;margin-bottom:4px', text: 'Nenhuma solicitação pendente' }),
            h('span', { class: 'dim', style: 'font-size:14px', text: 'Novos pedidos de acesso enviados pelo site aparecerão aqui para sua aprovação.' })
          ]);
        } else {
          corpoPendentes = h('div', { class: 'admin-requests-list', style: 'display:flex;flex-direction:column;gap:12px' }, pendentes.map(function (p) {
            var selectCargo = h('select', { class: 'input select-compact', style: 'width:auto', 'aria-label': 'Cargo ao aprovar' }, [
              h('option', { value: 'tecnico', text: 'Técnico de campo' }),
              h('option', { value: 'gestor', text: 'Gestor' }),
              h('option', { value: 'admin', text: 'Administrador' })
            ]);

            var btnAprovar = h('button', {
              class: 'btn btn--filled',
              type: 'button',
              onclick: function () {
                btnAprovar.disabled = true;
                btnAprovar.textContent = 'Aprovando…';
                MPRO.session.aprovarSolicitacao(p.id, selectCargo.value).then(function () {
                  ui.snack('Acesso liberado para ' + p.nome + ' como ' + selectCargo.value + '.');
                  ctx.rerender();
                }).catch(function (e) {
                  btnAprovar.disabled = false;
                  ui.snack(e.message);
                });
              }
            }, [ui.icon('check'), 'Aprovar']);

            var btnRecusar = h('button', {
              class: 'btn btn--outline',
              type: 'button',
              onclick: function () {
                ui.confirmSheet({
                  titulo: 'Recusar solicitação',
                  texto: 'Deseja recusar o pedido de acesso de ' + p.nome + ' (' + p.email + ')?',
                  confirmar: 'Recusar',
                  onConfirm: function () {
                    MPRO.session.recusarSolicitacao(p.id).then(function () {
                      ui.snack('Solicitação de ' + p.nome + ' recusada.');
                      ctx.rerender();
                    });
                  }
                });
              }
            }, [ui.icon('close'), 'Recusar']);

            return h('div', { class: 'card', style: 'border:1px solid var(--outline-variant);border-left:4px solid var(--monitorar);padding:16px 20px;display:flex;flex-direction:column;gap:12px' }, [
              h('div', { style: 'display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px' }, [
                h('div', [
                  h('strong', { style: 'font-size:16px;display:block', text: p.nome }),
                  h('span', { class: 'dim', style: 'font-size:14px', text: p.email + (p.empresa ? ' · ' + p.empresa : '') + (p.cargo ? ' · ' + p.cargo : '') })
                ]),
                h('span', { class: 'badge', style: 'background:color-mix(in srgb, var(--monitorar) 15%, transparent);color:var(--monitorar);border:1px solid var(--monitorar)', text: 'AGUARDANDO APROVAÇÃO' })
              ]),
              h('div', { style: 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding-top:8px;border-top:1px solid var(--outline-variant)' }, [
                h('label', { style: 'display:flex;align-items:center;gap:8px;font-size:14px' }, [
                  h('span', { class: 'dim', text: 'Cargo ao aprovar:' }),
                  selectCargo
                ]),
                h('div', { style: 'display:flex;gap:8px' }, [btnRecusar, btnAprovar])
              ])
            ]);
          }));
        }

        root.appendChild(ui.section('Solicitações pendentes', null, corpoPendentes));

        // Seção 2: Usuários cadastrados e gestão de cargos
        var corpoUsuarios = h('div', { class: 'settings-card', style: 'display:flex;flex-direction:column;gap:0' }, ativos.map(function (u) {
          var selectPapel = h('select', {
            class: 'input select-compact',
            style: 'width:auto',
            'aria-label': 'Papel de ' + u.nome,
            onchange: function (event) {
              var novoPapel = event.target.value;
              MPRO.session.alterarCargo(u.id, novoPapel).then(function () {
                ui.snack('Cargo de ' + u.nome + ' alterado para ' + novoPapel.toUpperCase() + '.');
                ctx.rerender();
              }).catch(function (e) {
                ui.snack(e.message);
                ctx.rerender();
              });
            }
          }, [
            h('option', { value: 'tecnico', selected: (u.papel || 'tecnico') === 'tecnico', text: 'Técnico' }),
            h('option', { value: 'gestor', selected: u.papel === 'gestor', text: 'Gestor' }),
            h('option', { value: 'admin', selected: u.papel === 'admin', text: 'Administrador' })
          ]);

          var btnExcluir = h('button', {
            class: 'iconbtn',
            type: 'button',
            'aria-label': 'Excluir usuário',
            onclick: function () {
              ui.confirmSheet({
                titulo: 'Remover usuário',
                texto: 'Deseja remover o acesso de ' + u.nome + ' (' + u.email + ')?',
                confirmar: 'Remover',
                onConfirm: function () {
                  MPRO.session.recusarSolicitacao(u.id).then(function () {
                    ui.snack('Usuário ' + u.nome + ' removido.');
                    ctx.rerender();
                  });
                }
              });
            }
          }, [ui.icon('delete')]);

          return h('div', { class: 'settings-row settings-row--stack', style: 'padding:14px 16px;border-bottom:1px solid var(--outline-variant)' }, [
            h('div', { class: 'profile-avatar', style: 'width:40px;height:40px;font-size:14px', text: MPRO.session.perfil().iniciais }, []),
            h('div', { class: 'listtile__body', style: 'flex:1' }, [
              h('div', { style: 'display:flex;align-items:center;gap:8px' }, [
                h('strong', { text: u.nome }),
                u.papel === 'admin'
                  ? h('span', { class: 'badge', style: 'background:color-mix(in srgb, var(--secondary) 15%, transparent);color:var(--secondary);border:1px solid var(--secondary)', text: 'ADMIN' })
                  : null
              ]),
              h('span', { class: 'dim', style: 'font-size:13px', text: u.email + (u.empresa ? ' · ' + u.empresa : '') })
            ]),
            h('div', { style: 'display:flex;align-items:center;gap:8px' }, [
              selectPapel,
              btnExcluir
            ])
          ]);
        }));

        root.appendChild(ui.section('Usuários e cargos', null, corpoUsuarios));
      }).catch(function (err) {
        root.innerHTML = '';
        root.appendChild(ui.errorState('Erro ao carregar lista de usuários: ' + err.message, ctx.recarregar));
      });

      return root;
    }
  };
})();
