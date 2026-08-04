/* Conta de demonstração. A conta nova começa sem nada — os estados vazios de cada
   tela são o comportamento normal dela, não um erro. */
window.MPRO = window.MPRO || {};

MPRO.demo = {
  clients: [
    {
      id: 'cli-boa-vista',
      nome: 'Fazenda Boa Vista',
      municipio: 'Cristalina',
      uf: 'GO',
      cultura: 'soja',
      unidades: ['Pivô 1', 'Pivô 2', 'Talhão sede'],
      hectares: 640,
      status: 'corrigir',
      ultimaVisita: '2026-07-19',
      phMedio: '5,8',
      distanciaKm: '4,2',
      coordenadas: '-16.7670, -47.6130',
      mapa: { x: 35.9, y: 70 },
      recomendacao: 'Elevar a saturação por bases para 60% antes do plantio e recalibrar a pressão de irrigação do pivô 2.'
    },
    {
      id: 'cli-alto-paranaiba',
      nome: 'Cooperativa Agropecuária dos Produtores do Alto Paranaíba',
      municipio: 'Rio Paranaíba',
      uf: 'MG',
      cultura: 'café',
      unidades: ['Núcleo 1', 'Núcleo 2', 'Núcleo 3'],
      hectares: 1180,
      status: 'corrigir',
      ultimaVisita: '2026-07-19',
      phMedio: '5,1',
      distanciaKm: '218,0',
      coordenadas: '-19.1875, -46.2470',
      mapa: { x: 78, y: 62 },
      recomendacao: 'Corrigir acidez do núcleo 2 e revisar o espaçamento de adubação de cobertura.'
    },
    {
      id: 'cli-tres-barras',
      nome: 'Sítio Três Barras',
      municipio: 'Unaí',
      uf: 'MG',
      cultura: 'milho',
      unidades: ['Talhão único'],
      hectares: 96,
      status: 'monitorar',
      ultimaVisita: '2026-07-24',
      phMedio: '6,1',
      distanciaKm: '132,5',
      coordenadas: '-16.3577, -46.9066',
      mapa: { x: 68.2, y: 50.5 },
      recomendacao: 'Acompanhar a população de plantas do talhão único na próxima janela de aplicação.'
    },
    {
      id: 'cli-vale-verde',
      nome: 'Estufa Vale Verde',
      municipio: 'Holambra',
      uf: 'SP',
      cultura: 'tomate',
      unidades: ['Estufa A', 'Estufa B'],
      hectares: 12,
      status: 'adequado',
      ultimaVisita: '2026-07-22',
      phMedio: '6,4',
      distanciaKm: '742,0',
      coordenadas: null,
      mapa: null,
      recomendacao: 'Manter o manejo atual de fertirrigação.'
    },
    {
      id: 'cli-santa-rita',
      nome: 'Fazenda Santa Rita',
      municipio: 'Paracatu',
      uf: 'MG',
      cultura: 'soja',
      unidades: ['Pivô norte', 'Pivô sul'],
      hectares: 410,
      status: 'corrigir',
      ultimaVisita: '2026-07-19',
      phMedio: '5,4',
      distanciaKm: '186,4',
      coordenadas: '-17.2252, -46.8711',
      mapa: { x: 60, y: 84 },
      recomendacao: 'Refazer a amostragem de solo do pivô sul antes de qualquer nova aplicação.'
    },
    {
      id: 'cli-campo-alto',
      nome: 'Agro Campo Alto',
      municipio: 'Luziânia',
      uf: 'GO',
      cultura: 'milho',
      unidades: ['Gleba 1', 'Gleba 2', 'Gleba 3', 'Gleba 4'],
      hectares: 310,
      status: 'monitorar',
      ultimaVisita: '2026-07-23',
      phMedio: '5,9',
      distanciaKm: '11,8',
      coordenadas: '-16.2523, -47.9503',
      mapa: { x: 20.5, y: 45.2 },
      recomendacao: 'Monitorar cigarrinha nas glebas 2 e 3 a cada sete dias.'
    },
    {
      id: 'cli-formosa-norte',
      nome: 'Fazenda Formosa Norte',
      municipio: 'Formosa',
      uf: 'GO',
      cultura: 'soja',
      unidades: ['Pivô A', 'Pivô B'],
      hectares: 380,
      status: 'adequado',
      ultimaVisita: '2026-07-21',
      phMedio: '6,2',
      distanciaKm: '96,3',
      coordenadas: '-15.5372, -47.3341',
      mapa: { x: 52, y: 19 },
      recomendacao: 'Sem pendências no último laudo.'
    },
    {
      id: 'cli-cabeceiras',
      nome: 'Fazenda Cabeceiras',
      municipio: 'Cabeceiras',
      uf: 'GO',
      cultura: 'soja',
      unidades: ['Talhão 1', 'Talhão 2'],
      hectares: 275,
      status: 'adequado',
      ultimaVisita: '2026-07-20',
      phMedio: '6,0',
      distanciaKm: '124,7',
      coordenadas: '-15.7963, -46.9247',
      mapa: { x: 63.6, y: 23.8 },
      recomendacao: 'Sem pendências no último laudo.'
    }
  ],

  drafts: [
    {
      id: 'rasc-boa-vista',
      clienteId: 'cli-boa-vista',
      unidade: 'Pivô 2',
      cultura: 'soja',
      data: '2026-07-25',
      hora: '06:05',
      responsavel: 'Sebastião Nogueira (gerente)',
      coordenadas: '-16.7670, -47.6130',
      etapa: 2,
      progresso: 68,
      salvoEm: '2026-07-25T06:12:00',
      avaliacoes: { geral: 'adequado', irrigacao: 'monitorar', nutricao: 'corrigir' },
      medicoes: [
        { nome: 'Pressão de irrigação', contexto: 'pivô 2 · esperado 2,0 bar', valor: '1,5', unidade: 'bar', alerta: 'monitorar' },
        { nome: 'Condutividade elétrica', contexto: 'solução do solo · 20 cm', valor: '2,3', unidade: 'dS/m', alerta: null }
      ]
    },
    {
      id: 'rasc-tres-barras',
      clienteId: 'cli-tres-barras',
      unidade: 'Talhão único',
      cultura: 'milho',
      data: '2026-07-24',
      hora: '18:10',
      responsavel: 'Cleide Barbosa',
      coordenadas: '-16.3577, -46.9066',
      etapa: 1,
      progresso: 41,
      salvoEm: '2026-07-24T18:40:00',
      avaliacoes: { geral: 'monitorar' },
      medicoes: []
    },
    {
      id: 'rasc-campo-alto',
      clienteId: 'cli-campo-alto',
      unidade: 'Gleba 3',
      cultura: 'milho',
      data: '2026-07-23',
      hora: '15:20',
      responsavel: 'Wagner Prado',
      coordenadas: '-16.2523, -47.9503',
      etapa: 1,
      progresso: 12,
      salvoEm: '2026-07-23T15:44:00',
      avaliacoes: {},
      medicoes: []
    }
  ],

  visits: [
    { id: 'vis-2207', clienteId: 'cli-vale-verde', data: '2026-07-22', status: 'adequado', unidade: 'Estufa A', cultura: 'tomate' },
    { id: 'vis-1907', clienteId: 'cli-santa-rita', data: '2026-07-19', status: 'corrigir', unidade: 'Pivô sul', cultura: 'soja' },
    { id: 'vis-1707', clienteId: 'cli-tres-barras', data: '2026-07-17', status: 'monitorar', unidade: 'Talhão único', cultura: 'milho' },
    { id: 'vis-1607', clienteId: 'cli-formosa-norte', data: '2026-07-16', status: 'adequado', unidade: 'Pivô A', cultura: 'soja' },
    { id: 'vis-1407', clienteId: 'cli-boa-vista', data: '2026-07-14', status: 'monitorar', unidade: 'Pivô 1', cultura: 'soja' }
  ],

  manutencao: { equipamento: 'Pivô 2', cliente: 'Fazenda Boa Vista', diasAtraso: 14 },

  equipments: [
    { id: 'eq-pivo-2', nome: 'Pivô 2', tipo: 'Irrigação', clienteId: 'cli-boa-vista', status: 'manutencao', ultima: '2026-06-12', proxima: '2026-07-20', observacao: 'Recalibrar manômetros e revisar o conjunto motobomba.' },
    { id: 'eq-condutivimetro', nome: 'Condutivímetro EC-60', tipo: 'Medição', clienteId: null, status: 'monitorar', ultima: '2026-07-01', proxima: '2026-08-15', observacao: 'Calibração intermediária recomendada antes da próxima campanha.' },
    { id: 'eq-phmetro', nome: 'pHmetro portátil PH-20', tipo: 'Medição', clienteId: null, status: 'adequado', ultima: '2026-07-18', proxima: '2026-09-18', observacao: 'Soluções tampão dentro da validade.' }
  ],

  notifications: [
    { id: 'not-1', icone: 'build', titulo: 'Manutenção vencida', texto: 'Pivô 2 — Fazenda Boa Vista', momento: 'há 2 h' },
    { id: 'not-2', icone: 'pending_actions', titulo: 'Rascunho sem sincronizar', texto: 'Sítio Três Barras — etapa 1 de 4', momento: 'ontem' },
    { id: 'not-3', icone: 'task_alt', titulo: 'Laudo pronto para revisar', texto: 'Estufa Vale Verde — 22/07/2026', momento: '22/07' }
  ],

  culturas: ['Soja', 'Milho', 'Café', 'Tomate'],

  blocosAvaliacao: [
    { chave: 'geral', rotulo: 'Condição geral' },
    { chave: 'irrigacao', rotulo: 'Irrigação' },
    { chave: 'nutricao', rotulo: 'Nutrição' },
    { chave: 'sanidade', rotulo: 'Sanidade' },
    { chave: 'solo', rotulo: 'Solo e raiz' }
  ]
};
