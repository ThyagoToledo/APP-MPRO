import { sql, send, readJson, query } from './_db.js';
import { requireAuth } from './_auth.js';
import { checkRateLimit } from './_rate_limit.js';

/**
 * Garante que a tabela de sincronização multidevice exista no schema mpro.
 */
async function assegurarTabela() {
  try {
    await sql`
      CREATE SCHEMA IF NOT EXISTS mpro;
      CREATE TABLE IF NOT EXISTS mpro.registros (
        usuario_id    text NOT NULL,
        colecao       text NOT NULL,
        item_id       text NOT NULL,
        dados         jsonb NOT NULL,
        atualizado_em timestamptz NOT NULL DEFAULT now(),
        removido      boolean NOT NULL DEFAULT false,
        PRIMARY KEY (usuario_id, colecao, item_id)
      );
      CREATE INDEX IF NOT EXISTS idx_mpro_registros_user_col ON mpro.registros (usuario_id, colecao);
    `;
  } catch (e) {
    console.error('Erro ao verificar tabela de sincronização:', e);
  }
}

let tabelaVerificada = false;

export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, {});

    // Autenticação obrigatória via Bearer Token
    const user = requireAuth(req, res);
    if (!user) return; // Resposta 401 já enviada por requireAuth

    if (!tabelaVerificada) {
      await assegurarTabela();
      tabelaVerificada = true;
    }

    const usuarioId = String(user.id);

    // ==========================================
    // 1. GET /api/sync — Puxa dados da nuvem (Download / Pull)
    // ==========================================
    if (req.method === 'GET') {
      const colecaoFiltro = query(req, 'colecao');

      let rows;
      if (colecaoFiltro) {
        rows = await sql`
          SELECT colecao, item_id, dados, atualizado_em
          FROM mpro.registros
          WHERE usuario_id = ${usuarioId}
            AND colecao = ${colecaoFiltro}
            AND removido = false
          ORDER BY atualizado_em ASC;
        `;
      } else {
        rows = await sql`
          SELECT colecao, item_id, dados, atualizado_em
          FROM mpro.registros
          WHERE usuario_id = ${usuarioId}
            AND removido = false
          ORDER BY atualizado_em ASC;
        `;
      }

      const registros = {
        clients: [],
        visits: [],
        drafts: [],
        equipments: [],
        photos: [],
        meta: []
      };

      for (const row of rows) {
        const col = row.colecao;
        if (!registros[col]) registros[col] = [];
        if (row.dados && typeof row.dados === 'object') {
          registros[col].push(row.dados);
        }
      }

      return send(res, 200, {
        success: true,
        usuarioId: usuarioId,
        total: rows.length,
        registros: registros,
        sincronizadoEm: new Date().toISOString()
      });
    }

    // ==========================================
    // 2. POST /api/sync — Envia dados para a nuvem (Upload / Push)
    // ==========================================
    if (req.method === 'POST') {
      if (!checkRateLimit(req, res, { chave: 'sync_post_' + usuarioId, limite: 180, janelaMs: 60000 })) return;

      const body = await readJson(req);
      const operacao = body.operacao || 'upsert';
      const colecao = (body.colecao || '').trim();
      const itemId = String(body.id || body.alvoId || '').trim();
      const dados = body.dados || body.payload || {};

      if (!colecao || !itemId) {
        return send(res, 400, { error: 'Coleção e ID do registro são obrigatórios.' });
      }

      const dadosJson = JSON.stringify(dados);

      if (operacao === 'delete') {
        await sql`
          INSERT INTO mpro.registros (usuario_id, colecao, item_id, dados, removido, atualizado_em)
          VALUES (${usuarioId}, ${colecao}, ${itemId}, ${dadosJson}::jsonb, true, now())
          ON CONFLICT (usuario_id, colecao, item_id)
          DO UPDATE SET removido = true, atualizado_em = now();
        `;
      } else {
        await sql`
          INSERT INTO mpro.registros (usuario_id, colecao, item_id, dados, removido, atualizado_em)
          VALUES (${usuarioId}, ${colecao}, ${itemId}, ${dadosJson}::jsonb, false, now())
          ON CONFLICT (usuario_id, colecao, item_id)
          DO UPDATE SET dados = ${dadosJson}::jsonb, removido = false, atualizado_em = now();
        `;
      }

      return send(res, 200, {
        success: true,
        operacao: operacao,
        colecao: colecao,
        id: itemId,
        sincronizadoEm: new Date().toISOString()
      });
    }

    return send(res, 405, { error: 'Método não permitido. Use GET ou POST.' });
  } catch (e) {
    console.error('Erro no endpoint de sincronização (/api/sync):', e);
    return send(res, 500, { error: 'Erro interno ao processar sincronização na nuvem.' });
  }
}
