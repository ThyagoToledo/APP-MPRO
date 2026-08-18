import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { sql, send, readJson, query } from './_db.js';
import { signToken } from './_auth.js';
import { checkRateLimit } from './_rate_limit.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashSenha(senha) {
  const salt = randomBytes(16).toString('hex');
  const dk = scryptSync(senha, salt, 32).toString('hex');
  return `${salt}:${dk}`;
}

function verificaSenha(senha, armazenado) {
  if (!armazenado) return false;
  if (!armazenado.includes(':')) {
    return senha === armazenado;
  }
  const [salt, dk] = armazenado.split(':');
  const alvo = Buffer.from(dk, 'hex');
  const calc = scryptSync(senha, salt, 32);
  return alvo.length === calc.length && timingSafeEqual(alvo, calc);
}

export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, {});
    if (req.method !== 'POST') return send(res, 405, { error: 'Método não permitido. Use POST.' });

    const acao = query(req, 'action') || 'login';
    const body = await readJson(req);
    const email = (body.email || '').trim().toLowerCase();
    const senha = body.senha || body.password || '';

    // 1. Solicitar acesso
    if (acao === 'solicitar-acesso' || acao === 'register') {
      if (!checkRateLimit(req, res, { chave: 'auth_register', limite: 5, janelaMs: 300000 })) return;

      const nome = (body.nome || '').trim();
      if (!nome || !email || !senha) {
        return send(res, 400, { error: 'Nome, e-mail e senha são obrigatórios.' });
      }

      if (!EMAIL_REGEX.test(email)) {
        return send(res, 400, { error: 'Formato de e-mail inválido.' });
      }

      if (senha.length < 6) {
        return send(res, 400, { error: 'A senha deve ter pelo menos 6 caracteres.' });
      }

      const existe = await sql`SELECT id, status FROM mpro.usuarios WHERE email = ${email};`;
      if (existe.length > 0) {
        if (existe[0].status === 'pendente') {
          return send(res, 409, { error: 'Já existe uma solicitação pendente para este e-mail. Aguarde a aprovação do administrador.' });
        }
        return send(res, 409, { error: 'Este e-mail já possui cadastro. Faça login ou solicite suporte.' });
      }

      const r = await sql`
        INSERT INTO mpro.usuarios (nome, email, empresa, cargo, senha_hash, papel, status)
        VALUES (${nome}, ${email}, ${body.empresa || 'M-PRO'}, ${body.cargo || 'Engenheiro agrônomo'}, ${hashSenha(senha)}, 'tecnico', 'pendente')
        RETURNING id, nome, email, empresa, cargo, papel, status, criado_em;
      `;
      return send(res, 201, { success: true, usuario: r[0] });
    }

    // 2. Login
    if (!checkRateLimit(req, res, { chave: 'auth_login', limite: 10, janelaMs: 60000 })) return;

    if (!email || !senha) {
      return send(res, 400, { error: 'E-mail e senha são obrigatórios.' });
    }

    const r = await sql`SELECT * FROM mpro.usuarios WHERE email = ${email};`;
    const user = r[0];

    if (!user || !verificaSenha(senha, user.senha_hash)) {
      return send(res, 401, { error: 'E-mail ou senha incorretos.' });
    }

    if (user.status === 'pendente') {
      return send(res, 403, { error: 'Seu cadastro foi recebido e está aguardando aprovação pelo administrador.' });
    }

    if (user.status === 'bloqueado') {
      return send(res, 403, { error: 'Este acesso foi desativado pela administração.' });
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      papel: user.papel || 'tecnico'
    });

    const usuarioPayload = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      empresa: user.empresa,
      cargo: user.cargo,
      papel: user.papel || 'tecnico'
    };

    return send(res, 200, { token, usuario: usuarioPayload });
  } catch (e) {
    console.error('Erro na autenticação:', e);
    return send(res, 500, { error: 'Erro interno ao processar autenticação.' });
  }
}
