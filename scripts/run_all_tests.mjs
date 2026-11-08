import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const testDir = path.resolve('tests');
const testFiles = fs.readdirSync(testDir)
  .filter(f => f.endsWith('.ts'))
  .sort()
  .map(f => path.join('tests', f));

console.log(`Found ${testFiles.length} test files.\n`);

let passedFiles = 0;
let failedFiles = 0;

for (const f of testFiles) {
  try {
    const stdout = execSync(`npx tsx "${f}"`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    const lines = stdout.trim().split('\n').map(l => l.trim()).filter(Boolean);
    const summary = lines[lines.length - 1] || 'NO OUTPUT';
    passedFiles++;
    console.log(`[PASS] ${f}: ${summary}`);
  } catch (err) {
    failedFiles++;
    console.error(`[FAIL] ${f}: exit code ${err.status}`);
    const out = (err.stdout || '').trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (out.length) {
      console.error(`       Last output: ${out[out.length - 1]}`);
    }
    if (err.stderr) {
      console.error(`       STDERR: ${err.stderr.slice(0, 200)}`);
    }
  }
}

console.log(`\nSummary: ${passedFiles} passed, ${failedFiles} failed out of ${testFiles.length} files.`);

if (failedFiles > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

