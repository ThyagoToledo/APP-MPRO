import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { indexedDB } from 'fake-indexeddb';
import { signToken, verifyToken, requireActiveUser } from '../api/_auth.js';

async function context(files, extra = {}) {
  const storage = new Map();
  const ctx = vm.createContext({ console, URL, Promise, Date, setInterval: () => 1, clearInterval() {}, navigator: { onLine: true }, localStorage: { getItem: k => storage.get(k) || null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) }, ...extra });
  ctx.window = ctx; ctx.addEventListener = () => {};
  for (const file of files) vm.runInContext(await readFile(file, 'utf8'), ctx, { filename: file });
  return { ctx, storage };
}
test('Android usa a origem configurada em auth, admin, upload, sync e IA', async () => {
  const { ctx, storage } = await context(['core/js/platform.js', 'mobile/js/platform.js', 'core/js/session.js'], { MPRO_RUNTIME: { backendUrl: 'https://mpro.example.org' }, fetch: async (url) => { assert.equal(url, 'https://mpro.example.org/api/auth?action=login'); return { ok: true, status: 200, json: async () => ({ token: 'token', usuario: { id: 7 } }) }; } });
  ctx.MPRO.db = { trocarEscopo: async s => assert.equal(s, 'u-7'), obter: () => null };
  await ctx.MPRO.session.entrar('teste@example.org', 'senha');
  assert.equal(ctx.MPRO.apiUrl('/api/admin?action=usuarios'), 'https://mpro.example.org/api/admin?action=usuarios');
  assert.equal(ctx.MPRO.apiUrl('upload'), 'https://mpro.example.org/api/upload');
  assert.equal(ctx.MPRO.platform.ia.endpoint, 'https://mpro.example.org/api/ia');
  assert.equal(storage.has('mpro.usuarios_cadastrados'), false);
});
test('dados locais anônimos não migram para outra conta e escopos ficam isolados', async () => {
  const { ctx } = await context(['core/js/platform.js', 'core/js/db.js'], { indexedDB });
  ctx.MPRO.platform.db.nome = 'test-' + Date.now();
  await ctx.MPRO.db.abrir('local');
  ctx.MPRO.db.salvar('clients', { id: 'local', nome: 'Privado' }, { semFila: true });
  await ctx.MPRO.db.trocarEscopo('u-1');
  assert.equal(ctx.MPRO.db.todos('clients').length, 0);
  ctx.MPRO.db.receber('clients', { id: 'cliente', nome: 'Conta 1', _pk: 'u-2:cliente', _escopo: 'u-2' });
  await ctx.MPRO.db.trocarEscopo('u-2');
  assert.equal(ctx.MPRO.db.todos('clients').length, 0);
  await ctx.MPRO.db.trocarEscopo('u-1');
  assert.equal(ctx.MPRO.db.obter('clients', 'cliente').nome, 'Conta 1');
  assert.equal(ctx.MPRO.db.obter('clients', 'cliente')._pendente, false);
});
test('sincronização não reenvia registros limpos; preserva edição feita durante o envio', async () => {
  let resolvePost;
  const { ctx } = await context(['core/js/platform.js', 'core/js/db.js', 'core/js/sync.js'], { fetch: async (url, options) => {
    if (options.method === 'POST') return new Promise(resolve => { resolvePost = () => resolve({ ok: true, json: async () => ({}) }); });
    return { ok: true, json: async () => ({ registros: { clients: [{ id: 'a', nome: 'Servidor' }] }, removidos: [{ colecao: 'clients', id: 'apagado' }] }) };
  } });
  ctx.MPRO.platform.db.driver = 'localstorage'; ctx.MPRO.platform.nuvem.baseUrl = '/api';
  ctx.MPRO.session = { modo: () => 'gated', cabecalhos: () => ({ Authorization: 'Bearer token' }) };
  await ctx.MPRO.db.abrir('u-1');
  ctx.MPRO.db.receber('clients', { id: 'a', nome: 'Limpo' });
  ctx.MPRO.db.receber('clients', { id: 'apagado' });
  await ctx.MPRO.sync.sincronizarTudo();
  assert.equal(ctx.MPRO.db.todos('outbox').length, 0);
  assert.equal(ctx.MPRO.db.obter('clients', 'a').nome, 'Servidor');
  assert.equal(ctx.MPRO.db.obter('clients', 'apagado'), null);
  ctx.MPRO.db.salvar('clients', { id: 'a', nome: 'Primeira edição' });
  const envio = ctx.MPRO.sync.drenar();
  await Promise.resolve(); await Promise.resolve();
  ctx.MPRO.db.salvar('clients', { id: 'a', nome: 'Nova edição' });
  resolvePost(); await envio;
  assert.equal(ctx.MPRO.db.todos('outbox').length, 1);
  assert.equal(ctx.MPRO.db.obter('clients', 'a')._pendente, true);
});
test('tokens adulterados, expirados e sem segredo não liberam acesso; falha no banco fecha o acesso', async () => {
  process.env.AUTH_SECRET = '[REDACTED_TEST_FIXTURE]';
  const token = signToken({ id: 1, papel: 'tecnico' });
  assert.equal(verifyToken(token).id, 1);
  assert.equal(verifyToken(token + '.extra'), null);
  assert.equal(verifyToken(token.slice(0, -1) + '!'), null);
  const res = { setHeader() {}, end() {} };
  assert.equal(await requireActiveUser({ headers: { authorization: 'Bearer ' + token } }, res), null);
  assert.equal(res.statusCode, 503);
  delete process.env.AUTH_SECRET;
  assert.equal(verifyToken(token), null);
  assert.throws(() => signToken({ id: 1 }), /AUTH_SECRET/);
});

