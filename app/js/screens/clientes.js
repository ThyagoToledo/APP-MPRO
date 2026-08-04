/* 04 · Clientes — grupo B. Busca no header, filtro por status, cadastro em bottom sheet. */
window.MPRO = window.MPRO || {};
MPRO.screens = MPRO.screens || {};

MPRO.screens.clientes = (function () {
  var ui = MPRO.ui;
  var h = ui.h;

  var filtro = 'todos';
  var busca = '';

  var DIACRITICOS = new RegExp('[̀-ͯ]', 'g');

  function normaliza(texto) {
    return String(texto || '').toLowerCase().normalize('NFD').replace(DIACRITICOS, '');
  }

  function filtrados() {
    var termo = normaliza(busca);
    return MPRO.store.clients().filter(function (c) {
      if (filtro !== 'todos' && c.status !== filtro) return false;
      if (!termo) return true;
      return normaliza(c.nome + ' ' + c.municipio + ' ' + c.uf + ' ' + c.cultura).indexOf(termo) !== -1;
    });
  }

  function contagens() {
    var todos = MPRO.store.clients();
    return {
      todos: todos.length,
      adequado: todos.filter(function (c) { return c.status === 'adequado'; }).length,
      monitorar: todos.filter(function (c) { return c.status === 'monitorar'; }).length,
      corrigir: todos.filter(function (c) { return c.status === 'corrigir'; }).length
    };
  }

  function chips(ctx) {
    var n = contagens();
    var opcoes = [
      { chave: 'todos', rotulo: 'Todos', total: n.todos },
      { chave: 'adequado', rotulo: 'Adequado', total: n.adequado },
      { chave: 'monitorar', rotulo: 'Monitorar', total: n.monitorar },
      { chave: 'corrigir', rotulo: 'Corrigir', total: n.corrigir }
    ];

    return h('div', { class: 'chiprow', role: 'group', 'aria-label': 'Filtrar por status' }, opcoes.map(function (op) {
      return h('button', {
        class: 'chip', type: 'button', 'aria-pressed': filtro === op.chave ? 'true' : 'false',
        onclick: function () { filtro = op.chave; ctx.rerender(); }
      }, [
        op.rotulo ? h('span', { class: 'chip__dot', style: 'background:' + ui.status(op.chave).cor }) : null,
        op.rotulo || null,
        h('span', { class: 'chip__count', text: op.total })
      ]);
    }));
  }

  function linha(cliente) {
    var tags = [ui.statusTag(cliente.status, cliente.ultimaVisita ? ui.formatDate(cliente.ultimaVisita) : 'sem visita registrada')];
    if (!cliente.coordenadas) {
      tags.push(h('span', { class: 'statustag dim' }, [ui.icon('location_off'), 'SEM COORDENADA']));
    }

    return ui.dataRow({
      status: cliente.status,
      variant: 'bordered',
      title: cliente.nome,
      meta: cliente.municipio + '/' + cliente.uf + ' · ' + cliente.unidades.length +
        (cliente.unidades.length === 1 ? ' unidade · ' : ' unidades · ') + cliente.cultura,
      tag: h('span', { style: 'display:flex;align-items:center;gap:8px;flex-wrap:wrap' }, tags),
      onClick: function () { location.hash = '#/cliente?id=' + cliente.id; }
    });
  }

  /* ----- cadastro ----- */

  function campo(label, opts) {
    opts = opts || {};
    var input = h('input', {
      class: 'input' + (opts.mono ? ' mono' : ''),
      type: opts.type || 'text',
      name: opts.name,
      value: opts.value || '',
      inputmode: opts.inputmode,
      placeholder: opts.placeholder,
      'aria-label': label
    });

    var hint = h('span', { class: 'field__hint', hidden: true });
    var wrap = h('div', { class: 'field' }, [
      h('label', { class: 'field__label', text: label }),
      input,
      hint
    ]);

    return { node: wrap, input: input, hint: hint, wrap: wrap };
  }

  function marcaErro(campoRef, mensagem) {
    campoRef.wrap.classList.toggle('field--invalid', !!mensagem);
    campoRef.hint.hidden = !mensagem;
    campoRef.hint.innerHTML = '';
    if (mensagem) {
      campoRef.hint.appendChild(ui.icon('error'));
      campoRef.hint.appendChild(document.createTextNode(mensagem));
    }
  }

  function abrirCadastro(ctx, existente) {
    var nome = campo('Nome / razão social', { name: 'nome', placeholder: 'Fazenda Rio Claro', value: existente && existente.nome });
    var doc = campo('CPF / CNPJ', { name: 'documento', mono: true, inputmode: 'numeric', placeholder: '00.000.000/0000-00', value: existente && existente.documento });
    var tel = campo('Telefone', { name: 'telefone', mono: true, inputmode: 'tel', placeholder: '(00) 00000-0000', value: existente && existente.telefone });
    var email = campo('E-mail', { name: 'email', type: 'email', placeholder: 'contato@fazenda.com.br', value: existente && existente.email });
    var municipio = campo('Município', { name: 'municipio', placeholder: 'Luziânia', value: existente && existente.municipio });
    var uf = campo('UF', { name: 'uf', placeholder: 'GO', value: existente && existente.uf });
    var coords = campo('Coordenadas', { name: 'coordenadas', mono: true, placeholder: '-16.2523, -47.9503', value: existente && existente.coordenadas });

    var cultura = (existente && existente.cultura) || MPRO.demo.culturas[0].toLowerCase();
    var chipsCultura = h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, MPRO.demo.culturas.map(function (nomeCultura) {
      var chave = nomeCultura.toLowerCase();
      return h('button', {
        class: 'chip chip--lg', type: 'button', 'aria-pressed': chave === cultura ? 'true' : 'false',
        onclick: function (event) {
          cultura = chave;
          Array.prototype.forEach.call(event.currentTarget.parentNode.children, function (btn) {
            btn.setAttribute('aria-pressed', btn === event.currentTarget ? 'true' : 'false');
          });
        }
      }, nomeCultura);
    }));

    var usarGps = h('button', {
      class: 'btn btn--outline', type: 'button',
      style: 'height:48px;padding:0 12px;border-color:var(--secondary);color:var(--secondary);font-size:14px'
    }, [ui.icon('my_location'), 'Usar']);

    usarGps.addEventListener('click', function () {
      if (!navigator.geolocation) {
        ui.snack('Este aparelho não expõe GPS ao navegador.');
        return;
      }
      usarGps.disabled = true;
      navigator.geolocation.getCurrentPosition(function (pos) {
        coords.input.value = pos.coords.latitude.toFixed(4) + ', ' + pos.coords.longitude.toFixed(4);
        usarGps.disabled = false;
      }, function () {
        usarGps.disabled = false;
        marcaErro(coords, 'Sem permissão de localização — digite a coordenada.');
      }, { timeout: 8000 });
    });

    coords.input.classList.add('input--sm');
    var linhaCoords = h('div', { style: 'display:flex;gap:8px' });
    coords.wrap.replaceChild(linhaCoords, coords.input);
    linhaCoords.appendChild(coords.input);
    linhaCoords.appendChild(usarGps);

    function validar() {
      var ok = true;
      marcaErro(nome, nome.input.value.trim() ? '' : 'Obrigatório — o cliente precisa de um nome.');
      if (!nome.input.value.trim()) ok = false;

      var valorEmail = email.input.value.trim();
      if (valorEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(valorEmail)) {
        marcaErro(email, 'E-mail incompleto — falta o domínio.');
        ok = false;
      } else {
        marcaErro(email, '');
      }

      marcaErro(municipio, municipio.input.value.trim() ? '' : 'Obrigatório — usado no mapa e no laudo.');
      if (!municipio.input.value.trim()) ok = false;

      var valorCoords = coords.input.value.trim();
      var coordsInvalida = valorCoords && !MPRO.store.parseCoords(valorCoords);
      marcaErro(coords, coordsInvalida ? 'Use o formato lat, lng — ex.: -16.2523, -47.9503.' : '');
      if (coordsInvalida) ok = false;

      return ok;
    }

    [nome, email, municipio].forEach(function (ref) {
      ref.input.addEventListener('input', function () {
        if (ref.wrap.classList.contains('field--invalid')) validar();
      });
    });

    ui.openSheet({
      titulo: existente ? 'Editar cliente' : 'Novo cliente',
      body: [
        nome.node,
        h('div', { class: 'field__row' }, [doc.node, tel.node]),
        email.node,
        h('div', { style: 'display:grid;grid-template-columns:1fr 96px;gap:12px' }, [municipio.node, uf.node]),
        h('div', { class: 'field' }, [
          h('span', { class: 'field__label', text: 'Cultura principal' }),
          chipsCultura
        ]),
        coords.node
      ],
      footer: [
        h('button', { class: 'btn btn--text', type: 'button', onclick: ui.closeSheet }, 'Cancelar'),
        h('button', {
          class: 'btn btn--filled btn--grow', type: 'button',
          onclick: function () {
            if (!validar()) return;
            var dados = {
              nome: nome.input.value.trim(),
              documento: doc.input.value.trim(),
              telefone: tel.input.value.trim(),
              email: email.input.value.trim(),
              municipio: municipio.input.value.trim(),
              uf: uf.input.value.trim().toUpperCase() || '—',
              cultura: cultura,
              coordenadas: coords.input.value.trim() || null
            };
            if (existente) {
              MPRO.store.updateClient(existente.id, dados);
              ui.snack('Cliente atualizado.');
            } else {
              MPRO.store.addClient(Object.assign({
                id: MPRO.store.newId('cli'),
                unidades: ['Unidade 1'],
                hectares: null,
                status: null,
                ultimaVisita: null,
                phMedio: null,
                distanciaKm: null,
                mapa: null,
                recomendacao: null
              }, dados));
              ui.snack('Cliente cadastrado.');
            }
            ui.closeSheet();
            ctx.rerender();
          }
        }, 'Salvar cliente')
      ]
    });
  }

  return {
    grupo: 'B',
    chave: 'clientes',
    titulo: 'Clientes',
    carrega: true,
    abrirCadastro: abrirCadastro,
    get busca() {
      return {
        placeholder: 'Buscar cliente, município ou cultura',
        valor: busca,
        onInput: function (valor) {
          busca = valor;
          var lista = document.getElementById('lista-clientes');
          var resumo = document.getElementById('resumo-clientes');
          if (lista) MPRO.screens.clientes.pintaLista(lista);
          if (resumo) MPRO.screens.clientes.pintaResumo(resumo);
        }
      };
    },
    acao: {
      icone: 'person_add',
      rotulo: 'Cadastrar cliente',
      onClick: function (ctx) { abrirCadastro(ctx); }
    },

    pintaLista: function (host) {
      host.innerHTML = '';
      var lista = filtrados();

      if (!lista.length) {
        host.appendChild(ui.emptyState(MPRO.store.clients().length ? {
          icone: 'search_off',
          titulo: 'Nenhum cliente com esse recorte',
          texto: 'Ajuste a busca ou volte para o filtro "todos".'
        } : {
          icone: 'groups',
          titulo: 'Nenhum cliente cadastrado',
          texto: 'Cadastre o primeiro cliente para começar a registrar visitas e montar o histórico técnico.',
          acao: { rotulo: 'Cadastrar cliente', icone: 'person_add', onClick: function () { abrirCadastro(MPRO.router); } }
        }));
        return;
      }

      lista.forEach(function (cliente) { host.appendChild(linha(cliente)); });
    },

    pintaResumo: function (host) {
      var total = filtrados().length;
      host.innerHTML = '';
      host.appendChild(h('span', {
        class: 'resultsbar__copy',
        text: total + (total === 1 ? ' cliente encontrado' : ' clientes encontrados')
      }));
      if (busca || filtro !== 'todos') {
        host.appendChild(h('button', {
          class: 'btn btn--text resultsbar__clear', type: 'button',
          onclick: function () {
            busca = '';
            filtro = 'todos';
            MPRO.router.render();
          }
        }, [ui.icon('filter_alt_off'), 'Limpar filtros']));
      }
    },

    deskHead: function (ctx) {
      return [
        h('div', { class: 'deskhead__id' }, [
          h('span', { class: 'mono', text: 'CARTEIRA' }),
          h('strong', { text: 'Clientes' })
        ]),
        h('div', { class: 'deskhead__tools' }, [
          h('input', {
            class: 'deskhead__search', type: 'search', value: busca,
            placeholder: 'Buscar cliente, município ou cultura',
            'aria-label': 'Buscar cliente, município ou cultura',
            oninput: function (event) {
              busca = event.target.value;
              var lista = document.getElementById('lista-clientes');
              var resumo = document.getElementById('resumo-clientes');
              if (lista) MPRO.screens.clientes.pintaLista(lista);
              if (resumo) MPRO.screens.clientes.pintaResumo(resumo);
            }
          }),
          h('button', { class: 'btn btn--filled', type: 'button', onclick: function () { abrirCadastro(ctx); } }, [
            ui.icon('person_add'), 'Novo cliente'
          ])
        ])
      ];
    },

    render: function (ctx) {
      if (ctx.query.novo) {
        location.hash = '#/clientes';
        setTimeout(function () { abrirCadastro(ctx); }, 0);
      }

      var host = h('div', { id: 'lista-clientes', class: 'section' });
      var resumo = h('div', { id: 'resumo-clientes', class: 'resultsbar', 'aria-live': 'polite' });
      MPRO.screens.clientes.pintaLista(host);
      MPRO.screens.clientes.pintaResumo(resumo);

      return h('div', { class: 'resource-page resource-page--compact' }, [
        chips(ctx),
        resumo,
        host
      ]);
    }
  };
})();
