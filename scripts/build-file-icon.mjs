// Builds the .chattotheme file icon (apps/desktop/build/chattotheme.ico) from its SVG sources in
// assets/: chattotheme-icon.svg for 48–256 px, and versions drawn on the pixel grid for 32, 24
// and 16 px. Run it after changing those files: `node scripts/build-file-icon.mjs`.
// Each size is rendered with the bundled Chromium (Playwright) and stored as PNG in the .ico.
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const svg = (name) => readFileSync(join(root, 'assets', name), 'utf8');
const SIZES = [
  [16, 'chattotheme-icon-16.svg'],
  [24, 'chattotheme-icon-24.svg'],
  [32, 'chattotheme-icon-32.svg'],
  [48, 'chattotheme-icon.svg'],
  [64, 'chattotheme-icon.svg'],
  [128, 'chattotheme-icon.svg'],
  [256, 'chattotheme-icon.svg'],
];

/** An .ico holding PNG images (Windows Vista and later read PNG entries at any size). */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png }, index) => {
    const entry = 6 + 16 * index;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map(({ png }) => png)]);
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const images = [];
for (const [size, file] of SIZES) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg(file)}`,
  );
  images.push({ size, png: await page.screenshot({ omitBackground: true }) });
}
await browser.close();

const out = join(root, 'apps', 'desktop', 'build', 'chattotheme.ico');
writeFileSync(out, ico(images));
console.log(`Wrote ${out} (${SIZES.map(([size]) => size).join(', ')} px)`);
