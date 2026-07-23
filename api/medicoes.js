import { crud } from './_db.js';
export default crud({
  table: 'medicoes',
  cols: ['visita_id', 'rotulo', 'valor', 'unidade', 'contexto'],
  filters: ['visita_id'],
  orderBy: 'id'
});
