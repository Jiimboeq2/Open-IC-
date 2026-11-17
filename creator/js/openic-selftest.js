/* Open IC Creator - openic-selftest.js
   A self test of the page in a real browser engine: open index.html#selftest (or call IC.app.selftest()). It loads a
   small zone file, fight file and ISXJQB file, draws every view, edits, undoes, checks, and in game drives the bridge
   with a stand-in. The report goes into #openic-selftest and the page title ("SELFTEST OK n" or "SELFTEST FAILED").
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var A = IC.app = IC.app || {};
  var G = (typeof globalThis === 'object' && globalThis) || Function('return this')();

  A.SAMPLES = {
    zone: { zone: 'Sample Zone: The Test Halls', variants: ['[Heroic]'], expansion: 'Sample', author: 'Open IC Creator', progression: 'sequential',
      entrance: { loc: [10, 2, -30], tolerance: 30 },
      steps: [
        { stepId: 'named1.walk', 'do': 'path', using: 'nav', spots: [[12, 2, -20], [30, 3, 15]] },
        { stepId: 'named1', 'do': 'named', name: 'Sample Warden', spot: [32, 3, 20], prebuffMs: 10000 },
        { stepId: 'named1.chest', 'do': 'loot', op: 'chest' },
        { stepId: 'named2.walk', 'do': 'path', using: 'nav', spots: [[40, 3, 60]] },
        { stepId: 'named2', 'do': 'named', name: 'Sample Keeper', boss: true },
        { stepId: 'exit', 'do': 'zoneOut', op: 'auto' }
      ] },
    fight: { named: [{ name: 'Sample Warden', distance: 50 }], zone: 'Sample Zone: The Test Halls [Heroic]', expansion: 'Sample',
      setup: [{ 'do': 'campSpot', op: 'setLoc', forwho: 'fighter', loc: [32, 3, 20] }],
      triggers: [{ on: 'text', match: { mode: 'substring', needle: 'raises its shield' }, allowConcurrentRuns: false,
        'do': [{ 'do': 'announce', console: true, message: 'Shield up' }, { wait: 'ms', limitMs: 2000, onTimeout: 'proceed' }] }],
      teardown: [{ 'do': 'campSpot', op: 'clearAll', forwho: 'all' }] },
    jb: { name: 'Sample Zone', zone: 'Sample Zone', difficulty: 'heroic', version: '2.0',
      steps: [{ type: 'WAYPOINT', data: '12,2,-20', mode: 'ogrenav' }, { type: 'WAIT', data: '2' }] }
  };

  A.selftest = function () {
    var out = [], fails = 0, checks = 0, H = IC.host, Z = IC.oic, s = A.st;
    function ok(c, m) { checks++; if (!c) { fails++; out.push('  FAIL ' + m); } }
    function test(name, fn) {
      var f0 = fails;
      try { fn(); } catch (e) { fails++; out.push('  FAIL ' + name + ' threw ' + (e && e.message)); }
      out.push((fails === f0 ? '  pass ' : '  FAIL ') + name);
    }
    function q(sel) { return document.querySelectorAll(sel); }
    function clone(o) { return JSON.parse(JSON.stringify(o)); }
    var sent = [];
    if (H.inGame && G.__openicFakeGame) G.__openicFakeGame.log = sent;

    test('a zone file loads, draws as a flowchart, and checks clean', function () {
      ok(A.load(clone(A.SAMPLES.zone), { name: 'sample.json', fromDisk: true }), 'load');
      ok(s.kind === 'zone', 'kind zone: ' + s.kind);
      s.view = 'flow'; A.refresh();
      ok(q('#openic-flow .fv-node').length >= 6, 'flowchart boxes: ' + q('#openic-flow .fv-node').length);
      ok(Z.counts(s.probs).error === 0, 'no errors: ' + JSON.stringify(s.probs.map(function (p) { return p.msg; })));
      ok(!A.dirty(), 'not dirty after a load from disk');
    });
    test('the Words view says every step', function () {
      s.view = 'words'; A.refresh();
      var n = q('#openic-words .oic-wl').length;
      ok(n >= 6, 'word lines: ' + n);
      ok(/Sample Warden/.test(document.getElementById('openic-words').textContent), 'the named is named');
    });
    test('picking a step shows its text and keys; Apply, undo and redo', function () {
      A.select('["steps",1]');
      var ta = document.getElementById('openic-step-json');
      ok(!!ta && /Sample Warden/.test(ta.value), 'step text');
      ok(q('#openic-side .oic-key').length > 5, 'keys listed');
      var st = JSON.parse(ta.value); st.spawnWaitMs = 5000; ta.value = JSON.stringify(st);
      A.applyStep();
      ok(s.doc.steps[1].spawnWaitMs === 5000, 'applied');
      ok(A.dirty(), 'dirty after an edit');
      A.undo(); ok(s.doc.steps[1].spawnWaitMs === undefined, 'undone');
      A.redo(); ok(s.doc.steps[1].spawnWaitMs === 5000, 'redone');
    });
    test('a palette chip adds a step before the way out, with a stepId', function () {
      var n0 = s.doc.steps.length;
      A.addAt('z:chest', '["steps"]', n0 - 1);
      ok(s.doc.steps.length === n0 + 1, 'one more step');
      var added = s.doc.steps[n0 - 1];
      ok(added && added['do'] === 'loot' && !!added.stepId, 'a loot step with an id: ' + JSON.stringify(added));
      ok(s.doc.steps[s.doc.steps.length - 1]['do'] === 'zoneOut', 'the way out stays last');
      A.act('del', '["steps",' + (n0 - 1) + ']');
      ok(s.doc.steps.length === n0, 'deleted again');
    });
    test('a problem is found and shown', function () {
      A.edit(function (d) { d.steps[0].using = 'walk'; });
      ok(Z.counts(s.probs).error >= 1, 'an error for using: walk');
      ok(q('#openic-problems .oic-pr-error').length >= 1, 'listed');
      A.undo();
      ok(Z.counts(s.probs).error === 0, 'gone after undo');
    });
    test('the JSON view applies text', function () {
      s.view = 'json'; A.refresh();
      var ta = document.getElementById('openic-json');
      ok(/"zone": "Sample Zone: The Test Halls"/.test(ta.value), 'text shown');
      var d = JSON.parse(ta.value); d.author = 'Someone Else'; ta.value = JSON.stringify(d, null, 2);
      A.applyJson();
      ok(s.doc.author === 'Someone Else', 'applied');
      A.undo();
      ok(s.doc.author === 'Open IC Creator', 'undone');
    });
    test('the Spots view draws the file\'s spots', function () {
      s.view = 'map'; A.refresh();
      ok(q('#openic-map circle').length >= 4, 'dots: ' + q('#openic-map circle').length);
    });
    test('a fight file draws its lanes and takes a new rule', function () {
      ok(A.load(clone(A.SAMPLES.fight), { name: 'Sample Warden.json', fromDisk: true }), 'load');
      ok(s.kind === 'fight', 'kind fight');
      s.view = 'flow'; A.refresh();
      ok(q('#openic-flow .fv-node').length >= 5, 'boxes: ' + q('#openic-flow .fv-node').length);
      ok(Z.counts(s.probs).error === 0, 'no errors: ' + JSON.stringify(s.probs.map(function (p) { return p.msg; })));
      var n0 = s.doc.triggers.length;
      A.edit(function (d) { IC.ogf.addTrigger(d, IC.ogf.whenLine('the floor shakes', false)); });
      ok(s.doc.triggers.length === n0 + 1, 'a rule added');
    });
    test('an ISXJQB instance file draws and checks', function () {
      ok(A.load(clone(A.SAMPLES.jb), { name: 'jb.json', fromDisk: true }), 'load');
      ok(s.kind === 'jb', 'kind jb');
      s.view = 'flow'; A.refresh();
      ok(q('#openic-flow .fv-node').length >= 3, 'boxes: ' + q('#openic-flow .fv-node').length);
      A.select('0');
      ok(/WAYPOINT/.test(document.getElementById('openic-step-json').value), 'step text');
    });
    test('game icons: my class\'s ability shows its own cell, another class\'s its class icon, Who: <Class>', function () {
      var D = IC.iconData || {};
      ok(!!D.spellText && +D.spellSheets === 34, 'the ability list and 34 spell sheets');
      var doc = { named: [{ name: 'Sample Warden', distance: 50 }], setup: [{ 'do': 'castAbility', ability: 'Abandoned Fury' }] };
      var keep = { my: A.iconPref.myClass, grp: A.iconPref.group.slice() };
      A.iconPref.myClass = 'berserker'; A.iconPref.group = [];
      A.load(clone(doc), { name: 'icons.json', fromDisk: true });
      s.view = 'flow'; A.refresh();
      var art = '#openic-flow .fv-node .oic-sp-9[style*="background-position:0px 0px"]';
      var cell = document.querySelector(art);
      ok(!!cell, 'the box shows its cell: Abandoned Fury is icon 288, the first cell of sheet 9');
      var bg = cell ? String(G.getComputedStyle(cell).backgroundImage) : '';
      ok(/atlas-9\.png|data:image\/png/.test(bg), 'the sheet is there: ' + bg.slice(0, 60));
      A.iconPref.myClass = 'wizard'; A.refresh();
      ok(!document.querySelector(art), 'not my class: no ability art');
      var who = document.querySelector('#openic-flow span[title="Who: Berserker"] img.oic-cls');
      ok(!!who && /Berserker\.webp|data:image\/webp/.test(who.getAttribute('src')), 'the class icon, with its tooltip');
      ok(!document.querySelector('#openic-flow .fv-det'), 'no detriment icon');
      s.fv.abicons = false; A.setAbIcons(false);
      ok(!document.querySelector('#openic-flow .fv-node .oic-cls'), 'Ability icons off: no class icons on boxes');
      A.setAbIcons(true);
      A.iconPref.myClass = keep.my; A.iconPref.group = keep.grp; A.applyIcons();
    });
    test('a new zone file starts with a way out', function () {
      ok(A.load(Z.newZone({ zone: 'Another Zone', variants: ['[Solo]'] }), {}), 'load');
      ok(s.doc.steps.length === 1 && s.doc.steps[0]['do'] === 'zoneOut', 'zoneOut');
      ok(A.dirty(), 'a new file is not saved');
      ok(Z.fileName(s.doc) === 'Another_Zone_Solo.json', 'file name: ' + Z.fileName(s.doc));
    });
    test('game actions: the bridge in game, the console line in a browser', function () {
      A.load(clone(A.SAMPLES.zone), { name: 'sample.json', fromDisk: true });
      var n0 = H.lines.length;
      A.game('Reload', { kind: 'zone' }, 'ogre ic reload');
      if (H.inGame) ok(sent.length && /Event\[OpenIC_Reload\]:Execute/.test(sent[sent.length - 1]), 'event sent: ' + sent.join(' / '));
      else ok(H.lines.length === n0 + 1 && H.lines[0].line === 'ogre ic reload', 'line shown');
      if (H.inGame) {
        var keepCheck = H.ext.check, n1 = sent.length;
        H.ext.check = false;
        s.gamePath = 'Sample/sample.json';
        A.ogreCheck();
        ok(sent.length === n1, 'an Ogre without the file check (ISXOgreEQ2 Validate) is never asked');
        H.ext.check = true;
        s.gamePath = '';
        A.ogreCheck();
        ok(sent.length === n1, 'a file not saved in a folder Ogre reads is not sent to Ogre\'s check');
        s.gamePath = 'Sample/sample.json';
        A.ogreCheck();
        ok(/Event\[OpenIC_Check\]:Execute/.test(sent[sent.length - 1]), 'Ogre\'s check asked');
        ok(document.getElementById('openic-arg-tier').value === 'custom' && document.getElementById('openic-arg-path').value === 'Sample/sample.json',
          'the saved file went as its folder and path');
        s.gamePath = '';
        H.ext.check = keepCheck;
      }
    });
    var report = out.join('\n') + '\n' + (fails ? 'SELFTEST FAILED: ' + fails + ' of ' + checks + ' checks' : 'SELFTEST OK: ' + checks + ' checks passed');
    var el = document.getElementById('openic-selftest');
    if (el) { el.textContent = report; el.style.display = 'block'; }
    document.title = fails ? 'SELFTEST FAILED ' + fails : 'SELFTEST OK ' + checks;
    return { fails: fails, checks: checks, report: report };
  };
  /* in game the icon parts arrive one at a time after the window opens: the self test waits for the last one to report
     itself in (openic-assets-got "<k>/<n>"), 10 s at most */
  A.selftestWhenReady = function () {
    var t0 = Date.now();
    (function wait() {
      var got = document.getElementById('openic-assets-got'), m = got ? /^(\d+)\/(\d+)$/.exec(got.value) : null;
      if (!IC.host.inGame || (m && +m[1] >= +m[2]) || Date.now() - t0 > 10000) A.selftest();
      else setTimeout(wait, 50);
    })();
  };
  A.onStart = function () {
    var hash = '';
    try { hash = String(G.location && G.location.hash || ''); } catch (e) { hash = ''; }
    if (hash === '#selftest' || G.__openicSelftest) setTimeout(function () { A.selftestWhenReady(); }, 50);
  };
})(typeof window !== 'undefined' ? window : this);
