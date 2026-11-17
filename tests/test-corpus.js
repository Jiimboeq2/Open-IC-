// Optional: every zone file and fight file Ogre ships, read, drawn, put in words and checked. The checks must find no
// error in Ogre's own files (they load in game), and nothing may throw.
//   node tests/test-corpus.js --scripts "<InnerSpace>\Scripts"
'use strict';
const path = require('path');
const fs = require('fs');
const { load, ok, test, done, walkJson, readJson } = require('./lib.js');

const args = process.argv.slice(2);
const at = args.indexOf('--scripts');
const scripts = at >= 0 ? args[at + 1] : (process.env.OPENIC_SCRIPTS || '');
if (!scripts || !fs.existsSync(path.join(scripts, 'Ogre', 'EQ2'))) {
  console.log('No --scripts <InnerSpace Scripts folder> with Ogre in it: the shipped-file pass is skipped.');
  process.exit(0);
}
const IC = load();
function pass(dir, kind) {
  const files = walkJson(dir, []);
  let errors = 0, threw = 0, warns = 0;
  for (const f of files) {
    let d;
    try { d = readJson(f); } catch (e) { continue; }
    try {
      ok(IC.oic.kindOf(d) === kind, path.basename(f) + ' reads as a ' + kind + ' file');
      const probs = IC.oic.check(d, kind);
      const e = probs.filter((p) => p.level === 'error');
      errors += e.length; warns += probs.filter((p) => p.level === 'warn').length;
      ok(!e.length, path.basename(f) + ': ' + e.map((p) => p.msg).join(' | '));
      const g = kind === 'zone' ? IC.oic.graph(d, { split: true }) : IC.ogf.graph(d, {});
      ok(IC.oic.lines(g).length > 1, path.basename(f) + ' has words');
      const L = IC.fv.layout(g, 1400);
      ok(L.nodes.every((n) => isFinite(n.x) && isFinite(n.y)), path.basename(f) + ' lays out');
    } catch (e) { threw++; ok(false, path.basename(f) + ' threw ' + e.message); }
  }
  console.log('  ' + kind + ': ' + files.length + ' files, ' + errors + ' errors, ' + warns + ' warnings, ' + threw + ' threw');
}
test('Ogre\'s shipped zone files', () => pass(path.join(scripts, 'Ogre', 'EQ2', 'IC', 'default'), 'zone'));
test('Ogre\'s shipped fight files', () => pass(path.join(scripts, 'Ogre', 'EQ2', 'Encounters', 'default'), 'fight'));
done('test-corpus');
