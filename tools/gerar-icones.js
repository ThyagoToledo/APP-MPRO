/* Gera os ícones PNG do aplicativo a partir do símbolo M-PRO.
   Node puro, sem dependências: rasteriza o contorno (retas + o arco do canto aproximado)
   com regra even-odd e escreve o PNG na mão.

   Uso:  node tools/gerar-icones.js
   Saída: mobile/icons/icon-192.png, icon-512.png, icon-maskable-512.png */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* Contornos do símbolo, em coordenadas do viewBox 0 0 512 512 (ver core/assets/mpro-app-icon.svg).
   O primeiro é o escudo; os três seguintes são as barras, vazadas pela regra even-odd. */
const CONTORNOS = [
  [
    [182, 102], [432, 102], [434, 102.5], [436, 104], [437.5, 106], [438, 108],
    [438, 302], [436, 313], [426, 330], [350, 405], [335, 412], [325, 415],
    [76, 415], [76, 211], [80, 199], [88, 182], [163, 109], [168, 104], [174, 102]
  ],
  [[151, 170], [151, 351], [209, 351], [209, 204]],
  [[226, 170], [226, 255], [285, 289], [285, 204]],
  [[303, 170], [303, 351], [323, 351], [361, 313], [361, 204]]
];

const FUNDO = [0x00, 0x2d, 0x1d];
const TINTA = [0xff, 0xff, 0xff];
const AMOSTRAS = 4; /* supersampling por eixo: 4x4 = 16 amostras por pixel */

function dentro(contornos, x, y) {
  let cruzamentos = 0;
  for (const pontos of contornos) {
    for (let i = 0; i < pontos.length; i++) {
      const [x1, y1] = pontos[i];
      const [x2, y2] = pontos[(i + 1) % pontos.length];
      if ((y1 > y) === (y2 > y)) continue;
      const xi = x1 + ((y - y1) / (y2 - y1)) * (x2 - x1);
      if (xi > x) cruzamentos++;
    }
  }
  return cruzamentos % 2 === 1; /* even-odd: as barras viram buracos */
}

function rasteriza(tamanho, escala) {
  const desenho = tamanho * escala;
  const margem = (tamanho - desenho) / 2;
  const linhas = Buffer.alloc(tamanho * (tamanho * 3 + 1));
  let p = 0;

  for (let y = 0; y < tamanho; y++) {
    linhas[p++] = 0; /* filtro None */
    for (let x = 0; x < tamanho; x++) {
      let acertos = 0;
      for (let sy = 0; sy < AMOSTRAS; sy++) {
        for (let sx = 0; sx < AMOSTRAS; sx++) {
          const px = ((x + (sx + 0.5) / AMOSTRAS) - margem) / desenho * 512;
          const py = ((y + (sy + 0.5) / AMOSTRAS) - margem) / desenho * 512;
          if (px >= 0 && px <= 512 && py >= 0 && py <= 512 && dentro(CONTORNOS, px, py)) acertos++;
        }
      }
      const a = acertos / (AMOSTRAS * AMOSTRAS);
      for (let c = 0; c < 3; c++) {
        linhas[p++] = Math.round(FUNDO[c] * (1 - a) + TINTA[c] * a);
      }
    }
  }
  return linhas;
}

function chunk(tipo, dados) {
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(corpo) >>> 0);
  return Buffer.concat([tamanho, corpo, crc]);
}

function png(tamanho, escala) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tamanho, 0);
  ihdr.writeUInt32BE(tamanho, 4);
  ihdr[8] = 8;  /* 8 bits por canal */
  ihdr[9] = 2;  /* RGB */
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(rasteriza(tamanho, escala), { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const destino = path.join(__dirname, '..', 'mobile', 'icons');
fs.mkdirSync(destino, { recursive: true });

/* 0.62 para os ícones comuns; 0.46 no maskable, que precisa caber na área segura circular. */
[
  ['icon-192.png', 192, 0.62],
  ['icon-512.png', 512, 0.62],
  ['icon-maskable-512.png', 512, 0.46]
].forEach(function ([nome, tamanho, escala]) {
  const arquivo = path.join(destino, nome);
  fs.writeFileSync(arquivo, png(tamanho, escala));
  console.log(nome, fs.statSync(arquivo).size, 'bytes');
});
