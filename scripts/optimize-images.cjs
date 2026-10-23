const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

const tasks = [
  { input: 'hero-laptop.png', outputWebp: 'hero-laptop.webp', quality: 85 },
  { input: 'myzkoolp.png', outputWebp: 'myzkoolp.webp', quality: 85 },
  { input: 'Ahiri Naskar.png', outputWebp: 'Ahiri Naskar.webp', quality: 85 },
  { input: 'Aqsa Ibrahim.jpg', outputWebp: 'Aqsa Ibrahim.webp', quality: 85 },
  { input: 'Khaqan Ahmad.jpg', outputWebp: 'Khaqan Ahmad.webp', quality: 85 },
];

async function run() {
  for (const t of tasks) {
    const srcPath = path.join(publicDir, t.input);
    if (!fs.existsSync(srcPath)) {
      console.warn(`File not found: ${srcPath}`);
      continue;
    }
    const origStat = fs.statSync(srcPath);
    const destPath = path.join(publicDir, t.outputWebp);
    
    await sharp(srcPath)
      .webp({ quality: t.quality, effort: 6 })
      .toFile(destPath);
      
    const newStat = fs.statSync(destPath);
    const savings = ((1 - newStat.size / origStat.size) * 100).toFixed(1);
    console.log(`Optimized ${t.input} (${(origStat.size / 1024).toFixed(0)} KB) -> ${t.outputWebp} (${(newStat.size / 1024).toFixed(0)} KB) [${savings}% smaller]`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
