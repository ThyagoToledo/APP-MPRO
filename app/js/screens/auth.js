/* Entrada e cadastro locais para alternar os escopos demonstrativo e novo. */
window.MPRO = window.MPRO || {};
MPRO.screens = MPRO.screens || {};

(function () {
  var ui = MPRO.ui;
  var h = ui.h;

  function campoSenha(rotulo) {
    var input = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', 'aria-label': rotulo });
    var botao = h('button', { class: 'password-toggle', type: 'button', 'aria-label': 'Mostrar senha', onclick: function () {
      var visivel = input.type === 'text';
      input.type = visivel ? 'password' : 'text';
      botao.setAttribute('aria-label', visivel ? 'Mostrar senha' : 'Ocultar senha');
      botao.innerHTML = '';
      botao.appendChild(ui.icon(visivel ? 'visibility' : 'visibility_off'));
    } }, [ui.icon('visibility')]);
    return { node: h('label', { class: 'field' }, [h('span', { class: 'field__label', text: rotulo }), h('div', { class: 'password-field' }, [input, botao])]), input: input };
  }

  function shell(titulo, subtitulo, formulario, lateral) {
    return h('div', { class: 'auth-shell' }, [
      h('aside', { class: 'auth-brand' }, [ui.brand(), h('div', { class: 'auth-brand__copy' }, [h('span', { class: 'mono', text: 'UTILITÁRIO DE CAMPO' }), h('h1', { text: lateral.titulo }), h('p', { text: lateral.texto })]), h('div', { class: 'auth-brand__signal' }, [ui.icon('offline_bolt'), h('span', { text: 'Rascunhos locais e operação resiliente em campo' })])]),
      h('main', { class: 'auth-panel' }, [h('div', { class: 'auth-panel__brand' }, [ui.brand()]), h('div', { class: 'auth-heading' }, [h('span', { class: 'mono', text: 'M-PRO CAMPO' }), h('h2', { text: titulo }), h('p', { text: subtitulo })]), formulario])
    ]);
  }

  MPRO.screens.login = {
    grupo: 'A', titulo: 'Entrar',
    render: function () {
      var email = h('input', { class: 'input', type: 'email', autocomplete: 'email', placeholder: 'voce@empresa.com.br', 'aria-label': 'E-mail' });
      var senha = campoSenha('Senha');
      var erro = h('p', { class: 'form-error', hidden: true, role: 'alert' });
      var form = h('form', { class: 'auth-form', onsubmit: function (event) {
        event.preventDefault();
        if (!email.value.trim() || !senha.input.value) {
          erro.hidden = false;
          erro.textContent = 'Informe e-mail e senha para continuar.';
          return;
        }
        MPRO.store.setAccount(email.value.toLowerCase().indexOf('demo') !== -1 ? 'demo' : 'nova');
        location.hash = '#/';
      } }, [
        h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'E-mail' }), email]),
        senha.node,
        erro,
        h('button', { class: 'btn btn--filled btn--grow', type: 'submit' }, [ui.icon('login'), 'Entrar']),
        h('div', { class: 'auth-divider' }, [h('span', { text: 'ou' })]),
        h('button', { class: 'btn btn--outline btn--grow', type: 'button', onclick: function () { MPRO.store.setAccount('demo'); location.hash = '#/'; } }, [ui.icon('science'), 'Acessar demonstração']),
        h('p', { class: 'auth-switch' }, ['Ainda não tem conta? ', h('a', { href: '#/registro', text: 'Criar conta' })])
      ]);
      return shell('Bem-vindo de volta', 'Entre para continuar seus registros de campo.', form, { titulo: 'Decisões melhores começam com registros confiáveis.', texto: 'Organize visitas, medições e evidências em um histórico técnico que acompanha cada cliente.' });
    }
  };

  MPRO.screens.registro = {
    grupo: 'A', titulo: 'Criar conta',
    render: function () {
      var nome = h('input', { class: 'input', autocomplete: 'name', 'aria-label': 'Nome completo' });
      var email = h('input', { class: 'input', type: 'email', autocomplete: 'email', 'aria-label': 'E-mail profissional' });
      var empresa = h('input', { class: 'input', autocomplete: 'organization', 'aria-label': 'Empresa' });
      var senha = campoSenha('Senha');
      var termos = h('input', { type: 'checkbox' });
      var erro = h('p', { class: 'form-error', hidden: true, role: 'alert' });
      var form = h('form', { class: 'auth-form', onsubmit: function (event) {
        event.preventDefault();
        if (!nome.value.trim() || !email.value.trim() || senha.input.value.length < 8 || !termos.checked) {
          erro.hidden = false;
          erro.textContent = 'Preencha os campos, aceite os termos e use uma senha com ao menos 8 caracteres.';
          return;
        }
        MPRO.store.setAccount('nova');
        MPRO.store.updateUser({ nome: nome.value.trim(), email: email.value.trim(), empresa: empresa.value.trim() || 'M-PRO', cargo: 'Responsável técnico' });
        location.hash = '#/';
      } }, [
        h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Nome completo *' }), nome]),
        h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'E-mail profissional *' }), email]),
        h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Empresa' }), empresa]),
        senha.node,
        h('span', { class: 'password-hint', text: 'Use ao menos 8 caracteres.' }),
        h('label', { class: 'check-consent' }, [termos, h('span', { text: 'Li e aceito os termos de uso desta versão de validação.' })]),
        erro,
        h('button', { class: 'btn btn--filled btn--grow', type: 'submit' }, [ui.icon('person_add'), 'Criar conta']),
        h('p', { class: 'auth-switch' }, ['Já tem conta? ', h('a', { href: '#/login', text: 'Entrar' })])
      ]);
      return shell('Comece uma carteira limpa', 'A conta nova não recebe nenhum dado de demonstração.', form, { titulo: 'Seu histórico técnico, desde a primeira visita.', texto: 'Cada cliente começa isolado e cada evidência permanece ligada ao registro que a originou.' });
    }
  };
})();
