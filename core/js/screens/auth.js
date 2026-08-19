/* Telas de entrada e consentimento LGPD. Qual delas existe depende da plataforma:

   - modo 'gated' (web): Entrar e Solicitar acesso com aceite de Termos de Serviço e LGPD.
   - modo 'local' (mobile): Primeiro acesso. Sem senha: o técnico só informa como quer ser
     identificado nos relatórios gerados neste aparelho. */
window.MPRO = window.MPRO || {};
MPRO.screens = MPRO.screens || {};

(function () {
  var ui = MPRO.ui;
  var h = ui.h;

  /**
   * Abre o Modal com os Termos de Serviço e Política de Privacidade (LGPD - Lei nº 13.709/2018)
   */
  function abrirTermosLgpd(onAceitar, obrigatorio) {
    var concordou = !obrigatorio;

    var check = h('input', {
      type: 'checkbox',
      id: 'check-consentimento-lgpd',
      style: 'width:20px;height:20px;accent-color:var(--secondary);cursor:pointer;flex-shrink:0;margin-top:2px',
      onchange: function (e) {
        concordou = e.target.checked;
        if (btnAceitar) btnAceitar.disabled = !concordou;
      }
    });

    var btnAceitar = h('button', {
      class: 'btn btn--filled btn--grow',
      type: 'button',
      disabled: obrigatorio,
      style: 'height:46px;font-weight:700;font-size:15px',
      onclick: function () {
        var agoraIso = new Date().toISOString();
        localStorage.setItem('mpro.termos_aceitos', JSON.stringify({
          versao: '1.0',
          aceitoEm: agoraIso,
          lgpd: true
        }));
        var emailInput = document.querySelector('input[type="email"]');
        if (emailInput && emailInput.value) {
          localStorage.setItem('mpro.termos_aceitos_' + emailInput.value.trim().toLowerCase(), JSON.stringify({
            versao: '1.0',
            aceitoEm: agoraIso,
            lgpd: true
          }));
        }
        ui.closeSheet();
        ui.snack('Termos de Serviço e Privacidade aceitos com sucesso!');
        if (onAceitar) onAceitar();
      }
    }, [ui.icon('verified_user'), obrigatorio ? 'Concordar e Acessar o Sistema' : 'Entendido e Aceito']);

    var corpoTermos = [
      h('div', { class: 'termos-wrapper', style: 'display:flex;flex-direction:column;gap:16px;max-height:60vh;overflow-y:auto;padding-right:4px;font-size:14px;line-height:1.6;color:var(--on-surface)' }, [
        h('div', { class: 'notice', style: 'border-left:3px solid var(--secondary);background:var(--surface-container-high);padding:10px 14px' }, [
          ui.icon('gavel'),
          h('div', { class: 'notice__body' }, [
            h('strong', { text: 'Conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)' }),
            h('p', { style: 'font-size:12px;margin:0', text: 'Ao utilizar a plataforma M-PRO, você concorda com o tratamento transparente e seguro dos seus dados técnicos e cadastrais.' })
          ])
        ]),

        h('section', {}, [
          h('h4', { style: 'margin:0 0 6px;color:var(--primary);font-size:15px;font-weight:700', text: '1. Objeto e Finalidade da Plataforma' }),
          h('p', { text: 'A plataforma M-PRO (Manejo de Precisão em Recursos Operacionais) destina-se à auditoria, acompanhamento e emissão de laudos técnicos de visitas agronômicas, gestão de lavouras, calibração de equipamentos de precisão e suporte a decisões agrícolas assistidas por Inteligência Artificial.' })
        ]),

        h('section', {}, [
          h('h4', { style: 'margin:0 0 6px;color:var(--primary);font-size:15px;font-weight:700', text: '2. Dados Pessoais e Técnicos Coletados' }),
          h('ul', { style: 'margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px' }, [
            h('li', { text: 'Dados Cadastrais do Usuário: Nome completo, e-mail profissional, cargo, empresa/propriedade vinculada e credenciais de acesso sob criptografia salgada.' }),
            h('li', { text: 'Dados de Campo e Visitas: Registros agronômicos, medições físico-químicas de solo e água, histórico de manejo e recomendações técnicas.' }),
            h('li', { text: 'Evidências Multimídia: Fotografias de lavoura e notas de áudio/voz de campo para fins de registro e transcrição técnica.' }),
            h('li', { text: 'Coordenadas Geográficas (GPS): Coletadas estritamente durante o registro de visitas e fotos para localização territorial dos talhões e pivôs inspecionados.' })
          ])
        ]),

        h('section', {}, [
          h('h4', { style: 'margin:0 0 6px;color:var(--primary);font-size:15px;font-weight:700', text: '3. Bases Legais do Tratamento (Art. 7º e 11 da LGPD)' }),
          h('p', { text: 'O tratamento de dados é realizado com fundamento na Execução de Contrato e procedimentos preliminares (Art. 7º, V), no Legítimo Interesse do controlador para aprimoramento da atividade agronômica (Art. 7º, IX) e no Cumprimento de Obrigação Legal e Regulatória (Art. 7º, II).' })
        ]),

        h('section', {}, [
          h('h4', { style: 'margin:0 0 6px;color:var(--primary);font-size:15px;font-weight:700', text: '4. Armazenamento Seguro, Sigilo e Não Compartilhamento' }),
          h('p', { text: 'Os dados são armazenados em nuvem sob conexões criptografadas (HTTPS/TLS 1.3), bancos de dados com isolamento estrito (PostgreSQL Neon) e CDN de objetos protegida (Vercel Blob). A M-PRO não comercializa nem compartilha dados cadastrais ou históricos técnicos com terceiros para fins publicitários.' })
        ]),

        h('section', {}, [
          h('h4', { style: 'margin:0 0 6px;color:var(--primary);font-size:15px;font-weight:700', text: '5. Inteligência Artificial e Sigilo Contextual' }),
          h('p', { text: 'A Consulta Assistida por IA processa unicamente os registros técnicos do escopo autorizado pelo agrônomo responsável. As consultas não são utilizadas para treinamento público ou vazamento de segredos agronômicos entre diferentes clientes.' })
        ]),

        h('section', {}, [
          h('h4', { style: 'margin:0 0 6px;color:var(--primary);font-size:15px;font-weight:700', text: '6. Direitos do Titular de Dados (Art. 18 da LGPD)' }),
          h('p', { text: 'O usuário pode a qualquer momento confirmar a existência de tratamento, solicitar acesso aos seus dados cadastrais, requerer a correção de informações incompletas ou solicitar a exclusão de sua conta através do painel de perfil ou canal de suporte.' })
        ]),

        h('section', {}, [
          h('h4', { style: 'margin:0 0 6px;color:var(--primary);font-size:15px;font-weight:700', text: '7. Responsabilidade do Usuário' }),
          h('p', { text: 'O usuário é responsável pela veracidade dos dados técnicos inseridos e pela guarda confidencial de suas credenciais de acesso.' })
        ])
      ]),

      obrigatorio ? h('div', {
        style: 'margin-top:14px;padding:12px;background:var(--surface-container-high);border-radius:var(--r-md);display:flex;align-items:flex-start;gap:10px'
      }, [
        check,
        h('label', {
          for: 'check-consentimento-lgpd',
          style: 'font-size:13px;line-height:1.4;cursor:pointer;color:var(--on-surface)',
          text: 'Declaro que li, compreendi e concordo integralmente com os Termos de Serviço e a Política de Privacidade (LGPD) da plataforma M-PRO.'
        })
      ]) : null
    ];

    ui.openSheet({
      titulo: 'Termos de Serviço e Privacidade (LGPD)',
      body: corpoTermos,
      footer: [
        obrigatorio ? null : h('button', { class: 'btn btn--text', type: 'button', onclick: ui.closeSheet }, 'Fechar'),
        btnAceitar
      ].filter(Boolean)
    });
  }

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
      var checkLgpd = h('input', { type: 'checkbox', id: 'check-solicitar-lgpd', style: 'width:18px;height:18px;accent-color:var(--secondary);cursor:pointer;flex-shrink:0;margin-top:2px' });
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
        if (!checkLgpd.checked) { falha('Você precisa aceitar os Termos de Serviço e LGPD para solicitar acesso.'); return; }

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
        h('div', { style: 'display:flex;align-items:flex-start;gap:8px;margin-top:4px;margin-bottom:6px' }, [
          checkLgpd,
          h('label', { for: 'check-solicitar-lgpd', style: 'font-size:12px;line-height:1.4;color:var(--on-surface-variant);cursor:pointer' }, [
            'Li e concordo com os ',
            h('button', {
              class: 'btn btn--text', type: 'button',
              style: 'padding:0;height:auto;font-size:12px;text-decoration:underline;display:inline',
              onclick: function () { abrirTermosLgpd(null, false); }
            }, 'Termos de Serviço e Privacidade (LGPD)'),
            ' da M-PRO.'
          ])
        ]),
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

      function realizarLogin() {
        enviar.disabled = true;
        enviar.textContent = 'Verificando…';
        var emailNorm = email.value.trim().toLowerCase();
        MPRO.session.entrar(emailNorm, senha.input.value)
          .then(function () {
            var agoraIso = new Date().toISOString();
            localStorage.setItem('mpro.termos_aceitos', JSON.stringify({ versao: '1.0', aceitoEm: agoraIso, lgpd: true }));
            localStorage.setItem('mpro.termos_aceitos_' + emailNorm, JSON.stringify({ versao: '1.0', aceitoEm: agoraIso, lgpd: true }));
            location.hash = '#/';
            MPRO.router.render();
          })
          .catch(function (e) { falha(e.message); });
      }

      var form = h('form', { class: 'auth-form', onsubmit: function (evento) {
        evento.preventDefault();
        erro.hidden = true;
        var emailNorm = email.value.trim().toLowerCase();
        if (!emailNorm || !senha.input.value) {
          falha('Informe e-mail e senha para continuar.');
          return;
        }

        // Verifica se os Termos LGPD já foram aceitos globalmente ou para esta conta
        var termosSalvos = localStorage.getItem('mpro.termos_aceitos');
        var termosUsuario = localStorage.getItem('mpro.termos_aceitos_' + emailNorm);
        if (!termosSalvos && !termosUsuario) {
          // Primeiro login: abre o Pop-up obrigatório de Termos de Serviço LGPD
          abrirTermosLgpd(function () {
            realizarLogin();
          }, true);
        } else {
          realizarLogin();
        }
      } }, [
        h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'E-mail / Gmail' }), email]),
        senha.node,
        erro,
        enviar,
        h('div', { class: 'notice', style: 'margin-top:4px' }, [
          ui.icon('verified_user'),
          h('div', { class: 'notice__body' }, [
            h('strong', { text: 'Acesso restrito & Protegido por LGPD' }),
            h('p', { text: 'Entram apenas cadastros aprovados pela administração.' })
          ])
        ]),
        h('div', { style: 'text-align:center;margin-top:10px;font-size:12px;color:var(--on-surface-variant)' }, [
          'Ao acessar a plataforma, você concorda com nossos ',
          h('button', {
            class: 'btn btn--text',
            type: 'button',
            style: 'padding:0;height:auto;font-size:12px;text-decoration:underline;display:inline',
            onclick: function () { abrirTermosLgpd(null, false); }
          }, 'Termos de Serviço e Privacidade (LGPD)')
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

  /* Primeiro acesso do aplicativo mobile: identifica quem assina os registros deste aparelho. */
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
