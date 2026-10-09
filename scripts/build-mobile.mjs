import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { build } from 'esbuild';
const root = new URL('../', import.meta.url);
const fixture = process.argv.includes('--fixture');
const configPath = new URL(fixture ? 'tests/fixtures/mobile.config.json' : 'mobile/config.local.json', root);
let config;
try { config = JSON.parse(await readFile(configPath, 'utf8')); }
catch { throw new Error('Copie mobile/config.example.json para mobile/config.local.json e configure os dados públicos reais.'); }
const url = new URL(config.backendUrl);
if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password || /SEU-DOMINIO|localhost/i.test(url.hostname)) throw new Error('backendUrl deve ser a origem HTTPS real de produção, sem caminho ou credenciais.');
if (!fixture && /(?:example\.(?:org|com)|\.invalid|\.test)$/.test(url.hostname)) throw new Error('Domínio de exemplo não pode ser usado na publicação.');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.supportEmail) || !config.controllerName?.trim()) throw new Error('Preencha supportEmail e controllerName antes de preparar o app.');
if (!Number.isSafeInteger(config.versionCode) || config.versionCode < 1 || !/^\d+\.\d+\.\d+$/.test(config.versionName)) throw new Error('Versão inválida.');
const dist = new URL('mobile/dist/', root);
// O destino é fixo dentro de mobile; nunca depende da configuração do usuário.
await rm(dist, { recursive: true, force: true });
await mkdir(new URL('mobile/js/', dist), { recursive: true });
await cp(new URL('core/', root), new URL('core/', dist), { recursive: true });
await cp(new URL('mobile/js/', root), new URL('mobile/js/', dist), { recursive: true });
await cp(new URL('mobile/icons/', root), new URL('mobile/icons/', dist), { recursive: true });
const publicConfig = { backendUrl: url.origin, supportEmail: config.supportEmail, controllerName: config.controllerName, versionName: config.versionName, fixture };
await writeFile(new URL('mobile/js/runtime-config.js', dist), 'window.MPRO_RUNTIME = ' + JSON.stringify(publicConfig) + ';\n');
if (!fixture) await writeFile(new URL('mobile/js/runtime-config.js', root), 'window.MPRO_RUNTIME = ' + JSON.stringify({ ...publicConfig, backendUrl: '' }) + ';\n');
let html = await readFile(new URL('mobile/index.html', root), 'utf8');
html = html.replace('<link rel="manifest" href="/mobile/manifest.webmanifest">', '').replace('</head>', '<script src="/mobile/js/native.bundle.js"></script>\n</head>');
await writeFile(new URL('index.html', dist), html);
await build({ entryPoints: [new URL('mobile/native/bridge.js', root).pathname.replace(/^\/(\w:)/, '$1')], outfile: new URL('mobile/js/native.bundle.js', dist).pathname.replace(/^\/(\w:)/, '$1'), bundle: true, format: 'iife', target: 'chrome120' });
await writeFile(new URL('mobile/version.properties', root), `VERSION_CODE=${config.versionCode}\nVERSION_NAME=${config.versionName}\n`);
console.log('Assets Android preparados, com design compartilhado e API em ' + url.origin);
