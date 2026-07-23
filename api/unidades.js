import { crud } from './_db.js';
export default crud({
  table: 'unidades_produtivas',
  cols: ['propriedade_id', 'nome', 'tipo'],
  filters: ['propriedade_id']
});
