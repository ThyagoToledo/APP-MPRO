import { crud } from './_db.js';
export default crud({
  table: 'propriedades',
  cols: ['cliente_id', 'nome', 'municipio', 'uf', 'latitude', 'longitude', 'area_ha'],
  filters: ['cliente_id']
});
