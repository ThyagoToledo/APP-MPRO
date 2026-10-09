window.MPRO = window.MPRO || {};
(function () {
  var h = MPRO.ui.h;
  MPRO.screens.privacidade = {
    grupo: 'C', titulo: 'Privacidade e conta', voltar: true,
    render: function () {
      var runtime = window.MPRO_RUNTIME || {};
      var email = h('input', { type: 'email', class: 'input', required: true, autocomplete: 'username', value: (MPRO.session.usuario() || {}).email || '', 'aria-label': 'E-mail da conta' });
      var senha = h('input', { type: 'password', class: 'input', required: true, autocomplete: 'current-password', 'aria-label': 'Senha atual' });
      var confirmacao = h('input', { class: 'input', required: true, placeholder: 'Digite EXCLUIR', 'aria-label': 'Confirmação de exclusão' });
      var btn = h('button', { class: 'btn btn--outline', type: 'submit' }, 'Excluir minha conta e dados');
      return h('div', { class: 'profile-page' }, [
        h('h2', { text: 'Seus dados no M-PRO Campo' }),
        h('p', { text: 'Nome, e-mail e informações profissionais identificam sua conta. Clientes, fazendas, visitas, fotos, notas de áudio e coordenadas informadas são salvos no aparelho e sincronizados com o backend M-PRO hospedado na Vercel, banco Neon e armazenamento Vercel Blob.' }),
        h('p', { text: 'A localização é usada durante o uso para registrar a posição. O microfone grava notas de campo. Fotos são selecionadas por você. Você pode negar permissões nas configurações do Android. A consulta ao assistente envia a pergunta e o contexto selecionado ao serviço de IA NVIDIA. Mapas online usam serviços OpenStreetMap/Esri.' }),
        h('a', { class: 'btn btn--text', href: (runtime.backendUrl || '') + '/web/privacidade.html', target: '_blank', rel: 'noopener', text: 'Ler política de privacidade completa' }),
        runtime.supportEmail ? h('a', { href: 'mailto:' + runtime.supportEmail, text: 'Suporte: ' + runtime.supportEmail }) : null,
        h('h2', { text: 'Excluir conta e dados' }),
        h('p', { text: 'A exclusão é permanente: remove a conta, os registros sincronizados, relatos de IA e os arquivos enviados pela versão atual. Também limpa os dados desta conta neste aparelho. Em outros aparelhos, apague o armazenamento local nas configurações. Arquivos legados sem identificação de conta exigem contato com o suporte. Solicitações de acesso pendentes também podem ser excluídas.' }),
        h('form', { class: 'profile-form', onsubmit: function (event) {
          event.preventDefault();
          if (confirmacao.value !== 'EXCLUIR') { MPRO.ui.snack('Digite EXCLUIR para confirmar.'); return; }
          MPRO.ui.confirmSheet({ titulo: 'Excluir definitivamente?', texto: 'A conta e os registros serão removidos. Esta ação não pode ser desfeita.', confirmar: 'Excluir conta', onConfirm: function () {
            btn.disabled = true;
            fetch(MPRO.apiUrl('account'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.value, senha: senha.value, confirmacao: confirmacao.value }) }).then(function (res) {
              return res.json().then(function (data) { if (!res.ok) throw new Error(data.error); return data; });
            }).then(function () {
              var atual = MPRO.session.usuario();
              if (atual && atual.email.toLowerCase() === email.value.trim().toLowerCase()) { MPRO.db.limpar(); localStorage.removeItem('mpro.termos_aceitos_' + atual.email.toLowerCase()); return MPRO.session.sair(); }
            }).then(function () { MPRO.ui.snack('Conta excluída.'); location.hash = '#/login'; MPRO.router.render(); }).catch(function (e) { MPRO.ui.snack(e.message); }).finally(function () { btn.disabled = false; });
          } });
        } }, [h('label', { class: 'field' }, ['E-mail', email]), h('label', { class: 'field' }, ['Senha atual', senha]), h('label', { class: 'field' }, ['Confirmação', confirmacao]), btn])
      ]);
    }
  };
})();
