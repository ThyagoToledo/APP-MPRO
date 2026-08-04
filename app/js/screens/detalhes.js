/* Detalhes navegáveis de cliente e visita, conectando os destinos antes sem ação. */
window.MPRO = window.MPRO || {};
MPRO.screens = MPRO.screens || {};

(function () {
  var ui = MPRO.ui;
  var h = ui.h;

  function dado(rotulo, valor, mono) {
    return h('div', { class: 'keyvalue' }, [
      h('span', { text: rotulo }),
      h('strong', { class: mono ? 'mono' : '', text: valor || '—' })
    ]);
  }

  function clienteDoContexto(ctx) {
    return MPRO.store.client(ctx.query.id);
  }

  MPRO.screens.clienteDetalhe = {
    grupo: 'B',
    chave: 'clientes',
    titulo: 'Cliente',
    get acao() {
      return {
        icone: 'add', rotulo: 'Iniciar visita',
        onClick: function (ctx) {
          if (ctx.query.id) location.hash = '#/visitas/nova?cliente=' + ctx.query.id;
        }
      };
    },
    render: function (ctx) {
      var cliente = clienteDoContexto(ctx);
      if (!cliente) return ui.emptyState({
        icone: 'person_off', titulo: 'Cliente não encontrado',
        texto: 'Ele pode ter sido removido ou pertencer a outro escopo de conta.',
        acao: { rotulo: 'Voltar a Clientes', icone: 'groups', onClick: function () { location.hash = '#/clientes'; } }
      });

      var visitas = MPRO.store.visits().filter(function (visita) { return visita.clienteId === cliente.id; });
      return h('div', { class: 'detail-page' }, [
        h('section', { class: 'detail-hero' }, [
          h('div', { class: 'detail-hero__eyebrow' }, [ui.icon('location_on'), cliente.municipio + '/' + cliente.uf]),
          h('h2', { text: cliente.nome }),
          h('div', { class: 'detail-hero__tags' }, [
            ui.statusTag(cliente.status, cliente.ultimaVisita ? ui.formatDate(cliente.ultimaVisita) : 'sem visita'),
            h('span', { class: 'pillcount' }, [ui.icon('grass'), cliente.cultura])
          ]),
          h('div', { class: 'detail-actions' }, [
            h('button', { class: 'btn btn--filled', type: 'button', onclick: function () { location.hash = '#/visitas/nova?cliente=' + cliente.id; } }, [ui.icon('add'), 'Iniciar visita']),
            h('button', { class: 'btn btn--outline', type: 'button', onclick: function () { location.hash = '#/mapa'; } }, [ui.icon('map'), 'Ver no mapa']),
            h('button', {
              class: 'btn btn--outline', type: 'button',
              onclick: function () { MPRO.screens.clientes.abrirCadastro(ctx, cliente); }
            }, [ui.icon('edit'), 'Editar']),
            h('button', {
              class: 'btn btn--text btn--danger', type: 'button',
              onclick: function () {
                ui.confirmSheet({
                  titulo: 'Excluir cliente',
                  texto: 'Remove "' + cliente.nome + '" da carteira deste aparelho. As visitas finalizadas dele permanecem no histórico, marcadas como cliente removido.',
                  confirmar: 'Excluir',
                  onConfirm: function () {
                    MPRO.store.removeClient(cliente.id);
                    location.hash = '#/clientes';
                    ui.snack('Cliente excluído.');
                  }
                });
              }
            }, [ui.icon('delete'), 'Excluir'])
          ])
        ]),

        h('div', { class: 'summary-grid' }, [
          dado('Área acompanhada', cliente.hectares ? cliente.hectares + ' ha' : 'Não informada', true),
          dado('Unidades produtivas', String(cliente.unidades.length), true),
          dado('pH médio', cliente.phMedio, true),
          dado('Coordenadas', cliente.coordenadas || 'Não cadastradas', true)
        ]),

        cliente.recomendacao ? ui.section('Recomendação em aberto', null,
          h('div', { class: 'notice', style: 'border-color:' + ui.status(cliente.status).cor }, [
            ui.icon('assignment_late'),
            h('div', { class: 'notice__body' }, [
              h('strong', { text: 'Próxima ação técnica' }),
              h('p', { text: cliente.recomendacao })
            ])
          ])) : null,

        ui.section('Unidades produtivas', h('span', { class: 'pillcount', text: String(cliente.unidades.length) }),
          h('div', { class: 'card-list' }, cliente.unidades.map(function (unidade) {
            return h('div', { class: 'listtile' }, [
              h('span', { class: 'listtile__icon' }, [ui.icon('grid_view')]),
              h('span', { class: 'listtile__body' }, [h('strong', { text: unidade }), h('span', { text: cliente.cultura + ' · ' + cliente.municipio + '/' + cliente.uf })]),
              ui.icon('chevron_right', 'dim')
            ]);
          }))
        ),

        ui.section('Histórico de visitas', null, visitas.length ? visitas.map(function (visita) {
          return ui.dataRow({
            status: visita.status,
            title: visita.unidade + ' · ' + visita.cultura,
            meta: ui.formatDate(visita.data),
            tag: ui.statusTag(visita.status),
            onClick: function () { location.hash = '#/visita?id=' + visita.id; }
          });
        }) : ui.emptyState({ icone: 'history', titulo: 'Sem visitas finalizadas', texto: 'A primeira visita concluída aparece aqui com seu status e medições.' }))
      ]);
    }
  };

  MPRO.screens.visitaDetalhe = {
    grupo: 'B',
    chave: 'visitas',
    titulo: 'Detalhe da visita',
    acao: {
      icone: 'preview', rotulo: 'Abrir revisão',
      onClick: function (ctx) { location.hash = '#/revisao?visita=' + (ctx.query.id || ''); }
    },
    render: function (ctx) {
      var visita = MPRO.store.visits().find(function (item) { return item.id === ctx.query.id; });
      if (!visita) return ui.emptyState({
        icone: 'event_busy', titulo: 'Visita não encontrada',
        texto: 'Ela pode pertencer a outro cliente ou ainda estar em rascunho.',
        acao: { rotulo: 'Voltar a Visitas', icone: 'assignment', onClick: function () { location.hash = '#/visitas'; } }
      });

      var cliente = MPRO.store.client(visita.clienteId);
      var avaliacoes = visita.avaliacoes || {};
      var medicoes = visita.medicoes || [];
      var fotos = visita.fotos || [];
      return h('div', { class: 'detail-page' }, [
        h('section', { class: 'detail-hero' }, [
          h('div', { class: 'detail-hero__eyebrow' }, [ui.icon('calendar_today'), ui.formatDate(visita.data)]),
          h('h2', { text: cliente ? cliente.nome : 'Cliente removido' }),
          h('p', { text: visita.unidade + ' · ' + visita.cultura }),
          h('div', { class: 'detail-hero__tags' }, [ui.statusTag(visita.status), h('span', { class: 'pillcount' }, [ui.icon('verified_user'), 'LAUDO FINALIZADO'])])
        ]),
        h('div', { class: 'summary-grid' }, [
          dado('Responsável', visita.responsavel || 'Não informado'),
          dado('Coordenada', visita.coordenadas || 'Não registrada', true),
          dado('Medições', String(medicoes.length), true),
          dado('Fotografias', String(fotos.length), true)
        ]),
        ui.section('Avaliação técnica', null,
          h('div', { class: 'card-list' }, MPRO.demo.blocosAvaliacao.map(function (bloco) {
            return h('div', { class: 'listtile' }, [
              h('span', { class: 'listtile__body' }, [h('strong', { text: bloco.rotulo }), h('span', { text: (visita.observacoes && visita.observacoes[bloco.chave]) || 'Sem observação adicional.' })]),
              avaliacoes[bloco.chave] ? ui.statusTag(avaliacoes[bloco.chave]) : h('span', { class: 'dim', text: 'Não avaliado' })
            ]);
          }))
        ),
        medicoes.length ? ui.section('Medições', null, medicoes.map(function (medicao) {
          return h('div', { class: 'measure' }, [
            h('div', { class: 'measure__track' }),
            h('div', { class: 'measure__body' }, [h('strong', { text: medicao.nome }), h('span', { text: medicao.contexto || visita.unidade })]),
            h('div', { class: 'measure__value' }, [h('b', { text: medicao.valor }), h('span', { text: medicao.unidade })])
          ]);
        })) : null,
        h('div', { class: 'detail-actions' }, [
          h('button', { class: 'btn btn--filled', type: 'button', onclick: function () { location.hash = '#/revisao?visita=' + visita.id; } }, [ui.icon('preview'), 'Revisar laudo']),
          h('button', { class: 'btn btn--outline', type: 'button', onclick: function () { location.hash = '#/cliente?id=' + visita.clienteId; } }, [ui.icon('person'), 'Abrir cliente']),
          h('button', {
            class: 'btn btn--outline', type: 'button',
            onclick: function () {
              var rascunho = {
                id: MPRO.store.newId('rasc'),
                clienteId: visita.clienteId,
                unidade: visita.unidade,
                cultura: visita.cultura,
                data: new Date().toISOString().slice(0, 10),
                hora: new Date().toTimeString().slice(0, 5),
                responsavel: visita.responsavel || '',
                coordenadas: visita.coordenadas || null,
                etapa: 1,
                progresso: 25,
                salvoEm: new Date().toISOString(),
                avaliacoes: Object.assign({}, visita.avaliacoes || {}),
                medicoes: (visita.medicoes || []).map(function (m) { return Object.assign({}, m); }),
                fotos: []
              };
              MPRO.store.saveDraft(rascunho);
              location.hash = '#/visitas/nova?rascunho=' + rascunho.id;
              ui.snack('Rascunho criado a partir desta visita.');
            }
          }, [ui.icon('content_copy'), 'Duplicar como rascunho']),
          h('button', {
            class: 'btn btn--text btn--danger', type: 'button',
            onclick: function () {
              ui.confirmSheet({
                titulo: 'Excluir visita',
                texto: 'Remove esta visita do histórico deste aparelho. O status do cliente não é recalculado automaticamente.',
                confirmar: 'Excluir',
                onConfirm: function () {
                  MPRO.store.removeVisit(visita.id);
                  location.hash = '#/visitas';
                  ui.snack('Visita excluída.');
                }
              });
            }
          }, [ui.icon('delete'), 'Excluir'])
        ])
      ]);
    }
  };
})();
