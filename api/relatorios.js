import { crud } from './_db.js';
export default crud({
  table: 'relatorios',
  cols: ['visita_id', 'cliente_id', 'versao', 'pdf_url'],
  filters: ['cliente_id', 'visita_id'],
  orderBy: 'gerado_em'
});
