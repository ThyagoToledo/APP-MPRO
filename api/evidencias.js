import { crud } from './_db.js';
export default crud({
  table: 'evidencias',
  cols: ['visita_id', 'tipo', 'url', 'titulo', 'legenda', 'ordem', 'duracao_seg'],
  filters: ['visita_id', 'tipo'],
  orderBy: 'ordem'
});
