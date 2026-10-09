import { mkdir, writeFile, readFile } from 'node:fs/promises';
const dir = 'core/vendor/fonts';
await mkdir(dir, { recursive: true });
const urls = [
  'https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600;700;800&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300..600,0..1,-25..0&display=block'
];
let css = '', index = 0;
const downloaded = new Map();
for (const url of urls) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36' } });
  if (!response.ok) throw new Error('Falha ao obter fontes: ' + response.status);
  let part = await response.text();
  for (const match of [...part.matchAll(/url\((https:\/\/[^)]+)\)/g)]) {
    const remote = match[1];
    let local = downloaded.get(remote);
    if (!local) {
      local = 'font-' + index++ + '.woff2';
      const file = await fetch(remote);
      if (!file.ok) throw new Error('Fonte indisponível.');
      await writeFile(dir + '/' + local, new Uint8Array(await file.arrayBuffer()));
      downloaded.set(remote, local);
    }
    part = part.replaceAll(remote, '/core/vendor/fonts/' + local);
  }
  css += part + '\n';
}
await writeFile(dir + '/fonts.css', css);
for (const path of ['mobile/index.html', 'web/sistema.html']) {
  let html = await readFile(path, 'utf8');
  html = html.replace(/<link[^>]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>\r?\n/g, '');
  html = html.replace('</head>', '<link rel="stylesheet" href="/core/vendor/fonts/fonts.css">\n</head>');
  await writeFile(path, html);
}
console.log('Fontes existentes empacotadas para uso offline: ' + downloaded.size + ' arquivos.');
