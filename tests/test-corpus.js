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
const { ENGINE } = require('./lib.js');
const IC = load(ENGINE.concat(['openic-app.js', 'openic-icons.js', '../data/spell-icons.js', '../data/item-icons.js']));
/* with the icons on, as the page draws them: a class picked and a group, so every icon rule runs */
IC.app.startIcons();
IC.app.iconPref.myClass = 'wizard';
IC.app.iconPref.group = ['guardian', 'fury', 'troubador'];
IC.app.applyIcons();
function pass(dir, kind) {
  const files = walkJson(dir, []);
  let errors = 0, threw = 0, warns = 0, boxes = 0, art = 0, who = 0, items = 0;
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
      for (const p of L.nodes) {
        const n = p.n;
        if (n.fixed || n.card) continue;
        boxes++;
        if (n.gi && n.gi.item) items++; else if (n.gi && n.abil && n.gi !== n.giKind) art++;
        if (n.need && n.need.some((x) => x.cls)) who++;
        ok(!n.gi || n.gi.cls || (+n.gi.id > 0 && +n.gi.id < (n.gi.item ? 145 : 1224)), path.basename(f) + ': a box icon in a sheet');
      }
      ok(L.nodes.every((n) => isFinite(n.x) && isFinite(n.y)), path.basename(f) + ' lays out');
    } catch (e) { threw++; ok(false, path.basename(f) + ' threw ' + e.message); }
  }
  console.log('  ' + kind + ': ' + files.length + ' files, ' + errors + ' errors, ' + warns + ' warnings, ' + threw + ' threw; ' + boxes + ' boxes: ' + art +
    ' with ability art, ' + who + ' with a class icon, ' + items + ' with an item picture');
}
test('Ogre\'s shipped zone files', () => pass(path.join(scripts, 'Ogre', 'EQ2', 'IC', 'default'), 'zone'));
test('Ogre\'s shipped fight files', () => pass(path.join(scripts, 'Ogre', 'EQ2', 'Encounters', 'default'), 'fight'));
done('test-corpus');
