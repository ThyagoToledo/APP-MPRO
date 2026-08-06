/* 03 · Dashboard (Início) — grupo B. */
window.MPRO = window.MPRO || {};
MPRO.screens = MPRO.screens || {};

MPRO.screens.dashboard = (function () {
  var ui = MPRO.ui;
  var h = ui.h;

  function metricas() {
    var store = MPRO.store;
    var visitas = store.visits();
    var limite = new Date();
    limite.setDate(limite.getDate() - 30);

    var recentes = visitas.filter(function (v) { return new Date(v.data) >= limite; });
    var pendentes = store.drafts().length + visitas.filter(function (v) { return v.status === 'corrigir'; }).length;

    return {
      visitas30: recentes.length,
      clientes: store.clients().length,
      pendentes: pendentes
    };
  }

  function porStatus() {
    var contagem = { adequado: 0, monitorar: 0, corrigir: 0 };
    MPRO.store.clients().forEach(function (c) {
      if (contagem[c.status] !== undefined) contagem[c.status]++;
    });
    return contagem;
  }

  function saudacao(compacta) {
    var user = MPRO.store.user();
    var praca = user.empresa ? ' · ' + user.empresa : '';
    var primeiroNome = (user.nome || 'técnico').split(' ')[0];
    if (compacta) {
      return h('div', { class: 'deskhead__id' }, [
        h('span', { class: 'mono', text: (ui.todayLabel() + praca).toUpperCase() }),
        h('strong', { text: ui.greetingWord() + ', ' + primeiroNome })
      ]);
    }
    return h('div', { class: 'greeting' }, [
      h('span', { class: 'greeting__meta', text: ui.todayLabel() + praca }),
      h('h2', { class: 'greeting__name', text: ui.greetingWord() + ', ' + primeiroNome })
    ]);
  }

  function linhaRascunho(rascunho, tema) {
    var cliente = MPRO.store.client(rascunho.clienteId);
    var nome = cliente ? cliente.nome : 'Cliente removido';
    var local = cliente ? ' — ' + cliente.municipio + '/' + cliente.uf : '';
    return ui.dataRow({
      status: 'monitorar',
      title: tema === 'compacto' ? nome : nome + local,
      meta: (rascunho.cultura ? rascunho.cultura[0].toUpperCase() + rascunho.cultura.slice(1) + ' · ' : '') +
        'salvo ' + ui.formatSavedAt(rascunho.salvoEm) + ' · ' + rascunho.progresso + '% completo',
      onClick: function () { location.hash = '#/visitas/nova?rascunho=' + rascunho.id; }
    });
  }

  function blocoRascunhos(tema) {
    var rascunhos = MPRO.store.drafts();
    if (!rascunhos.length) return null;

    var contador = h('span', {
      class: 'pillcount',
      style: 'color:var(--monitorar)'
    }, [ui.icon('pending'), rascunhos.length + (rascunhos.length === 1 ? ' PENDENTE' : ' PENDENTES')]);

    return ui.section('Rascunhos ativos', contador, rascunhos.map(function (r) {
      return linhaRascunho(r, tema);
    }));
  }

  function blocoMetricas() {
    var m = metricas();
    return h('div', { class: 'metrics' }, [
      h('div', { class: 'metric' }, [h('strong', { text: m.visitas30 }), h('span', { html: 'visitas em<br>30 dias' })]),
      h('div', { class: 'metric' }, [h('strong', { text: m.clientes }), h('span', { html: 'clientes<br>ativos' })]),
      h('div', { class: 'metric' }, [
        h('strong', { style: m.pendentes ? 'color:var(--corrigir)' : '', text: m.pendentes }),
        h('span', { html: 'laudos a<br>finalizar' })
      ])
    ]);
  }

  function linhaVisita(visita, trailing) {
    var cliente = MPRO.store.client(visita.clienteId);
    return ui.dataRow({
      status: visita.status,
      title: (cliente ? cliente.nome : 'Cliente removido') + (cliente ? ' — ' + cliente.municipio + '/' + cliente.uf : ''),
      meta: ui.formatDate(visita.data) + ' · ' + visita.unidade,
      tag: ui.statusTag(visita.status),
      trailing: trailing,
      onClick: function () {
        location.hash = '#/visita?id=' + visita.id;
      }
    });
  }

  function tabelaVisitas(visitas) {
    var linhas = visitas.map(function (visita) {
      var cliente = MPRO.store.client(visita.clienteId);
      return h('button', {
        class: 'table__row', type: 'button',
        onclick: function () { location.hash = '#/visita?id=' + visita.id; }
      }, [
        h('span', { class: 'mono dim', style: 'font-size:13px', text: ui.formatDate(visita.data) }),
        h('span', { style: 'font-size:15px;font-weight:600', text: (cliente ? cliente.nome + ' — ' + cliente.municipio + '/' + cliente.uf : 'Cliente removido') }),
        ui.statusTag(visita.status),
        h('span', { style: 'font-size:13px;font-weight:700;color:var(--secondary)', text: 'Ver' })
      ]);
    });

    return h('div', { class: 'table' }, [
      h('div', { class: 'table__row table__row--head' }, [
        h('span', { text: 'DATA' }), h('span', { text: 'CLIENTE' }), h('span', { text: 'STATUS' }), h('span')
      ])
    ].concat(linhas));
  }

  /* Manutenção vencida sai dos equipamentos cadastrados, não de um texto fixo. */
  function manutencaoVencida() {
    var hoje = new Date().toISOString().slice(0, 10);
    var vencidos = MPRO.store.equipments()
      .filter(function (eq) { return eq.proxima && eq.proxima < hoje; })
      .sort(function (a, b) { return String(a.proxima).localeCompare(String(b.proxima)); });
    if (!vencidos.length) return null;
    var equipamento = vencidos[0];
    var cliente = equipamento.clienteId ? MPRO.store.client(equipamento.clienteId) : null;
    var dias = Math.round((Date.now() - new Date(equipamento.proxima).getTime()) / 86400000);
    return {
      equipamento: equipamento.nome,
      cliente: cliente ? cliente.nome : 'sem cliente vinculado',
      diasAtraso: dias
    };
  }

  function painelCarteira() {
    var contagem = porStatus();
    var total = Math.max(1, contagem.adequado + contagem.monitorar + contagem.corrigir);
    var manutencao = manutencaoVencida();

    return h('div', { class: 'panel' }, [
      h('h2', { class: 'section__title', text: 'Status da carteira' }),
      h('div', { style: 'display:flex;flex-direction:column;gap:10px' }, ['adequado', 'monitorar', 'corrigir'].map(function (chave) {
        var meta = ui.status(chave);
        return h('div', { class: 'bar' }, [
          h('span', { class: 'bar__count', text: contagem[chave] }),
          h('div', { class: 'bar__track' }, [
            h('i', { style: 'width:' + Math.round((contagem[chave] / total) * 100) + '%;background:' + meta.cor })
          ]),
          h('span', { class: 'statustag', style: 'color:' + meta.cor + ';font-size:12px' }, [
            ui.icon(meta.icone), meta.rotulo[0] + meta.rotulo.slice(1).toLowerCase()
          ])
        ]);
      })),
      manutencao ? h('div', { style: 'margin-top:auto;border-top:1px solid var(--outline-variant);padding-top:12px;display:flex;flex-direction:column;gap:4px' }, [
        h('span', { style: 'font-size:13px;font-weight:600;color:var(--on-surface-variant)', text: 'Próxima manutenção vencida' }),
        h('span', { style: 'font-size:15px;font-weight:600;line-height:1.3' }, [
          manutencao.equipamento + ' — ' + manutencao.cliente + ' · ',
          h('span', { class: 'mono', style: 'color:var(--corrigir)', text: manutencao.diasAtraso + ' dias' })
        ])
      ]) : null
    ]);
  }

  function vazio() {
    return ui.emptyState({
      icone: 'eco',
      titulo: 'Nada registrado ainda',
      texto: 'Cadastre o primeiro cliente e registre a primeira visita — o histórico técnico se monta a partir daí, direto no aparelho.',
      acao: {
        rotulo: 'Cadastrar cliente',
        icone: 'person_add',
        onClick: function () { location.hash = '#/clientes?novo=1'; }
      }
    });
  }

  /* Pendências reais do banco local: rascunho aberto, manutenção vencida e fila de envio. */
  function pendencias() {
    var itens = [];

    MPRO.store.drafts().forEach(function (rascunho) {
      var cliente = MPRO.store.client(rascunho.clienteId);
      itens.push({
        icone: 'pending_actions',
        titulo: 'Rascunho sem finalizar',
        texto: (cliente ? cliente.nome : 'Cliente removido') + ' — etapa ' + (rascunho.etapa || 1) + ' de 4',
        momento: ui.formatSavedAt(rascunho.salvoEm),
        onClick: function () { location.hash = '#/visitas/nova?rascunho=' + rascunho.id; }
      });
    });

    var manutencao = manutencaoVencida();
    if (manutencao) {
      itens.push({
        icone: 'build',
        titulo: 'Manutenção vencida',
        texto: manutencao.equipamento + ' — ' + manutencao.cliente,
        momento: manutencao.diasAtraso + ' dias',
        onClick: function () { location.hash = '#/equipamentos'; }
      });
    }

    var sync = MPRO.sync.status();
    if (sync.pendentes) {
      itens.push({
        icone: sync.configurado ? 'cloud_upload' : 'save',
        titulo: sync.configurado ? 'Registros aguardando envio' : 'Registros salvos só neste aparelho',
        texto: MPRO.sync.rotulo(),
        momento: String(sync.pendentes)
      });
    }

    return itens;
  }

  function abrirNotificacoes() {
    var itens = pendencias();
    ui.openSheet({
      titulo: 'Pendências',
      body: itens.length ? itens.map(function (item) {
        return h(item.onClick ? 'button' : 'div', {
          class: 'listtile', type: item.onClick ? 'button' : null,
          onclick: item.onClick ? function () { ui.closeSheet(); item.onClick(); } : null
        }, [
          h('span', { class: 'listtile__icon' }, [ui.icon(item.icone)]),
          h('span', { class: 'listtile__body' }, [
            h('strong', { text: item.titulo }),
            h('span', { text: item.texto })
          ]),
          h('span', { class: 'mono dim', style: 'font-size:11px', text: item.momento })
        ]);
      }) : [h('p', { class: 'dim', style: 'margin:0', text: 'Nenhuma pendência agora: nenhum rascunho aberto, nenhuma manutenção vencida e nada na fila de envio.' })],
      footer: [h('button', { class: 'btn btn--filled btn--grow', type: 'button', onclick: ui.closeSheet }, 'Entendi')]
    });
  }

  return {
    grupo: 'B',
    chave: 'inicio',
    titulo: 'M-PRO',
    marca: true,
    carrega: true,
    get acao() {
      return {
        icone: 'notifications',
        rotulo: 'Pendências',
        badge: pendencias().length > 0,
        onClick: abrirNotificacoes
      };
    },

    deskHead: function () {
      return [
        saudacao(true),
        h('div', { class: 'deskhead__tools' }, [
          h('button', {
            class: 'deskhead__search', type: 'button',
            onclick: function () { location.hash = '#/clientes'; }
          }, [ui.icon('search', null), h('span', { text: 'Buscar cliente ou visita' })]),
          h('button', {
            class: 'btn btn--filled', type: 'button',
            onclick: function () { location.hash = '#/visitas/nova'; }
          }, [ui.icon('add'), 'Nova visita'])
        ])
      ];
    },

    render: function (ctx) {
      var store = MPRO.store;
      var visitas = store.visits().slice(0, ctx.desktop ? 5 : 3);
      var vazia = !store.clients().length && !store.visits().length && !store.drafts().length;

      if (ctx.desktop) {
        if (vazia) return h('div', { class: 'section' }, [vazio()]);
        return h('div', { class: 'dashgrid' }, [
          h('div', { style: 'display:flex;flex-direction:column;gap:20px;min-width:0' }, [
            blocoMetricas(),
            ui.section('Visitas recentes', null, visitas.length
              ? tabelaVisitas(visitas)
              : h('p', { class: 'dim', text: 'Nenhuma visita finalizada ainda.' }))
          ]),
          h('div', { style: 'display:flex;flex-direction:column;gap:20px;min-width:0' }, [
            store.drafts().length ? h('div', { class: 'panel panel--primary' }, [
              h('div', { class: 'section__head' }, [
                h('h2', { class: 'section__title', text: 'Rascunhos ativos' }),
                h('span', {
                  class: 'mono',
                  style: 'font-size:11px;font-weight:700;color:var(--primary);background:var(--monitorar);padding:3px 8px;border-radius:4px',
                  text: store.drafts().length + ' PENDENTES'
                })
              ]),
              store.drafts().map(function (r) { return linhaRascunho(r, 'compacto'); })
            ]) : null,
            painelCarteira()
          ])
        ]);
      }

      return h('div', { style: 'display:flex;flex-direction:column;gap:20px' }, [
        saudacao(false),
        h('button', {
          class: 'cta-primary', type: 'button',
          onclick: function () { location.hash = '#/visitas/nova'; }
        }, [
          h('div', { class: 'cta-primary__icon' }, [ui.icon('add')]),
          h('div', { class: 'cta-primary__body' }, [
            h('strong', { text: 'Nova visita' }),
            h('span', { text: 'Iniciar relatório técnico em campo' })
          ]),
          ui.icon('arrow_forward')
        ]),
        vazia ? vazio() : null,
        blocoRascunhos(),
        vazia ? null : blocoMetricas(),
        visitas.length ? ui.section('Visitas recentes', null, visitas.map(function (v) {
          return linhaVisita(v, 'cta');
        })) : null
      ]);
    }
  };
})();