test('resposta de sincronização da conta anterior não entra na conta atual', async () => {
  let finish;
  const { ctx } = await context(['core/js/platform.js', 'core/js/db.js', 'core/js/sync.js'], { fetch: async () => new Promise(resolve => { finish = () => resolve({ ok: true, json: async () => ({ registros: { clients: [{ id: 'privado', nome: 'Conta anterior' }] } }) }); }) });
  ctx.MPRO.platform.db.driver = 'localstorage'; ctx.MPRO.platform.nuvem.baseUrl = '/api';
  ctx.MPRO.session = { modo: () => 'gated', cabecalhos: () => ({ Authorization: 'Bearer token' }) };
  await ctx.MPRO.db.abrir('u-1');
  const pull = ctx.MPRO.sync.puxar();
  await ctx.MPRO.db.trocarEscopo('u-2');
  finish(); await pull;
  assert.equal(ctx.MPRO.db.todos('clients').length, 0);
});

test('mídia offline só sai da fila após upload e confirmação da sincronização', async () => {
  let available = false, sent;
  const { ctx } = await context(['core/js/platform.js', 'core/js/db.js', 'core/js/sync.js'], { fetch: async (url, options) => {
    if (url.endsWith('/upload')) return { ok: available, json: async () => available ? { url: 'https://store.public.blob.vercel-storage.com/foto.webp' } : { error: 'Falha temporária' } };
    if (options.method === 'POST') { sent = JSON.parse(options.body); return { ok: true, json: async () => ({}) }; }
    return { ok: true, json: async () => ({ registros: {} }) };
  } });
  ctx.MPRO.platform.db.driver = 'localstorage'; ctx.MPRO.platform.nuvem.baseUrl = '/api';
  ctx.MPRO.session = { modo: () => 'gated', cabecalhos: () => ({ Authorization: 'Bearer token' }) };
  await ctx.MPRO.db.abrir('u-1');
  ctx.MPRO.db.salvar('photos', { id: 'foto', url: 'data:image/webp;base64,AAAA' });
  await ctx.MPRO.sync.sincronizarTudo();
  assert.equal(ctx.MPRO.db.todos('outbox').length, 1);
  assert.equal(ctx.MPRO.db.obter('photos', 'foto').url, 'data:image/webp;base64,AAAA');
  available = true;
  await ctx.MPRO.sync.sincronizarTudo();
  assert.equal(ctx.MPRO.db.todos('outbox').length, 0);
  assert.equal(sent.dados.url, 'https://store.public.blob.vercel-storage.com/foto.webp');
});
