// Regenera os ícones do PWA em public/. Uso: node scripts/generate-icons.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const GREEN = "#2f7d34";
const GREEN_DARK = "#245e28";

// Três pétalas sobrepostas partindo de um mesmo ponto — o broto da Nutrimilho.
function leafMarkup(size, color = "#ffffff") {
  const cx = size / 2;
  const pivotY = size * 0.675;
  const rx = size * 0.107;
  const ry = size * 0.225;
  const ellipseCy = pivotY - ry;
  return `<g fill="${color}">
    <ellipse cx="${cx}" cy="${ellipseCy}" rx="${rx}" ry="${ry}" transform="rotate(-27 ${cx} ${pivotY})"/>
    <ellipse cx="${cx}" cy="${ellipseCy}" rx="${rx}" ry="${ry}"/>
    <ellipse cx="${cx}" cy="${ellipseCy}" rx="${rx}" ry="${ry}" transform="rotate(27 ${cx} ${pivotY})"/>
  </g>`;
}

function iconSvg({ size, radius = 0, safeScale = 1 }) {
  const inner = size * safeScale;
  const offset = (size - inner) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="${size}" y2="${size}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${GREEN}"/>
        <stop offset="1" stop-color="${GREEN_DARK}"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bg)"/>
    <g transform="translate(${offset} ${offset})">${leafMarkup(inner)}</g>
  </svg>`;
}

const outDir = new URL("../public/", import.meta.url);

const jobs = [
  { file: "icon-512.png", size: 512, radius: 96 },
  { file: "icon-192.png", size: 192, radius: 36 },
  { file: "icon-maskable-512.png", size: 512, radius: 0, safeScale: 0.72 },
  { file: "apple-touch-icon.png", size: 180, radius: 0, safeScale: 0.82 },
  { file: "favicon-48.png", size: 48, radius: 9 },
  { file: "favicon-32.png", size: 32, radius: 6 },
];

for (const job of jobs) {
  const svg = iconSvg(job);
  await sharp(Buffer.from(svg))
    .png()
    .toFile(fileURLToPath(new URL(job.file, outDir)));
  console.log("wrote", job.file);
}
