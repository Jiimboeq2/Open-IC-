// The repository itself: built files are up to date, text is plain ASCII, nothing names a private path, the map
// planner is not in it, and the page names only files that exist.
//   node tests/test-repo.js
'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, ok, test, done } = require('./lib.js');

const TEXT = /\.(js|html|css|md|json|iss|txt|gitignore|gitattributes)$/i;
function files(dir, out) {
  for (const f of fs.readdirSync(dir)) {
    if (f === '.git' || f === '.work' || f === 'node_modules') continue;
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) files(p, out); else out.push(p);
  }
  return out;
}
const all = files(ROOT, []);
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('the built files are up to date with their sources', () => {
  const w = require('../tools/build-window.js'), v = require('../tools/build-vocab.js'), ic = require('../tools/build-icon-data.js');
  /* a checkout may turn line ends into CR LF: compare the text, not the line ends */
  const lf = (s) => String(s).replace(/\r\n/g, '\n');
  ok(lf(fs.readFileSync(w.OUT, 'utf8')) === lf(w.build().text), 'host/OpenIC.html: run node tools/build-window.js');
  const built = w.buildAssets(), onDisk = fs.readdirSync(w.HOST).filter((f) => /^OpenIC-assets(-\d+)?\.js$/.test(f)).sort();
  ok(JSON.stringify(onDisk) === JSON.stringify(built.map((t, i) => w.assetName(i + 1)).sort()), 'host has exactly the asset parts: ' + onDisk.join(', '));
  built.forEach((t, i) => {
    const f = path.join(w.HOST, w.assetName(i + 1));
    ok(fs.existsSync(f) && lf(fs.readFileSync(f, 'utf8')) === lf(t), 'host/' + w.assetName(i + 1) + ': run node tools/build-window.js');
    ok(Buffer.byteLength(t) <= w.PART_MAX, w.assetName(i + 1) + ' is ' + Buffer.byteLength(t) + ' bytes, at most ' + w.PART_MAX);
  });
  ok(lf(fs.readFileSync(v.OUT, 'utf8')) === lf(v.build()), 'creator/js/openic-vocab.js: run node tools/build-vocab.js');
  ok(lf(read('creator/css/openic-icons.css')) === lf(ic.css(false)), 'creator/css/openic-icons.css: run node tools/build-icon-data.js');
});
test('text files are plain ASCII', () => {
  for (const p of all) if (TEXT.test(p) || /LICENSE$/.test(p)) {
    const t = fs.readFileSync(p, 'utf8'), m = /[^\t\n\r -~]/.exec(t);
    ok(!m, rel(p) + (m ? ' has character ' + m[0].charCodeAt(0) + ' at ' + m.index : ''));
  }
});
test('the game art is named as EverQuest II\'s own', () => {
  ok(/Daybreak Game Company/.test(read('README.md')), 'README');
  const parts = fs.readdirSync(path.join(ROOT, 'host')).filter((f) => /^OpenIC-assets-\d+\.js$/.test(f)).map((f) => 'host/' + f);
  ok(parts.length >= 2, 'the asset parts: ' + parts.join(', '));
  for (const p of ['creator/css/openic-icons.css', 'creator/data/spell-icons.js', 'creator/data/item-icons.js'].concat(parts)) ok(/Daybreak Game Company/.test(read(p)), p);
});
test('no private paths, no notes left to do', () => {
  for (const p of all) if (TEXT.test(p) && !/test-repo\.js$/.test(p)) {
    const t = fs.readFileSync(p, 'utf8');
    ok(!/[A-Za-z]:\\Users\\|\/Users\/[A-Za-z]|AppData\\|\\Desktop\\/.test(t), rel(p) + ' names a private path');
    ok(!/\b(TODO|FIXME|XXX)\b/.test(t), rel(p) + ' holds a TODO');
  }
});
test('the map planner and auto solver are not in the Creator', () => {
  const js = fs.readdirSync(path.join(ROOT, 'creator', 'js'));
  for (const f of ['ic-plan.js', 'ic-plan-map.js', 'ic-plan-read.js', 'ic-nmap-plot.js']) ok(js.indexOf(f) < 0, f + ' is not here');
  for (const f of js) {
    const t = read('creator/js/' + f);
    ok(!/jbplan|IC\.icread|IC\.nplot|sweepplan/.test(t), f + ' reaches for the planner');
    for (const line of t.split('\n')) if (/IC\.plan\b/.test(line)) ok(line.indexOf('IC.plan && IC.plan.') === line.search(/IC\.plan\b/), f + ': an IC.plan use that is not guarded: ' + line.trim().slice(0, 80));
  }
});
test('the page names only files that exist, in the order the window build uses', () => {
  const html = read('creator/index.html'), srcs = (html.match(/src="([^"]+)"/g) || []).map((s) => s.slice(5, -1));
  ok(srcs.length >= 20, srcs.length + ' scripts');
  for (const s of srcs) ok(fs.existsSync(path.join(ROOT, 'creator', s)), s);
  ok(/href="css\/openic\.css"/.test(html) && fs.existsSync(path.join(ROOT, 'creator', 'css', 'openic.css')), 'the stylesheet');
  const lib = require('./lib.js').ENGINE;
  ok(JSON.stringify(srcs.map((s) => path.basename(s)).filter((s) => lib.indexOf(s) >= 0)) === JSON.stringify(lib), 'tests/lib.js loads the page\'s engine in the page\'s order');
});
test('the vocabulary file is valid and the examples parse', () => {
  const v = JSON.parse(read('data/vocabulary.json'));
  ok(v.zoneFile && v.fightFile && v.conditions && v.tokens, 'its parts');
  for (const f of fs.readdirSync(path.join(ROOT, 'examples'))) if (/\.json$/.test(f)) { let o = null; try { o = JSON.parse(read('examples/' + f)); } catch (e) { o = null; } ok(!!o, f); }
});
test('the license and the change log are there', () => {
  ok(/MIT License/.test(read('LICENSE')) && /Copyright \(c\) 2026 Jiimboeq2/.test(read('LICENSE')), 'MIT, Jiimboeq2');
  ok(/0\.1\.0/.test(read('CHANGELOG.md')), 'CHANGELOG 0.1.0');
  ok(/^## 0\.2\.0 /m.test(read('CHANGELOG.md')), 'CHANGELOG 0.2.0');
});
done('test-repo');
