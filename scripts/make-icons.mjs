// Generates the PWA and Apple touch icons from one SVG. Run: node scripts/make-icons.mjs
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const svg = (size, padding) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#047857"/>
  <g transform="translate(${padding} ${padding}) scale(${(512 - padding * 2) / 512})">
    <circle cx="256" cy="256" r="168" fill="none" stroke="#d1fae5" stroke-width="28" stroke-dasharray="880 1056" stroke-linecap="round" transform="rotate(-90 256 256)"/>
    <text x="256" y="300" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="150" fill="#ffffff">8W</text>
  </g>
</svg>`;

await mkdir("public/icons", { recursive: true });
const targets = [
  ["public/icons/icon-192.png", 192, 0],
  ["public/icons/icon-512.png", 512, 0],
  // Maskable icons need their content inside the central safe zone.
  ["public/icons/icon-maskable-512.png", 512, 64],
  ["public/icons/apple-touch-icon.png", 180, 24],
];
for (const [file, size, padding] of targets) {
  const png = await sharp(Buffer.from(svg(size, padding))).resize(size, size).png().toBuffer();
  await writeFile(file, png);
  console.log("wrote", file);
}
