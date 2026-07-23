import { crud } from './_db.js';
export default crud({
  table: 'consultas_ia',
  cols: ['usuario_id', 'cliente_id', 'pergunta', 'resposta', 'referencias'],
  filters: ['cliente_id', 'usuario_id']
});
