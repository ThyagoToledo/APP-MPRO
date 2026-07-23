import { crud } from './_db.js';
export default crud({
  table: 'transcricoes',
  cols: ['evidencia_id', 'texto', 'estruturado'],
  filters: ['evidencia_id']
});
