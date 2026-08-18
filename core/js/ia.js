/* Molde da consulta assistida.

   A recuperação é sempre local: quem escolhe os trechos relevantes é este arquivo, lendo o
   banco do aparelho. Isso é o que garante o isolamento por cliente exigido pela fase 5 do
   roadmap — nenhum registro de outro cliente entra no contexto, nem local nem remotamente.

   Dois modos de resposta:

   - 'local'  → não há modelo de linguagem. A resposta é a apresentação dos registros
     encontrados, com a visita de origem em cada afirmação. Se nada foi encontrado, responde
     que não encontrou. Nunca redige conclusão que não esteja escrita no banco.

   - 'remoto' → o mesmo contexto recuperado aqui é enviado a um servidor intermediário da
     M-PRO, que fala com o provedor de IA usando a chave dele. Nenhuma credencial de modelo
     existe neste front-end, e o contexto enviado é sempre o do escopo já filtrado. */
window.MPRO = window.MPRO || {};

MPRO.ia = (function () {
  function modo() {
    var cfg = MPRO.platform.ia;
    return cfg.modo === 'remoto' && cfg.endpoint ? 'remoto' : 'local';
  }

  function disponivelRemoto() {
    return !!(MPRO.platform.ia.endpoint);
  }

  function normaliza(texto) {
    return String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function termos(pergunta) {
    return normaliza(pergunta).split(/[^a-z0-9]+/).filter(function (t) { return t.length > 3; });
  }

  /* Cada trecho é uma unidade citável: texto + a visita/registro que o originou. */
  function trechosDoCliente(clienteId) {
    var cliente = MPRO.store.client(clienteId);
    if (!cliente) return [];
    var trechos = [];
    var prefixo = '[' + cliente.nome + '] ';

    if (cliente.recomendacao) {
      trechos.push({
        tipo: 'recomendacao',
        texto: prefixo + cliente.recomendacao,
        rotulo: 'Recomendação (' + cliente.nome + ')',
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        data: cliente.ultimaVisita,
        origem: { rota: '#/cliente?id=' + cliente.id, titulo: cliente.nome }
      });
    }

    MPRO.store.visits().filter(function (v) { return v.clienteId === clienteId; }).forEach(function (visita) {
      var partes = [];
      if (visita.observacoes) partes.push({ rotulo: 'Observações', texto: visita.observacoes });
      if (visita.recomendacao) partes.push({ rotulo: 'Recomendação', texto: visita.recomendacao });
      if (visita.conclusao) partes.push({ rotulo: 'Conclusão', texto: visita.conclusao });
      (visita.medicoes || []).forEach(function (medicao) {
        partes.push({
          rotulo: 'Medição',
          texto: medicao.nome + ': ' + medicao.valor + ' ' + (medicao.unidade || '') +
            (medicao.contexto ? ' (' + medicao.contexto + ')' : '')
        });
      });
      Object.keys(visita.avaliacoes || {}).forEach(function (bloco) {
        var rotuloBloco = (MPRO.catalogo.blocoPorChave(bloco) || {}).rotulo || bloco;
        partes.push({ rotulo: 'Avaliação', texto: rotuloBloco + ': ' + visita.avaliacoes[bloco] });
      });

      partes.forEach(function (parte) {
        trechos.push({
          tipo: 'visita',
          texto: prefixo + parte.texto,
          rotulo: parte.rotulo + ' (' + cliente.nome + ')',
          clienteId: cliente.id,
          clienteNome: cliente.nome,
          data: visita.data,
          origem: { rota: '#/visita?id=' + visita.id, titulo: cliente.nome + ' · Visita ' + MPRO.ui.formatDate(visita.data) + ' · ' + (visita.unidade || '') }
        });
      });
    });

    MPRO.store.equipments().filter(function (e) { return e.clienteId === clienteId; }).forEach(function (equipamento) {
      trechos.push({
        tipo: 'equipamento',
        texto: prefixo + equipamento.nome + ' — situação ' + equipamento.status +
          (equipamento.proxima ? ', próxima manutenção em ' + MPRO.ui.formatDate(equipamento.proxima) : '') +
          (equipamento.observacao ? '. ' + equipamento.observacao : ''),
        rotulo: 'Equipamento (' + cliente.nome + ')',
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        data: equipamento.ultima,
        origem: { rota: '#/equipamentos', titulo: cliente.nome + ' · ' + equipamento.nome }
      });
    });

    return trechos;
  }

  function obterListaIds(opts) {
    if (opts.todos) {
      return MPRO.store.clients().map(function (c) { return c.id; });
    }
    if (Array.isArray(opts.clienteIds) && opts.clienteIds.length) {
      return opts.clienteIds;
    }
    if (opts.clienteId) {
      return [opts.clienteId];
    }
    var todos = MPRO.store.clients();
    return todos.length ? [todos[0].id] : [];
  }

  function recuperar(pergunta, escopo, limite) {
    var chaves = termos(pergunta);
    var ids = Array.isArray(escopo) ? escopo : (escopo === 'todos' ? MPRO.store.clients().map(function (c) { return c.id; }) : [escopo]);
    var todosTrechos = [];

    ids.forEach(function (id) {
      todosTrechos = todosTrechos.concat(trechosDoCliente(id));
    });

    return todosTrechos
      .map(function (trecho) {
        var alvo = normaliza(trecho.rotulo + ' ' + trecho.texto);
        var pontos = chaves.reduce(function (soma, chave) {
          return soma + (alvo.indexOf(chave) !== -1 ? 1 : 0);
        }, 0);
        return Object.assign({ pontos: pontos }, trecho);
      })
      .sort(function (a, b) {
        if (b.pontos !== a.pontos) return b.pontos - a.pontos;
        return String(b.data || '').localeCompare(String(a.data || ''));
      })
      .slice(0, limite || 8);
  }

  function respostaLocal(pergunta, opts) {
    var ids = obterListaIds(opts);
    var achados = recuperar(pergunta, ids, 6).filter(function (t) { return t.pontos > 0; });
    var recentes = recuperar('', ids, 4);

    if (!achados.length && !recentes.length) {
      return {
        origem: 'local',
        semEvidencia: true,
        texto: 'Não há registros finalizados para o escopo selecionado no banco deste aparelho. ' +
          'Registre uma visita para que a consulta tenha o que citar.',
        referencias: []
      };
    }

    var usados = achados.length ? achados : recentes;
    var corpo = usados.map(function (trecho) { return trecho.rotulo + ' — ' + trecho.texto; }).join('\n');

    return {
      origem: 'local',
      semEvidencia: false,
      texto: (achados.length
        ? 'Encontrei ' + achados.length + ' registro(s) relacionados no escopo selecionado:'
        : 'Nada corresponde exatamente à pergunta. Estes são os registros mais recentes:') +
        '\n' + corpo,
      referencias: usados.reduce(function (lista, trecho) {
        var repetida = lista.some(function (ref) { return ref.rota === trecho.origem.rota; });
        if (!repetida) lista.push({ titulo: trecho.origem.titulo, rota: trecho.origem.rota, data: trecho.data });
        return lista;
      }, [])
    };
  }

  function respostaRemota(pergunta, opts) {
    var ids = obterListaIds(opts);
    var contexto = recuperar(pergunta, ids, 12);
    var url = MPRO.platform.ia.endpoint || '/api/ia';
    return fetch(url, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, MPRO.session.cabecalhos()),
      body: JSON.stringify({
        pergunta: pergunta,
        clienteId: opts.clienteId || (ids.length === 1 ? ids[0] : null),
        clienteIds: ids,
        todos: !!opts.todos,
        contexto: contexto.map(function (t) {
          return { rotulo: t.rotulo, texto: t.texto, data: t.data, origem: t.origem };
        })
      })
    }).then(function (resposta) {
      if (!resposta.ok) throw new Error('HTTP ' + resposta.status);
      return resposta.json();
    }).then(function (dados) {
      return {
        origem: 'remoto',
        modelo: dados.modelo || 'NVIDIA Nemotron',
        provedor: dados.provedor || 'NVIDIA NIM',
        semEvidencia: !dados.referencias || !dados.referencias.length,
        texto: dados.texto || '',
        referencias: dados.referencias || []
      };
    });
  }

  function perguntar(opts) {
    var pergunta = String(opts.pergunta || '').trim();
    if (!pergunta) return Promise.reject(new Error('Pergunta vazia.'));

    if (modo() === 'remoto') {
      return respostaRemota(pergunta, opts).catch(function () {
        var local = respostaLocal(pergunta, opts);
        local.degradado = true;
        return local;
      });
    }
    return Promise.resolve(respostaLocal(pergunta, opts));
  }

  return {
    modo: modo,
    disponivelRemoto: disponivelRemoto,
    recuperar: recuperar,
    perguntar: perguntar,
    rotuloModo: function () {
      return modo() === 'remoto'
        ? 'Consulta assistida pelo servidor M-PRO'
        : 'Consulta local — busca no banco deste aparelho, sem modelo de linguagem';
    }
  };
})();
