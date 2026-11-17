// Runs every test that needs only Node: node tests/run-all.js [--scripts "<InnerSpace>\Scripts"]
// The browser self test is separate (it needs Edge or Chrome): node tests/browser-selftest.js
'use strict';
const path = require('path');
const cp = require('child_process');
const extra = process.argv.slice(2);
const TESTS = ['test-strip.js', 'test-engine.js', 'test-bridge.js', 'test-repo.js', 'test-corpus.js'];
let bad = 0;
for (const t of TESTS) {
  const r = cp.spawnSync(process.execPath, [path.join(__dirname, t)].concat(t === 'test-corpus.js' ? extra : []), { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const last = out.trim().split(/\r?\n/).pop();
  console.log((r.status === 0 ? 'ok    ' : 'FAIL  ') + t + ': ' + last);
  if (r.status !== 0) { bad++; console.log(out.split(/\r?\n/).filter((l) => /FAIL/.test(l)).slice(0, 20).join('\n')); }
}
console.log(bad ? bad + ' test file(s) failed' : 'all test files passed');
process.exitCode = bad ? 1 : 0;
