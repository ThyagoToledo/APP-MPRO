import { sql, send, readJson } from './_db.js';
import { requireActiveUser, requireAdmin } from './_auth.js';
import { checkRateLimit } from './_rate_limit.js';
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  try {
    if (req.method === 'GET') {
      if (!await requireAdmin(req, res)) return;
      return send(res, 200, await sql`SELECT id, motivo, resposta, criado_em FROM mpro.feedback ORDER BY criado_em DESC LIMIT 100`);
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Use GET ou POST.' });
    const user = await requireActiveUser(req, res);
    if (!user) return;
    if (!checkRateLimit(req, res, { chave: 'report_' + user.id, limite: 10, janelaMs: 60000 })) return;
    const body = await readJson(req);
    if (typeof body.motivo !== 'string' || !body.motivo.trim() || body.motivo.length > 2000 || typeof body.resposta !== 'string' || body.resposta.length > 30000) return send(res, 400, { error: 'Relato inválido.' });
    await sql`INSERT INTO mpro.feedback (usuario_id, motivo, resposta) VALUES (${String(user.id)}, ${body.motivo.trim()}, ${body.resposta})`;
    return send(res, 201, { success: true });
  } catch (e) { console.error('Erro no relato de IA:', e); return send(res, 503, { error: 'Não foi possível registrar o relato agora. Tente novamente.' }); }
}
