import { sql, send, readJson, query } from './_db.js';
import { requireAdmin } from './_auth.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, {});

    // Validação estrita de autorização de administrador
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const acao = query(req, 'action') || 'usuarios';

    // GET /api/admin?action=usuarios
    if (req.method === 'GET') {
      const usuarios = await sql`
        SELECT id, nome, email, empresa, cargo, papel, status, criado_em, aprovado_em, aprovado_por
        FROM mpro.usuarios
        ORDER BY criado_em DESC;
      `;
      return send(res, 200, usuarios);
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const id = body.id || query(req, 'id');

      if (!id) {
        return send(res, 400, { error: 'ID do usuário é obrigatório.' });
      }

      // Aprovar solicitação
      if (acao === 'aprovar') {
        const papel = body.papel || 'tecnico';
        const r = await sql`
          UPDATE mpro.usuarios
          SET status = 'aprovado',
              papel = ${papel},
              aprovado_em = now()
          WHERE id = ${id}
          RETURNING id, nome, email, empresa, cargo, papel, status, criado_em, aprovado_em;
        `;
        if (!r.length) return send(res, 404, { error: 'Usuário não encontrado.' });
        return send(res, 200, r[0]);
      }

      // Banir / Bloquear usuário
      if (acao === 'banir' || acao === 'bloquear') {
        const r = await sql`
          UPDATE mpro.usuarios
          SET status = 'bloqueado'
          WHERE id = ${id}
          RETURNING id, nome, email, empresa, cargo, papel, status;
        `;
        if (!r.length) return send(res, 404, { error: 'Usuário não encontrado.' });
        return send(res, 200, r[0]);
      }

      // Desbloquear / Reativar usuário
      if (acao === 'desbloquear' || acao === 'reativar') {
        const r = await sql`
          UPDATE mpro.usuarios
          SET status = 'aprovado'
          WHERE id = ${id}
          RETURNING id, nome, email, empresa, cargo, papel, status;
        `;
        if (!r.length) return send(res, 404, { error: 'Usuário não encontrado.' });
        return send(res, 200, r[0]);
      }

      // Recusar / Remover usuário
      if (acao === 'recusar' || acao === 'excluir') {
        await sql`DELETE FROM mpro.usuarios WHERE id = ${id};`;
        return send(res, 200, { success: true });
      }

      // Alterar cargo / papel
      if (acao === 'cargo' || acao === 'set-cargo') {
        const papel = body.papel;
        if (!papel) return send(res, 400, { error: 'Novo papel é obrigatório.' });

        const r = await sql`
          UPDATE mpro.usuarios
          SET papel = ${papel}
          WHERE id = ${id}
          RETURNING id, nome, email, empresa, cargo, papel, status;
        `;
        if (!r.length) return send(res, 404, { error: 'Usuário não encontrado.' });
        return send(res, 200, r[0]);
      }
    }

    return send(res, 405, { error: 'Método não permitido.' });
  } catch (e) {
    return send(res, 500, { error: String(e && e.message || e) });
  }
}
