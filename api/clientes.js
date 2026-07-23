import { crud } from './_db.js';
export default crud({
  table: 'clientes',
  cols: ['nome', 'documento', 'contato_email', 'contato_telefone']
});
