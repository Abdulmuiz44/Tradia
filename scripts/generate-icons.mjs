import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const svgPath = path.join(root, 'public', 'tradia-mark.svg');
const outApple = path.join(root, 'public', 'apple-touch-icon.png');
const outIcon = path.join(root, 'src', 'app', 'icon.png');

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function run() {
  const svg = await fs.readFile(svgPath);
  await ensureDir(outApple);
  await ensureDir(outIcon);

  // Apple Touch Icon 180x180
  await sharp(svg)
    .resize(180, 180, { fit: 'cover' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outApple);

  // App Router icon (512x512 recommended)
  await sharp(svg)
    .resize(512, 512, { fit: 'cover' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outIcon);

  console.log('Generated:', outApple, outIcon);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
