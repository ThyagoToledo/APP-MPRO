import { access, mkdir, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
await mkdir('private', { recursive: true });
try { await access('private/mpro-upload.jks'); throw new Error('A chave já existe; não será substituída.'); }
catch (e) { if (e.code !== 'ENOENT') throw e; }
const password = randomBytes(32).toString('base64url');
const keytool = process.env.JAVA_HOME ? process.env.JAVA_HOME + '/bin/keytool' : 'keytool';
const result = spawnSync(keytool, ['-genkeypair', '-keystore', 'private/mpro-upload.jks', '-storetype', 'JKS', '-alias', 'mpro-upload', '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000', '-dname', 'CN=M-PRO Campo, OU=Mobile, O=M-PRO, C=BR', '-storepass:env', 'MPRO_KEY_PASSWORD', '-keypass:env', 'MPRO_KEY_PASSWORD'], { env: { ...process.env, MPRO_KEY_PASSWORD: password }, encoding: 'utf8' });
if (result.error) throw result.error;
if (result.status) throw new Error('Não foi possível gerar a chave: ' + result.stderr);
await writeFile('android/keystore.properties', `storeFile=../private/mpro-upload.jks\nstorePassword=${password}\nkeyAlias=mpro-upload\nkeyPassword=${password}\n`, { mode: 0o600 });
console.log('Chave de upload e configuração criadas. Faça backup privado de private/mpro-upload.jks e android/keystore.properties.');
