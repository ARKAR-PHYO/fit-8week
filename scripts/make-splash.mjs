// Generates iOS launch-screen images (apple-touch-startup-image) for portrait iPhones.
// Run: node scripts/make-splash.mjs   → public/splash/*.png and src/content/splash.json
// The in-app splash (src/components/Splash.tsx) uses the same layout, so the hand-off is seamless.
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

// CSS width × height (portrait) and device pixel ratio.
const DEVICES = [
  [440, 956, 3], // iPhone 16 Pro Max / 17 Pro Max
  [430, 932, 3], // 14 Pro Max, 15 Plus / Pro Max, 16 Plus
  [428, 926, 3], // 12 / 13 Pro Max, 14 Plus
  [414, 896, 3], // XS Max, 11 Pro Max
  [414, 896, 2], // XR, 11
  [402, 874, 3], // 16 Pro / 17 Pro / 17
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16
  [390, 844, 3], // 12, 13, 14, 12 Pro, 13 Pro, 16e
  [375, 812, 3], // X, XS, 11 Pro, 12 mini, 13 mini
  [375, 667, 2], // SE 2nd/3rd gen, 8
];

export const BRAND_GREEN = "#047857";

function svg(w, h) {
  // Logo sized relative to the CSS width so it looks the same on every device.
  const logo = Math.round(w * 0.36);
  const cx = w / 2;
  const cy = h / 2 - logo * 0.15;
  const r = logo * 0.33;
  const stroke = logo * 0.055;
  const circumference = 2 * Math.PI * r;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${BRAND_GREEN}"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#d1fae5" stroke-opacity="0.35" stroke-width="${stroke}"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#d1fae5" stroke-width="${stroke}"
    stroke-dasharray="${circumference * 0.83} ${circumference}" stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"/>
  <text x="${cx}" y="${cy + logo * 0.11}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700"
    font-size="${logo * 0.3}" fill="#ffffff">8W</text>
  <text x="${cx}" y="${cy + r + logo * 0.42}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="600"
    font-size="${w * 0.065}" fill="#ffffff">8-Week Plan</text>
</svg>`;
}

await mkdir("public/splash", { recursive: true });
const entries = [];
for (const [w, h, dpr] of DEVICES) {
  const file = `public/splash/splash-${w * dpr}x${h * dpr}.png`;
  // Render at CSS size as vector, then rasterize at device pixels for sharp text.
  const png = await sharp(Buffer.from(svg(w, h)), { density: 72 * dpr })
    .resize(w * dpr, h * dpr)
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(file, png);
  entries.push({
    url: file.replace("public", ""),
    media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
  });
  console.log("wrote", file, `${Math.round(png.length / 1024)} KB`);
}
await writeFile("src/content/splash.json", JSON.stringify(entries, null, 2) + "\n");
console.log("wrote src/content/splash.json");
