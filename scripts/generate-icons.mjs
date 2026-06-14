// Generates PWA icons from the Wave brand glyph. Run: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");

// Standard icon: rounded purple tile + white wave.
const tile = (size, { maskable = false } = {}) => {
  const pad = maskable ? size * 0.12 : 0; // safe zone for maskable
  const r = maskable ? 0 : size * 0.22;
  const inner = size - pad * 2;
  const s = inner / 32;
  const ox = pad;
  const oy = pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="${size}" y2="${size}">
      <stop offset="0" stop-color="#a855f7"/>
      <stop offset="1" stop-color="#6d28d9"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="${maskable ? "#6d28d9" : "url(#g)"}"/>
  ${maskable ? `<rect x="${ox}" y="${oy}" width="${inner}" height="${inner}" rx="${inner * 0.22}" fill="url(#g)"/>` : ""}
  <path d="M ${ox + 6 * s} ${oy + 20 * s} C ${ox + 8.2 * s} ${oy + 20 * s}, ${ox + 8.2 * s} ${oy + 15 * s}, ${ox + 10.4 * s} ${oy + 15 * s} S ${ox + 12.6 * s} ${oy + 20 * s}, ${ox + 14.8 * s} ${oy + 20 * s} S ${ox + 17 * s} ${oy + 15 * s}, ${ox + 19.2 * s} ${oy + 15 * s} S ${ox + 21.4 * s} ${oy + 20 * s}, ${ox + 23.6 * s} ${oy + 20 * s} S ${ox + 25.8 * s} ${oy + 15 * s}, ${ox + 26 * s} ${oy + 20 * s}"
    fill="none" stroke="#0b0a10" stroke-width="${2.2 * s}" stroke-linecap="round" stroke-linejoin="round" opacity="0.92"/>
</svg>`;
};

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "maskable-512.png", size: 512, maskable: true },
  { name: "apple-touch-icon.png", size: 180 },
];

await mkdir(outDir, { recursive: true });
for (const t of targets) {
  const svg = Buffer.from(tile(t.size, { maskable: t.maskable }));
  await sharp(svg).png().toFile(join(outDir, t.name));
  console.log("wrote", t.name);
}
console.log("done");
