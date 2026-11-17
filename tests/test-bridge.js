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
const page = read('creator/js/openic-app.js') + read('creator/js/openic-game.js') + read('creator/js/openic-browse.js') + read('creator/js/openic-edit.js') +
  read('creator/js/openic-map.js') + read('creator/js/openic-test.js') + host;
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
  ok(args.length >= 7, 'fields: ' + args.join(','));
  for (const a of args) ok(html.indexOf('id="openic-arg-' + a + '"') >= 0, 'openic-arg-' + a);
  for (const id of ['openic-arg-text', 'openic-assets-got']) {
    ok(iss.indexOf(id) >= 0, 'the script reads ' + id);
    ok(html.indexOf('id="' + id + '"') >= 0, id + ' is in the page');
  }
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
test('the script uses the window name the page uses, opens the built window and loads its asset parts', () => {
  ok(/variable string OpenIC_Win="openic"/.test(iss) && /H\.WIN = 'openic'/.test(host), 'window name openic');
  ok(/ISXOgreX\.UI:Open\[\$\{OpenIC_Win\},"\$\{OpenIC_Dir\}\/OpenIC\.html","\$\{OpenIC_Dir\}\/OpenIC\.md"\]/.test(iss), 'opens host/OpenIC.html with its help');
  ok(/ISXOgreX\.UI:EvalFile\["\$\{OpenIC_Dir\}\/OpenIC-assets-\$\{OpenIC_AssetSent\}\.js"\]/.test(iss), 'loads host/OpenIC-assets-<k>.js, one part at a time');
  ok(/OpenIC_AssetSent:Set\[1\]\s+OpenIC_SendAssetPart/.test(iss), 'part 1 goes once the window is open');
  ok(/openic-assets-got\]/.test(iss) && /OpenIC_AssetSent:Inc\s+OpenIC_SendAssetPart/.test(iss), 'the next part goes when the window reports the last one in');
  for (const f of ['OpenIC.html', 'OpenIC.md', 'OpenIC-assets-1.js', 'OpenIC-assets-2.js']) ok(fs.existsSync(path.join(ROOT, 'host', f)), f + ' is there');
  ok(!fs.existsSync(path.join(ROOT, 'host', 'OpenIC-assets.js')), 'no single asset pack (Ogre\'s UI dropped it whole at 4.8 MB)');
});
test('a big text crosses in pieces: no LavishScript command carries a whole file', () => {
  const code = lines.filter((l) => !/^\s*;/.test(l)).join('\n');
  const after = (re) => (code.match(re) || []).map((m) => m.replace(/^[\s\S]*\]/, '').slice(0, 5));
  ok(!/OpenIC\.Arg\[(text|b64)\]/.test(code), 'the file\'s text is never read whole through Arg');
  for (const u of after(/openic-arg-text\]\.[A-Za-z]+/g)) ok(/^\.(Leng|Mid)/.test(u), 'openic-arg-text is read as .Length or .Mid: ' + u);
  for (const m of code.match(/\.AsJSON\.[A-Za-z]+/g) || []) ok(/\.AsJSON\.(Length|Mid)/.test(m), 'AsJSON is read as .Length or .Mid: ' + m);
  for (const m of code.match(/\.Validation\.[A-Za-z]+/g) || []) ok(/\.Validation\.(Length|Mid)/.test(m), 'Validation is read as .Length or .Mid: ' + m);
  for (const m of code.match(/Say\[(file|check|list),"[^"]*/g) || []) ok(/Say\[(file|check|list),"\$\{K\}\/\$\{N\}\|/.test(m), 'a pieced message: ' + m.slice(0, 40));
  ok(/variable int OpenIC_Piece=(\d+)/.test(iss) && +/variable int OpenIC_Piece=(\d+)/.exec(iss)[1] <= 8000, 'a piece is at most 8,000 characters');
  ok(!/Validate\[\$\{OpenIC\.Arg/.test(code), 'Ogre\'s check never gets the file as one base64 argument');
  ok(/PIECED = \{ file: true, check: true, list: true \}/.test(host), 'the page joins the file, the check and a folder\'s listing from pieces');
});
test('no slash and star together in the script: LavishScript reads that as a comment, even inside quotes', () => {
  ok(iss.indexOf('/' + '*') < 0, 'host/OpenIC.iss has no slash-star');
  ok(/GetDirectories\["\$\{Folder\}\/\\\*"\]/.test(iss) && /GetFiles\["\$\{Folder\}\/\\\*\.json"\]/.test(iss), 'a folder\'s contents are written <folder>/\\*');
});
test('the file browser lists only its own folders and makes folders only in mine', () => {
  const list = iss.slice(iss.indexOf('atom(script) OpenIC_OnList()'), iss.indexOf('atom(script) OpenIC_OnMkDir()'));
  ok(/Rel\.Find\[\.\.\]\(exists\)/.test(list) && /Rel\.Find\[:\]\(exists\)/.test(list), 'a path that climbs out or names a drive is refused');
  ok(/OpenIC\.RootDir\[/.test(list), 'the folder is one of RootDir\'s');
  const mk = iss.slice(iss.indexOf('atom(script) OpenIC_OnMkDir()'), iss.indexOf('function OpenIC_MakeDirs()'));
  ok(/RootId\.Equal\[zone\]/.test(mk) && /RootId\.Equal\[fight\]/.test(mk) && /RootId\.Equal\[jb\]/.test(mk) && !/ozone|ofight/.test(mk), 'New folder only in my folders, never Ogre\'s');
  const browse = read('creator/js/openic-browse.js');
  for (const r of ['zone', 'fight', 'ozone', 'ofight', 'jb']) ok(new RegExp("id: '" + r + "'").test(browse) && new RegExp('Equal\\[' + r + '\\]').test(iss), 'the page and the script both know the folder ' + r);
  ok(/write: false/.test(browse) && /Scripts\/Ogre\//.test(iss), 'Ogre\'s folders are read only in the page, and Save refuses Scripts/Ogre in the script');
});
test('Ogre\'s file check is asked only of an Ogre that has it', () => {
  const at = iss.indexOf('atom(script) OpenIC_OnCheck()'), end = iss.indexOf('\n}', at), body = iss.slice(at, end);
  const guard = body.indexOf('if !${Can}'), call = body.indexOf(':Validate[');
  ok(/OpenIC_HasCheck/.test(body) && /OpenIC_HasFCheck/.test(body), 'the script knows whether Ogre has Validation, for both kinds');
  const rt = iss.slice(iss.indexOf('function OpenIC_ReadTypes()'), iss.indexOf('function main()'));
  ok(/lstype ogreeq2ic/.test(rt) && /lstype ogreeq2encounter/.test(rt) && /Find\[Validation\]/.test(rt), 'it reads the types\' member lists (lstype prints no error)');
  ok(/call OpenIC_ReadTypes/.test(iss.slice(iss.indexOf('function main()'))), 'once, when the script starts');
  /* asking for a member a type lacks prints "No such '<type>' member" on the console, (exists) or not: the owner saw it */
  const code = iss.split('\n').filter((l) => !/^\s*;/.test(l)).join('\n');
  ok(!/ISXOgreEQ2\.(IC|Encounter)\.[A-Za-z]+(\[[^\]]*\])?\(exists\)/.test(code), 'no (exists) on an Ogre member: the flags instead');
  ok(guard > 0 && call > guard, 'the guard comes before the first Validate call');
  ok(/;check=1/.test(iss) && /;fcheck=1/.test(iss), 'the page is told which checks this Ogre has');
  ok(/H\.ext\.check = o\.check === '1'/.test(host), 'the page reads it');
  ok(/A\.ogreCanCheck/.test(page) && /off: !canCheck/.test(page), 'the menu item is off without it');
});
test('the script never writes under Scripts/Ogre and refuses paths that climb out', () => {
  ok(/Full\.Find\[\/Scripts\/Ogre\/\]\(exists\)/.test(iss), 'the Scripts/Ogre guard');
  ok(/Rel\.Find\[\.\.\]\(exists\)/.test(iss), 'the .. guard');
  const saveAt = iss.indexOf('atom(script) OpenIC_OnSave()'), writeAt = iss.indexOf('F:Open[writeover]', saveAt), guardAt = iss.indexOf('/Scripts/Ogre/', saveAt);
  ok(guardAt > saveAt && guardAt < writeAt, 'the guard comes before the write');
});
test('the calls Ogre\'s developer API reference documents say where (API: ...)', () => {
  const documented = ['ISXOgreEQ2.IC:Reload', 'ISXOgreEQ2.Encounter:Reload', 'ISXOgreEQ2.IC:Validate', 'ISXOgreEQ2.Encounter:Validate', 'ISXOgreEQ2.IC:Queue[',
    'ISXOgreEQ2.IC:Run[', 'OgreBotAPI.Bot:SetUpFor[', 'OgreBotAPI.Util.FileExists', 'ISXOgreX.UI:Open[', 'ISXOgreX.UI:EvalFile[', 'ISXOgreX.UI:Set[',
    'ISXOgreX.UI.Value[', 'ISXOgreX.UI.Window[', 'ISXOgreX.UI:Close[', 'ISXOgreEQ2.IC:List[', 'ISXOgreEQ2.IC:Stop'];
  for (const c of documented) {
    const n = notesFor(c);
    ok(n.at >= 0, c + ' is used');
    ok(/API: /.test(n.notes), c + ' cites the API reference');
  }
  ok(!/\bogre ic run\b/.test(iss.split('\n').filter((l) => !/^\s*;/.test(l)).join('\n')), 'the run is the documented ISXOgreEQ2.IC:Run, not a console word');
  ok(!/-SetUpFor/.test(iss.split('\n').filter((l) => !/^\s*;/.test(l)).join('\n')), 'the setup is the documented OgreBotAPI.Bot:SetUpFor');
});
test('every call the reference does not cover is marked UNVERIFIED', () => {
  for (const u of ['jb ic rundirect', 'jb ic queue', 'u1nav path', 'U1Nav.PointCount']) {
    const n = notesFor(u);
    ok(n.at >= 0, u + ' is used in the script');
    ok(/UNVERIFIED/.test(n.notes), u + ' is marked UNVERIFIED in the note above it');
  }
});
test('the calls run in game say what they did (PROVEN ...)', () => {
  for (const u of ['ISXOgreX.UI:Set[', 'ISXOgreX.UI:EvalFile[', 'Doc:ParseFile[', 'F:Open[writeover]', 'Doc:WriteFile[', 'ISXOgreEQ2.IC:List[', 'F:Seek[']) {
    const n = notesFor(u);
    ok(n.at >= 0, u + ' is used in the script');
    ok(/PROVEN \d{4}-\d\d-\d\d/.test(n.notes), u + ' has a PROVEN note above it');
  }
});
test('no variable is named after a top-level object (the script ends: a "Zone" variable ended it in game)', () => {
  const TLO = ['Zone', 'Me', 'Target', 'Actor', 'Group', 'Raid', 'Script', 'Session', 'Event', 'Math', 'Time', 'Display', 'Mouse', 'Keyboard', 'Item', 'Ability',
    'EQ2', 'EQ2UIPage', 'Window', 'InnerSpace', 'LavishScript', 'ISXOgreX', 'ISXOgreEQ2', 'OgreBotAPI', 'ISXJQB', 'ADD', 'U1Nav', 'String', 'Int', 'Float', 'Bool', 'Type'];
  const vars = (iss.match(/variable [a-z0-9]+ [A-Za-z_][A-Za-z0-9_]*/g) || []).map((s) => s.split(' ')[2]);
  ok(vars.length > 20, 'variables found: ' + vars.length);
  for (const v of vars) ok(TLO.indexOf(v) < 0, 'variable ' + v + ' is not a top-level object\'s name');
});
test('no <select> anywhere in the page: Ogre\'s window draws its list over the whole window', () => {
  const dir = path.join(ROOT, 'creator', 'js');
  const files = fs.readdirSync(dir).filter((f) => /^openic-.*\.js$/.test(f) || f === 'ic-flowpal.js').map((f) => 'creator/js/' + f).concat(['creator/index.html']);
  for (const f of files) ok(!/['"]\s*<select\b|^\s*<select\b/m.test(read(f)), f + ' writes no <select> (lists are the page\'s own menu: IC.app.pick, chips)');
  ok(/if \(typeof jbDropdown === 'function'\) return jbDropdown\(/.test(read('creator/js/ic-oc-picker.js')), 'ic-oc-picker.js uses the theme\'s drop-down (its <select> is only for a page without one)');
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
  ok(/classData: \{"Assassin":"data:image\/webp;base64,/.test(win), 'the class icons are inline');
  /* Ogre's page outlives the window: opened again, the window's scripts run again in the same page */
  const first = (/<script>\n([\s\S]*?)<\/script>/.exec(win.replace(/^[\s\S]*?<\/style>/, '')) || [])[1] || '';
  ok(/old\.dispose\(\)/.test(first) && /window\.OpenIC_LIB = \{\}/.test(first), 'the window\'s first script puts the copy from before away and starts a fresh one');
  ok(/removeEventListener/.test(first) && /clearInterval/.test(first), 'putting it away takes its page-wide listeners and timers off');
  ok(/innerWidth/.test(first) && /innerHeight/.test(first) && /L\.addEventListener = /.test(first), 'the private window has innerWidth, innerHeight and addEventListener');
  const wrapped = (win.match(/\(function \(window, document, setInterval, /g) || []).length;
  const modules = (win.match(/\}\)\(OpenIC_LIB, OpenIC_LIB\.document, OpenIC_LIB\.setInterval, /g) || []).length;
  ok(wrapped > 20 && wrapped === modules, wrapped + ' modules get this window\'s document and setInterval');
  ok(!/D\.spellText = "/.test(win) && !/data:image\/png;base64,/.test(win), 'the sheets and the ability list are in the asset pack, not the window');
  const names = fs.readdirSync(path.join(ROOT, 'host')).filter((f) => /^OpenIC-assets-\d+\.js$/.test(f)).sort((a, b) => parseInt(a.slice(14), 10) - parseInt(b.slice(14), 10));
  const parts = names.map((f) => read('host/' + f)), pack = parts.join('\n');
  ok(/data:image\/png;base64,/.test(pack) && /D\.spellText = /.test(pack) && /D\.items = /.test(pack) && /iconsLoaded\(\)/.test(parts[parts.length - 1]), 'the asset parts hold the sheets and the lists; the last one redraws');
  ok(!/window\.[A-Za-z_$][\w$]*\s*=(?!=)/.test(pack), 'the asset parts add nothing to the shared page');
  parts.forEach((p, i) => ok(p.indexOf("ogreUISet('openic', 'openic-assets-got', '" + (i + 1) + '/' + parts.length + "')") >= 0, names[i] + ' reports itself in'));
});
done('test-bridge');
