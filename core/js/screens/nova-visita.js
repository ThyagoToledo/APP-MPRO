/* 06 · Nova visita — grupo C. Fluxo modal de 4 etapas, com rascunho salvo no aparelho. */
window.MPRO = window.MPRO || {};
MPRO.screens = MPRO.screens || {};

MPRO.screens.novaVisita = (function () {
  var ui = MPRO.ui;
  var h = ui.h;

  var ROTULOS_ETAPA = [
    'ETAPA 1 DE 4 · DADOS DA VISITA',
    'ETAPA 2 DE 4 · AVALIAÇÃO',
    'ETAPA 3 DE 4 · REGISTRO FOTOGRÁFICO',
    'ETAPA 4 DE 4 · REVISÃO'
  ];

  var estado = { chave: null, rascunho: null, sujo: false, erroUnidade: false };

  function agora() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function hoje() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function novoRascunho(clienteId) {
    var cliente = MPRO.store.client(clienteId) || MPRO.store.clients()[0] || null;
    return {
      id: MPRO.store.newId('rasc'),
      clienteId: cliente ? cliente.id : null,
      unidade: '',
      cultura: cliente ? cliente.cultura : '',
      data: hoje(),
      hora: agora(),
      responsavel: '',
      coordenadas: null,
      etapa: 1,
      progresso: 0,
      salvoEm: null,
      avaliacoes: {},
      observacoes: {},
      medicoes: [],
      recomendacao: '',
      fotos: [],
      audios: [],
      transcricao: ''
    };
  }

  function garanteEstado(ctx) {
    var chave = JSON.stringify(ctx.query);
    if (estado.chave === chave && estado.rascunho) return;

    estado.chave = chave;
    estado.sujo = false;
    estado.erroUnidade = false;

    if (ctx.query.rascunho) {
      var salvo = MPRO.store.draft(ctx.query.rascunho);
      estado.rascunho = salvo
        ? JSON.parse(JSON.stringify(salvo))
        : novoRascunho(ctx.query.cliente);
      if (!estado.rascunho.fotos) estado.rascunho.fotos = [];
      if (!estado.rascunho.audios) estado.rascunho.audios = [];
      if (!estado.rascunho.observacoes) estado.rascunho.observacoes = {};
      if (!estado.rascunho.recomendacao) estado.rascunho.recomendacao = '';
      if (!estado.rascunho.transcricao) estado.rascunho.transcricao = '';
    } else {
      estado.rascunho = novoRascunho(ctx.query.cliente);
    }
  }

  function progresso() {
    var r = estado.rascunho;
    var pontos = 0;
    if (r.clienteId && r.unidade) pontos += 25;
    if (Object.keys(r.avaliacoes).length) pontos += 25;
    if (r.fotos.length) pontos += 25;
    if (r.etapa === 4) pontos += 25;
    return Math.max(pontos, (r.etapa - 1) * 25);
  }

  function salvarRascunho(silencioso) {
    var r = estado.rascunho;
    r.progresso = progresso();
    r.salvoEm = new Date().toISOString();
    MPRO.store.saveDraft(r);
    estado.sujo = false;
    if (!silencioso) ui.snack('Rascunho salvo no aparelho.');
  }

  function piorStatus() {
    var valores = Object.keys(estado.rascunho.avaliacoes).map(function (k) { return estado.rascunho.avaliacoes[k]; });
    if (valores.indexOf('corrigir') !== -1) return 'corrigir';
    if (valores.indexOf('monitorar') !== -1) return 'monitorar';
    if (valores.indexOf('adequado') !== -1) return 'adequado';
    return null;
  }

  function campoSelect(rotulo, valor, opcoes, onChange, opts) {
    opts = opts || {};
    var select = h('select', {
      class: 'input', 'aria-label': rotulo,
      onchange: function (event) { onChange(event.target.value); }
    }, [opts.vazio ? h('option', { value: '', text: opts.vazio, selected: !valor }) : null].concat(
      opcoes.map(function (op) {
        return h('option', { value: op.valor, text: op.rotulo, selected: op.valor === valor });
      })
    ));

    var invalido = opts.invalido;
    return h('div', { class: 'field' + (invalido ? ' field--invalid' : '') }, [
      h('label', { class: 'field__label', text: rotulo }),
      select,
      invalido ? h('span', { class: 'field__hint' }, [ui.icon('error'), opts.mensagemErro]) : null
    ]);
  }

  function campoTexto(rotulo, valor, onInput, opts) {
    opts = opts || {};
    return h('div', { class: 'field' }, [
      h('label', { class: 'field__label', text: rotulo }),
      h('input', {
        class: 'input' + (opts.mono ? ' mono' : ''), type: opts.type || 'text', value: valor || '',
        placeholder: opts.placeholder, 'aria-label': rotulo,
        oninput: function (event) { estado.sujo = true; onInput(event.target.value); }
      })
    ]);
  }

  /* ----- etapa 1 ----- */

  function etapaDados(ctx) {
    var r = estado.rascunho;
    var clientes = MPRO.store.clients();

    if (!clientes.length) {
      return ui.emptyState({
        icone: 'groups',
        titulo: 'Cadastre um cliente antes',
        texto: 'Toda visita pertence a um cliente e a uma unidade. Cadastre o primeiro cliente para abrir o fluxo.',
        acao: { rotulo: 'Cadastrar cliente', icone: 'person_add', onClick: function () { location.hash = '#/clientes?novo=1'; } }
      });
    }

    var cliente = MPRO.store.client(r.clienteId) || clientes[0];
    r.clienteId = cliente.id;

    var coordenada = h('div', {
      class: 'field__control field__control--dashed',
      text: r.coordenadas || 'Aguardando GPS…'
    });

    var botaoGps = h('button', {
      class: 'iconbtn iconbtn--ghost', type: 'button', 'aria-label': 'Capturar coordenada',
      onclick: function () {
        if (!navigator.geolocation) { ui.snack('Este aparelho não expõe GPS ao navegador.'); return; }
        coordenada.textContent = 'Procurando satélites…';
        navigator.geolocation.getCurrentPosition(function (pos) {
          r.coordenadas = pos.coords.latitude.toFixed(4) + ', ' + pos.coords.longitude.toFixed(4);
          estado.sujo = true;
          coordenada.textContent = r.coordenadas;
        }, function () {
          coordenada.textContent = 'Sem permissão de GPS — a coordenada fica vazia no laudo.';
        }, { timeout: 8000, enableHighAccuracy: true });
      }
    }, [ui.icon(r.coordenadas ? 'gps_fixed' : 'gps_not_fixed')]);

    return h('div', { style: 'display:flex;flex-direction:column;gap:16px' }, [
      campoSelect('Cliente', r.clienteId, clientes.map(function (c) {
        return { valor: c.id, rotulo: c.nome };
      }), function (valor) {
        r.clienteId = valor;
        r.unidade = '';
        var novo = MPRO.store.client(valor);
        if (novo) r.cultura = novo.cultura;
        estado.sujo = true;
        ctx.rerender();
      }),

      campoSelect('Propriedade / unidade *', r.unidade, cliente.unidades.map(function (u) {
        return { valor: u, rotulo: u };
      }), function (valor) {
        r.unidade = valor;
        estado.erroUnidade = false;
        estado.sujo = true;
        ctx.rerender();
      }, {
        vazio: 'Selecionar unidade',
        invalido: estado.erroUnidade,
        mensagemErro: 'Obrigatório — escolha o pivô ou talhão avaliado.'
      }),

      h('div', { class: 'field' }, [
        h('span', { class: 'field__label', text: 'Cultura' }),
        h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, MPRO.catalogo.culturas.map(function (nome) {
          var chave = nome.toLowerCase();
          return h('button', {
            class: 'chip chip--lg', type: 'button', 'aria-pressed': r.cultura === chave ? 'true' : 'false',
            onclick: function () { r.cultura = chave; estado.sujo = true; ctx.rerender(); }
          }, nome);
        }))
      ]),

      h('div', { class: 'field__row' }, [
        campoTexto('Data', r.data, function (v) { r.data = v; }, { type: 'date' }),
        campoTexto('Hora', r.hora, function (v) { r.hora = v; }, { type: 'time' })
      ]),

      campoTexto('Responsável na propriedade', r.responsavel, function (v) { r.responsavel = v; }, {
        placeholder: 'Quem acompanhou a visita'
      }),

      h('div', { class: 'field' }, [
        h('span', { class: 'field__label', text: 'Coordenada da visita' }),
        h('div', { style: 'display:flex;gap:8px;align-items:center' }, [
          h('div', { style: 'flex:1' }, [coordenada]),
          botaoGps
        ])
      ])
    ]);
  }

  /* ----- etapa 2 ----- */

  function abrirMedicao(ctx) {
    var nome = h('input', { class: 'input', placeholder: 'Pressão de irrigação', 'aria-label': 'Medição' });
    var contexto = h('input', { class: 'input', placeholder: 'pivô 2 · esperado 2,0 bar', 'aria-label': 'Contexto' });
    var valor = h('input', { class: 'input mono', inputmode: 'decimal', placeholder: '1,5', 'aria-label': 'Valor' });
    var unidade = h('input', { class: 'input mono', placeholder: 'bar', 'aria-label': 'Unidade' });
    var alerta = null;

    ui.openSheet({
      titulo: 'Nova medição',
      body: [
        h('div', { class: 'field' }, [h('span', { class: 'field__label', text: 'O que foi medido' }), nome]),
        h('div', { class: 'field' }, [h('span', { class: 'field__label', text: 'Contexto' }), contexto]),
        h('div', { class: 'field__row' }, [
          h('div', { class: 'field' }, [h('span', { class: 'field__label', text: 'Valor' }), valor]),
          h('div', { class: 'field' }, [h('span', { class: 'field__label', text: 'Unidade' }), unidade])
        ]),
        h('div', { class: 'field' }, [
          h('span', { class: 'field__label', text: 'Fora do esperado?' }),
          h('div', { class: 'segmented' }, ['adequado', 'monitorar', 'corrigir'].map(function (chave) {
            var meta = ui.status(chave);
            return h('button', {
              class: 'segmented__opt', type: 'button', 'data-status': chave, 'aria-pressed': 'false',
              onclick: function (event) {
                alerta = chave === 'adequado' ? null : chave;
                Array.prototype.forEach.call(event.currentTarget.parentNode.children, function (btn) {
                  btn.setAttribute('aria-pressed', btn === event.currentTarget ? 'true' : 'false');
                });
              }
            }, [ui.icon(meta.icone), meta.rotulo[0] + meta.rotulo.slice(1).toLowerCase()]);
          }))
        ])
      ],
      footer: [
        h('button', { class: 'btn btn--text', type: 'button', onclick: ui.closeSheet }, 'Cancelar'),
        h('button', {
          class: 'btn btn--filled btn--grow', type: 'button',
          onclick: function () {
            if (!nome.value.trim() || !valor.value.trim()) {
              ui.snack('Medição precisa de nome e valor.');
              return;
            }
            estado.rascunho.medicoes.push({
              nome: nome.value.trim(),
              contexto: contexto.value.trim(),
              valor: valor.value.trim(),
              unidade: unidade.value.trim(),
              alerta: alerta
            });
            estado.sujo = true;
            ui.closeSheet();
            ctx.rerender();
          }
        }, 'Adicionar')
      ]
    });
  }

  function etapaAvaliacao(ctx) {
    var r = estado.rascunho;
    var cliente = MPRO.store.client(r.clienteId);

    return h('div', { style: 'display:flex;flex-direction:column;gap:14px' }, [
      h('div', { class: 'section__head' }, [
        h('span', { class: 'section__title', text: (r.unidade || 'Unidade') + ' · ' + (r.cultura || '—') }),
        h('span', { class: 'mono', style: 'font-size:11px;color:var(--adequado)', text: r.salvoEm ? 'SALVO ' + ui.formatSavedAt(r.salvoEm) : 'NÃO SALVO' })
      ]),

      h('div', {
        style: 'background:var(--surface-container-high);border-radius:var(--r-lg);padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;border:1px solid ' + (MPRO.audio && MPRO.audio.estaGravando() ? '#d32f2f' : 'var(--outline-variant)')
      }, [
        h('div', { style: 'display:flex;align-items:center;gap:8px' }, [
          h('button', {
            class: 'btn ' + (MPRO.audio && MPRO.audio.estaGravando() ? 'btn--danger btn--sm' : 'btn--filled btn--sm'),
            type: 'button',
            style: 'font-weight:700',
            onclick: function () {
              if (MPRO.audio && MPRO.audio.estaGravando()) {
                MPRO.audio.pararGravacao().then(function (res) {
                  if (res) {
                    r.audios.push(res);
                    if (res.transcricao) {
                      r.transcricao = (r.transcricao ? r.transcricao + ' ' : '') + res.transcricao;
                      r.recomendacao = (r.recomendacao ? r.recomendacao + '\n' : '') + res.transcricao;
                    }
                    estado.sujo = true;
                    ui.snack('Áudio salvo e transcrito no laudo!');
                  }
                  ctx.rerender();
                });
              } else if (MPRO.audio) {
                MPRO.audio.iniciarGravacao(function (p) {
                  if (p.transcricao) {
                    r.transcricao = p.transcricao;
                  }
                  ctx.rerender();
                }, function () {
                  ui.snack('Microfone indisponível.');
                });
                ctx.rerender();
              }
            }
          }, [
            ui.icon(MPRO.audio && MPRO.audio.estaGravando() ? 'stop' : 'mic'),
            MPRO.audio && MPRO.audio.estaGravando() ? 'Parar gravação' : 'Gravar áudio da visita'
          ]),
          h('span', {
            class: 'dim',
            style: 'font-size:12px',
            text: MPRO.audio && MPRO.audio.estaGravando() ? 'Gravando e transcrevendo…' : (r.audios.length ? r.audios.length + ' áudio(s) gravado(s)' : 'Prefere falar? Grave uma nota de voz.')
          })
        ]),
        r.transcricao ? h('span', { class: 'pillcount', text: 'Voz Transcrita' }) : null
      ]),

      h('div', { style: 'display:flex;flex-direction:column;gap:10px' }, MPRO.catalogo.blocosAvaliacao.map(function (bloco) {
        var textarea = h('textarea', {
          class: 'textarea', placeholder: 'Observação técnica sobre ' + bloco.rotulo.toLowerCase(),
          'aria-label': 'Observação de ' + bloco.rotulo,
          oninput: function (event) { r.observacoes[bloco.chave] = event.target.value; estado.sujo = true; }
        }, r.observacoes[bloco.chave] || '');

        return h('div', { class: 'evalblock' }, [
          h('div', { style: 'display:flex;justify-content:space-between;align-items:center' }, [
            h('span', { class: 'evalblock__label', text: bloco.rotulo }),
            h('button', {
              class: 'iconbtn iconbtn--ghost',
              type: 'button',
              style: 'width:32px;height:32px',
              'aria-label': 'Ditar observação de ' + bloco.rotulo,
              onclick: function () {
                if (MPRO.audio) {
                  MPRO.audio.ditarParaCampo(textarea, function (val) {
                    r.observacoes[bloco.chave] = val;
                    estado.sujo = true;
                  });
                }
              }
            }, [ui.icon('mic')])
          ]),
          h('div', { class: 'segmented', role: 'group', 'aria-label': bloco.rotulo }, ['adequado', 'monitorar', 'corrigir'].map(function (chave) {
            var meta = ui.status(chave);
            var ativo = r.avaliacoes[bloco.chave] === chave;
            return h('button', {
              class: 'segmented__opt', type: 'button', 'data-status': chave,
              'aria-pressed': ativo ? 'true' : 'false',
              onclick: function () {
                if (r.avaliacoes[bloco.chave] === chave) delete r.avaliacoes[bloco.chave];
                else r.avaliacoes[bloco.chave] = chave;
                estado.sujo = true;
                ctx.rerender();
              }
            }, [ativo ? ui.icon(meta.icone) : null, meta.rotulo[0] + meta.rotulo.slice(1).toLowerCase()]);
          })),
          textarea
        ]);
      })),

      h('div', { class: 'section' }, [
        h('h2', { class: 'section__title', text: 'Medições' }),
        r.medicoes.map(function (medicao, indice) {
          return h('div', { class: 'measure' }, [
            h('div', { class: 'measure__track' }),
            h('div', { class: 'measure__body' }, [
              h('strong', { text: medicao.nome }),
              h('span', { text: medicao.contexto || (cliente ? cliente.nome : '') })
            ]),
            h('div', { class: 'measure__value' }, [
              h('b', { style: medicao.alerta ? 'color:' + ui.status(medicao.alerta).cor : '', text: medicao.valor }),
              h('span', { text: medicao.unidade })
            ]),
            h('button', {
              class: 'iconbtn iconbtn--ghost', type: 'button', 'aria-label': 'Remover medição',
              onclick: function () { r.medicoes.splice(indice, 1); estado.sujo = true; ctx.rerender(); }
            }, [ui.icon('close')])
          ]);
        }),
        h('button', { class: 'addrow', type: 'button', onclick: function () { abrirMedicao(ctx); } }, [
          ui.icon('add'), 'Adicionar medição'
        ])
      ]),

      h('div', { class: 'section' }, [
        h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px' }, [
          h('h2', { class: 'section__title', style: 'margin:0', text: 'Recomendação acompanhável' }),
          h('button', {
            class: 'btn btn--secondary btn--sm',
            type: 'button',
            onclick: function () {
              var recInput = document.getElementById('campo-recomendacao-visita');
              if (recInput && MPRO.audio) {
                MPRO.audio.ditarParaCampo(recInput, function (val) {
                  r.recomendacao = val;
                  estado.sujo = true;
                });
              }
            }
          }, [ui.icon('mic'), 'Ditar por voz'])
        ]),
        h('textarea', {
          id: 'campo-recomendacao-visita',
          class: 'textarea', placeholder: 'Descreva a ação, o prazo e o responsável',
          'aria-label': 'Recomendação da visita',
          oninput: function (event) { r.recomendacao = event.target.value; estado.sujo = true; }
        }, r.recomendacao || '')
      ])
    ]);
  }

  /* ----- etapa 3 ----- */

  function etapaFotos(ctx) {
    var r = estado.rascunho;
    var enviandoFoto = false;

    var entrada = h('input', {
      type: 'file', accept: 'image/*', capture: 'environment', class: 'sr-only', id: 'foto-input',
      onchange: function (event) {
        var arquivo = event.target.files && event.target.files[0];
        if (!arquivo) return;
        ui.snack('Otimizando e preparando imagem…');
        MPRO.upload.enviar(arquivo, { pasta: 'visitas', nome: arquivo.name })
          .then(function (res) {
            r.fotos.push({
              id: MPRO.store.newId('foto'),
              nome: res.nome || arquivo.name,
              titulo: '',
              legenda: '',
              url: res.url
            });
            estado.sujo = true;
            ui.snack('Foto adicionada ao laudo!');
            ctx.rerender();
          })
          .catch(function (err) {
            console.error('Falha ao processar foto:', err);
            ui.snack('Erro ao adicionar foto. Tente novamente.');
          });
      }
    });

    return h('div', { style: 'display:flex;flex-direction:column;gap:14px' }, [
      h('p', { class: 'dim', style: 'margin:0;font-size:13px;line-height:1.4' },
        'Cada foto entra no laudo com legenda técnica e localização. As imagens são otimizadas e salvas em nuvem de alta velocidade para máxima economia de armazenamento.'),
      entrada,
      h('button', {
        class: 'cta-primary', type: 'button',
        onclick: function () { document.getElementById('foto-input').click(); }
      }, [
        h('div', { class: 'cta-primary__icon' }, [ui.icon('photo_camera')]),
        h('div', { class: 'cta-primary__body' }, [
          h('strong', { text: 'Adicionar foto' }),
          h('span', { text: 'Câmera ou galeria do aparelho' })
        ]),
        ui.icon('arrow_forward')
      ]),

      r.fotos.length ? h('div', { class: 'section' }, r.fotos.map(function (foto, indice) {
        return h('div', { style: 'display:flex;gap:12px;border-top:1px solid var(--outline-variant);padding-top:12px' }, [
          h('img', {
            src: foto.url, alt: foto.legenda || foto.nome,
            style: 'width:72px;height:72px;object-fit:cover;border-radius:8px;flex:none;background:var(--skel)'
          }),
          h('div', { style: 'flex:1;display:flex;flex-direction:column;gap:6px;min-width:0' }, [
            h('input', {
              class: 'input input--sm', value: foto.titulo || '', placeholder: 'Título da evidência',
              'aria-label': 'Título da foto ' + (indice + 1),
              oninput: function (event) { foto.titulo = event.target.value; estado.sujo = true; }
            }),
            h('input', {
              class: 'input input--sm', value: foto.legenda, placeholder: 'Legenda técnica da foto',
              'aria-label': 'Legenda da foto ' + (indice + 1),
              oninput: function (event) { foto.legenda = event.target.value; estado.sujo = true; }
            }),
            h('span', { class: 'mono dim', style: 'font-size:11px', text: foto.nome })
          ]),
          h('button', {
            class: 'iconbtn iconbtn--ghost', type: 'button', 'aria-label': 'Mover foto para trás', disabled: indice === 0,
            onclick: function () { var item = r.fotos.splice(indice, 1)[0]; r.fotos.splice(indice - 1, 0, item); estado.sujo = true; ctx.rerender(); }
          }, [ui.icon('arrow_upward')]),
          h('button', {
            class: 'iconbtn iconbtn--ghost', type: 'button', 'aria-label': 'Mover foto para frente', disabled: indice === r.fotos.length - 1,
            onclick: function () { var item = r.fotos.splice(indice, 1)[0]; r.fotos.splice(indice + 1, 0, item); estado.sujo = true; ctx.rerender(); }
          }, [ui.icon('arrow_downward')]),
          h('button', {
            class: 'iconbtn iconbtn--ghost', type: 'button', 'aria-label': 'Remover foto',
            onclick: function () {
              r.fotos.splice(indice, 1);
              estado.sujo = true;
              ctx.rerender();
            }
          }, [ui.icon('delete')])
        ]);
      })) : ui.emptyState({
        icone: 'photo_camera',
        titulo: 'Nenhuma foto ainda',
        texto: 'O relatório fotográfico é o que o cliente lê primeiro. Registre ao menos uma imagem por pendência apontada.'
      })
    ]);
  }

  /* ----- etapa 4 ----- */

  function etapaRevisao(ctx) {
    var r = estado.rascunho;
    var cliente = MPRO.store.client(r.clienteId);
    var status = piorStatus();

    function linha(rotulo, valor) {
      return h('div', { style: 'display:flex;justify-content:space-between;gap:16px;border-top:1px solid var(--outline-variant);padding:10px 0' }, [
        h('span', { class: 'dim', style: 'font-size:13px', text: rotulo }),
        h('span', { style: 'font-size:15px;font-weight:600;text-align:right', text: valor || '—' })
      ]);
    }

    return h('div', { style: 'display:flex;flex-direction:column;gap:20px' }, [
      h('div', { class: 'section' }, [
        h('h2', { class: 'section__title', text: 'Resumo da visita' }),
        linha('Cliente', cliente ? cliente.nome : '—'),
        linha('Unidade', r.unidade),
        linha('Cultura', r.cultura),
        linha('Data', ui.formatDate(r.data) + ' · ' + r.hora),
        linha('Responsável', r.responsavel),
        linha('Coordenada', r.coordenadas),
        linha('Fotos', r.fotos.length + (r.fotos.length === 1 ? ' imagem' : ' imagens'))
      ]),

      ui.section('Avaliação', null, MPRO.catalogo.blocosAvaliacao.map(function (bloco) {
        var valor = r.avaliacoes[bloco.chave];
        return h('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:12px;border-top:1px solid var(--outline-variant);padding:10px 0' }, [
          h('span', { style: 'font-size:15px;font-weight:600', text: bloco.rotulo }),
          valor ? ui.statusTag(valor) : h('span', { class: 'dim', style: 'font-size:13px', text: 'não avaliado' })
        ]);
      })),

      r.medicoes.length ? ui.section('Medições', null, r.medicoes.map(function (medicao) {
        return h('div', { class: 'measure' }, [
          h('div', { class: 'measure__track' }),
          h('div', { class: 'measure__body' }, [
            h('strong', { text: medicao.nome }),
            h('span', { text: medicao.contexto })
          ]),
          h('div', { class: 'measure__value' }, [
            h('b', { style: medicao.alerta ? 'color:' + ui.status(medicao.alerta).cor : '', text: medicao.valor }),
            h('span', { text: medicao.unidade })
          ])
        ]);
      })) : null,

      r.recomendacao ? ui.section('Recomendação', null, h('div', { class: 'notice' }, [
        ui.icon('assignment_late'), h('div', { class: 'notice__body' }, [h('strong', { text: 'Ação acompanhável' }), h('p', { text: r.recomendacao })])
      ])) : null,

      h('div', { class: 'notice', style: 'border-color:' + (status ? ui.status(status).cor : 'var(--outline-variant)') }, [
        ui.icon(status ? ui.status(status).icone : 'help'),
        h('div', { class: 'notice__body' }, [
          h('strong', { text: 'Status final do laudo: ' + (status ? ui.status(status).rotulo : 'SEM AVALIAÇÃO') }),
          h('p', { text: 'O status vem do pior item avaliado. Finalizar move esta visita para o histórico do cliente e limpa o rascunho.' })
        ])
      ])
    ]);
  }

  function finalizar(ctx) {
    var r = estado.rascunho;
    var status = piorStatus();

    if (!status) {
      ui.snack('Avalie ao menos um bloco antes de finalizar.');
      return;
    }

    ui.confirmSheet({
      titulo: 'Finalizar visita',
      texto: 'A visita entra no histórico do cliente com status ' + ui.status(status).rotulo +
        ' e o rascunho é removido. O PDF do laudo é gerado na fase de revisão e finalização.',
      confirmar: 'Finalizar',
      onConfirm: function () {
        MPRO.store.addVisit({
          id: MPRO.store.newId('vis'),
          clienteId: r.clienteId,
          data: r.data,
          status: status,
          unidade: r.unidade,
          cultura: r.cultura,
          responsavel: r.responsavel,
          coordenadas: r.coordenadas,
          avaliacoes: r.avaliacoes,
          observacoes: r.observacoes,
          medicoes: r.medicoes,
          recomendacao: r.recomendacao,
          fotos: r.fotos.map(function (f) { return { nome: f.nome, titulo: f.titulo, legenda: f.legenda, url: f.url }; })
        });
        MPRO.store.setClientStatus(r.clienteId, status, r.data);
        MPRO.store.removeDraft(r.id);
        estado.chave = null;
        estado.rascunho = null;
        location.hash = '#/';
        ui.snack('Visita finalizada e adicionada ao histórico.');
      }
    });
  }

  function sair() {
    if (!estado.sujo) {
      estado.chave = null;
      history.length > 1 ? history.back() : (location.hash = '#/');
      return;
    }
    ui.confirmSheet({
      titulo: 'Sair da visita',
      texto: 'Há alterações que ainda não foram salvas neste rascunho.',
      cancelar: 'Continuar editando',
      confirmar: 'Salvar e sair',
      onConfirm: function () {
        salvarRascunho(true);
        estado.chave = null;
        location.hash = '#/';
      }
    });
  }

  return {
    grupo: 'C',
    titulo: 'Nova visita',
    prepare: function (ctx) { garanteEstado(ctx); },
    get voltar() { return estado.rascunho && estado.rascunho.etapa > 1; },
    onSair: sair,

    get progresso() {
      if (!estado.rascunho) return null;
      return {
        rotulo: ROTULOS_ETAPA[estado.rascunho.etapa - 1],
        percentual: estado.rascunho.etapa * 25
      };
    },

    get banner() {
      if (navigator.onLine) return null;
      return h('div', { class: 'banner' }, [
        ui.icon('cloud_off', null),
        h('span', { text: 'Offline — rascunho salvo no aparelho' + (estado.rascunho && estado.rascunho.salvoEm ? ' às ' + ui.formatSavedAt(estado.rascunho.salvoEm) : '') }),
        ui.icon('check', null)
      ]);
    },

    acao: {
      icone: 'help',
      rotulo: 'Ajuda do fluxo',
      onClick: function () {
        ui.snack('Etapas: dados · avaliação · fotos · revisão. O rascunho fica no aparelho até finalizar.');
      }
    },

    rodape: function (ctx) {
      var r = estado.rascunho;
      var ultima = r && r.etapa === 4;

      return [
        h('button', {
          class: 'btn btn--text', type: 'button',
          onclick: function () { salvarRascunho(false); ctx.rerender(); }
        }, [ui.icon('save'), 'Salvar rascunho']),
        h('button', {
          class: 'btn btn--filled btn--grow', type: 'button',
          onclick: function () {
            if (ultima) { finalizar(ctx); return; }
            if (r.etapa === 1 && !r.unidade) {
              estado.erroUnidade = true;
              ctx.rerender();
              ui.snack('Escolha a propriedade ou unidade avaliada.');
              return;
            }
            r.etapa += 1;
            salvarRascunho(true);
            ctx.rerender();
          }
        }, ultima ? [ui.icon('fact_check'), 'Finalizar visita'] : ['Avançar', ui.icon('arrow_forward')])
      ];
    },

    render: function (ctx) {
      garanteEstado(ctx);
      var etapa = estado.rascunho.etapa;
      if (etapa === 1) return etapaDados(ctx);
      if (etapa === 2) return etapaAvaliacao(ctx);
      if (etapa === 3) return etapaFotos(ctx);
      return etapaRevisao(ctx);
    }
  };
})();
