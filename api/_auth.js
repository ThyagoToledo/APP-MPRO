// Módulo de segurança, assinatura de tokens e autorização
import { createHmac, timingSafeEqual } from 'node:crypto';
import { send } from './_db.js';

const SECRET = process.env.AUTH_SECRET || process.env.DATABASE_URL || 'mpro-seguranca-token-chave-padrao-2026';

export function signToken(payload) {
  const data = {
    id: payload.id,
    papel: payload.papel || 'tecnico',
    email: payload.email,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 dias
  };
  const bodyBase64 = Buffer.from(JSON.stringify(data)).toString('base64url');
  const hmac = createHmac('sha256', SECRET).update(bodyBase64).digest('base64url');
  return `${bodyBase64}.${hmac}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [bodyBase64, signature] = token.split('.');
  if (!bodyBase64 || !signature) return null;

  const expectedHmac = createHmac('sha256', SECRET).update(bodyBase64).digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedHmac);

  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(bodyBase64, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null; // Expirado
    return payload;
  } catch {
    return null;
  }
}

export function extractBearerToken(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return null;
}

export function requireAuth(req, res) {
  const token = extractBearerToken(req);
  const user = verifyToken(token);
  if (!user) {
    send(res, 401, { error: 'Acesso não autorizado. Faça login para continuar.' });
    return null;
  }
  return user;
}

export function requireAdmin(req, res) {
  const token = extractBearerToken(req);
  const user = verifyToken(token);
  if (!user) {
    send(res, 401, { error: 'Autenticação necessária.' });
    return null;
  }
  if (user.papel !== 'admin') {
    send(res, 403, { error: 'Permissão negada. Apenas administradores podem executar esta ação.' });
    return null;
  }
  return user;
}
