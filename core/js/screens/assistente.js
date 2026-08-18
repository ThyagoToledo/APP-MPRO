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
  var sessaoAtualId = null;
  var painelHistoricoAberto = false;
  var STORAGE_KEY = 'mpro.assistente.historico';

  function carregarHistorico() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function salvarHistorico(lista) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify((lista || []).slice(0, 30)));
    } catch (e) {
      console.warn('Falha ao salvar historico de consultas:', e);
    }
  }

  function obterRotuloEscopoAtual() {
    var clientes = MPRO.store.clients();
    if (modoEscopo === 'todos') {
      return 'Todo o Portfólio (' + clientes.length + ' produtores)';
    }
    if (modoEscopo === 'multiplo') {
      return clientesSelecionados.length + ' produtores selecionados';
    }
    var c = MPRO.store.client(clienteId);
    return c ? c.nome : 'Produtor';
  }

  function salvarSessaoAtual() {
    if (!mensagens.length) return;
    var historico = carregarHistorico();
    var agora = new Date().toISOString();
    var primeiraPergunta = '';
    for (var i = 0; i < mensagens.length; i++) {
      if (mensagens[i].autor === 'usuario') {
        primeiraPergunta = mensagens[i].texto;
        break;
      }
    }
    var titulo = primeiraPergunta ? (primeiraPergunta.length > 55 ? primeiraPergunta.slice(0, 52) + '…' : primeiraPergunta) : 'Consulta assistida';

    var sessao = {
      id: sessaoAtualId || ('sess_' + Date.now()),
      titulo: titulo,
      modoEscopo: modoEscopo,
      clienteId: clienteId,
      clientesSelecionados: (clientesSelecionados || []).slice(),
      rotuloEscopo: obterRotuloEscopoAtual(),
      criadoEm: agora,
      atualizadoEm: agora,
      totalMensagens: mensagens.length,
      mensagens: mensagens
    };

    sessaoAtualId = sessao.id;

    var idx = -1;
    for (var j = 0; j < historico.length; j++) {
      if (historico[j].id === sessao.id) {
        idx = j;
        break;
      }
    }

    if (idx !== -1) {
      sessao.criadoEm = historico[idx].criadoEm;
      historico[idx] = sessao;
    } else {
      historico.unshift(sessao);
    }

    salvarHistorico(historico);
  }

  function carregarSessao(sessao, ctx) {
    sessaoAtualId = sessao.id;
    modoEscopo = sessao.modoEscopo || 'unico';
    if (sessao.clienteId) clienteId = sessao.clienteId;
    if (Array.isArray(sessao.clientesSelecionados)) clientesSelecionados = sessao.clientesSelecionados;
    mensagens = Array.isArray(sessao.mensagens) ? sessao.mensagens.slice() : [];
    painelHistoricoAberto = false;
    ctx.rerender();
  }

  function excluirSessao(id, evento, ctx) {
    if (evento) evento.stopPropagation();
    var historico = carregarHistorico().filter(function (s) { return s.id !== id; });
    salvarHistorico(historico);
    if (sessaoAtualId === id) {
      sessaoAtualId = null;
      mensagens = [];
    }
    ctx.rerender();
  }

  function limparTodoHistorico(ctx) {
    if (confirm('Deseja realmente apagar todo o histórico de conversas gravado neste aparelho?')) {
      salvarHistorico([]);
      sessaoAtualId = null;
      mensagens = [];
      painelHistoricoAberto = false;
      ctx.rerender();
    }
  }

  function formataDataRelativa(isoString) {
    if (!isoString) return '';
    try {
      var d = new Date(isoString);
      var agora = new Date();
      var hoje = d.toDateString() === agora.toDateString();
      var hora = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      if (hoje) return 'Hoje às ' + hora;
      var ontem = new Date(agora);
      ontem.setDate(ontem.getDate() - 1);
      if (d.toDateString() === ontem.toDateString()) return 'Ontem às ' + hora;
      return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + ' às ' + hora;
    } catch (e) {
      return '';
    }
  }

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
        salvarSessaoAtual();
        ctx.rerender();
      });
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function parseInline(texto) {
    var s = escapeHtml(texto);
    // Inline code: `codigo`
    s = s.replace(/`([^`]+)`/g, '<code style="background:var(--surface-tint);padding:2px 5px;border-radius:4px;font-family:var(--font-mono);font-size:12px;color:var(--secondary)">$1</code>');
    // Bold + Italic: ***texto*** or ___texto___
    s = s.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    s = s.replace(/___(.*?)___/g, '<strong><em>$1</em></strong>');
    // Bold: **texto** or __texto__
    s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__(.*?)__/g, '<strong>$1</strong>');
    // Italic: *texto* or _texto_
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/_([^_]+)_/g, '<em>$1</em>');
    return s;
  }

  function isTableSeparator(linha) {
    return /^\|[\s\-:\|]+\|$/.test(linha.trim());
  }

  function isTableRow(linha) {
    var t = linha.trim();
    return t.startsWith('|') && t.endsWith('|') && t.length > 2;
  }

  function parseTableCells(linha) {
    var t = linha.trim();
    if (t.startsWith('|')) t = t.slice(1);
    if (t.endsWith('|')) t = t.slice(0, -1);
    return t.split('|').map(function (c) { return c.trim(); });
  }

  function renderTable(linhasTabela) {
    if (!linhasTabela.length) return null;
    var headerRow = linhasTabela[0];
    var dataRows = [];
    for (var i = 1; i < linhasTabela.length; i++) {
      if (!isTableSeparator(linhasTabela[i])) {
        dataRows.push(linhasTabela[i]);
      }
    }

    var ths = parseTableCells(headerRow).map(function (celula) {
      return h('th', {
        style: 'padding:8px 12px;background:var(--surface-tint);color:var(--on-surface);font-size:13px;font-weight:700;text-align:left;border:1px solid var(--outline-variant);white-space:nowrap',
        html: parseInline(celula)
      });
    });

    var thead = h('thead', {}, [h('tr', {}, ths)]);

    var trs = dataRows.map(function (linha, rIdx) {
      var tds = parseTableCells(linha).map(function (celula) {
        return h('td', {
          style: 'padding:8px 12px;font-size:13px;line-height:1.45;color:var(--on-surface);border:1px solid var(--outline-variant);background:' + (rIdx % 2 === 0 ? 'var(--surface-raised)' : 'var(--surface-soft)'),
          html: parseInline(celula)
        });
      });
      return h('tr', {}, tds);
    });

    var tbody = h('tbody', {}, trs);

    var tabela = h('table', {
      style: 'width:100%;border-collapse:collapse;margin:10px 0;border:1px solid var(--outline-variant);border-radius:var(--r-md);overflow:hidden;box-shadow:var(--shadow-sm)'
    }, [thead, tbody]);

    return h('div', { style: 'width:100%;overflow-x:auto;margin:6px 0' }, [tabela]);
  }

  function formataMarkdown(texto) {
    if (!texto) return [];
    var linhas = texto.split('\n');
    var nodes = [];
    var listaUl = null;
    var listaOl = null;
    var tabelaBuffer = [];

    function flushListas() {
      listaUl = null;
      listaOl = null;
    }

    function flushTabela() {
      if (tabelaBuffer.length) {
        var tNode = renderTable(tabelaBuffer);
        if (tNode) nodes.push(tNode);
        tabelaBuffer = [];
      }
    }

    for (var i = 0; i < linhas.length; i++) {
      var linha = linhas[i];
      var l = linha.trim();

      // Linha de tabela
      if (isTableRow(l)) {
        flushListas();
        tabelaBuffer.push(l);
        continue;
      } else {
        flushTabela();
      }

      if (!l) {
        flushListas();
        continue;
      }

      // Divisor horizontal: --- ou *** ou ___
      if (/^(\-{3,}|\*{3,}|_{3,})$/.test(l)) {
        flushListas();
        nodes.push(h('hr', { style: 'margin:14px 0;border:0;border-top:1px solid var(--outline-variant);opacity:0.6' }));
        continue;
      }

      // Headings: de ###### até #
      var headingMatch = l.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        flushListas();
        var nivel = headingMatch[1].length;
        var conteudoHeading = headingMatch[2];
        var tag = nivel <= 2 ? 'h3' : (nivel === 3 ? 'h4' : 'h5');
        var fontSize = nivel === 1 ? '18px' : (nivel === 2 ? '16px' : (nivel === 3 ? '15px' : '14px'));
        var margemTop = nivel <= 2 ? '18px' : '12px';
        nodes.push(h(tag, {
          style: 'margin:' + margemTop + ' 0 6px;font-size:' + fontSize + ';font-weight:700;color:var(--on-surface);line-height:1.3',
          html: parseInline(conteudoHeading)
        }));
        continue;
      }

      // Unordered list item: * ou - ou +
      var ulMatch = l.match(/^[\*\-\+]\s+(.*)$/);
      if (ulMatch) {
        listaOl = null;
        if (!listaUl) {
          listaUl = h('ul', { style: 'margin:6px 0;padding-left:22px;display:flex;flex-direction:column;gap:5px' });
          nodes.push(listaUl);
        }
        listaUl.appendChild(h('li', { style: 'font-size:14px;line-height:1.55;color:var(--on-surface)', html: parseInline(ulMatch[1]) }));
        continue;
      }

      // Ordered list item: 1. ou 2.
      var olMatch = l.match(/^(\d+)\.\s+(.*)$/);
      if (olMatch) {
        listaUl = null;
        if (!listaOl) {
          listaOl = h('ol', { style: 'margin:6px 0;padding-left:22px;display:flex;flex-direction:column;gap:5px' });
          nodes.push(listaOl);
        }
        listaOl.appendChild(h('li', { style: 'font-size:14px;line-height:1.55;color:var(--on-surface)', html: parseInline(olMatch[2]) }));
        continue;
      }

      // Parágrafo normal
      flushListas();
      nodes.push(h('p', {
        style: 'margin:6px 0;font-size:14px;line-height:1.6;color:var(--on-surface)',
        html: parseInline(l)
      }));
    }

    flushTabela();
    flushListas();

    return nodes.length ? nodes : [h('p', { text: texto })];
  }

  function avatarIa() {
    return h('span', {
      class: 'message__avatar',
      style: 'background:#143820;color:#ffffff;border-radius:8px;box-shadow:0 2px 6px rgba(20,56,32,0.25);display:grid;place-items:center;padding:4px;flex-shrink:0;width:34px;height:34px',
      html: '<svg viewBox="0 0 512 512" style="width:20px;height:20px;display:block" aria-hidden="true"><path fill="#ffffff" fill-rule="evenodd" d="M182 102h250a6 6 0 0 1 6 6v194c0 11-4 20-12 28l-76 75c-7 7-15 10-25 10H76V211c0-12 4-21 12-29l75-73c5-5 11-7 19-7Zm-31 68v181h58V204l-58-34Zm75 0v85l59 34v-85l-59-34Zm77 0v181h20l38-38V204l-58-34Z"/></svg>'
    });
  }

  function iconeIaBadge(tamanho) {
    var s = tamanho || 26;
    var iconS = Math.round(s * 0.62);
    return h('span', {
      style: 'width:' + s + 'px;height:' + s + 'px;border-radius:6px;background:#143820;color:#ffffff;display:grid;place-items:center;flex-shrink:0;box-shadow:0 2px 4px rgba(20,56,32,0.18)',
      html: '<svg viewBox="0 0 512 512" style="width:' + iconS + 'px;height:' + iconS + 'px;display:block" aria-hidden="true"><path fill="#ffffff" fill-rule="evenodd" d="M182 102h250a6 6 0 0 1 6 6v194c0 11-4 20-12 28l-76 75c-7 7-15 10-25 10H76V211c0-12 4-21 12-29l75-73c5-5 11-7 19-7Zm-31 68v181h58V204l-58-34Zm75 0v85l59 34v-85l-59-34Zm77 0v181h20l38-38V204l-58-34Z"/></svg>'
    });
  }

  function balao(mensagem) {
    return h('div', { class: 'message message--' + mensagem.autor }, [
      mensagem.autor === 'ia' ? avatarIa() : null,
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

      var historico = carregarHistorico();

      // Painel de Histórico aberto
      if (painelHistoricoAberto) {
        return h('div', { class: 'assistant-page' }, [
          h('section', { class: 'assistant-scope' }, [
            h('div', { class: 'assistant-scope__title' }, [
              ui.icon('history'),
              h('span', {}, [h('small', { text: 'MEMÓRIA LOCAL' }), h('strong', { text: 'Histórico de Consultas' })])
            ]),
            h('div', { class: 'demo-callout', style: 'border-left: 3px solid var(--secondary)' }, [
              ui.icon('inventory_2'),
              h('span', {}, [
                h('strong', { text: historico.length + ' consulta(s) salva(s)' }),
                h('small', { text: 'Armazenamento leve gravado no aparelho' })
              ])
            ]),
            h('button', {
              class: 'btn btn--primary',
              style: 'width:100%;justify-content:center;margin-top:12px',
              type: 'button',
              onclick: function () {
                sessaoAtualId = null;
                mensagens = [];
                painelHistoricoAberto = false;
                ctx.rerender();
              }
            }, [ui.icon('add'), 'Iniciar Nova Consulta']),
            h('button', {
              class: 'btn btn--secondary',
              style: 'width:100%;justify-content:center;margin-top:8px',
              type: 'button',
              onclick: function () {
                painelHistoricoAberto = false;
                ctx.rerender();
              }
            }, [ui.icon('arrow_back'), 'Voltar à Consulta Atual']),
            historico.length ? h('button', {
              class: 'btn btn--ghost',
              style: 'width:100%;justify-content:center;margin-top:16px;color:var(--corrigir)',
              type: 'button',
              onclick: function () { limparTodoHistorico(ctx); }
            }, [ui.icon('delete_sweep'), 'Limpar Todo o Histórico']) : null
          ]),
          h('section', { class: 'chat-panel' }, [
            h('div', { style: 'padding:20px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;height:100%' }, [
              h('div', { style: 'display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--outline-variant)' }, [
                h('h2', { style: 'margin:0;font-size:20px;font-weight:800;color:var(--on-surface)', text: 'Histórico de Conversas com a IA' }),
                h('button', {
                  class: 'btn btn--secondary btn--sm',
                  type: 'button',
                  onclick: function () { painelHistoricoAberto = false; ctx.rerender(); }
                }, [ui.icon('close'), 'Fechar'])
              ]),
              historico.length ? h('div', { style: 'display:flex;flex-direction:column;gap:10px' }, historico.map(function (sessao) {
                var ativa = sessao.id === sessaoAtualId;
                return h('div', {
                  style: 'border:1px solid ' + (ativa ? 'var(--primary)' : 'var(--outline-variant)') + ';border-radius:var(--r-lg);background:' + (ativa ? 'var(--surface-tint)' : 'var(--surface-raised)') + ';padding:14px 16px;display:flex;flex-direction:column;gap:8px;box-shadow:var(--shadow-sm);transition:all 140ms ease'
                }, [
                  h('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:8px' }, [
                    h('span', {
                      style: 'font-size:11px;font-weight:700;text-transform:uppercase;background:var(--surface-container);color:var(--primary);padding:3px 8px;border-radius:4px',
                      text: sessao.rotuloEscopo || 'Escopo'
                    }),
                    h('small', { class: 'dim mono', text: formataDataRelativa(sessao.criadoEm || sessao.atualizadoEm) })
                  ]),
                  h('strong', { style: 'font-size:15px;color:var(--on-surface);line-height:1.4', text: sessao.titulo }),
                  h('div', { style: 'display:flex;align-items:center;justify-content:space-between;margin-top:6px;padding-top:8px;border-top:1px dashed var(--outline-variant)' }, [
                    h('small', { class: 'dim', text: (sessao.mensagens ? sessao.mensagens.length : sessao.totalMensagens || 0) + ' mensagem(ns)' }),
                    h('div', { style: 'display:flex;gap:6px' }, [
                      h('button', {
                        class: 'btn btn--primary btn--sm',
                        type: 'button',
                        onclick: function () { carregarSessao(sessao, ctx); }
                      }, [ui.icon('visibility'), 'Visualizar Conversa']),
                      h('button', {
                        class: 'btn btn--ghost btn--sm',
                        style: 'color:var(--corrigir)',
                        type: 'button',
                        'aria-label': 'Excluir conversa do histórico',
                        onclick: function (e) { excluirSessao(sessao.id, e, ctx); }
                      }, [ui.icon('delete')])
                    ])
                  ])
                ]);
              })) : ui.emptyState({
                icone: 'history_toggle_off',
                titulo: 'Nenhuma consulta gravada',
                texto: 'Quando você faz perguntas técnicas à IA, as respostas são armazenadas localmente no seu aparelho para você consultar quando quiser.',
                acao: {
                  rotulo: 'Fazer uma pergunta agora',
                  icone: 'chat',
                  onClick: function () { painelHistoricoAberto = false; ctx.rerender(); }
                }
              })
            ])
          ])
        ]);
      }

      // Toolbar superior de histórico e nova conversa
      var barraHistorico = h('div', { style: 'display:flex;gap:8px;margin-bottom:12px' }, [
        h('button', {
          class: 'btn btn--secondary btn--sm',
          style: 'flex:1;justify-content:center;font-size:13px;font-weight:700',
          type: 'button',
          onclick: function () {
            salvarSessaoAtual();
            sessaoAtualId = null;
            mensagens = [];
            ctx.rerender();
          }
        }, [ui.icon('add'), 'Nova consulta']),
        h('button', {
          class: 'btn btn--secondary btn--sm',
          style: 'flex:1;justify-content:center;font-size:13px;font-weight:700',
          type: 'button',
          onclick: function () {
            painelHistoricoAberto = true;
            ctx.rerender();
          }
        }, [ui.icon('history'), 'Histórico (' + historico.length + ')'])
      ]);

      return h('div', { class: 'assistant-page' }, [
        h('section', { class: 'assistant-scope' }, [
          h('div', { class: 'assistant-scope__title' }, [
            ui.icon('filter_alt'),
            h('span', {}, [h('small', { text: 'ESCOPO ATIVO' }), h('strong', { text: rotuloEscopo })])
          ]),
          barraHistorico,
          h('div', { class: 'demo-callout', style: 'border-left: 3px solid var(--secondary)' }, [
            remoto ? iconeIaBadge(28) : ui.icon('search'),
            h('span', {}, [
              h('strong', { text: remoto ? 'IA Agronômica M-PRO' : 'Busca local, sem IA' }),
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
              avatarIa(),
              h('div', { class: 'message__bubble' }, [h('p', { class: 'dim', text: 'Analisando histórico de campo com a IA Agronômica…' })])
            ])] : [])
            : h('div', { class: 'chat-empty' }, [
              h('div', {
                style: 'width:64px;height:64px;border-radius:16px;background:#143820;color:#ffffff;display:grid;place-items:center;margin-bottom:8px;box-shadow:0 4px 14px rgba(20,56,32,0.25)',
                html: '<svg viewBox="0 0 512 512" style="width:40px;height:40px;display:block" aria-hidden="true"><path fill="#ffffff" fill-rule="evenodd" d="M182 102h250a6 6 0 0 1 6 6v194c0 11-4 20-12 28l-76 75c-7 7-15 10-25 10H76V211c0-12 4-21 12-29l75-73c5-5 11-7 19-7Zm-31 68v181h58V204l-58-34Zm75 0v85l59 34v-85l-59-34Zm77 0v181h20l38-38V204l-58-34Z"/></svg>'
              }),
              h('h2', { text: modoEscopo === 'todos' ? 'Análise Global do Portfólio' : (modoEscopo === 'multiplo' ? 'Análise Comparativa de Produtores' : 'Assistente Agronômico M-PRO') }),
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
