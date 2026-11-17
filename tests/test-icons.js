// The game icons: the sheets, class icons and lists are there and well formed; the cell math; the rules the boxes
// follow (my class's ability shows its own icon, another class's shows that class's icon first in the strip, no
// detriment icon on a box, items show their picture, the Ability icons switch); and the in-game asset pack.
//   node tests/test-icons.js
'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, ENGINE, load, ok, test, done } = require('./lib.js');

const A_DIR = path.join(ROOT, 'creator', 'assets');
const IC = load(ENGINE.concat(['openic-app.js', 'openic-icons.js', 'openic-game.js', '../data/spell-icons.js', '../data/item-icons.js']));
const A = IC.app, H = IC.host, I = IC.icons, W = IC.words, O = IC.ogf;

function png(file) {
  const b = fs.readFileSync(file);
  return { sig: b.slice(1, 4).toString('ascii') === 'PNG', w: b.readUInt32BE(16), h: b.readUInt32BE(20), depth: b[24], type: b[25] };
}
function nodeFor(g, test) {
  let hit = null;
  (function walk(items) {
    for (const it of items || []) {
      const n = it.t === 'n' ? it : it.node;
      if (n && !hit && test(n)) hit = n;
      walk(it.items); if (it.body) walk(it.body.items);
    }
  })([].concat(...g.lanes.map((l) => l.items)));
  return hit;
}

