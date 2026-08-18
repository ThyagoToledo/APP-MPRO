// Helpers compartilhados pelas funções serverless (Vercel + Neon).
import { neon } from '@neondatabase/serverless';

const connStr = process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED;

export const sql = connStr ? neon(connStr) : () => {
  throw new Error('DATABASE_URL não configurada nas variáveis de ambiente da Vercel.');
};

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type,authorization');
  res.end(status === 204 ? '' : JSON.stringify(body));
}

export function query(req, name) {
  try {
    const u = new URL(req.url, 'http://localhost');
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
