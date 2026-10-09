import test from 'node:test';
import assert from 'node:assert/strict';
import { scryptSync } from 'node:crypto';

test('exclusão exige senha e confirmação e remove apenas arquivos e registros da conta', async t => {
  const salt = 'a'.repeat(32);
  const hash = salt + ':' + scryptSync('senha-de-teste', salt, 32).toString('hex');
  let queries = [], blobs = [], deleted = [];
  t.mock.module('../api/_db.js', { namedExports: {
    sql: async (strings, ...params) => { queries.push({ text: strings.join('?'), params }); return strings.join('').includes('SELECT id') ? [{ id: 19, senha_hash: hash }] : []; },
    readJson: async req => req.body, query: () => null,
    send: (res, status, body) => { res.status = status; res.body = body; }
  } });
  t.mock.module('@vercel/blob', { namedExports: {
    list: async opts => { blobs.push(opts); return { hasMore: false, blobs: [{ url: 'https://store.public.blob.vercel-storage.com/mpro/users/19/file.webp' }] }; },
    del: async urls => deleted.push(...urls)
  } });
  process.env.BLOB_READ_WRITE_TOKEN = 'fixture';
  const { default: handler } = await import('../api/account.js');
  const req = body => ({ method: 'POST', headers: { 'x-forwarded-for': '127.0.0.19' }, body });
  let res = {};
  await handler(req({ email: 'teste@example.org', senha: 'errada', confirmacao: 'EXCLUIR' }), res);
  assert.equal(res.status, 401); assert.equal(deleted.length, 0);
  res = {};
  await handler(req({ email: 'teste@example.org', senha: 'senha-de-teste', confirmacao: 'SIM' }), res);
  assert.equal(res.status, 400);
  res = {};
  await handler(req({ email: 'teste@example.org', senha: 'senha-de-teste', confirmacao: 'EXCLUIR' }), res);
  assert.equal(res.status, 200);
  assert.equal(blobs[0].prefix, 'mpro/users/19/');
  assert.equal(deleted.length, 1);
  const deletion = queries.find(q => q.text.includes('WITH apagados'));
  assert.ok(deletion.text.includes('DELETE FROM mpro.feedback'));
  assert.deepEqual(deletion.params, ['19', '19', 19]);
  delete process.env.BLOB_READ_WRITE_TOKEN;
});
