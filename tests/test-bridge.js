// The page and host/OpenIC.iss agree: every action the page fires is an event the script registers and attaches,
// every field the script reads is in the page, every channel the script answers on is one the page listens to; and
// the in-game window is self-contained.
//   node tests/test-bridge.js
'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, ok, test, done } = require('./lib.js');

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const iss = read('host/OpenIC.iss'), app = read('creator/js/openic-app.js'), host = read('creator/js/openic-host.js'), html = read('creator/index.html');
const uniq = (a) => Array.from(new Set(a)).sort();

test('every action the page fires is registered and attached in the script, and nothing else', () => {
  const fired = uniq([].concat((app.match(/H\(\)\.call\('([A-Za-z]+)'/g) || []).map((s) => s.slice(10, -1)),
    (app.match(/A\.game\('([A-Za-z]+)'/g) || []).map((s) => s.slice(8, -1)), (host.match(/H\.call\('([A-Za-z]+)'/g) || []).map((s) => s.slice(8, -1))));
  const reg = uniq((iss.match(/RegisterEvent\[OpenIC_([A-Za-z]+)\]/g) || []).map((s) => s.replace(/^RegisterEvent\[OpenIC_/, '').slice(0, -1)));
  const att = uniq((iss.match(/Event\[OpenIC_([A-Za-z]+)\]:AttachAtom\[OpenIC_On\1\]/g) || []).map((s) => /Event\[OpenIC_([A-Za-z]+)\]/.exec(s)[1]));
  ok(JSON.stringify(fired) === JSON.stringify(reg), 'page fires ' + fired.join(',') + ' / script registers ' + reg.join(','));
  ok(JSON.stringify(reg) === JSON.stringify(att), 'registered ' + reg.join(',') + ' / attached ' + att.join(','));
  for (const a of reg) ok(new RegExp('atom\\(script\\) OpenIC_On' + a + '\\(').test(iss), 'atom OpenIC_On' + a);
  ok((iss.match(/:DetachAtom\[/g) || []).length === (iss.match(/:AttachAtom\[/g) || []).length, 'every atom is detached at exit');
});
test('every field the script reads is in the page', () => {
  const args = uniq((iss.match(/OpenIC\.Arg\[([a-z]+)\]/g) || []).map((s) => s.slice(11, -1)));
  ok(args.length >= 7, 'fields: ' + args.join(','));
  for (const a of args) ok(html.indexOf('id="openic-arg-' + a + '"') >= 0, 'openic-arg-' + a);
});
test('every channel the script answers on is one the page listens to', () => {
  const chans = uniq((iss.match(/Say\[([a-z]+),/g) || []).map((s) => s.slice(4, -1)));
  const listen = /H\.CHANNELS = \[([^\]]+)\]/.exec(host)[1].split(',').map((s) => s.trim().replace(/'/g, ''));
  for (const c of chans) {
    ok(listen.indexOf(c) >= 0, 'the page listens on ' + c);
    ok(html.indexOf('id="openic-msg-' + c + '"') >= 0, 'openic-msg-' + c + ' is in the page');
  }
});
test('the script uses the window name the page uses, and opens the built window', () => {
  ok(/variable string OpenIC_Win="openic"/.test(iss) && /H\.WIN = 'openic'/.test(host), 'window name openic');
  ok(/ISXOgreX\.UI:Open\[\$\{OpenIC_Win\},"\$\{OpenIC_Dir\}\/OpenIC\.html","\$\{OpenIC_Dir\}\/OpenIC\.md"\]/.test(iss), 'opens host/OpenIC.html with its help');
  ok(fs.existsSync(path.join(ROOT, 'host', 'OpenIC.html')) && fs.existsSync(path.join(ROOT, 'host', 'OpenIC.md')), 'both files are there');
});
test('the script never writes under Scripts/Ogre and refuses paths that climb out', () => {
  ok(/Full\.Find\[\/Scripts\/Ogre\/\]\(exists\)/.test(iss), 'the Scripts/Ogre guard');
  ok(/Rel\.Find\[\.\.\]\(exists\)/.test(iss), 'the .. guard');
  const saveAt = iss.indexOf('atom(script) OpenIC_OnSave()'), writeAt = iss.indexOf(':WriteFile[', saveAt), guardAt = iss.indexOf('/Scripts/Ogre/', saveAt);
  ok(guardAt > saveAt && guardAt < writeAt, 'the guard comes before the write');
});
test('every line of the script that is not documented says so', () => {
  const unverified = ['ogre ic run', 'jb ic rundirect', 'jb ic queue', 'u1nav path', 'U1Nav.PointCount', ':WriteFile['];
  const lines = iss.split(/\r?\n/);
  for (const u of unverified) {
    const at = lines.findIndex((l) => !/^\s*;/.test(l) && l.indexOf(u) >= 0);
    ok(at >= 0, u + ' is used in the script');
    const notes = lines.slice(Math.max(0, at - 14), at).filter((l) => /^\s*;/.test(l)).join('\n');
    ok(/UNVERIFIED/.test(notes) && notes.indexOf(u.replace(/[:[]/g, '').split(' ')[0]) >= 0, u + ' is marked UNVERIFIED in the note above it');
  }
});
test('the in-game window loads nothing from outside and adds one name to the shared page', () => {
  const win = read('host/OpenIC.html');
  ok(!/<script[^>]+src=/i.test(win) && !/<link[^>]+href=/i.test(win) && !/<img[^>]+src=/i.test(win), 'no script, stylesheet or image files');
  ok(/^<!--[^]*?-->\s*<script type="ogre\/window">\{"title":"Open IC Creator"/.test(win), 'starts with its window options');
  ok(!/<html|<head|<body/i.test(win), 'no html, head or body (an Ogre window is one fragment)');
  const globals = uniq((win.match(/window\.([A-Za-z_$][\w$]*)\s*=/g) || []).map((s) => s.replace(/\s*=$/, '')));
  ok(JSON.stringify(globals) === JSON.stringify(['window.OpenIC_LIB']), 'globals: ' + globals.join(', '));
  ok(/class="oic-ingame"/.test(win), 'the in-game layout');
});
done('test-bridge');