test('the spell sheets, class icons and item sheets are there and well formed', () => {
  const sp = fs.readdirSync(path.join(A_DIR, 'spell_atlases')).filter((f) => /^atlas-\d+\.png$/.test(f));
  ok(sp.length === 34, sp.length + ' spell sheets');
  for (let n = 1; n <= 34; n++) {
    const p = png(path.join(A_DIR, 'spell_atlases', 'atlas-' + n + '.png'));
    ok(p.sig && p.w === 256 && p.h === 256 && p.depth === 8 && p.type === 6, 'spell sheet ' + n + ' is a 256 x 256 RGBA PNG');
  }
  const cls = fs.readdirSync(path.join(A_DIR, 'class_icons'));
  ok(cls.length === 26 && JSON.stringify(cls.map((f) => f.replace(/\.webp$/, ''))) === JSON.stringify(H.CLASSES), '26 class icons, one per class');
  for (const f of cls) { const b = fs.readFileSync(path.join(A_DIR, 'class_icons', f)); ok(b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP', f + ' is WebP'); }
  const it = fs.readdirSync(path.join(A_DIR, 'item_atlases')).filter((f) => /^atlas-\d+\.png$/.test(f));
  ok(it.length === IC.iconData.itemSheets && it.length >= 1, it.length + ' item sheets');
  for (const f of it) { const p = png(path.join(A_DIR, 'item_atlases', f)); ok(p.sig && p.w === 256 && p.h === 256, f + ' is a 256 x 256 PNG'); }
});
test('the ability list and the item list load', () => {
  const D = IC.iconData;
  ok(D.spellSheets === 34, 'spell sheets: ' + D.spellSheets);
  const rows = D.spellText.split('\n').filter((l) => l && l.charAt(0) !== '#');
  ok(rows.length > 14000 && rows.every((r) => r.split('\t').length === 4), rows.length + ' rows of four columns');
  const pairs = W.parseSpellIconPairs(D.spellText);
  ok(Object.keys(pairs).every((k) => pairs[k][0] >= 0 && pairs[k][0] < 34 * 36), 'every icon id is in a sheet');
  const names = Object.keys(D.items);
  ok(names.length >= 150 && names.every((n) => n === n.toLowerCase() && D.items[n] >= 1 && D.items[n] <= D.itemSheets * 36), names.length + ' items, each in a sheet');
});
test('the cell math: sheet floor(id / 36) + 1, place id % 36, 6 x 6 cells of 42 px', () => {
  const c = (id) => H.cell(id);
  ok(c(0) === null && c(-3) === null, 'no cell for 0');
  ok(JSON.stringify(c(1)) === JSON.stringify({ sheet: 1, tile: 1, x: -42, y: -0 }) || (c(1).sheet === 1 && c(1).x === -42 && c(1).y === 0), 'id 1');
  ok(c(36).sheet === 2 && c(36).tile === 0 && c(36).x === 0 && c(36).y === 0, 'id 36: the first cell of sheet 2');
  ok(c(43).sheet === 2 && c(43).x === -42 && c(43).y === -42, 'id 43: sheet 2, second row, second column');
  ok(c(1223).sheet === 34 && c(1223).x === -210 && c(1223).y === -210, 'id 1223: the last cell of sheet 34');
  const span = H.shims.invItemIcon({ icon_id: 43 }, 42, true);
  ok(/class="oic-ic oic-sp-2"/.test(span) && /background-position:-42px -42px/.test(span) && /background-size:256px 256px/.test(span), span);
  const half = H.shims.invItemIcon({ icon_id: 43 }, 21, true);
  ok(/background-position:-21px -21px/.test(half) && /background-size:128px 128px/.test(half), 'scaled to half: ' + half);
  ok(H.shims.invItemIcon({ icon_id: 34 * 36 }, 16, true) === '', 'no sheet 35');
  ok(/oic-it-1/.test(H.shims.invItemIcon({ icon_id: 5 }, 16, false)) && H.shims.invItemIcon({ icon_id: IC.iconData.itemSheets * 36 + 1 }, 16, false) === '', 'item sheets');
  ok(/src="assets\/class_icons\/Shadowknight\.webp"/.test(H.shims.jbClassIcon('shadowknight', 14)) && H.shims.jbClassIcon('nobody', 14) === '', 'class icons by name');
});

const castFight = (ability, extra) => ({ named: [{ name: 'Sample', distance: 50 }], setup: [Object.assign({ 'do': 'castAbility', ability: ability }, extra || {})] });
function castNode(doc) { return nodeFor(O.graph(doc, {}), (n) => n.ref === '["setup",0]'); }

test('my class\'s ability shows its own icon; another class\'s shows that class\'s icon first in the strip', () => {
  A.startIcons();
  const cls = W.parseSpellClasses(IC.iconData.spellText), pairs = W.parseSpellIconPairs(IC.iconData.spellText);
  ok(JSON.stringify(cls['abandoned fury']) === '["berserker"]' && JSON.stringify(pairs['abandoned fury']) === '[288,317]', 'the list knows Abandoned Fury: berserker, icon 288 on 317');
  A.iconPref.myClass = 'berserker'; A.applyIcons();
  let n = castNode(castFight('Abandoned Fury'));
  ok(n && n.gi && n.gi.id === 288 && n.gi.back === 317, 'my class: the ability\'s own cell ' + JSON.stringify(n && n.gi));
  const cell = A.gameIcon(n.gi, 16);
  ok(/oic-stack/.test(cell) && (cell.match(/oic-sp-9"/g) || []).length === 2, 'drawn over its backdrop (icon 288 and backdrop 317 are both in sheet 9): ' + cell.slice(0, 120));
  A.iconPref.myClass = 'wizard'; A.applyIcons();
  n = castNode(castFight('Abandoned Fury'));
  ok(n && !(n.gi && n.gi.id === 288) && n.gi.id === I.K.cast, 'another class: the box keeps its kind icon ' + JSON.stringify(n && n.gi));
  ok(n.need && n.need[0] && n.need[0].cls === 'berserker', 'and the strip starts with the class icon: ' + JSON.stringify(n && n.need));
  const html = IC.fv.html(IC.fv.layout({ lanes: [{ id: 'x', items: [n] }] }, 900), { lanes: [] }, { gameIcon: A.gameIcon });
  ok(/<span title="Who: Berserker"><img class="oic-cls" src="assets\/class_icons\/Berserker\.webp"/.test(html), 'drawn with the tooltip Who: Berserker');
  A.iconPref.myClass = ''; A.applyIcons();
  n = castNode(castFight('Abandoned Fury'));
  ok(n.gi && n.gi.id === 288, 'no class picked: every ability counts as mine');
  A.iconPref.myClass = 'wizard'; A.iconPref.group = ['berserker']; A.applyIcons();
  ok(JSON.stringify(I.groupClasses) === '["wizard","berserker"]', 'my group: ' + JSON.stringify(I.groupClasses));
  n = castNode(castFight('Abandoned Fury', { forwho: 'fighter' }));
  ok(n.need[0] && n.need[0].cls === 'berserker', 'who does a job: the group\'s fighter, ' + JSON.stringify(n.need[0]));
  A.iconPref.group = []; A.iconPref.myClass = '';
});
test('no detriment icon on a box', () => {
  A.applyIcons();
  ok(I.dets === false, 'I.dets is off');
  const doc = { named: [{ name: 'Sample', distance: 50 }], triggers: [{ on: 'detAdded', match: { main: 999, back: 317 }, 'do': [{ 'do': 'cures', op: 'cancelDetrimental', main: 999, back: 317 }] }] };
  const g = O.graph(doc, {});
  const head = nodeFor(g, (n) => n.ref === '["triggers",0]' && n.lane === 1), step = nodeFor(g, (n) => n.ref === '["triggers",0,"do",0]');
  ok(head && !(head.gi && head.gi.id === 999), 'the rule\'s box: ' + JSON.stringify(head && head.gi));
  ok(step && !(step.gi && step.gi.id === 999), 'the cure\'s box: ' + JSON.stringify(step && step.gi));
});
test('zone-file boxes, items, and the Ability icons switch', () => {
  A.iconPref.myClass = 'berserker'; A.applyIcons();
  const zone = { zone: 'Sample', variants: ['[Heroic]'], steps: [{ stepId: 'a', 'do': 'path', using: 'nav', spots: [[1, 2, 3]] },
    { stepId: 'b', 'do': 'castAbility', ability: 'Abandoned Fury' }, { stepId: 'c', 'do': 'useItem', item: 'a boar horn' }, { stepId: 'exit', 'do': 'zoneOut', op: 'auto' }] };
  const g = IC.oic.graph(zone, {});
  const step = (r) => (n) => n.ref === r && !n.noSlot;
  const walk = nodeFor(g, step('["steps",0]')), cast = nodeFor(g, step('["steps",1]')), item = nodeFor(g, step('["steps",2]'));
  ok(walk.gi && walk.gi.id === I.K.move[0], 'a walk shows the move icon');
  ok(cast.gi && cast.gi.id === 288, 'my class\'s ability in a zone file');
  ok(item.gi && item.gi.item && item.gi.id === IC.iconData.items['a boar horn'] && /oic-it-/.test(A.gameIcon(item.gi, 16)), 'an item shows its picture ' + JSON.stringify(item.gi));
  ok(IC.oic.lines(g).some((l) => l.gi && l.gi.id === 288), 'the Words view gets the icons too');
  A.setAbIcons(false);
  const off = nodeFor(IC.oic.graph(zone, {}), step('["steps",1]'));
  ok(off.gi && off.gi.id !== 288 && I.off === true, 'Ability icons off: kind icons only');
  A.setAbIcons(true);
  A.iconPref.myClass = '';
});
test('chips get icons, and the class picker lists the 26 classes', () => {
  A.applyIcons();
  const gi = A.chipIcon('zone', { key: 'z:named', role: 'sec' });
  ok(gi && gi.id === I.K.named, 'the named chip');
  ok(A.chipIcon('fight', { key: 'castAbility', role: 'action' }).id === I.K.cast, 'a fight chip');
  ok(/^Pictures: every class/.test(A.classLabel()), A.classLabel());
});
test('the in-game window has the class icons inline; the asset parts have the sheets and the lists', () => {
  const win = fs.readFileSync(path.join(ROOT, 'host', 'OpenIC.html'), 'utf8');
  const pack = fs.readdirSync(path.join(ROOT, 'host')).filter((f) => /^OpenIC-assets-\d+\.js$/.test(f))
    .map((f) => fs.readFileSync(path.join(ROOT, 'host', f), 'utf8')).join('\n');
  ok((win.match(/"[A-Z][a-z]+":"data:image\/webp;base64,/g) || []).length === 26, '26 class icons in the window');
  ok((pack.match(/\.oic-sp-\d+\{background-image:url\(data:image\/png;base64,/g) || []).length === 34, '34 spell sheets in the pack');
  ok((pack.match(/\.oic-it-\d+\{background-image:url\(data:image\/png;base64,/g) || []).length === IC.iconData.itemSheets, 'the item sheets in the pack');
  ok(/D\.spellText = "/.test(pack) && /D\.items = \{/.test(pack), 'the lists in the pack');
});
done('test-icons');
