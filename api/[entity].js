// Roteador dinâmico: /api/<entidade> → CRUD no schema mpro.
// Um único Serverless Function para todas as entidades (limite de funções do plano Hobby).
import { crudHandler, send } from './_db.js';

const ENTITIES = {
  clientes:      { table: 'clientes', cols: ['nome', 'documento', 'contato_email', 'contato_telefone', 'owner'], filters: ['owner'] },
  propriedades:  { table: 'propriedades', cols: ['cliente_id', 'nome', 'municipio', 'uf', 'latitude', 'longitude', 'area_ha'], filters: ['cliente_id'] },
  unidades:      { table: 'unidades_produtivas', cols: ['propriedade_id', 'nome', 'tipo'], filters: ['propriedade_id'] },
  culturas:      { table: 'culturas_unidade', cols: ['unidade_id', 'cultura', 'data_inicio', 'data_fim'], filters: ['unidade_id'], orderBy: 'data_inicio' },
  visitas:       { table: 'visitas', cols: ['cliente_id', 'propriedade_id', 'unidade_id', 'tecnico_id', 'cultura', 'data_visita', 'responsavel', 'condicao_geral', 'irrigacao', 'nutricao', 'sanidade', 'solo_raiz', 'recomendacoes', 'conclusao', 'situacao', 'status', 'owner'], filters: ['cliente_id', 'status', 'unidade_id', 'owner'] },
  medicoes:      { table: 'medicoes', cols: ['visita_id', 'rotulo', 'valor', 'unidade', 'contexto'], filters: ['visita_id'], orderBy: 'id' },
  evidencias:    { table: 'evidencias', cols: ['visita_id', 'tipo', 'url', 'titulo', 'legenda', 'ordem', 'duracao_seg'], filters: ['visita_id', 'tipo'], orderBy: 'ordem' },
  transcricoes:  { table: 'transcricoes', cols: ['evidencia_id', 'texto', 'estruturado'], filters: ['evidencia_id'] },
  relatorios:    { table: 'relatorios', cols: ['visita_id', 'cliente_id', 'versao', 'pdf_url'], filters: ['cliente_id', 'visita_id'], orderBy: 'gerado_em' },
  equipamentos:  { table: 'equipamentos', cols: ['propriedade_id', 'cliente_id', 'nome', 'tipo', 'status', 'ultima_manutencao', 'proxima_manutencao', 'owner'], filters: ['cliente_id', 'status', 'owner'] },
  consultas:     { table: 'consultas_ia', cols: ['usuario_id', 'cliente_id', 'pergunta', 'resposta', 'referencias'], filters: ['cliente_id', 'usuario_id'] }
};

export default async function handler(req, res) {
  let entity = req.query && req.query.entity;
  if (!entity) {
    try { entity = new URL(req.url, 'http://x').pathname.split('/').pop(); } catch { entity = ''; }
  }
  const opts = ENTITIES[entity];
  if (!opts) return send(res, 404, { error: 'entidade desconhecida: ' + entity });
  return crudHandler(opts, req, res);
}
