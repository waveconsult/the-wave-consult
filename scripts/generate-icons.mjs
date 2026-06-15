// Generates PWA icons + favicon from public/logo.png (the WaveHub wave),
// composited onto the dark brand background. Run: npm run icons
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "public", "logo.png");
const iconsDir = join(root, "public", "icons");
const appDir = join(root, "app");

const BG = { r: 11, g: 10, b: 16, alpha: 1 }; // #0b0a10
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function makeIcon(size, pad, out) {
  const inner = Math.round(size * (1 - pad * 2));
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: TRANSPARENT })
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(out);
  console.log("wrote", out.replace(root, "."));
}

await mkdir(iconsDir, { recursive: true });

// Standard + Apple icons: a little padding around the wave.
await makeIcon(192, 0.14, join(iconsDir, "icon-192.png"));
await makeIcon(512, 0.14, join(iconsDir, "icon-512.png"));
await makeIcon(180, 0.14, join(iconsDir, "apple-touch-icon.png"));
// Maskable: larger safe-zone padding so the OS crop never clips the wave.
await makeIcon(512, 0.24, join(iconsDir, "maskable-512.png"));
// Favicon (Next App Router auto-serves app/icon.png).
await makeIcon(256, 0.12, join(appDir, "icon.png"));

console.log("done");
