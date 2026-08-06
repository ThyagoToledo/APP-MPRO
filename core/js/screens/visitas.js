/* Visitas — destino da barra inferior (grupo B). Reúne rascunhos e visitas finalizadas. */
window.MPRO = window.MPRO || {};
MPRO.screens = MPRO.screens || {};

MPRO.screens.visitas = (function () {
  var ui = MPRO.ui;
  var h = ui.h;

  var filtro = 'todas';

  function nomeCliente(id) {
    var cliente = MPRO.store.client(id);
    return cliente ? cliente.nome + ' — ' + cliente.municipio + '/' + cliente.uf : 'Cliente removido';
  }

  return {
    grupo: 'B',
    chave: 'visitas',
    titulo: 'Visitas',
    carrega: true,
    acao: {
      icone: 'add',
      rotulo: 'Nova visita',
      onClick: function () { location.hash = '#/visitas/nova'; }
    },

    deskHead: function () {
      return [
        h('div', { class: 'deskhead__id' }, [
          h('span', { class: 'mono', text: 'HISTÓRICO TÉCNICO' }),
          h('strong', { text: 'Visitas' })
        ]),
        h('div', { class: 'deskhead__tools' }, [
          h('button', { class: 'btn btn--filled', type: 'button', onclick: function () { location.hash = '#/visitas/nova'; } }, [
            ui.icon('add'), 'Nova visita'
          ])
        ])
      ];
    },

    render: function (ctx) {
      var rascunhos = MPRO.store.drafts();
      var visitas = MPRO.store.visits().filter(function (v) {
        return filtro === 'todas' || v.status === filtro;
      });

      if (!rascunhos.length && !MPRO.store.visits().length) {
        return ui.emptyState({
          icone: 'assignment',
          titulo: 'Nenhuma visita registrada',
          texto: 'Toda visita começa em campo e vira laudo depois da revisão. Comece pela primeira.',
          acao: { rotulo: 'Nova visita', icone: 'add', onClick: function () { location.hash = '#/visitas/nova'; } }
        });
      }

      var chipsFiltro = h('div', { class: 'chiprow', role: 'group', 'aria-label': 'Filtrar visitas' },
        [['todas', 'Todas'], ['adequado', 'Adequado'], ['monitorar', 'Monitorar'], ['corrigir', 'Corrigir']].map(function (par) {
          var total = par[0] === 'todas' ? MPRO.store.visits().length : MPRO.store.visits().filter(function (visita) { return visita.status === par[0]; }).length;
          return h('button', {
            class: 'chip', type: 'button', 'aria-pressed': filtro === par[0] ? 'true' : 'false',
            onclick: function () { filtro = par[0]; ctx.rerender(); }
          }, [
            par[0] === 'todas' ? null : h('span', { class: 'chip__dot', style: 'background:' + ui.status(par[0]).cor }),
            par[1],
            h('span', { class: 'chip__count', text: total })
          ]);
        }));

      return h('div', { class: 'resource-page' }, [
        rascunhos.length ? h('div', { class: 'draft-panel' }, [ui.section('Em rascunho', h('span', { class: 'pillcount', style: 'color:var(--monitorar)' }, [
          ui.icon('pending'), rascunhos.length + (rascunhos.length === 1 ? ' PENDENTE' : ' PENDENTES')
        ]), rascunhos.map(function (rascunho) {
          return ui.dataRow({
            status: 'monitorar',
            title: nomeCliente(rascunho.clienteId),
            meta: rascunho.unidade + ' · etapa ' + rascunho.etapa + ' de 4 · salvo ' + ui.formatSavedAt(rascunho.salvoEm),
            onClick: function () { location.hash = '#/visitas/nova?rascunho=' + rascunho.id; }
          });
        }))]) : null,

        chipsFiltro,

        ui.section('Finalizadas', h('span', { class: 'resultsbar__copy', text: visitas.length + (visitas.length === 1 ? ' registro' : ' registros') }), visitas.length ? visitas.map(function (visita) {
          return ui.dataRow({
            status: visita.status,
            title: nomeCliente(visita.clienteId),
            meta: ui.formatDate(visita.data) + ' · ' + visita.unidade + ' · ' + visita.cultura,
            tag: ui.statusTag(visita.status),
            trailing: 'cta',
            onClick: function () { location.hash = '#/visita?id=' + visita.id; }
          });
        }) : h('p', { class: 'dim', style: 'margin:0', text: 'Nenhuma visita finalizada com esse filtro.' }))
      ]);
    }
  };
})();
