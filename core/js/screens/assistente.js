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

  function formataMarkdown(texto) {
    if (!texto) return [];
    var linhas = texto.split('\n');
    var nodes = [];
    var listaAtual = null;

    linhas.forEach(function (linha) {
      var l = linha.trim();
      if (!l) {
        listaAtual = null;
        return;
      }

      if (l.startsWith('### ')) {
        listaAtual = null;
        nodes.push(h('h4', { style: 'margin:14px 0 6px;font-size:15px;font-weight:700;color:var(--on-surface)', text: l.slice(4) }));
        return;
      }
      if (l.startsWith('## ')) {
        listaAtual = null;
        nodes.push(h('h3', { style: 'margin:16px 0 8px;font-size:16px;font-weight:700;color:var(--on-surface)', text: l.slice(3) }));
        return;
      }

      if (l.startsWith('* ') || l.startsWith('- ')) {
        if (!listaAtual) {
          listaAtual = h('ul', { style: 'margin:6px 0;padding-left:20px;display:flex;flex-direction:column;gap:4px' });
          nodes.push(listaAtual);
        }
        var itemTexto = l.slice(2).replace(/\*\*(.*?)\*\*/g, '$1');
        listaAtual.appendChild(h('li', { style: 'font-size:14px;line-height:1.5', text: itemTexto }));
        return;
      }

      listaAtual = null;
      var p = h('p', { style: 'margin:6px 0;font-size:14px;line-height:1.6', text: l.replace(/\*\*(.*?)\*\*/g, '$1') });
      nodes.push(p);
    });

    return nodes.length ? nodes : [h('p', { text: texto })];
  }

  function balao(mensagem) {
    return h('div', { class: 'message message--' + mensagem.autor }, [
      mensagem.autor === 'ia' ? h('span', { class: 'message__avatar' }, [ui.icon('psychology')]) : null,
      h('div', { class: 'message__bubble' }, [
        mensagem.autor === 'ia'
          ? h('div', { class: 'message__content' }, formataMarkdown(mensagem.texto))
          : h('p', { style: 'white-space:pre-line', text: mensagem.texto }),
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
          icone: 'psychology',
          titulo: 'Nada para consultar ainda',
          texto: 'Cadastre um cliente e registre uma visita. A consulta só responde com base no que estiver gravado neste aparelho.',
          acao: { rotulo: 'Cadastrar cliente', icone: 'person_add', onClick: function () { location.hash = '#/clientes?novo=1'; } }
        });
      }
      if (!clienteId || !MPRO.store.client(clienteId)) clienteId = clientes[0].id;
      var cliente = MPRO.store.client(clienteId);

      var input = h('textarea', {
        class: 'chat-composer__input', rows: '1',
        placeholder: 'Pergunte sobre o histórico, manejo de solo, irrigação ou sanidade…',
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
      var sugestoes = [
        'Quais recomendações de manejo estão em aberto?',
        'O que foi observado sobre irrigação e solo na última visita?',
        'Como identificar e corrigir deficiência de potássio nesta cultura?'
      ];

      return h('div', { class: 'assistant-page' }, [
        h('section', { class: 'assistant-scope' }, [
          h('div', { class: 'assistant-scope__title' }, [
            ui.icon('filter_alt'),
            h('span', {}, [h('small', { text: 'ESCOPO ATIVO' }), h('strong', { text: 'Produtor e registros selecionados' })])
          ]),
          h('div', { class: 'demo-callout', style: 'border-left: 3px solid var(--secondary)' }, [
            ui.icon(remoto ? 'psychology' : 'search'),
            h('span', {}, [
              h('strong', { text: remoto ? 'IA Agronômica (NVIDIA Nemotron 3 Ultra)' : 'Busca local, sem IA' }),
              h('small', { text: remoto ? 'Análise avançada com base nos históricos de campo' : 'Consulta direta no banco deste aparelho' })
            ])
          ]),
          h('label', { class: 'field' }, [
            h('span', { class: 'field__label', text: 'Produtor / Fazenda' }),
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
          h('p', { text: 'A IA analisa os dados deste produtor e sugere recomendações práticas baseadas no histórico de campo.' })
        ]),
        h('section', { class: 'chat-panel' }, [
          h('div', { class: 'chat-log', 'aria-live': 'polite' }, mensagens.length
            ? mensagens.map(balao).concat(pensando ? [h('div', { class: 'message message--ia' }, [
              h('span', { class: 'message__avatar' }, [ui.icon('psychology')]),
              h('div', { class: 'message__bubble' }, [h('p', { class: 'dim', text: 'Analisando histórico de campo com a IA Nemotron…' })])
            ])] : [])
            : h('div', { class: 'chat-empty' }, [
              ui.icon('psychology'),
              h('h2', { text: 'Assistente Agronômico Inteligente' }),
              h('p', { text: 'Faça perguntas técnicas sobre histórico de visitas, controle de pragas, calagem, irrigação ou medições.' }),
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
