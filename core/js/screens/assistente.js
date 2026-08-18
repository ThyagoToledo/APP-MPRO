/* Consulta assistida. A tela não sabe responder nada: ela delega a MPRO.ia, que recupera
   os trechos do banco local e — quando houver servidor configurado — os envia para a nuvem.
   O rótulo do modo fica sempre visível, para que ninguém confunda busca local com IA. */
window.MPRO = window.MPRO || {};
MPRO.screens = MPRO.screens || {};

MPRO.screens.assistente = (function () {
  var ui = MPRO.ui;
  var h = ui.h;
  var modoEscopo = 'unico'; // 'unico' | 'multiplo' | 'todos'
  var clienteId = null;
  var clientesSelecionados = [];
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

    var payload = { pergunta: texto };
    if (modoEscopo === 'todos') {
      payload.todos = true;
    } else if (modoEscopo === 'multiplo') {
      payload.clienteIds = clientesSelecionados.length ? clientesSelecionados : (clienteId ? [clienteId] : []);
    } else {
      payload.clienteId = clienteId;
    }

    MPRO.ia.perguntar(payload)
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
      if (!clientesSelecionados.length) clientesSelecionados = [clienteId];
      var cliente = MPRO.store.client(clienteId);

      var input = h('textarea', {
        class: 'chat-composer__input', rows: '1',
        placeholder: modoEscopo === 'todos'
          ? 'Pergunte sobre tendências, diagnósticos ou resumo geral de todos os produtores…'
          : (modoEscopo === 'multiplo'
            ? 'Compare ou pergunte sobre os ' + clientesSelecionados.length + ' produtores selecionados…'
            : 'Pergunte sobre histórico, manejo de solo ou nutrição deste produtor…'),
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

      var sugestoes = [];
      if (modoEscopo === 'todos') {
        sugestoes = [
          'Quais são os principais problemas ou alertas em aberto no portfólio?',
          'Fazer um resumo comparativo das últimas visitas de todos os produtores',
          'Quais culturas apresentam mais desafios nutricionais ou de irrigação?'
        ];
      } else if (modoEscopo === 'multiplo') {
        sugestoes = [
          'Comparar o histórico de manejo e adubação entre os produtores selecionados',
          'Quais recomendações estão pendentes entre estas fazendas?',
          'Como estão os indicadores de solo e sanidade nestes clientes?'
        ];
      } else {
        sugestoes = [
          'Quais recomendações de manejo estão em aberto?',
          'O que foi observado sobre irrigação e solo na última visita?',
          'Como identificar e corrigir deficiência de potássio nesta cultura?'
        ];
      }

      // Seletor de modo de escopo
      var abasEscopo = h('div', { class: 'tabs', style: 'margin-bottom:12px' }, [
        h('button', {
          class: 'tab' + (modoEscopo === 'unico' ? ' tab--active' : ''),
          type: 'button',
          onclick: function () { modoEscopo = 'unico'; mensagens = []; ctx.rerender(); }
        }, [ui.icon('person'), 'Único']),
        h('button', {
          class: 'tab' + (modoEscopo === 'multiplo' ? ' tab--active' : ''),
          type: 'button',
          onclick: function () { modoEscopo = 'multiplo'; mensagens = []; ctx.rerender(); }
        }, [ui.icon('group'), 'Múltiplos (' + clientesSelecionados.length + ')']),
        h('button', {
          class: 'tab' + (modoEscopo === 'todos' ? ' tab--active' : ''),
          type: 'button',
          onclick: function () { modoEscopo = 'todos'; mensagens = []; ctx.rerender(); }
        }, [ui.icon('public'), 'Todos (' + clientes.length + ')'])
      ]);

      var corpoSeletor;
      if (modoEscopo === 'unico') {
        corpoSeletor = [
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
          ])
        ];
      } else if (modoEscopo === 'multiplo') {
        corpoSeletor = [
          h('div', { style: 'margin-bottom:8px;font-size:13px;font-weight:600;color:var(--on-surface-variant)', text: 'Selecione os produtores para comparar:' }),
          h('div', { style: 'display:flex;flex-direction:column;gap:6px;max-height:180px;overflow-y:auto;padding-right:4px' }, clientes.map(function (c) {
            var selecionado = clientesSelecionados.indexOf(c.id) !== -1;
            return h('label', {
              style: 'display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:var(--r-md);background:' + (selecionado ? 'var(--surface-tint)' : 'var(--surface-raised)') + ';cursor:pointer;border:1px solid ' + (selecionado ? 'var(--primary)' : 'var(--outline-variant)')
            }, [
              h('input', {
                type: 'checkbox',
                checked: selecionado,
                onchange: function (e) {
                  if (e.target.checked) {
                    if (clientesSelecionados.indexOf(c.id) === -1) clientesSelecionados.push(c.id);
                  } else {
                    clientesSelecionados = clientesSelecionados.filter(function (id) { return id !== c.id; });
                  }
                  mensagens = [];
                  ctx.rerender();
                }
              }),
              h('span', { style: 'font-size:13px;font-weight:600;flex:1', text: c.nome }),
              h('small', { class: 'dim mono', text: c.cultura || '' })
            ]);
          }))
        ];
      } else {
        corpoSeletor = [
          h('div', { class: 'scope-summary', style: 'background:var(--surface-tint);padding:10px 12px;border-radius:var(--r-md)' }, [
            ui.icon('travel_explore', 'dim'),
            h('span', { style: 'font-size:13px;font-weight:600', text: 'Todos os ' + clientes.length + ' produtores ativos em análise' })
          ])
        ];
      }

      var rotuloEscopo = modoEscopo === 'todos'
        ? 'Todo o Portfólio (' + clientes.length + ' produtores)'
        : (modoEscopo === 'multiplo' ? clientesSelecionados.length + ' produtores selecionados' : cliente.nome);

      return h('div', { class: 'assistant-page' }, [
        h('section', { class: 'assistant-scope' }, [
          h('div', { class: 'assistant-scope__title' }, [
            ui.icon('filter_alt'),
            h('span', {}, [h('small', { text: 'ESCOPO ATIVO' }), h('strong', { text: rotuloEscopo })])
          ]),
          h('div', { class: 'demo-callout', style: 'border-left: 3px solid var(--secondary)' }, [
            ui.icon(remoto ? 'psychology' : 'search'),
            h('span', {}, [
              h('strong', { text: remoto ? 'IA Agronômica (NVIDIA Nemotron 3 Ultra)' : 'Busca local, sem IA' }),
              h('small', { text: remoto ? 'Análise avançada com base nos históricos de campo' : 'Consulta direta no banco deste aparelho' })
            ])
          ]),
          abasEscopo,
          corpoSeletor,
          h('p', {
            style: 'margin-top:12px;font-size:12px;line-height:1.4;color:var(--on-surface-variant)',
            text: modoEscopo === 'todos'
              ? 'A IA realiza diagnósticos macros cruzando dados e visitas de todos os produtores.'
              : (modoEscopo === 'multiplo'
                ? 'A IA compara o histórico técnico entre as fazendas selecionadas.'
                : 'A IA analisa os dados deste produtor e sugere recomendações práticas.')
          })
        ]),
        h('section', { class: 'chat-panel' }, [
          h('div', { class: 'chat-log', 'aria-live': 'polite' }, mensagens.length
            ? mensagens.map(balao).concat(pensando ? [h('div', { class: 'message message--ia' }, [
              h('span', { class: 'message__avatar' }, [ui.icon('psychology')]),
              h('div', { class: 'message__bubble' }, [h('p', { class: 'dim', text: 'Analisando histórico de campo com a IA Nemotron…' })])
            ])] : [])
            : h('div', { class: 'chat-empty' }, [
              ui.icon('psychology'),
              h('h2', { text: modoEscopo === 'todos' ? 'Análise Global do Portfólio' : (modoEscopo === 'multiplo' ? 'Análise Comparativa de Produtores' : 'Assistente Agronômico Inteligente') }),
              h('p', { text: 'Faça perguntas técnicas sobre histórico de visitas, controle de pragas, calagem, irrigação ou comparações de desempenho.' }),
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
