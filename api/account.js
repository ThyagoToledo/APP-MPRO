import { sql, send, readJson } from './_db.js';
import { verificaSenha } from './auth.js';
import { checkRateLimit } from './_rate_limit.js';
import { list, del } from '@vercel/blob';

// Também permite excluir solicitações pendentes, sem exigir aprovação/login.
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST.' });
  if (!checkRateLimit(req, res, { chave: 'account_delete', limite: 5, janelaMs: 300000 })) return;
  try {
    const body = await readJson(req);
    if (body.confirmacao !== 'EXCLUIR' || typeof body.email !== 'string' || typeof body.senha !== 'string') return send(res, 400, { error: 'Informe e-mail, senha e confirmação EXCLUIR.' });
    const rows = await sql`SELECT id, senha_hash FROM mpro.usuarios WHERE email = ${body.email.trim().toLowerCase()}`;
    const user = rows[0];
    if (!user || !verificaSenha(body.senha, user.senha_hash)) return send(res, 401, { error: 'E-mail ou senha incorretos.' });
    const id = String(user.id);
    // O prefixo é atribuído pelo servidor no upload, jamais recebido do cliente.
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      let cursor;
      do {
        const page = await list({ prefix: `mpro/users/${id}/`, cursor, token: process.env.BLOB_READ_WRITE_TOKEN });
        if (page.blobs.length) await del(page.blobs.map(b => b.url), { token: process.env.BLOB_READ_WRITE_TOKEN });
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
    }
    // Uma única instrução SQL: exclusão de registros e da conta é atômica.
    await sql`WITH apagados AS (DELETE FROM mpro.registros WHERE usuario_id = ${id}), relatos AS (DELETE FROM mpro.feedback WHERE usuario_id = ${id}) DELETE FROM mpro.usuarios WHERE id = ${user.id}`;
    return send(res, 200, { success: true, mensagem: 'Conta e registros sincronizados excluídos. Apague os dados locais nos demais aparelhos utilizados.' });
  } catch (error) {
    console.error('Falha ao excluir conta:', error);
    return send(res, 503, { error: 'Não foi possível concluir a exclusão. Tente novamente ou contate o suporte.' });
  }
}
