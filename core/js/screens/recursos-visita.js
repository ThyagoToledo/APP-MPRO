/* Biblioteca de evidências, fotos, transcrição e revisão do laudo. */
window.MPRO = window.MPRO || {};
MPRO.screens = MPRO.screens || {};

(function () {
  var ui = MPRO.ui;
  var h = ui.h;
  var abaEvidencia = 'fotos';
  var reproduzindo = false;
  var elementoAudio = null;
  var estruturado = false;
  var gravandoAudio = false;
  var tempoGravacao = '00:00';
  var fotosLocais = [];
  var audiosGravados = [
    {
      id: 'aud-1',
      tipo: 'audios',
      icone: 'mic',
      titulo: 'Nota de campo · Pivô 2',
      meta: '01:18 · Sebastião Nogueira',
      legenda: 'Pressão em 1,5 bar, abaixo dos 2,0 bar esperados. Folhas novas com coloração uniforme. Recomenda-se revisar os emissores do setor sul antes da próxima visita.',
      duracao: '01:18',
      url: ''
    }
  ];
  var transcricaoTexto = 'Irrigação do pivô 2 com pressão em 1,5 bar, abaixo dos 2,0 bar esperados. Folhas novas com coloração uniforme. Recomenda-se revisar os emissores do setor sul antes da próxima visita.';

  var EVIDENCIAS = [
    { id: 'ev-1', tipo: 'fotos', icone: 'photo_camera', titulo: 'Manômetro do pivô 2', meta: 'Fazenda Boa Vista · 25/07 · 06:18', legenda: 'Pressão observada de 1,5 bar no setor sul.' },
    { id: 'ev-2', tipo: 'fotos', icone: 'photo_camera', titulo: 'Folhas do terço superior', meta: 'Fazenda Boa Vista · 25/07 · 06:32', legenda: 'Coloração uniforme, sem sinais de fitotoxicidade.' },
    { id: 'ev-3', tipo: 'videos', icone: 'videocam', titulo: 'Uniformidade dos emissores', meta: '00:42 · Pivô 2', legenda: 'Variação visível na extremidade sul.' },
    { id: 'ev-4', tipo: 'audios', icone: 'mic', titulo: 'Nota de campo · Pivô 2', meta: '01:18 · Sebastião Nogueira', legenda: 'Relato sobre oscilação de pressão após manutenção.' }
  ];

  function seletorVisita() {
    var visitas = MPRO.store.visits();
    return h('label', { class: 'scopebar' }, [
      ui.icon('assignment'),
      h('span', { class: 'scopebar__body' }, [
        h('small', { text: 'VISITA ATIVA' }),
        h('strong', { text: visitas.length ? ui.formatDate(visitas[0].data) + ' · ' + visitas[0].unidade : 'Nenhuma visita finalizada' })
      ]),
      ui.icon('expand_more')
    ]);
  }

  function cardEvidencia(item, ctx) {
    return h('article', { class: 'media-card' }, [
      h('div', { class: 'media-card__preview' }, [ui.icon(item.icone)]),
      h('div', { class: 'media-card__body' }, [
        h('strong', { text: item.titulo }),
        h('span', { class: 'mono', text: item.meta }),
        h('p', { text: item.legenda })
      ]),
      h('button', {
        class: 'iconbtn iconbtn--ghost',
        type: 'button',
        'aria-label': 'Abrir ' + item.titulo,
        onclick: function () {
          if (item.tipo === 'audios') {
            location.hash = '#/transcricao';
          } else {
            ui.snack('Evidência aberta para revisão.');
          }
        }
      }, [ui.icon(item.tipo === 'audios' ? 'play_arrow' : 'open_in_full')])
    ]);
  }

  MPRO.screens.evidencias = {
    grupo: 'B', titulo: 'Evidências',
    acao: {
      icone: 'add_circle',
      rotulo: 'Adicionar evidência',
      onClick: function () {
        if (abaEvidencia === 'audios') location.hash = '#/transcricao';
        else location.hash = '#/fotos';
      }
    },
    render: function (ctx) {
      var abas = [['fotos', 'Fotos', 'photo_camera'], ['videos', 'Vídeos', 'videocam'], ['audios', 'Áudios', 'mic']];
      var itens = (abaEvidencia === 'audios' ? audiosGravados : EVIDENCIAS.filter(function (item) { return item.tipo === abaEvidencia; }));

      return h('div', { class: 'resource-page' }, [
        seletorVisita(),
        h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Tipo de evidência' }, abas.map(function (aba) {
          return h('button', {
            class: 'tab', type: 'button', role: 'tab',
            'aria-selected': abaEvidencia === aba[0] ? 'true' : 'false',
            onclick: function () { abaEvidencia = aba[0]; ctx.rerender(); }
          }, [ui.icon(aba[2]), aba[1]]);
        })),
        abaEvidencia === 'audios' ? h('div', { style: 'margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap' }, [
          h('button', {
            class: 'btn btn--filled btn--sm',
            type: 'button',
            onclick: function () { location.hash = '#/transcricao'; }
          }, [ui.icon('mic'), 'Gravar novo áudio']),
          h('span', { class: 'dim', style: 'align-self:center;font-size:12px', text: audiosGravados.length + ' áudio(s) registrado(s)' })
        ]) : null,
        itens.length ? h('div', { class: 'media-list' }, itens.map(function (it) { return cardEvidencia(it, ctx); })) : ui.emptyState({
          icone: 'perm_media',
          titulo: 'Nenhuma evidência nesta aba',
          texto: 'Adicione um registro e mantenha-o vinculado à visita de origem.'
        })
      ]);
    }
  };

  function adicionarFoto(ctx) {
    var input = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'sr-only' });
    input.addEventListener('change', function () {
      var arquivos = Array.from(input.files || []);
      if (!arquivos.length) return;

      ui.snack('Otimizando fotos selecionadas…');
      Promise.all(arquivos.map(function (arq) {
        return MPRO.upload.enviar(arq, { pasta: 'visitas', nome: arq.name });
      })).then(function (resultados) {
        resultados.forEach(function (res, i) {
          fotosLocais.push({
            id: MPRO.store.newId('foto'),
            nome: res.nome || arquivos[i].name,
            titulo: '',
            legenda: '',
            url: res.url
          });
        });
        ui.snack(resultados.length + ' foto(s) adicionada(s)!');
        ctx.rerender();
      }).catch(function (err) {
        console.error('Erro no upload de fotos:', err);
        ui.snack('Erro ao adicionar fotos.');
      });
    });
    document.body.appendChild(input);
    input.click();
    input.addEventListener('change', function () { input.remove(); });
  }

  function moverFoto(indice, direcao, ctx) {
    var destino = indice + direcao;
    if (destino < 0 || destino >= fotosLocais.length) return;
    var foto = fotosLocais.splice(indice, 1)[0];
    fotosLocais.splice(destino, 0, foto);
    ctx.rerender();
  }

  MPRO.screens.fotos = {
    grupo: 'B', titulo: 'Registro fotográfico',
    acao: { icone: 'add_a_photo', rotulo: 'Adicionar fotos', onClick: function (ctx) { adicionarFoto(ctx); } },
    render: function (ctx) {
      return h('div', { class: 'resource-page' }, [
        seletorVisita(),
        h('div', { class: 'notice' }, [
          ui.icon('info'),
          h('div', { class: 'notice__body' }, [
            h('strong', { text: 'Ordem preservada no laudo' }),
            h('p', { text: 'Título e legenda acompanham cada imagem. As fotos são salvas em nuvem CDN e organizadas na sequência do PDF.' })
          ])
        ]),
        h('button', {
          class: 'dropzone', type: 'button',
          onclick: function () { adicionarFoto(ctx); }
        }, [
          ui.icon('add_a_photo'),
          h('strong', { text: 'Adicionar fotos' }),
          h('span', { text: 'Câmera ou arquivos deste aparelho (salvos em nuvem CDN)' })
        ]),
        fotosLocais.length ? h('div', { class: 'photo-grid' }, fotosLocais.map(function (foto, indice) {
          return h('article', { class: 'photo-card' }, [
            h('div', { class: 'photo-card__image' }, [
              h('img', { src: foto.url, alt: foto.titulo || foto.nome }),
              h('span', { class: 'photo-card__index mono', text: String(indice + 1).padStart(2, '0') })
            ]),
            h('div', { class: 'photo-card__body' }, [
              h('input', {
                class: 'input input--sm', value: foto.titulo,
                placeholder: 'Título da evidência', 'aria-label': 'Título da foto ' + (indice + 1),
                oninput: function (event) { foto.titulo = event.target.value; }
              }),
              h('textarea', {
                class: 'textarea', placeholder: 'Legenda técnica',
                'aria-label': 'Legenda da foto ' + (indice + 1),
                oninput: function (event) { foto.legenda = event.target.value; }
              }, foto.legenda),
              h('div', { class: 'photo-card__actions' }, [
                h('button', { class: 'iconbtn iconbtn--ghost', type: 'button', disabled: indice === 0, 'aria-label': 'Mover foto para trás', onclick: function () { moverFoto(indice, -1, ctx); } }, [ui.icon('arrow_back')]),
                h('button', { class: 'iconbtn iconbtn--ghost', type: 'button', disabled: indice === fotosLocais.length - 1, 'aria-label': 'Mover foto para frente', onclick: function () { moverFoto(indice, 1, ctx); } }, [ui.icon('arrow_forward')]),
                h('button', { class: 'iconbtn iconbtn--ghost', type: 'button', 'aria-label': 'Remover foto', onclick: function () { fotosLocais.splice(indice, 1); ctx.rerender(); } }, [ui.icon('delete')])
              ])
            ])
          ]);
        })) : ui.emptyState({ icone: 'photo_library', titulo: 'Nenhuma foto selecionada', texto: 'Inclua imagens legíveis e dê contexto técnico a cada uma antes de gerar o documento.' })
      ]);
    }
  };

  MPRO.screens.transcricao = {
    grupo: 'B', titulo: 'Transcrição e Áudio',
    acao: {
      icone: 'auto_fix_high',
      rotulo: 'Estruturar texto',
      onClick: function (ctx) {
        estruturado = true;
        ui.snack('Texto organizado por seções técnicas agronômicas.');
        ctx.rerender();
      }
    },
    render: function (ctx) {
      var rascunhos = MPRO.store.drafts();
      var rascunhoAtivo = rascunhos.length ? rascunhos[0] : null;

      var trechos = MPRO.audio
        ? MPRO.audio.estruturarTextoAgronomico(transcricaoTexto)
        : [
          { titulo: 'Irrigação & Manejo', texto: 'Pressão em 1,5 bar, abaixo dos 2,0 bar esperados.', status: 'monitorar', chave: 'irrigacao' },
          { titulo: 'Condição geral', texto: 'Folhas novas com coloração uniforme.', status: 'adequado', chave: 'sanidade' },
          { titulo: 'Recomendação', texto: 'Revisar emissores do setor sul antes da próxima visita.', status: 'corrigir', chave: 'recomendacao' }
        ];

      function alternarGravacao() {
        if (!gravandoAudio) {
          MPRO.audio.iniciarGravacao(function (progresso) {
            tempoGravacao = progresso.tempoFormatado;
            if (progresso.transcricao) {
              transcricaoTexto = progresso.transcricao;
            }
            ctx.rerender();
          }, function (err) {
            ui.snack('Não foi possível acessar o microfone.');
          });
          gravandoAudio = true;
          ctx.rerender();
        } else {
          MPRO.audio.pararGravacao().then(function (resultado) {
            gravandoAudio = false;
            if (resultado) {
              audiosGravados.unshift({
                id: resultado.id,
                tipo: 'audios',
                icone: 'mic',
                titulo: 'Nota de voz (' + resultado.duracaoFormatada + ')',
                meta: ui.formatDate(new Date().toISOString()) + ' · Campo',
                legenda: resultado.transcricao,
                duracao: resultado.duracaoFormatada,
                url: resultado.url
              });
              if (resultado.transcricao) {
                transcricaoTexto = resultado.transcricao;
              }
              ui.snack('Áudio gravado e transcrito com sucesso!');
            }
            ctx.rerender();
          });
        }
      }

      function alternarPlay() {
        if (!reproduzindo) {
          var audioAtual = audiosGravados[0];
          if (audioAtual && audioAtual.url) {
            if (!elementoAudio) elementoAudio = new Audio();
            elementoAudio.src = audioAtual.url;
            elementoAudio.onended = function () {
              reproduzindo = false;
              ctx.rerender();
            };
            elementoAudio.play().catch(function () {
              reproduzindo = false;
              ctx.rerender();
            });
            reproduzindo = true;
          } else {
            reproduzindo = true;
            setTimeout(function () { reproduzindo = false; ctx.rerender(); }, 4000);
          }
        } else {
          if (elementoAudio) elementoAudio.pause();
          reproduzindo = false;
        }
        ctx.rerender();
      }

      var barraGravador = h('div', {
        style: 'display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--surface-container-high);border-radius:var(--r-lg);border:1px solid ' + (gravandoAudio ? '#d32f2f' : 'var(--outline-variant)') + ';margin-bottom:14px;flex-wrap:wrap;gap:10px'
      }, [
        h('div', { style: 'display:flex;align-items:center;gap:10px' }, [
          h('button', {
            class: 'btn ' + (gravandoAudio ? 'btn--danger' : 'btn--filled'),
            type: 'button',
            style: 'height:44px;font-weight:700;' + (gravandoAudio ? 'background:#d32f2f;color:#fff;animation:pulse 1s infinite' : ''),
            onclick: alternarGravacao
          }, [
            ui.icon(gravandoAudio ? 'stop' : 'mic'),
            gravandoAudio ? 'Parar gravação (' + tempoGravacao + ')' : 'Gravar áudio da visita'
          ]),
          h('span', {
            class: 'dim',
            style: 'font-size:13px;line-height:1.4',
            text: gravandoAudio ? 'Ouvindo e transcrevendo em tempo real…' : 'Grave um relato de voz em campo para transcrever automaticamente.'
          })
        ]),
        h('button', {
          class: 'btn btn--secondary btn--sm',
          type: 'button',
          onclick: function () {
            var input = document.getElementById('textarea-transcricao');
            if (input) MPRO.audio.ditarParaCampo(input, function (txt) { transcricaoTexto = txt; });
          }
        }, [ui.icon('mic_none'), 'Ditado contínuo'])
      ]);

      return h('div', { class: 'resource-page transcript-layout' }, [
        barraGravador,
        h('section', { class: 'audio-player' }, [
          h('button', {
            class: 'audio-player__play', type: 'button',
            'aria-label': reproduzindo ? 'Pausar áudio' : 'Reproduzir áudio',
            onclick: alternarPlay
          }, [ui.icon(reproduzindo ? 'pause' : 'play_arrow')]),
          h('div', { class: 'audio-player__body' }, [
            h('strong', { text: audiosGravados[0] ? audiosGravados[0].titulo : 'Nota de campo · Gravação de Voz' }),
            h('div', { class: 'waveform', 'data-playing': reproduzindo ? 'true' : 'false' }, Array.from({ length: 28 }, function (_, i) {
              return h('i', { style: 'height:' + (10 + ((i * 17) % 26)) + 'px' });
            })),
            h('span', { class: 'mono dim', text: audiosGravados[0] ? '00:00 / ' + (audiosGravados[0].duracao || '01:18') : 'Pronto para reproduzir' })
          ])
        ]),
        h('div', { class: 'transcript-grid' }, [
          h('section', { class: 'panel' }, [
            h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px' }, [
              h('h2', { class: 'section__title', style: 'margin:0', text: 'Texto transcrito' }),
              h('button', {
                class: 'btn btn--text btn--sm',
                type: 'button',
                onclick: function () {
                  if (rascunhoAtivo) {
                    rascunhoAtivo.recomendacao = (rascunhoAtivo.recomendacao ? rascunhoAtivo.recomendacao + '\n\n' : '') + transcricaoTexto;
                    MPRO.store.saveDraft(rascunhoAtivo);
                    ui.snack('Texto anexado ao rascunho da visita ativa!');
                  } else {
                    ui.snack('Abra uma nova visita para vincular o texto.');
                  }
                }
              }, [ui.icon('content_paste_go'), 'Vincular ao laudo ativo'])
            ]),
            h('textarea', {
              id: 'textarea-transcricao',
              class: 'textarea textarea--lg',
              'aria-label': 'Texto transcrito',
              rows: '6',
              placeholder: 'Fale no microfone ou edite a transcrição aqui…',
              oninput: function (event) { transcricaoTexto = event.target.value; }
            }, transcricaoTexto)
          ]),
          h('section', { class: 'panel' }, [
            h('div', { class: 'section__head' }, [
              h('h2', { class: 'section__title', text: 'Estrutura sugerida' }),
              estruturado ? h('span', { class: 'pillcount', text: trechos.length + ' TRECHOS' }) : null
            ]),
            estruturado ? trechos.map(function (trecho) {
              return h('div', { class: 'structured-item' }, [
                h('div', { class: 'structured-item__head' }, [
                  h('strong', { text: trecho.titulo }),
                  ui.statusTag(trecho.status)
                ]),
                h('p', { text: trecho.texto }),
                h('button', {
                  class: 'btn btn--text', type: 'button',
                  onclick: function () {
                    if (rascunhoAtivo) {
                      if (trecho.chave === 'recomendacao') {
                        rascunhoAtivo.recomendacao = (rascunhoAtivo.recomendacao ? rascunhoAtivo.recomendacao + '\n' : '') + trecho.texto;
                      } else {
                        rascunhoAtivo.observacoes = rascunhoAtivo.observacoes || {};
                        rascunhoAtivo.observacoes[trecho.chave] = trecho.texto;
                        rascunhoAtivo.avaliacoes = rascunhoAtivo.avaliacoes || {};
                        rascunhoAtivo.avaliacoes[trecho.chave] = trecho.status;
                      }
                      MPRO.store.saveDraft(rascunhoAtivo);
                      ui.snack('Trecho aplicado à seção ' + trecho.titulo + ' do laudo!');
                    } else {
                      ui.snack('Trecho copiado: ' + trecho.titulo);
                    }
                  }
                }, [ui.icon('input'), 'Aplicar ao laudo'])
              ]);
            }) : ui.emptyState({
              icone: 'account_tree',
              titulo: 'Texto ainda não estruturado',
              texto: 'Revise a transcrição e use o botão “Estruturar texto” acima para separar observações de solo, irrigação e recomendações.'
            })
          ])
        ])
      ]);
    }
  };

  function visitaParaRevisao(ctx) {
    var visitas = MPRO.store.visits();
    return visitas.find(function (visita) { return visita.id === ctx.query.visita; }) || visitas[0] || null;
  }

  MPRO.screens.revisao = {
    grupo: 'B', titulo: 'Revisão e finalização',
    acao: { icone: 'print', rotulo: 'Imprimir ou salvar PDF', onClick: function () { window.print(); } },
    render: function (ctx) {
      var visita = visitaParaRevisao(ctx);
      if (!visita) return ui.emptyState({ icone: 'fact_check', titulo: 'Nenhuma visita para revisar', texto: 'Finalize uma visita ou salve um rascunho para montar a prévia do laudo.' });
      var cliente = MPRO.store.client(visita.clienteId);
      return h('div', { class: 'review-layout' }, [
        h('aside', { class: 'review-checklist panel' }, [
          h('h2', { class: 'section__title', text: 'Checklist de publicação' }),
          ['Cliente e unidade identificados', 'Data e responsável técnico', 'Avaliação com status textual', 'Medições com unidade', 'Versão preservada no histórico'].map(function (texto) { return h('div', { class: 'checkline' }, [ui.icon('check_circle'), h('span', { text: texto })]); }),
          h('button', { class: 'btn btn--filled', type: 'button', onclick: function () { window.print(); } }, [ui.icon('picture_as_pdf'), 'Gerar PDF']),
          h('p', { class: 'dim', text: 'A impressão do navegador permite salvar a prévia como PDF sem alterar o laudo finalizado.' })
        ]),
        h('article', { class: 'report-preview' }, [
          h('header', { class: 'report-preview__head' }, [ui.brand(), h('div', {}, [h('span', { class: 'mono', text: 'RELATÓRIO TÉCNICO' }), h('strong', { text: ui.formatDate(visita.data) })])]),
          h('div', { class: 'report-preview__title' }, [h('span', { text: visita.cultura + ' · ' + visita.unidade }), h('h2', { text: cliente ? cliente.nome : 'Cliente removido' }), h('p', { text: cliente ? cliente.municipio + '/' + cliente.uf : '' })]),
          h('div', { class: 'report-preview__status' }, [h('span', { text: 'SITUAÇÃO DA VISITA' }), ui.statusTag(visita.status)]),
          h('section', {}, [h('h3', { text: 'Síntese técnica' }), h('p', { text: 'A visita registra as condições observadas em campo, as medições disponíveis e os pontos que exigem continuidade. Cada status aparece com ícone e rótulo para manter a leitura também em impressão monocromática.' })]),
          h('section', {}, [h('h3', { text: 'Medições' }), (visita.medicoes && visita.medicoes.length) ? visita.medicoes.map(function (m) { return h('div', { class: 'report-row' }, [h('span', { text: m.nome }), h('strong', { class: 'mono', text: m.valor + ' ' + m.unidade })]); }) : h('p', { class: 'dim', text: 'Sem medições registradas nesta visita.' })]),
          h('footer', {}, [h('span', { text: 'M-PRO · acompanhamento agronômico' }), h('span', { class: 'mono', text: 'VERSÃO 1' })])
        ])
      ]);
    }
  };
})();
