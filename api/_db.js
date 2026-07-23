// Helpers compartilhados pelas funções serverless (Vercel + Neon).
import { neon } from '@neondatabase/serverless';

export const sql = neon(process.env.DATABASE_URL);

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
  res.end(status === 204 ? '' : JSON.stringify(body));
}

export function query(req, name) {
  try {
    const u = new URL(req.url, 'http://x');
    return u.searchParams.get(name);
  } catch { return null; }
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

// Fábrica de CRUD para tabelas simples do schema mpro.
// opts: { table, cols:[colunas graváveis], filters:[colunas de filtro GET], orderBy }
export function crud(opts) {
  const { table, cols, filters = [], orderBy = 'criado_em' } = opts;
  return async (req, res) => {
    try {
      const id = query(req, 'id');
      if (req.method === 'OPTIONS') return send(res, 204, {});

      if (req.method === 'GET') {
        if (id) {
          const r = await sql.query(`select * from mpro.${table} where id = $1`, [id]);
          return send(res, 200, r[0] || null);
        }
        const where = [], params = [];
        for (const f of filters) {
          const v = query(req, f);
          if (v != null) { params.push(v); where.push(`${f} = $${params.length}`); }
        }
        const clause = where.length ? 'where ' + where.join(' and ') : '';
        const r = await sql.query(
          `select * from mpro.${table} ${clause} order by ${orderBy} desc nulls last limit 500`, params);
        return send(res, 200, r);
      }

      if (req.method === 'POST') {
        const body = await readJson(req);
        const keys = cols.filter(c => body[c] !== undefined);
        if (!keys.length) return send(res, 400, { error: 'nenhum campo válido enviado' });
        const params = keys.map(k => body[k]);
        const ph = keys.map((_, i) => `$${i + 1}`);
        const r = await sql.query(
          `insert into mpro.${table} (${keys.join(',')}) values (${ph.join(',')}) returning *`, params);
        return send(res, 201, r[0]);
      }

      if (req.method === 'PATCH') {
        if (!id) return send(res, 400, { error: 'id é obrigatório' });
        const body = await readJson(req);
        const keys = cols.filter(c => body[c] !== undefined);
        if (!keys.length) return send(res, 400, { error: 'nada para atualizar' });
        const params = keys.map(k => body[k]);
        const sets = keys.map((k, i) => `${k} = $${i + 1}`);
        params.push(id);
        const r = await sql.query(
          `update mpro.${table} set ${sets.join(',')} where id = $${params.length} returning *`, params);
        return send(res, 200, r[0] || null);
      }

      if (req.method === 'DELETE') {
        if (!id) return send(res, 400, { error: 'id é obrigatório' });
        await sql.query(`delete from mpro.${table} where id = $1`, [id]);
        return send(res, 204, {});
      }

      return send(res, 405, { error: 'método não suportado' });
    } catch (e) {
      return send(res, 500, { error: String(e && e.message || e) });
    }
  };
}
