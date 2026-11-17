// The Creator's engine without a page: the modules load into a private namespace (as in game), and the native-file
// logic (IC.oic) reads, draws, words and checks zone and fight files the way the docs describe them.
//   node tests/test-engine.js
'use strict';
const path = require('path');
const { ROOT, load, ok, test, done, readJson } = require('./lib.js');

const IC = load();
const Z = IC.oic, O = IC.ogf;
const zoneFile = () => readJson(path.join(ROOT, 'examples', '_01_Crypt_of_Valdoon_Heroic.json'));
const fightFile = () => readJson(path.join(ROOT, 'examples', 'The_Hollow_Regent.json'));
const msgs = (list, level) => list.filter((p) => !level || p.level === level).map((p) => p.msg);
function nodes(g) {
  const out = [];
  (function walk(items) {
    for (const it of items || []) {
      const n = it.t === 'n' ? it : it.node;
      if (n) out.push(n);
      walk(it.items); if (it.body) walk(it.body.items); if (it.yes) walk(it.yes.items); if (it.no) walk(it.no.items);
    }
  })([].concat(...g.lanes.map((l) => l.items)));
  return out;
}

test('every module is there and none needs the map planner', () => {
  for (const ns of ['reg', 'pack', 'model', 'val', 'words', 'icons', 'oc', 'fv', 'icflow', 'ogf', 'snip', 'imp', 'nmap', 'nenc', 'vocab', 'oic', 'host']) ok(!!IC[ns], 'IC.' + ns);
  ok(!IC.plan && !IC.icread && !IC.nplot, 'no planner or solver module is loaded');
});
test('which kind a file is', () => {
  ok(Z.kindOf(zoneFile()) === 'zone', 'zone');
  ok(Z.kindOf(fightFile()) === 'fight', 'fight');
  ok(Z.kindOf({ name: 'x', zone: 'x', steps: [{ type: 'WAYPOINT', data: '1,2,3' }] }) === 'jb', 'ISXJQB instance file');
  ok(Z.kindOf({ zone: 'x', variants: [], steps: [] }) === 'zone', 'an empty zone file');
  ok(Z.kindOf({ hello: 1 }) === '', 'not a file the Creator knows');
});
test('the examples check clean', () => {
  const z = Z.check(zoneFile(), 'zone'), f = Z.check(fightFile(), 'fight');
  ok(!z.length, 'zone: ' + JSON.stringify(msgs(z)));
  ok(!f.length, 'fight: ' + JSON.stringify(msgs(f)));
});
test('a zone file as a flowchart: every step a box, its sections as parts, refs that find the step', () => {
  const doc = zoneFile(), g = Z.graph(doc, { split: true }), ns = nodes(g).filter((n) => n.ref && !n.noActs);
  ok(ns.length === doc.steps.length, ns.length + ' step boxes for ' + doc.steps.length + ' steps');
  for (const n of ns) ok(O.at(doc, JSON.parse(n.ref)) === doc.steps[JSON.parse(n.ref)[1]], 'ref ' + n.ref);
  ok(g.parts.length === 4 && g.split.length === 4, 'parts: ' + g.parts.map((p) => p.title).join(' | '));
  ok(/Named 2: The Hollow Regent/.test(g.parts[1].title), 'the boss part: ' + g.parts[1].title);
  const layout = IC.fv.layout(g, 1200);
  ok(layout.nodes.every((p) => isFinite(p.x) && isFinite(p.y) && p.w > 0 && p.h > 0), 'every box has real coordinates');
  ok(layout.ins.every((s) => typeof s.seq === 'string' && s.idx >= 0), 'every + knows its list and index');
});
test('plain words for zone steps, with no code left in them', () => {
  const lines = Z.lines(Z.graph(zoneFile(), {}));
  const text = lines.map((l) => l.text + ' ' + l.sub).join('\n');
  ok(/Walk along 2 spots/.test(text) && /Fight Gravekeeper Morvane/.test(text) && /Leave by the nearest exit/.test(text), text);
  ok(/waits up to 20 s for it to spawn/.test(text) && /buffs up for 10 s first/.test(text), 'the named\'s timings in words');
  ok(!/\{\{|\$\{|undefined|NaN|\[object/.test(text), 'no code words');
});
test('a fight file as a flowchart and in words', () => {
  const g = O.graph(fightFile(), {}), lines = Z.lines(g).map((l) => l.text).join('\n');
  ok(g.lanes.length === 5, g.lanes.length + ' lanes (start, two rules, one check, the end)');
  ok(g.links.some((k) => /Regent_ShadowsDone/.test(k.label)), 'the timer links to the rule that hears it');
  ok(/When a line shows with: "gathers the shadows"/.test(lines), lines);
});
test('the checks find what Ogre refuses, and what its reload misses', () => {
  const d = zoneFile();
  d.steps[0].using = 'walk';
  d.steps[2].prebufMs = 5000;
  d.steps.push({ stepId: 'named1', 'do': 'loot', op: 'chest' });
  d.steps.push({ 'do': 'annonce', message: 'hi' });
  d.steps.push({ 'do': 'raw', command: 'echo ${Me.Name}' });
  d.steps.push({ wait: { inCombatt: {} }, limitMs: 1000, onTimeout: 'proceed' });
  d.steps.push({ wait: 'ms', limitMs: 500, onTimeout: 'fail' });
  d.mystery = 1;
  const all = Z.check(d, 'zone'), err = msgs(all, 'error').join('\n'), warn = msgs(all, 'warn').join('\n');
  ok(/must be nav, campspot/.test(err) || /must say nav or camp spot/.test(err), 'using must be nav or campspot');
  ok(/"prebufMs" is not a field of named.*Did you mean prebuffMs\?/.test(warn), 'a misspelt key, with its fix');
  ok(/Two steps are called named1/.test(warn), 'a duplicate stepId (Ogre\'s reload misses it)');
  ok(/no action "annonce".*Did you mean announce\?/.test(warn), 'an unknown action, with its fix');
  ok(/bare \$\{\.\.\.\} makes the file not valid/.test(err), 'a bare ${...}');
  ok(/"inCombatt" is not a condition/.test(warn), 'a misspelt condition (Ogre\'s reload misses it)');
  ok(/A "ms" wait must use onTimeout proceed/.test(err), 'a ms wait that fails');
  ok(/"mystery" is not a key Ogre reads/.test(warn), 'an unknown top-level key');
  const d2 = zoneFile(); d2.steps.pop();
  ok(/No way out yet/.test(msgs(Z.check(d2, 'zone'), 'error').join('\n')), 'no zoneOut');
});
test('fight-file checks', () => {
  const d = fightFile();
  d.triggers[0].when = [{ hasDett: { main: 1 } }];
  d.setup.push({ 'do': 'castAbility', ability: 'x', abilty: 'y' });
  d.setup.push({ 'do': 'path', using: 'nav', spots: [[1, 2, 3]] });
  delete d.named;
  const all = Z.check(d, 'fight'), text = all.map((p) => p.level + ': ' + p.msg).join('\n');
  ok(/error: named must list at least one mob/.test(text), 'named is needed');
  ok(/"hasDett" is not a condition.*Did you mean hasDet\?/.test(text), 'a misspelt condition');
  ok(/"abilty" is not a field of castAbility.*Did you mean ability\?/.test(text), 'a misspelt key');
  ok(/"path" only runs in a zone file/.test(text), 'a zone-only action in a fight file');
});
test('new files, file names and the palette', () => {
  const z = Z.newZone({ zone: 'Crypt of Valdoon', variants: ['[Heroic]'] });
  ok(!msgs(Z.check(z, 'zone'), 'error').length, 'a new zone file has no errors');
  ok(Z.fileName(z) === 'Crypt_of_Valdoon_Heroic.json', Z.fileName(z));
  ok(Z.fileName({ zone: "Oogothl Sprawl: Ver'Bohten Atoll", variants: ['[Solo]', '[Heroic]'], steps: [] }, 1) === '_01_Oogothl_Sprawl_VerBohten_Atoll.json', 'the docs\' own example');
  const f = Z.newFight({ named: 'The Hollow Regent', zone: 'Crypt of Valdoon [Heroic]' });
  ok(Z.kindOf(f) === 'fight' && !msgs(Z.check(f, 'fight'), 'error').length, 'a new fight file');
  for (const p of Z.PALETTE) {
    const s = p.make();
    ok(s && (s['do'] || s.wait || s.repeat), p.key + ' makes a step');
  }
  const doc = Z.newZone({ zone: 'A', variants: ['[Solo]'] });
  const st = Z.withId(doc, doc.steps, 0, Z.paletteItem('z:chest').make());
  ok(st.stepId === 'loot' && Object.keys(st)[0] === 'stepId', 'a new step gets a stepId first: ' + JSON.stringify(st));
});
test('the quest-pack lines that run a file through ISXJQB', () => {
  const q = Z.questSteps('OgreSave/EQ2/IC/custom/mine/_01_Crypt_of_Valdoon_Heroic.json', { minutes: 60, zone: 'Crypt of Valdoon [Heroic]' });
  ok(q.team.type === 'command' && q.team.command === 'TeamRunIC OgreSave/EQ2/IC/custom/mine/_01_Crypt_of_Valdoon_Heroic.json,60,auto', q.team.command);
  ok(q.solo.command === 'RunIC "OgreSave/EQ2/IC/custom/mine/_01_Crypt_of_Valdoon_Heroic.json",60', q.solo.command);
  ok(q.lines.console === 'jb RunIC OgreSave/EQ2/IC/custom/mine/_01_Crypt_of_Valdoon_Heroic.json,60', q.lines.console);
});
test('an ISXJQB instance file through the model, the chart and the checks', () => {
  const doc = { name: 'A', zone: 'A', difficulty: 'heroic', version: '2.0', steps: [{ type: 'WAYPOINT', data: '1,2,3', mode: 'ogrenav' }, { type: 'WAIT', data: 'x' }] };
  IC.model.loadObj(doc, { path: 'a.json', fromDisk: true });
  const g = IC.icflow.graph({});
  ok(nodes(g).length >= 3, 'boxes');
  ok(IC.val.doc().some((p) => p.level === 'error'), 'a WAIT of "x" is an error');
});
test('the vocabulary covers what the engine modules know', () => {
  const V = IC.vocab;
  ok(Object.keys(V.fightFile.actions).length >= 50 && Object.keys(V.zoneFile.verbs).length === 13, 'actions and zone verbs');
  ok(Object.keys(V.conditions).length >= 60, 'conditions');
  ok(V.zoneFile.verbs.named.keys.prebuffMs['default'] === 10000, 'prebuffMs defaults to 10 s');
  const chips = Z.fightPalette();
  ok(chips.length >= 9 && chips.length < O.PALETTE.length, chips.length + ' of ' + O.PALETTE.length + ' fight chips are fight-file actions');
  for (const k of chips) { const s = k.make(), d = (Array.isArray(s) ? s[0] : s)['do']; if (d) ok(!!(V.fightFile.actions[d] || V.fightFile.controlVerbs[d]), 'fight palette ' + d); }
  ok(!chips.some((k) => k.key === 'groupQuery'), 'groupQuery (zone files only) is not offered for fight files');
});
test('a step put in front of the way out joins the part before it', () => {
  const L = [{ stepId: 'named1' }, { stepId: 'named1.chest' }, { stepId: 'exit' }];
  ok(Z.prefixAt(L, 2) === 'named1', 'before the exit: ' + Z.prefixAt(L, 2));
  ok(Z.prefixAt(L, 0) === 'named1', 'before named1: ' + Z.prefixAt(L, 0));
  ok(Z.prefixAt([{ stepId: 'exit' }], 0) === '', 'a file with only its exit');
});
done('test-engine');
