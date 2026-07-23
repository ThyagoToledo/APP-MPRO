import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { sql, send, readJson, query } from './_db.js';

// Hash de senha simples (scrypt) — suficiente para o protótipo.
function hashSenha(senha) {
  const salt = randomBytes(16).toString('hex');
  const dk = scryptSync(senha, salt, 32).toString('hex');
  return `${salt}:${dk}`;
}
function verificaSenha(senha, armazenado) {
  if (!armazenado || !armazenado.includes(':')) return false;
  const [salt, dk] = armazenado.split(':');
  const alvo = Buffer.from(dk, 'hex');
  const calc = scryptSync(senha, salt, 32);
  return alvo.length === calc.length && timingSafeEqual(alvo, calc);
}
const semSenha = (u) => { if (u) delete u.senha_hash; return u; };

export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, {});
    if (req.method !== 'POST') return send(res, 405, { error: 'use POST' });
    const acao = query(req, 'action') || 'login';
    const body = await readJson(req);
    const email = (body.email || '').trim().toLowerCase();
    const senha = body.senha || body.password || '';
    if (!email || !senha) return send(res, 400, { error: 'email e senha são obrigatórios' });

    if (acao === 'register') {
      const existe = await sql.query('select 1 from mpro.usuarios where email = $1', [email]);
      if (existe.length) return send(res, 409, { error: 'e-mail já cadastrado' });
      const r = await sql.query(
        `insert into mpro.usuarios (nome, email, empresa, cargo, senha_hash)
         values ($1,$2,$3,$4,$5) returning id, nome, email, empresa, cargo, papel, criado_em`,
        [body.nome || email, email, body.empresa || null, body.cargo || null, hashSenha(senha)]);
      return send(res, 201, r[0]);
    }

    // login
    const r = await sql.query('select * from mpro.usuarios where email = $1', [email]);
    const user = r[0];
    if (!user || !verificaSenha(senha, user.senha_hash)) {
      return send(res, 401, { error: 'credenciais inválidas' });
    }
    return send(res, 200, semSenha(user));
  } catch (e) {
    return send(res, 500, { error: String(e && e.message || e) });
  }
}
