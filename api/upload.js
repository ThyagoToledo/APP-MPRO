// Backend Serverless para Upload de Imagens e Evidências Fotográficas (Vercel Blob Storage)
import { send, readJson } from './_db.js';
import { requireAuth } from './_auth.js';
import { checkRateLimit } from './_rate_limit.js';

const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const VERCEL_BLOB_API = 'https://blob.vercel-storage.com';

function validaMagicBytes(buffer, mimeType) {
  if (!buffer || buffer.length < 12) return false;
  // JPEG: FF D8 FF
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }
  // PNG: 89 50 4E 47
  if (mimeType === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  }
  // WebP: RIFF (52 49 46 46) ... WEBP (57 45 42 50)
  if (mimeType === 'image/webp') {
    return buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
           buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
  }
  // GIF: GIF (47 49 46)
  if (mimeType === 'image/gif') {
    return buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
  }
  return true;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, {});
    if (req.method !== 'POST') return send(res, 405, { error: 'Método não permitido. Use POST.' });

    // 1. Rate Limiting por IP/usuário (máximo 30 uploads por minuto)
    if (!checkRateLimit(req, res, { chave: 'upload_image', limite: 30, janelaMs: 60000 })) return;

    // 2. Validação de autenticação
    const user = requireAuth(req, res);
    if (!user) return;

    const body = await readJson(req);
    const imagemBase64 = body.imagem || body.base64 || body.dataUrl || '';
    const pasta = (body.pasta || 'visitas').replace(/[^a-z0-9_-]/gi, '');
    const nomeOriginal = (body.nome || 'imagem').replace(/[^a-z0-9_.-]/gi, '_');

    if (!imagemBase64) {
      return send(res, 400, { error: 'O conteúdo da imagem em base64 é obrigatório.' });
    }

    // 3. Extrai mimeType e buffer
    let mimeType = 'image/jpeg';
    let bufferData = null;

    if (imagemBase64.startsWith('data:')) {
      const parts = imagemBase64.split(';base64,');
      mimeType = parts[0].replace('data:', '');
      bufferData = Buffer.from(parts[1], 'base64');
    } else {
      bufferData = Buffer.from(imagemBase64, 'base64');
    }

    // Validação de tipo de arquivo
    const tiposValidos = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif'];
    if (!tiposValidos.includes(mimeType.toLowerCase())) {
      return send(res, 400, { error: 'Tipo de imagem inválido. Formatos aceitos: JPEG, PNG, WebP.' });
    }

    // Validação de Magic Bytes (assinatura binária) contra Web Shells e arquivos maliciosos camuflados
    if (!validaMagicBytes(bufferData, mimeType.toLowerCase())) {
      return send(res, 400, { error: 'Assinatura de arquivo inválida. O conteúdo não corresponde a uma imagem autêntica.' });
    }

    // Limite de 10MB por imagem
    if (bufferData.length > 10 * 1024 * 1024) {
      return send(res, 400, { error: 'A imagem excede o tamanho máximo de 10MB.' });
    }

    const extensao = mimeType.split('/')[1] || 'jpg';
    const timestamp = Date.now();
    const hash = Math.random().toString(36).slice(2, 8);
    const pathname = `mpro/${pasta}/${timestamp}-${hash}-${nomeOriginal.replace(/\.[^/.]+$/, '')}.${extensao}`;

    // 4. Upload para o Vercel Blob Storage
    if (BLOB_READ_WRITE_TOKEN) {
      try {
        let blobUrl = '';
        let blobPathname = pathname;

        // Tenta usar SDK @vercel/blob se disponível
        try {
          const { put } = await import('@vercel/blob');
          const blob = await put(pathname, bufferData, {
            access: 'public',
            contentType: mimeType,
            token: BLOB_READ_WRITE_TOKEN
          });
          blobUrl = blob.url;
          blobPathname = blob.pathname;
        } catch (eSdk) {
          // Fallback para REST API oficial do Vercel Blob
          const uploadRes = await fetch(`${VERCEL_BLOB_API}/${pathname}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${BLOB_READ_WRITE_TOKEN}`,
              'x-content-type': mimeType,
              'x-add-random-suffix': 'true'
            },
            body: bufferData
          });

          if (!uploadRes.ok) {
            const erroBlob = await uploadRes.text();
            throw new Error(`Falha no Vercel Blob: ${uploadRes.status} - ${erroBlob}`);
          }

          const blobDados = await uploadRes.json();
          blobUrl = blobDados.url;
          blobPathname = blobDados.pathname;
        }

        return send(res, 200, {
          url: blobUrl,
          pathname: blobPathname,
          tamanho: bufferData.length,
          tipo: mimeType,
          provedor: 'Vercel Blob CDN'
        });
      } catch (errBlob) {
        console.error('Erro no upload Vercel Blob:', errBlob);
        return send(res, 502, { error: 'Erro ao transferir imagem para o armazenamento da nuvem.', detalhe: errBlob.message });
      }
    }

    // Fallback: se o BLOB_READ_WRITE_TOKEN ainda não foi adicionado na Vercel
    return send(res, 200, {
      url: imagemBase64.startsWith('data:') ? imagemBase64 : `data:${mimeType};base64,${bufferData.toString('base64')}`,
      tamanho: bufferData.length,
      tipo: mimeType,
      provedor: 'Local Base64 Fallback',
      aviso: 'Configure BLOB_READ_WRITE_TOKEN na Vercel para salvar em CDN.'
    });

  } catch (err) {
    console.error('Erro no endpoint de upload:', err);
    return send(res, 500, { error: 'Erro interno ao processar upload de imagem.' });
  }
}
