/* Gestão local de equipamentos e manutenção. */
window.MPRO = window.MPRO || {};
MPRO.screens = MPRO.screens || {};

MPRO.screens.equipamentos = (function () {
  var ui = MPRO.ui;
  var h = ui.h;
  var filtro = 'todos';

  function metaStatus(status) {
    if (status === 'manutencao') return { rotulo: 'MANUTENÇÃO', icone: 'build_circle', cor: 'var(--corrigir)' };
    return ui.status(status);
  }

  function abrirFormulario(ctx, equipamento) {
    var atual = equipamento || {};
    var nome = h('input', { class: 'input', value: atual.nome || '', placeholder: 'Ex.: Bomba dosadora 01', 'aria-label': 'Nome do equipamento' });
    var tipo = h('input', { class: 'input', value: atual.tipo || '', placeholder: 'Irrigação, medição…', 'aria-label': 'Tipo do equipamento' });
    var proxima = h('input', { class: 'input mono', type: 'date', value: atual.proxima || '', 'aria-label': 'Próxima manutenção' });
    var observacao = h('textarea', { class: 'textarea', placeholder: 'Procedimento ou ponto de atenção', 'aria-label': 'Observação' }, atual.observacao || '');

    ui.openSheet({
      titulo: equipamento ? 'Editar equipamento' : 'Novo equipamento',
      body: [
        h('div', { class: 'field' }, [h('span', { class: 'field__label', text: 'Nome *' }), nome]),
        h('div', { class: 'field' }, [h('span', { class: 'field__label', text: 'Tipo *' }), tipo]),
        h('div', { class: 'field' }, [h('span', { class: 'field__label', text: 'Próxima manutenção' }), proxima]),
        h('div', { class: 'field' }, [h('span', { class: 'field__label', text: 'Observação' }), observacao])
      ],
      footer: [
        h('button', { class: 'btn btn--text', type: 'button', onclick: ui.closeSheet }, 'Cancelar'),
        h('button', { class: 'btn btn--filled btn--grow', type: 'button', onclick: function () {
          if (!nome.value.trim() || !tipo.value.trim()) { ui.snack('Informe nome e tipo do equipamento.'); return; }
          var item = Object.assign({}, atual, {
            id: atual.id || MPRO.store.newId('eq'),
            nome: nome.value.trim(), tipo: tipo.value.trim(), proxima: proxima.value,
            observacao: observacao.value.trim(), status: atual.status || 'adequado', ultima: atual.ultima || null, clienteId: atual.clienteId || null
          });
          if (equipamento) MPRO.store.saveEquipment(item); else MPRO.store.addEquipment(item);
          ui.closeSheet();
          ui.snack(equipamento ? 'Equipamento atualizado.' : 'Equipamento cadastrado.');
          ctx.rerender();
        } }, equipamento ? 'Salvar alterações' : 'Cadastrar')
      ]
    });
  }

  function abrirDetalhe(ctx, equipamento) {
    var meta = metaStatus(equipamento.status);
    var cliente = equipamento.clienteId ? MPRO.store.client(equipamento.clienteId) : null;
    ui.openSheet({
      titulo: equipamento.nome,
      body: [
        h('div', { class: 'equipment-status', style: 'border-color:' + meta.cor }, [ui.icon(meta.icone), h('div', {}, [h('strong', { text: meta.rotulo }), h('span', { text: equipamento.tipo + (cliente ? ' · ' + cliente.nome : ' · equipamento da equipe') })])]),
        h('div', { class: 'summary-grid summary-grid--compact' }, [
          h('div', { class: 'keyvalue' }, [h('span', { text: 'Última manutenção' }), h('strong', { class: 'mono', text: ui.formatDate(equipamento.ultima) })]),
          h('div', { class: 'keyvalue' }, [h('span', { text: 'Próxima manutenção' }), h('strong', { class: 'mono', text: ui.formatDate(equipamento.proxima) })])
        ]),
        h('p', { class: 'dim', style: 'margin:0;line-height:1.5', text: equipamento.observacao || 'Sem observações registradas.' })
      ],
      footer: [
        h('button', {
          class: 'btn btn--text btn--danger', type: 'button', 'aria-label': 'Excluir equipamento',
          onclick: function () {
            ui.confirmSheet({
              titulo: 'Excluir equipamento',
              texto: 'Remove "' + equipamento.nome + '" da lista deste aparelho. O histórico de manutenção some junto.',
              confirmar: 'Excluir',
              onConfirm: function () {
                MPRO.store.removeEquipment(equipamento.id);
                ui.snack('Equipamento excluído.');
                ctx.rerender();
              }
            });
          }
        }, [ui.icon('delete')]),
        h('button', { class: 'btn btn--outline', type: 'button', onclick: function () { ui.closeSheet(); abrirFormulario(ctx, equipamento); } }, [ui.icon('edit'), 'Editar']),
        h('button', { class: 'btn btn--filled btn--grow', type: 'button', onclick: function () {
          equipamento.status = 'adequado';
          equipamento.ultima = new Date().toISOString().slice(0, 10);
          MPRO.store.saveEquipment(equipamento);
          ui.closeSheet(); ui.snack('Manutenção registrada.'); ctx.rerender();
        } }, [ui.icon('task_alt'), 'Registrar manutenção'])
      ]
    });
  }

  return {
    grupo: 'B', chave: 'equipamentos', titulo: 'Equipamentos', carrega: true,
    acao: { icone: 'add', rotulo: 'Novo equipamento', onClick: function (ctx) { abrirFormulario(ctx); } },
    deskHead: function (ctx) {
      return [
        h('div', { class: 'deskhead__id' }, [h('span', { class: 'mono', text: 'OPERAÇÃO DE CAMPO' }), h('strong', { text: 'Equipamentos' })]),
        h('div', { class: 'deskhead__tools' }, [h('button', { class: 'btn btn--filled', type: 'button', onclick: function () { abrirFormulario(ctx); } }, [ui.icon('add'), 'Novo equipamento'])])
      ];
    },
    render: function (ctx) {
      var todos = MPRO.store.equipments();
      var opcoes = [['todos', 'Todos'], ['adequado', 'Adequados'], ['monitorar', 'Monitorar'], ['manutencao', 'Manutenção']];
      var lista = todos.filter(function (item) { return filtro === 'todos' || item.status === filtro; });
      return h('div', { class: 'resource-page' }, [
        h('div', { class: 'chiprow', role: 'group', 'aria-label': 'Filtrar equipamentos' }, opcoes.map(function (opcao) {
          var total = opcao[0] === 'todos' ? todos.length : todos.filter(function (item) { return item.status === opcao[0]; }).length;
          return h('button', { class: 'chip', type: 'button', 'aria-pressed': filtro === opcao[0] ? 'true' : 'false', onclick: function () { filtro = opcao[0]; ctx.rerender(); } }, [opcao[1], h('span', { class: 'chip__count', text: total })]);
        })),
        lista.length ? h('div', { class: 'equipment-grid' }, lista.map(function (equipamento) {
          var meta = metaStatus(equipamento.status);
          var cliente = equipamento.clienteId ? MPRO.store.client(equipamento.clienteId) : null;
          var vencida = equipamento.proxima && new Date(equipamento.proxima) < new Date();
          return h('button', { class: 'equipment-card', type: 'button', onclick: function () { abrirDetalhe(ctx, equipamento); } }, [
            h('div', { class: 'equipment-card__top' }, [h('span', { class: 'equipment-card__icon' }, [ui.icon(equipamento.tipo === 'Medição' ? 'speed' : 'precision_manufacturing')]), h('span', { class: 'statustag', style: 'color:' + meta.cor }, [ui.icon(meta.icone), meta.rotulo])]),
            h('div', { class: 'equipment-card__body' }, [h('h3', { text: equipamento.nome }), h('p', { text: equipamento.tipo + (cliente ? ' · ' + cliente.nome : ' · equipe M-PRO') })]),
            h('div', { class: 'equipment-card__date' + (vencida ? ' equipment-card__date--late' : '') }, [ui.icon(vencida ? 'event_busy' : 'event'), h('span', {}, [h('small', { text: 'PRÓXIMA MANUTENÇÃO' }), h('strong', { class: 'mono', text: ui.formatDate(equipamento.proxima) })])])
          ]);
        })) : ui.emptyState({ icone: 'filter_alt_off', titulo: 'Nenhum equipamento neste filtro', texto: 'Troque o status selecionado ou cadastre um novo equipamento.' })
      ]);
    }
  };
})();
