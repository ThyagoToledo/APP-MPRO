import { crud } from './_db.js';
export default crud({
  table: 'equipamentos',
  cols: ['propriedade_id', 'cliente_id', 'nome', 'tipo', 'status', 'ultima_manutencao', 'proxima_manutencao'],
  filters: ['cliente_id', 'status']
});
