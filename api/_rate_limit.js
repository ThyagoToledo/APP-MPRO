// Rate Limiter em memória (Sliding Window) para proteção contra Brute-Force e DoS
const registros = new Map();

// Limpa registros antigos a cada 5 minutos
setInterval(() => {
  const agora = Date.now();
  for (const [chave, dados] of registros.entries()) {
    if (agora > dados.resetEm) {
      registros.delete(chave);
    }
  }
}, 5 * 60 * 1000).unref?.();

export function getClientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers?.['x-real-ip'] || req.socket?.remoteAddress || '127.0.0.1';
}

export function checkRateLimit(req, res, { chave, limite = 10, janelaMs = 60000 }) {
  const ip = getClientIp(req);
  const chaveCompleta = `${chave}:${ip}`;
  const agora = Date.now();

  let dados = registros.get(chaveCompleta);
  if (!dados || agora > dados.resetEm) {
    dados = { contagem: 1, resetEm: agora + janelaMs };
    registros.set(chaveCompleta, dados);
    return true;
  }

  dados.contagem += 1;
  if (dados.contagem > limite) {
    const segundosRestantes = Math.ceil((dados.resetEm - agora) / 1000);
    res.statusCode = 429;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('retry-after', String(segundosRestantes));
    res.end(JSON.stringify({
      error: `Muitas tentativas. Aguarde ${segundosRestantes} segundos antes de tentar novamente.`,
      codigo: 'RATE_LIMIT_EXCEEDED',
      retryAfter: segundosRestantes
    }));
    return false;
  }

  return true;
}
