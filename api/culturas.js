import { crud } from './_db.js';
export default crud({
  table: 'culturas_unidade',
  cols: ['unidade_id', 'cultura', 'data_inicio', 'data_fim'],
  filters: ['unidade_id'],
  orderBy: 'data_inicio'
});
