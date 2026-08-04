/* Assistente demonstrativo com escopo explícito e respostas sempre referenciadas. */
window.MPRO = window.MPRO || {};
MPRO.screens = MPRO.screens || {};

MPRO.screens.assistente = (function () {
  var ui = MPRO.ui;
  var h = ui.h;
  var clienteId = 'cli-boa-vista';
  var mensagens = [];

  function referencia(cliente) {
    return h('button', { class: 'source-card', type: 'button', onclick: function () { location.hash = '#/cliente?id=' + cliente.id; } }, [
      ui.icon('description'),
      h('span', {}, [h('strong', { text: 'Visita de ' + ui.formatDate(cliente.ultimaVisita) }), h('small', { text: cliente.nome + ' · Irrigação' })]),
      ui.icon('arrow_forward')
    ]);
  }

  function responder(pergunta, ctx) {
    var cliente = MPRO.store.client(clienteId) || MPRO.store.clients()[0];
    mensagens.push({ autor: 'usuario', texto: pergunta });
    if (!cliente) {
      mensagens.push({ autor: 'ia', texto: 'Não há cliente no escopo atual. Cadastre um cliente antes de consultar o histórico.', semFonte: true });
      ctx.rerender();
      return;
    }

    var termo = pergunta.toLowerCase();
    var resposta;
    if (termo.indexOf('irriga') !== -1 || termo.indexOf('press') !== -1) {
      resposta = 'O último registro aponta pressão de 1,5 bar no pivô 2, abaixo dos 2,0 bar esperados. A ação registrada é recalibrar a pressão e revisar os emissores do setor sul.';
    } else if (termo.indexOf('recomenda') !== -1 || termo.indexOf('pend') !== -1) {
      resposta = cliente.recomendacao || 'O histórico selecionado não registra recomendação em aberto.';
    } else {
      resposta = 'No escopo selecionado, o último laudo está classificado como ' + ui.status(cliente.status).rotulo.toLowerCase() + '. Posso detalhar irrigação, medições ou recomendações registradas.';
    }
    mensagens.push({ autor: 'ia', texto: resposta, cliente: cliente });
    ctx.rerender();
  }

  return {
    grupo: 'B', chave: 'assistente', titulo: 'Assistente IA',
    render: function (ctx) {
      var clientes = MPRO.store.clients();
      if (!clientes.length) return ui.emptyState({ icone: 'smart_toy', titulo: 'Assistente sem escopo', texto: 'Cadastre um cliente e finalize uma visita para consultar evidências do histórico.' });
      if (!MPRO.store.client(clienteId)) clienteId = clientes[0].id;
      var cliente = MPRO.store.client(clienteId);
      var input = h('textarea', { class: 'chat-composer__input', rows: '1', placeholder: 'Pergunte sobre o histórico deste cliente', 'aria-label': 'Pergunta para o assistente' });

      function enviar() {
        var pergunta = input.value.trim();
        if (!pergunta) return;
        responder(pergunta, ctx);
      }

      input.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          enviar();
        }
      });

      var sugestoes = ['Quais pendências estão abertas?', 'O que mudou na irrigação?', 'Resuma o último laudo'];
      return h('div', { class: 'assistant-page' }, [
        h('section', { class: 'assistant-scope' }, [
          h('div', { class: 'assistant-scope__title' }, [ui.icon('filter_alt'), h('span', {}, [h('small', { text: 'ESCOPO ATIVO' }), h('strong', { text: 'Um cliente · todo o histórico finalizado' })])]),
          h('div', { class: 'demo-callout' }, [ui.icon('science'), h('span', {}, [h('strong', { text: 'Modo demonstrativo' }), h('small', { text: 'Respostas locais para validar o fluxo. Nenhum dado é enviado.' })])]),
          h('label', { class: 'field' }, [h('span', { class: 'field__label', text: 'Cliente' }), h('select', { class: 'input', 'aria-label': 'Cliente no escopo', onchange: function (event) { clienteId = event.target.value; mensagens = []; ctx.rerender(); } }, clientes.map(function (item) { return h('option', { value: item.id, selected: item.id === clienteId, text: item.nome }); }))]),
          h('div', { class: 'scope-summary' }, [ui.statusTag(cliente.status), h('span', { class: 'mono', text: (cliente.unidades[0] || 'sem unidade') + ' · ' + cliente.cultura })]),
          h('p', { text: 'O assistente consulta somente laudos finalizados deste escopo e indica a origem de cada afirmação.' })
        ]),
        h('section', { class: 'chat-panel' }, [
          h('div', { class: 'chat-log', 'aria-live': 'polite' }, mensagens.length ? mensagens.map(function (mensagem) {
            return h('div', { class: 'message message--' + mensagem.autor }, [
              mensagem.autor === 'ia' ? h('span', { class: 'message__avatar' }, [ui.icon('smart_toy')]) : null,
              h('div', { class: 'message__bubble' }, [h('p', { text: mensagem.texto }), mensagem.cliente ? referencia(mensagem.cliente) : null, mensagem.semFonte ? h('span', { class: 'source-warning' }, [ui.icon('warning'), 'Resposta sem fonte factual']) : null])
            ]);
          }) : h('div', { class: 'chat-empty' }, [ui.icon('forum'), h('h2', { text: 'Consulte o histórico técnico' }), h('p', { text: 'Pergunte por mudanças, medições ou pendências. A resposta mantém o cliente e a visita de origem visíveis.' }), h('div', { class: 'quick-prompts' }, sugestoes.map(function (sugestao) { return h('button', { class: 'chip chip--lg', type: 'button', onclick: function () { responder(sugestao, ctx); } }, sugestao); }))])),
          h('div', { class: 'chat-composer' }, [input, h('button', { class: 'chat-composer__send', type: 'button', 'aria-label': 'Enviar pergunta', onclick: enviar }, [ui.icon('arrow_upward')]), h('span', { class: 'chat-composer__hint', text: 'Enter envia · Shift + Enter quebra a linha' })])
        ])
      ]);
    }
  };
})();
