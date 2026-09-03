// Regenera o logo e os ícones do PWA em public/ a partir de scripts/assets/logo-nutrimilho.png.
// Uso: node scripts/generate-icons.mjs
import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const sourcePath = fileURLToPath(new URL("./assets/logo-nutrimilho.png", import.meta.url));
const outDir = new URL("../public/", import.meta.url);

function roundedMask(size, radius) {
  return Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}"/></svg>`,
  );
}

// Ícone recortado num quadrado de cantos arredondados (ícones "any" e favicons).
async function roundedIcon(size, radius) {
  return sharp(sourcePath)
    .resize(size, size)
    .composite([{ input: roundedMask(size, radius), blend: "dest-in" }])
    .png();
}

// Ícone maskable: logo reduzido dentro da "safe zone" central sobre fundo branco,
// para não ser cortado quando o SO aplica sua própria máscara (círculo, squircle, etc).
async function maskableIcon(size, safeScale) {
  const inner = Math.round(size * safeScale);
  const logo = await sharp(sourcePath).resize(inner, inner).toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 3, background: "#ffffff" },
  }).composite([{ input: logo, gravity: "center" }]);
}

// Empacota PNGs (32-bit, com alpha) num container .ico — todo navegador/SO
// moderno lê entradas PNG dentro do ICO, então não precisamos de um encoder BMP.
function buildIco(entries) {
  const headerSize = 6 + 16 * entries.length;
  let offset = headerSize;
  const dirEntries = [];
  for (const { size, png } of entries) {
    const dim = size >= 256 ? 0 : size;
    const entry = Buffer.alloc(16);
    entry.writeUInt8(dim, 0); // width (0 = 256px)
    entry.writeUInt8(dim, 1); // height (0 = 256px)
    entry.writeUInt8(0, 2); // color count (0 = >=256 colors)
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8); // image size
    entry.writeUInt32LE(offset, 12); // image offset
    dirEntries.push(entry);
    offset += png.length;
  }
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(entries.length, 4);
  return Buffer.concat([header, ...dirEntries, ...entries.map((e) => e.png)]);
}

async function faviconIco() {
  const sizes = [16, 32, 48];
  const entries = [];
  for (const size of sizes) {
    const radius = Math.round(size * 0.1875);
    const png = await (await roundedIcon(size, radius)).png().toBuffer();
    entries.push({ size, png });
  }
  return { raw: buildIco(entries) };
}

const jobs = [
  { file: "icon-512.png", build: () => roundedIcon(512, 96) },
  { file: "icon-192.png", build: () => roundedIcon(192, 36) },
  { file: "icon-maskable-512.png", build: () => maskableIcon(512, 0.72) },
  { file: "apple-touch-icon.png", build: () => sharp(sourcePath).resize(180, 180) },
  { file: "favicon-48.png", build: () => roundedIcon(48, 9) },
  { file: "favicon-32.png", build: () => roundedIcon(32, 6) },
  { file: "favicon.ico", build: faviconIco },
  { file: "logo-nutrimilho.png", build: () => sharp(sourcePath).resize(240, 240) },
];

for (const job of jobs) {
  const result = await job.build();
  const path = fileURLToPath(new URL(job.file, outDir));
  if (Buffer.isBuffer(result.raw)) {
    await writeFile(path, result.raw);
  } else {
    await result.png({ compressionLevel: 9 }).toFile(path);
  }
  console.log("wrote", job.file);
}
