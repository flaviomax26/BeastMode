#!/usr/bin/env node
// Roda todas as suítes (tests/test_*.js) em sequência; sai 1 se qualquer uma falhar.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => /^test_.*\.js$/.test(f)).sort();
let failed = 0;

for (const f of files) {
  console.log('\n=== ' + f + ' ===');
  const r = spawnSync(process.execPath, [path.join(dir, f)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}

console.log('\n' + (failed ? '✗ ' + failed + ' suíte(s) falharam' : '✓ todas as suítes passaram'));
process.exit(failed ? 1 : 0);
