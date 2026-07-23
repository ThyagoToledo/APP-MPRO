import { crud } from './_db.js';
export default crud({
  table: 'visitas',
  cols: ['cliente_id', 'propriedade_id', 'unidade_id', 'tecnico_id', 'cultura', 'data_visita',
    'responsavel', 'condicao_geral', 'irrigacao', 'nutricao', 'sanidade', 'solo_raiz',
    'recomendacoes', 'conclusao', 'situacao', 'status'],
  filters: ['cliente_id', 'status', 'unidade_id']
});
