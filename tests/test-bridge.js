// The page and host/OpenIC.iss agree: every action the page fires is an event the script registers and attaches,
// every field the script reads is in the page, every channel the script answers on is one the page listens to; the
// calls are the documented ones (cited) or marked UNVERIFIED; and the in-game window is self-contained.
//   node tests/test-bridge.js
'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, ok, test, done } = require('./lib.js');

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const iss = read('host/OpenIC.iss'), host = read('creator/js/openic-host.js'), html = read('creator/index.html');
const page = read('creator/js/openic-app.js') + read('creator/js/openic-game.js') + host;
const uniq = (a) => Array.from(new Set(a)).sort();
const lines = iss.split(/\r?\n/);
/* the comment lines just above the first line that uses this call (not a comment itself) */
function notesFor(call) {
  const at = lines.findIndex((l) => !/^\s*;/.test(l) && l.indexOf(call) >= 0);
  return { at, notes: at < 0 ? '' : lines.slice(Math.max(0, at - 14), at).filter((l) => /^\s*;/.test(l)).join('\n') };
}

test('every action the page fires is registered and attached in the script, and nothing else', () => {
  const fired = uniq((page.match(/(?:H\(\)\.call|A\.game|H\.call)\('([A-Za-z]+)'/g) || []).map((s) => /'([A-Za-z]+)'/.exec(s)[1]));
  const reg = uniq((iss.match(/RegisterEvent\[OpenIC_([A-Za-z]+)\]/g) || []).map((s) => s.replace(/^RegisterEvent\[OpenIC_/, '').slice(0, -1)));
  const att = uniq((iss.match(/Event\[OpenIC_([A-Za-z]+)\]:AttachAtom\[OpenIC_On\1\]/g) || []).map((s) => /Event\[OpenIC_([A-Za-z]+)\]/.exec(s)[1]));
  ok(JSON.stringify(fired) === JSON.stringify(reg), 'page fires ' + fired.join(',') + ' / script registers ' + reg.join(','));
  ok(JSON.stringify(reg) === JSON.stringify(att), 'registered ' + reg.join(',') + ' / attached ' + att.join(','));
  for (const a of reg) ok(new RegExp('atom\\(script\\) OpenIC_On' + a + '\\(').test(iss), 'atom OpenIC_On' + a);
  ok((iss.match(/:DetachAtom\[/g) || []).length === (iss.match(/:AttachAtom\[/g) || []).length, 'every atom is detached at exit');
});
test('every field the script reads is in the page', () => {
  const args = uniq((iss.match(/OpenIC\.Arg\[([a-z0-9]+)\]/g) || []).map((s) => s.slice(11, -1)));
  ok(args.length >= 8, 'fields: ' + args.join(','));
  for (const a of args) ok(html.indexOf('id="openic-arg-' + a + '"') >= 0, 'openic-arg-' + a);
});
test('every channel the script answers on is one the page listens to', () => {
  const chans = uniq((iss.match(/Say\[([a-z]+),/g) || []).map((s) => s.slice(4, -1)));
  const listen = /H\.CHANNELS = \[([^\]]+)\]/.exec(host)[1].split(',').map((s) => s.trim().replace(/'/g, ''));
  ok(chans.indexOf('check') >= 0, 'Ogre\'s check answers on its own channel');
  for (const c of chans) {
    ok(listen.indexOf(c) >= 0, 'the page listens on ' + c);
    ok(html.indexOf('id="openic-msg-' + c + '"') >= 0, 'openic-msg-' + c + ' is in the page');
  }
});
test('the script uses the window name the page uses, opens the built window and loads its asset pack', () => {
  ok(/variable string OpenIC_Win="openic"/.test(iss) && /H\.WIN = 'openic'/.test(host), 'window name openic');
  ok(/ISXOgreX\.UI:Open\[\$\{OpenIC_Win\},"\$\{OpenIC_Dir\}\/OpenIC\.html","\$\{OpenIC_Dir\}\/OpenIC\.md"\]/.test(iss), 'opens host/OpenIC.html with its help');
  ok(/ISXOgreX\.UI:EvalFile\["\$\{OpenIC_Dir\}\/OpenIC-assets\.js"\]/.test(iss), 'loads host/OpenIC-assets.js once the window is open');
  for (const f of ['OpenIC.html', 'OpenIC.md', 'OpenIC-assets.js']) ok(fs.existsSync(path.join(ROOT, 'host', f)), f + ' is there');
});
test('the script never writes under Scripts/Ogre and refuses paths that climb out', () => {
  ok(/Full\.Find\[\/Scripts\/Ogre\/\]\(exists\)/.test(iss), 'the Scripts/Ogre guard');
  ok(/Rel\.Find\[\.\.\]\(exists\)/.test(iss), 'the .. guard');
  const saveAt = iss.indexOf('atom(script) OpenIC_OnSave()'), writeAt = iss.indexOf(':WriteFile[', saveAt), guardAt = iss.indexOf('/Scripts/Ogre/', saveAt);
  ok(guardAt > saveAt && guardAt < writeAt, 'the guard comes before the write');
});
test('the calls Ogre\'s developer API reference documents say where (API: ...)', () => {
  const documented = ['ISXOgreEQ2.IC:Reload', 'ISXOgreEQ2.Encounter:Reload', 'ISXOgreEQ2.IC:Validate', 'ISXOgreEQ2.Encounter:Validate', 'ISXOgreEQ2.IC:Queue[',
    'ISXOgreEQ2.IC:Run[', 'OgreBotAPI.Bot:SetUpFor[', 'OgreBotAPI.Util.FileExists', 'ISXOgreX.UI:Open[', 'ISXOgreX.UI:EvalFile[', 'ISXOgreX.UI:Set[',
    'ISXOgreX.UI.Value[', 'ISXOgreX.UI.Window[', 'ISXOgreX.UI:Close['];
  for (const c of documented) {
    const n = notesFor(c);
    ok(n.at >= 0, c + ' is used');
    ok(/API: /.test(n.notes), c + ' cites the API reference');
  }
  ok(!/\bogre ic run\b/.test(iss.split('\n').filter((l) => !/^\s*;/.test(l)).join('\n')), 'the run is the documented ISXOgreEQ2.IC:Run, not a console word');
  ok(!/-SetUpFor/.test(iss.split('\n').filter((l) => !/^\s*;/.test(l)).join('\n')), 'the setup is the documented OgreBotAPI.Bot:SetUpFor');
});
test('every call the reference does not cover is marked UNVERIFIED', () => {
  for (const u of [':WriteFile[', 'jb ic rundirect', 'jb ic queue', 'u1nav path', 'U1Nav.PointCount', 'ISXOgreX.UI:EvalFile[', 'IC:Validate[${']) {
    const n = notesFor(u);
    ok(n.at >= 0, u + ' is used in the script');
    ok(/UNVERIFIED/.test(n.notes), u + ' is marked UNVERIFIED in the note above it');
  }
});
test('the in-game window loads nothing from outside and adds one name to the shared page', () => {
  const win = read('host/OpenIC.html');
  const markup = win.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');
  ok(!/<script[^>]+src=/i.test(win) && !/<link[^>]+href=/i.test(win), 'no script or stylesheet files');
  ok(!/<img[^>]+src=/i.test(markup) && !/url\(/i.test(win.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/url\(data:/g, '')), 'no image files');
  ok(/^<!--[^]*?-->\s*<script type="ogre\/window">\{"title":"Open IC Creator"/.test(win), 'starts with its window options');
  ok(!/<html|<head|<body/i.test(markup), 'no html, head or body (an Ogre window is one fragment)');
  const globals = uniq((win.match(/window\.([A-Za-z_$][\w$]*)\s*=/g) || []).map((s) => s.replace(/\s*=$/, '')));
  ok(JSON.stringify(globals) === JSON.stringify(['window.OpenIC_LIB']), 'globals: ' + globals.join(', '));
  ok(/class="oic-ingame"/.test(win), 'the in-game layout');
  ok(/classData = \{"Assassin":"data:image\/webp;base64,/.test(win), 'the class icons are inline');
  ok(!/D\.spellText = "/.test(win) && !/data:image\/png;base64,/.test(win), 'the sheets and the ability list are in the asset pack, not the window');
  const pack = read('host/OpenIC-assets.js');
  ok(/data:image\/png;base64,/.test(pack) && /D\.spellText = /.test(pack) && /D\.items = /.test(pack) && /iconsLoaded\(\)/.test(pack), 'the asset pack holds the sheets and the lists');
  ok(!/window\.[A-Za-z_$][\w$]*\s*=/.test(pack), 'the asset pack adds nothing to the shared page');
});
done('test-bridge');
