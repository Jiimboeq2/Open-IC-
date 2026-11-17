// The editing side without a page: who runs a step in words, who-words Ogre does not have, ISXJQB files that are not
// Ogre's, the op picker's words, and the Map view's reading of ISXJQB's saved map (its file names, floors, the floor
// a spot is on).
//   node tests/test-edit.js
'use strict';
const { load, ok, test, done, ENGINE } = require('./lib.js');

const IC = load(ENGINE.concat(['openic-app.js', 'openic-icons.js', 'openic-edit.js', 'openic-map.js']));
const Z = IC.oic, A = IC.app, W = IC.words;

test('who runs a step: the IC character in a zone file, every box in a fight file', () => {
  ok(/the whole group goes along/.test(Z.runsOn({ 'do': 'path', using: 'nav', spots: [[0, 0, 0]] }, 'zone').text), 'a walk takes the group');
  ok(/my group go along/.test(Z.runsOn({ 'do': 'path', using: 'nav', spots: [[0, 0, 0]], sendTo: 'igw:{{me}}' }, 'zone').text), 'a walk with sendTo names who walks');
  const cs = Z.runsOn({ 'do': 'castStack', op: 'disable', name: 'x' }, 'zone');
  ok(/only/.test(cs.text) && /fight file/.test(cs.warn), 'a cast stack change in a zone file: the IC character only, with the way round it');
  ok(/tells my group to do it/.test(Z.runsOn({ 'do': 'castAbility', ability: 'x', sendTo: 'igw:{{me}}' }, 'zone').text), 'sendTo: the IC character tells them');
  ok(/Send to adds others/.test(Z.runsOn({ 'do': 'castAbility', ability: 'x' }, 'zone').text), 'an action that can be sent says so');
  ok(/^Only fighters, each box for itself/.test(Z.runsOn({ 'do': 'campSpot', op: 'setLoc', forwho: 'fighter' }, 'fight').text), 'a fight step for fighters');
  ok(/^Every box, each for itself/.test(Z.runsOn({ 'do': 'announce', message: 'x' }, 'fight').text), 'a fight step for all');
});

test('who-words written with an s Ogre does not have are caught', () => {
  ok(JSON.stringify(W.oddWho('melee+scouts')) === JSON.stringify([{ word: 'scouts', meant: 'scout' }]), 'melee+scouts: ' + JSON.stringify(W.oddWho('melee+scouts')));
  ok(W.oddWho('scout').length === 0 && W.oddWho('casters').length === 0 && W.oddWho('igw:{{me}}').length === 0, 'Ogre\'s own words pass');
  ok(W.oddWho('notscouts').length === 1, 'notscouts too');
  const probs = Z.check({ zone: 'Z', variants: ['[Heroic]'], steps: [{ 'do': 'ogreBotUIOption', id: 'x', value: true, sendTo: 'scouts' }, { stepId: 'exit', 'do': 'zoneOut', op: 'auto' }] }, 'zone');
  ok(probs.some((p) => p.level === 'warn' && /"scouts" is probably meant as "scout"/.test(p.msg)), 'the check says so');
  const tips = Z.check({ zone: 'Z', variants: ['[Heroic]'], steps: [{ 'do': 'beltAdorn' }, { stepId: 'exit', 'do': 'zoneOut', op: 'auto' }] }, 'zone');
  ok(tips.some((p) => p.level === 'info' && /IC character only/.test(p.msg)), 'a per-box action in a zone file gets a tip');
});

test('an ISXJQB fight mechanics file is not read as an Ogre fight file', () => {
  const enc = { named: 'A Named', zone: 'Z', setup: {}, mechanics: [], cleanup: {} };
  ok(Z.isJbEncounter(enc) && Z.kindOf(enc) === '', 'mechanics file: ' + Z.kindOf(enc));
  ok(Z.kindOf({ named: [{ name: 'A Named' }], setup: [], triggers: [] }) === 'fight', 'an Ogre fight file still is one');
});

test('the op picker says what each op does', () => {
  const sp = IC.vocab.fightFile.actions.campSpot.keys.op;
  ok(sp.valuesAbout && sp.valuesAbout.setLoc, 'the vocabulary has op words');
  const h = A.fieldHtml('op', sp, { 'do': 'campSpot', op: 'setLoc' });
  ok(h.indexOf('setLoc: ' + sp.valuesAbout.setLoc.slice(0, 20)) >= 0, 'the picked op is in words under the picker');
});

test('ISXJQB\'s saved map: its file names, its floors, the floor a spot is on', () => {
  ok(A.mapToken('Exp04_Dun_Chelsith') === 'exp04_dun_chelsith' && A.mapToken('a b:c') === 'abc' && A.mapToken('x'.repeat(81)) === '', 'the zone token');
  const one = A.mapFloors({ zone: 'z', ok: true, key: 'z', min_x: -10, max_x: 10, min_z: -5, max_z: 5, floors: [] });
  ok(one.length === 1 && one[0].key === 'z', 'a zone without floors is one picture');
  const fl = A.mapFloors({ floors: [{ key: 'f0', name: 'Z - (Main Floor)', min_x: -10, max_x: 10, min_z: -10, max_z: 10, hmax: 50, prio: 1 },
    { key: 'f1', name: 'Z - (Upper)', min_x: -10, max_x: 10, min_z: -10, max_z: 10, hmin: 50, prio: 1 }, { key: 'bad', min_x: 1, max_x: 1, min_z: 0, max_z: 2 }] });
  ok(fl.length === 2, 'a floor without a size is left out');
  ok(A.floorOf(fl, [0, 10, 0]) === 0 && A.floorOf(fl, [0, 60, 0]) === 1, 'the height band picks the floor');
});

done('test-edit');
