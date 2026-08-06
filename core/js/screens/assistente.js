/* Consulta assistida. A tela não sabe responder nada: ela delega a MPRO.ia, que recupera
   os trechos do banco local e — quando houver servidor configurado — os envia para a nuvem.
   O rótulo do modo fica sempre visível, para que ninguém confunda busca local com IA. */
window.MPRO = window.MPRO || {};
MPRO.screens = MPRO.screens || {};

MPRO.screens.assistente = (function () {
  var ui = MPRO.ui;
  var h = ui.h;
  var clienteId = null;
  var mensagens = [];
  var pensando = false;

  function referencia(ref) {
    return h('button', { class: 'source-card', type: 'button', onclick: function () { location.hash = ref.rota; } }, [
      ui.icon('description'),
      h('span', {}, [
        h('strong', { text: ref.titulo }),
        h('small', { text: ref.data ? ui.formatDate(ref.data) : 'registro local' })
      ]),
      ui.icon('arrow_forward')
    ]);
  }

  function perguntar(texto, ctx) {
    if (pensando) return;
    mensagens.push({ autor: 'usuario', texto: texto });
    pensando = true;
    ctx.rerender();

    MPRO.ia.perguntar({ pergunta: texto, clienteId: clienteId })
      .then(function (resposta) {
        mensagens.push({
          autor: 'ia',
          texto: resposta.texto,
          referencias: resposta.referencias,
          semEvidencia: resposta.semEvidencia,
          degradado: resposta.degradado
        });
      })
      .catch(function (erro) {
        mensagens.push({ autor: 'ia', texto: erro.message, semEvidencia: true, referencias: [] });
      })
      .then(function () {
        pensando = false;
        ctx.rerender();
      });
  }

  function balao(mensagem) {
    return h('div', { class: 'message message--' + mensagem.autor }, [
      mensagem.autor === 'ia' ? h('span', { class: 'message__avatar' }, [ui.icon('travel_explore')]) : null,
      h('div', { class: 'message__bubble' }, [
        h('p', { style: 'white-space:pre-line', text: mensagem.texto }),
        (mensagem.referencias || []).map(referencia),
        mensagem.degradado ? h('span', { class: 'source-warning' }, [ui.icon('cloud_off'), 'O servidor não respondeu; esta resposta veio da busca local']) : null,
        mensagem.semEvidencia ? h('span', { class: 'source-warning' }, [ui.icon('warning'), 'Sem registro correspondente no banco']) : null
      ])
    ]);
  }

  return {
    grupo: 'B', chave: 'assistente', titulo: 'Consulta assistida',
    render: function (ctx) {
      var clientes = MPRO.store.clients();
      if (!clientes.length) {
        return ui.emptyState({
          icone: 'travel_explore',
          titulo: 'Nada para consultar ainda',
          texto: 'Cadastre um cliente e registre uma visita. A consulta só responde com base no que estiver gravado neste aparelho.',
          acao: { rotulo: 'Cadastrar cliente', icone: 'person_add', onClick: function () { location.hash = '#/clientes?novo=1'; } }
        });
      }
      if (!clienteId || !MPRO.store.client(clienteId)) clienteId = clientes[0].id;
      var cliente = MPRO.store.client(clienteId);

      var input = h('textarea', {
        class: 'chat-composer__input', rows: '1',
        placeholder: 'Pergunte sobre o histórico deste cliente',
        'aria-label': 'Pergunta sobre o histórico'
      });

      function enviar() {
        var pergunta = input.value.trim();
        if (pergunta) perguntar(pergunta, ctx);
      }

      input.addEventListener('keydown', function (evento) {
        if (evento.key === 'Enter' && !evento.shiftKey) {
          evento.preventDefault();
          enviar();
        }
      });

      var remoto = MPRO.ia.modo() === 'remoto';
      var sugestoes = ['Quais recomendações estão em aberto?', 'O que foi medido na última visita?', 'Como está a irrigação?'];

      return h('div', { class: 'assistant-page' }, [
        h('section', { class: 'assistant-scope' }, [
          h('div', { class: 'assistant-scope__title' }, [
            ui.icon('filter_alt'),
            h('span', {}, [h('small', { text: 'ESCOPO ATIVO' }), h('strong', { text: 'Um cliente · registros deste aparelho' })])
          ]),
          h('div', { class: 'demo-callout' }, [
            ui.icon(remoto ? 'cloud' : 'search'),
            h('span', {}, [
              h('strong', { text: remoto ? 'Consulta pelo servidor M-PRO' : 'Busca local, sem IA' }),
              h('small', { text: MPRO.ia.rotuloModo() })
            ])
          ]),
          h('label', { class: 'field' }, [
            h('span', { class: 'field__label', text: 'Cliente' }),
            h('select', {
              class: 'input', 'aria-label': 'Cliente no escopo',
              onchange: function (evento) { clienteId = evento.target.value; mensagens = []; ctx.rerender(); }
            }, clientes.map(function (item) {
              return h('option', { value: item.id, selected: item.id === clienteId, text: item.nome });
            }))
          ]),
          h('div', { class: 'scope-summary' }, [
            ui.statusTag(cliente.status),
            h('span', { class: 'mono', text: ((cliente.unidades || [])[0] || 'sem unidade') + ' · ' + (cliente.cultura || 'sem cultura') })
          ]),
          h('p', { text: 'A consulta lê apenas registros deste cliente e indica a visita de origem de cada trecho citado.' })
        ]),
        h('section', { class: 'chat-panel' }, [
          h('div', { class: 'chat-log', 'aria-live': 'polite' }, mensagens.length
            ? mensagens.map(balao).concat(pensando ? [h('div', { class: 'message message--ia' }, [
              h('span', { class: 'message__avatar' }, [ui.icon('travel_explore')]),
              h('div', { class: 'message__bubble' }, [h('p', { class: 'dim', text: 'Procurando nos registros…' })])
            ])] : [])
            : h('div', { class: 'chat-empty' }, [
              ui.icon('forum'),
              h('h2', { text: 'Consulte o histórico técnico' }),
              h('p', { text: 'Pergunte por medições, recomendações ou equipamentos. A resposta cita o registro de origem e nunca inventa conclusão.' }),
              h('div', { class: 'quick-prompts' }, sugestoes.map(function (sugestao) {
                return h('button', { class: 'chip chip--lg', type: 'button', onclick: function () { perguntar(sugestao, ctx); } }, sugestao);
              }))
            ])),
          h('div', { class: 'chat-composer' }, [
            input,
            h('button', { class: 'chat-composer__send', type: 'button', 'aria-label': 'Enviar pergunta', disabled: pensando, onclick: enviar }, [ui.icon('arrow_upward')]),
            h('span', { class: 'chat-composer__hint', text: 'Enter envia · Shift + Enter quebra a linha' })
          ])
        ])
      ]);
    }
  };
})();
