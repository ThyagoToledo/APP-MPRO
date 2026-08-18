/* Telas de entrada. Qual delas existe depende da plataforma:

   - modo 'gated' (web): Entrar. Não há autocadastro — quem não estiver aprovado no banco
     do servidor não passa daqui, e o app diz isso sem rodeios.
   - modo 'local' (mobile): Primeiro acesso. Sem senha: o técnico só informa como quer ser
     identificado nos relatórios gerados neste aparelho. */
window.MPRO = window.MPRO || {};
MPRO.screens = MPRO.screens || {};

(function () {
  var ui = MPRO.ui;
  var h = ui.h;

  function campoSenha(rotulo) {
    var input = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', 'aria-label': rotulo });
    var botao = h('button', {
      class: 'password-toggle', type: 'button', 'aria-label': 'Mostrar senha',
      onclick: function () {
        var visivel = input.type === 'text';
        input.type = visivel ? 'password' : 'text';
        botao.setAttribute('aria-label', visivel ? 'Mostrar senha' : 'Ocultar senha');
        botao.innerHTML = '';
        botao.appendChild(ui.icon(visivel ? 'visibility' : 'visibility_off'));
      }
    }, [ui.icon('visibility')]);
    return {
      node: h('label', { class: 'field' }, [
        h('span', { class: 'field__label', text: rotulo }),
        h('div', { class: 'password-field' }, [input, botao])
      ]),
      input: input
    };
  }

  function shell(titulo, subtitulo, formulario, lateral) {
    return h('div', { class: 'auth-shell' }, [
      h('aside', { class: 'auth-brand' }, [
        ui.brand(),
        h('div', { class: 'auth-brand__copy' }, [
          h('span', { class: 'mono', text: 'UTILITÁRIO DE CAMPO' }),
          h('h1', { text: lateral.titulo }),
          h('p', { text: lateral.texto })
        ]),
        h('div', { class: 'auth-brand__signal' }, [
          ui.icon('offline_bolt'),
          h('span', { text: 'Registro local primeiro; a nuvem recebe quando houver internet' })
        ])
      ]),
      h('main', { class: 'auth-panel' }, [
        h('div', { class: 'auth-panel__brand' }, [ui.brand()]),
        h('div', { class: 'auth-heading' }, [
          h('span', { class: 'mono', text: 'M-PRO CAMPO' }),
          h('h2', { text: titulo }),
          h('p', { text: subtitulo })
        ]),
        formulario
      ])
    ]);
  }

  MPRO.screens.solicitarAcesso = {
    grupo: 'A', titulo: 'Solicitar acesso',
    render: function () {
      var nome = h('input', { class: 'input', autocomplete: 'name', placeholder: 'Seu nome completo', 'aria-label': 'Nome completo' });
      var email = h('input', { class: 'input', type: 'email', autocomplete: 'email', placeholder: 'seu.email@gmail.com', 'aria-label': 'E-mail ou Gmail' });
      var senha = campoSenha('Senha desejada');
      var empresa = h('input', { class: 'input', autocomplete: 'organization', placeholder: 'M-PRO ou Empresa / Fazenda', 'aria-label': 'Empresa' });
      var cargo = h('input', { class: 'input', placeholder: 'Ex: Engenheiro agrônomo, Consultor', 'aria-label': 'Cargo' });
      var erro = h('p', { class: 'form-error', hidden: true, role: 'alert' });
      var enviar = h('button', { class: 'btn btn--filled btn--grow', type: 'submit' }, [ui.icon('how_to_reg'), 'Enviar solicitação']);
      var containerForm = h('div');

      function falha(mensagem) {
        erro.hidden = false;
        erro.textContent = mensagem;
        enviar.disabled = false;
        enviar.innerHTML = '';
        enviar.appendChild(ui.icon('how_to_reg'));
        enviar.appendChild(document.createTextNode('Enviar solicitação'));
      }

      function sucesso() {
        containerForm.innerHTML = '';
        containerForm.appendChild(h('div', { class: 'auth-success-card', style: 'text-align:center;padding:24px 16px' }, [
          h('div', { style: 'width:56px;height:56px;border-radius:50%;background:var(--surface-tint);color:var(--secondary);display:grid;place-items:center;margin:0 auto 16px' }, [
            ui.icon('mark_email_read', 'ms--lg')
          ]),
          h('h3', { style: 'font-size:20px;margin:0 0 8px', text: 'Solicitação enviada!' }),
          h('p', { style: 'font-size:15px;line-height:1.5;color:var(--on-surface-variant);margin:0 0 24px',
            text: 'Seus dados foram registrados com sucesso. O administrador analisará sua solicitação no painel e liberará o seu acesso.' }),
          h('button', {
            class: 'btn btn--filled btn--grow',
            type: 'button',
            onclick: function () { location.hash = '#/login'; }
          }, [ui.icon('login'), 'Ir para a tela de login'])
        ]));
      }

      var form = h('form', { class: 'auth-form', onsubmit: function (evento) {
        evento.preventDefault();
        erro.hidden = true;
        if (!nome.value.trim()) { falha('Informe seu nome completo.'); return; }
        if (!email.value.trim()) { falha('Informe seu e-mail ou Gmail.'); return; }
        if (!senha.input.value || senha.input.value.length < 6) { falha('A senha deve ter pelo menos 6 caracteres.'); return; }

        enviar.disabled = true;
        enviar.textContent = 'Enviando solicitação…';

        MPRO.session.solicitarAcesso({
          nome: nome.value.trim(),
          email: email.value.trim().toLowerCase(),
          senha: senha.input.value,
          empresa: empresa.value.trim(),
          cargo: cargo.value.trim()
        }).then(function () {
          sucesso();
        }).catch(function (e) {
          falha(e.message);
        });
      } }, [
        h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Nome completo *' }), nome]),
        h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'E-mail / Gmail *' }), email]),
        senha.node,
        h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Empresa / Propriedade' }), empresa]),
        h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Função / Cargo' }), cargo]),
        erro,
        enviar,
        h('div', { class: 'notice', style: 'margin-top:4px' }, [
          ui.icon('info'),
          h('div', { class: 'notice__body' }, [
            h('strong', { text: 'Aprovação necessária' }),
            h('p', { text: 'Após o envio, o administrador liberará seu login no painel administrativo.' })
          ])
        ]),
        h('p', { class: 'auth-switch' }, [
          'Já possui acesso liberado? ',
          h('button', { class: 'btn btn--text', type: 'button', style: 'padding:0;height:auto', onclick: function () { location.hash = '#/login'; } }, 'Entrar na conta')
        ])
      ]);

      containerForm.appendChild(form);

      return shell(
        'Solicitar acesso',
        'Informe seus dados para que a administração aprove sua conta.',
        containerForm,
        {
          titulo: 'Acompanhamento agronômico de precisão.',
          texto: 'Com o acesso liberado, você consulta históricos de campo, clientes e relatórios técnicos em tempo real.'
        }
      );
    }
  };

  MPRO.screens.login = {
    grupo: 'A', titulo: 'Entrar',
    render: function () {
      var email = h('input', { class: 'input', type: 'email', autocomplete: 'email', placeholder: 'voce@gmail.com', 'aria-label': 'E-mail ou Gmail' });
      var senha = campoSenha('Senha');
      var erro = h('p', { class: 'form-error', hidden: true, role: 'alert' });
      var enviar = h('button', { class: 'btn btn--filled btn--grow', type: 'submit' }, [ui.icon('login'), 'Entrar']);

      function falha(mensagem) {
        erro.hidden = false;
        erro.textContent = mensagem;
        enviar.disabled = false;
        enviar.innerHTML = '';
        enviar.appendChild(ui.icon('login'));
        enviar.appendChild(document.createTextNode('Entrar'));
      }

      var form = h('form', { class: 'auth-form', onsubmit: function (evento) {
        evento.preventDefault();
        erro.hidden = true;
        if (!email.value.trim() || !senha.input.value) {
          falha('Informe e-mail e senha para continuar.');
          return;
        }
        enviar.disabled = true;
        enviar.textContent = 'Verificando…';
        MPRO.session.entrar(email.value.trim().toLowerCase(), senha.input.value)
          .then(function () { location.hash = '#/'; MPRO.router.render(); })
          .catch(function (e) { falha(e.message); });
      } }, [
        h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'E-mail / Gmail' }), email]),
        senha.node,
        erro,
        enviar,
        h('div', { class: 'notice', style: 'margin-top:4px' }, [
          ui.icon('verified_user'),
          h('div', { class: 'notice__body' }, [
            h('strong', { text: 'Acesso restrito' }),
            h('p', { text: 'Entram apenas cadastros aprovados pelo administrador no painel.' })
          ])
        ]),
        h('p', { class: 'auth-switch' }, [
          'Ainda não tem acesso? ',
          h('button', { class: 'btn btn--text', type: 'button', style: 'padding:0;height:auto', onclick: function () { location.hash = '#/solicitar-acesso'; } }, 'Solicitar ao administrador')
        ])
      ]);

      return shell(
        'Entrar no sistema',
        'Use sua credencial aprovada pela administração.',
        form,
        {
          titulo: 'Decisões melhores começam com registros confiáveis.',
          texto: 'Consulte no navegador o histórico técnico que a equipe registra em campo pelo aplicativo Android.'
        }
      );
    }
  };

  /* Primeiro acesso do aplicativo: identifica quem assina os registros deste aparelho.
     Sem senha e sem servidor — o login entra depois, sem perder o que já foi gravado. */
  MPRO.screens.bemVindo = {
    grupo: 'A', titulo: 'Primeiro acesso',
    render: function () {
      var perfil = MPRO.session.perfil();
      var nome = h('input', { class: 'input', autocomplete: 'name', value: perfil.nome || '', placeholder: 'Como você assina os relatórios', 'aria-label': 'Nome' });
      var cargo = h('input', { class: 'input', value: perfil.cargo || '', placeholder: 'Engenheiro agrônomo', 'aria-label': 'Função' });
      var empresa = h('input', { class: 'input', autocomplete: 'organization', value: perfil.empresa || '', placeholder: 'M-PRO', 'aria-label': 'Empresa' });
      var unidade = h('select', { class: 'input', 'aria-label': 'Unidade de área' }, [
        h('option', { value: 'ha', text: 'Hectares (ha)' }),
        h('option', { value: 'm2', text: 'Metros quadrados (m²)' })
      ]);
      var erro = h('p', { class: 'form-error', hidden: true, role: 'alert' });

      var form = h('form', { class: 'auth-form', onsubmit: function (evento) {
        evento.preventDefault();
        if (!nome.value.trim()) {
          erro.hidden = false;
          erro.textContent = 'Informe ao menos o seu nome para identificar os registros.';
          return;
        }
        MPRO.session.salvarPerfil({
          nome: nome.value.trim(),
          cargo: cargo.value.trim(),
          empresa: empresa.value.trim(),
          email: ''
        });
        MPRO.store.saveSettings({ unidadeArea: unidade.value });
        location.hash = '#/';
        MPRO.router.render();
      } }, [
        h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Seu nome *' }), nome]),
        h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Função' }), cargo]),
        h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Empresa' }), empresa]),
        h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Unidade de área' }), unidade]),
        erro,
        h('button', { class: 'btn btn--filled btn--grow', type: 'submit' }, [ui.icon('arrow_forward'), 'Começar a usar']),
        h('div', { class: 'notice' }, [
          ui.icon('smartphone'),
          h('div', { class: 'notice__body' }, [
            h('strong', { text: 'Tudo fica no aparelho' }),
            h('p', { text: 'Clientes, visitas e fotos são gravados no banco local e funcionam sem internet. Quando o envio para a nuvem M-PRO for ligado, o que já está aqui sobe automaticamente.' })
          ])
        ])
      ]);

      return shell(
        'Vamos configurar o aplicativo',
        'Leva menos de um minuto e pode ser alterado depois em Perfil.',
        form,
        {
          titulo: 'Seu histórico técnico, desde a primeira visita.',
          texto: 'Registre em campo mesmo sem sinal. Cada evidência permanece ligada à visita que a originou.'
        }
      );
    }
  };
})();
