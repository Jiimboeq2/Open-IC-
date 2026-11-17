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
    test('the chart scrolls the native way (Ogre\'s windows scroll natively; the wheel may never reach the page)', function () {
      var long = clone(A.SAMPLES.zone);
      for (var i = 0; i < 40; i++) long.steps.splice(1, 0, { 'do': 'path', using: 'nav', spots: [[i, 0, i]] });
      A.load(long, { name: 'long.json', fromDisk: true });
      s.view = 'flow'; A.refresh();
      var sc = document.querySelector('#openic-flow .fv-scroll');
      ok(!!sc && sc.scrollTop > 1000, 'a scroll layer, held away from its edges: ' + (sc && sc.scrollTop));
      var y0 = s.fv.y;
      sc.scrollTop = sc.scrollTop + 200;
      sc.dispatchEvent(new Event('scroll'));
      ok(s.fv.y < y0, 'scrolling down moves the chart up: ' + y0 + ' -> ' + s.fv.y);
      var c = document.querySelector('#openic-flow .fv-canvas'), r = c.getBoundingClientRect(), h = document.getElementById('openic-flow').getBoundingClientRect();
      ok(Math.abs((r.top - h.top) - s.fv.y) <= 2, 'the boxes are where the view says: ' + Math.round(r.top - h.top) + ' / ' + Math.round(s.fv.y));
    });
    test('When and who: only if (all or any, not, the group has a class), repeat until, while and once', function () {
      var isA = function (v) { return Object.prototype.toString.call(v) === '[object Array]'; };
      A.load(clone(A.SAMPLES.zone), { name: 'sample.json', fromDisk: true });
      s.view = 'words'; A.refresh();
      A.select('["steps",0]');
      ok(!!document.querySelector('#openic-side .oic-when'), 'the section shows');
      A.setCondField('when:-1|@add', 'p:group');
      var w = s.doc.steps[0].when;
      ok(isA(w) && w.length === 1 && w[0].count && w[0].count.of === 'roster', 'the group has a priest: ' + JSON.stringify(w));
      A.setCondField('when:0|@who', 'bard');
      w = s.doc.steps[0].when;
      ok(w.length === 1 && isA(w[0].or) && w[0].or.length === 2 && document.querySelectorAll('#openic-side .oic-cond').length === 1, 'a bard: a troubador or a dirge, one condition');
      A.setCondField('when:-1|@add', 'p:combat');
      A.setCondField('when:1|@not', true);
      ok(JSON.stringify(s.doc.steps[0].when[1]) === '{"not":[{"inCombat":{}}]}', 'and not in combat');
      A.setCondField('when:-1|@mode', 'any');
      w = s.doc.steps[0].when;
      ok(w.length === 1 && isA(w[0].or) && w[0].or.length === 2, 'any one of these: an or of the two');
      A.setCondField('when:-1|@mode', 'all');
      A.setCondField('rep|@mode', 'until');
      var b = s.doc.steps[0];
      ok(b.repeat && b.repeat.max === 10 && isA(b.steps) && b.steps.length === 1 && b.steps[0]['do'] === 'path' && s.sel === '["steps",0,"steps",0]', 'Repeat until: the step inside a repeat block, still picked');
      A.setCondField('rep|@mode', 'while');
      b = s.doc.steps[0];
      ok(JSON.stringify(b.repeat.until) === '[{"not":[{"inCombat":{}}]}]' && JSON.stringify(b.when) === '[{"inCombat":{}}]', 'while: until it no longer holds, and skipped if false at the start');
      A.setCondField('rep|@mode', 'once');
      ok(s.doc.steps[0]['do'] === 'path' && s.sel === '["steps",0]' && s.doc.steps[0].when.length === 2, 'Once: out of the block again, its own conditions kept');
      ok(Z.counts(s.probs).error === 0, 'no errors: ' + JSON.stringify(s.probs.filter(function (p) { return p.level === 'error'; }).map(function (p) { return p.msg; })));
      ok(!!document.querySelector('#openic-side .oic-testrow') === !!H.inGame, 'the Test row shows in game only');
    });
    test('a picked step says who runs it', function () {
      s.view = 'words'; A.refresh();
      A.select('["steps",0]');
      var r = document.querySelector('#openic-side .oic-runs');
      ok(!!r && /whole group goes along/.test(r.textContent), 'a walk: ' + (r ? r.textContent : 'no line'));
    });
    test('the Pictures menu turns the step pictures off and on', function () {
      var b = document.getElementById('openic-classbtn'), m = document.getElementById('openic-menu');
      A.onClickExtra('class', b, m);
      ok(m.style.display === 'block' && /Pictures on the steps/.test(m.textContent), 'the menu says what it is for');
      A.onClickExtra('cls-pic:0', b, m);
      ok(s.fv.abicons === false && /off/.test(A.classLabel()), 'off');
      A.onClickExtra('cls-pic:1', b, m);
      ok(s.fv.abicons === true, 'on again');
      A.closeMenu();
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
    test('in game, Open and Save as use the file browser', function () {
      if (!H.inGame) { ok(typeof A.openLocal === 'function', 'a browser: the PC\'s own file window'); return; }
      A.load(clone(A.SAMPLES.zone), { name: 'sample.json', fromDisk: true });
      var $ = function (id) { return document.getElementById(id); };
      A.browse('open');
      ok(/Event\[OpenIC_List\]:Execute/.test(sent[sent.length - 1]) && $('openic-arg-root').value === 'zone', 'it asks for My zone files');
      ok($('openic-browse').style.display === 'flex', 'the browser shows');
      ok(/Sample Expansion/.test($('openic-br-list').textContent) && /sample\.json/.test($('openic-br-list').textContent), 'the folders and files are listed');
      A.browseClick('dir:Sample Expansion');
      ok($('openic-arg-path').value === 'Sample Expansion' && /inner\.json/.test($('openic-br-list').textContent), 'a folder click lists that folder');
      ok(/Up one folder/.test($('openic-br-list').textContent), 'with a way back up');
      A.browseClick('file:inner.json');
      ok(/Event\[OpenIC_Open\]:Execute/.test(sent[sent.length - 1]) && $('openic-arg-kind').value === 'zone' && $('openic-arg-path').value === 'Sample Expansion/inner.json',
        'a file click opens it from My zone files');
      ok($('openic-browse').style.display === 'none', 'and the browser closes');
      A.browse('open');
      A.browseClick('root:ofight');
      ok($('openic-arg-root').value === 'ofight' && !$('openic-br-newfolder').offsetParent, 'Ogre\'s fight files are listed, read only (no New folder)');
      A.closeBrowse();
      A.load(clone(A.SAMPLES.zone), { name: 'sample.json', fromDisk: false });
      A.save(true);
      ok($('openic-browse').style.display === 'flex' && $('openic-br-title').textContent === 'Save as' && $('openic-br-name').value !== '', 'Save as picks the folder and the name');
      ok(/My zone files/.test($('openic-br-roots').textContent) && !/Ogre's/.test($('openic-br-roots').textContent), 'only my own folders take a save');
      A.closeBrowse();
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
    /* in the stand-in for Ogre: ISXJQB's saved map comes over the bridge a file at a time, so this one waits */
    function mapTest(next) {
      if (!H.inGame || !G.__openicFakeGame) { next(); return; }
      var name = 'in game, the Map view lays ISXJQB\'s saved map of my zone under the spots, floor by floor', f0 = fails, t0 = Date.now(), stage = 0;
      A.load(clone(A.SAMPLES.zone), { name: 'sample.json', fromDisk: true });
      s.view = 'map'; A.refresh();
      (function wait() {
        try {
          if (stage === 0) {
            var img = document.querySelector('#openic-map image');
            if (!img && Date.now() - t0 < 5000) { setTimeout(wait, 50); return; }
            ok(sent.some(function (l) { return /Event\[OpenIC_Map\]:Execute/.test(l); }), 'the game was asked for the map');
            ok(!!img && /^data:image\/png/.test(img.getAttribute('href') || ''), 'the floor picture lies under the spots');
            ok(q('#openic-map circle').length >= 4, 'the spots are on it');
            ok(q('#openic-map-note [data-oic^="map:floor:"]').length === 2, 'two floors to pick from');
            A.editClick('map:floor:1');
            stage = 1; t0 = Date.now(); setTimeout(wait, 50); return;
          }
          var note = document.getElementById('openic-map-note').textContent;
          if (!/no picture of this floor/.test(note) && Date.now() - t0 < 5000) { setTimeout(wait, 50); return; }
          ok(/no picture of this floor/.test(note), 'a floor without a picture says so: ' + note.slice(-120));
          ok(!document.querySelector('#openic-map image'), 'and shows none');
          var k0 = A.mapView.k;
          A.editClick('map:in');
          ok(A.mapView.k > k0, 'the + button zooms in (the wheel may never reach the page in game)');
          A.editClick('map:fit');
        } catch (e) { fails++; out.push('  FAIL ' + name + ' threw ' + (e && e.message)); }
        out.push((fails === f0 ? '  pass ' : '  FAIL ') + name);
        next();
      })();
    }
    /* Ask Ogre with an Ogre that has no Validate: the script reloads, then sends what Ogre said, a line at a time */
    function verifyTest(next) {
      if (!H.inGame || !G.__openicFakeGame) { next(); return; }
      var name = 'in game, Ask Ogre without Ogre\'s Validate: a reload, then what Ogre said about this file', f0 = fails, t0 = Date.now(), keep = H.ext.check;
      A.load(clone(A.SAMPLES.zone), { name: 'sample.json', fromDisk: true });
      s.gamePath = 'Sample/sample.json';
      H.ext.check = false;
      A.ogreAsk();
      (function wait() {
        if ((!s.verify || s.verify.busy) && Date.now() - t0 < 4000) { setTimeout(wait, 50); return; }
        try {
          var V = s.verify || {};
          ok(sent.some(function (l) { return /Event\[OpenIC_Verify\]:Execute/.test(l); }) && document.getElementById('openic-arg-tier').value === 'custom', 'the script was asked, for the saved file');
          ok(V.loaded === true && /Test Halls \[Heroic\]/.test(V.mine), 'Ogre loaded it: ' + V.mine);
          ok(V.issues && V.issues.length === 1 && V.issues[0].ref === '["steps",2]' && V.issues[0].level === 'warn', 'its line is on the step it names (Ogre counts from 1): ' + JSON.stringify(V.issues));
          ok(V.clash && V.clash.length === 1 && /other\.json/.test(V.clash[0].file), 'the other file for the same zone and difficulty is named');
          ok(/Ogre loaded this file/.test(document.getElementById('openic-problems').textContent) && /3 zone\(s\) from 3 file\(s\)/.test(document.getElementById('openic-problems').textContent), 'shown under the checks, colour codes gone');
        } catch (e) { fails++; out.push('  FAIL ' + name + ' threw ' + (e && e.message)); }
        H.ext.check = keep; s.gamePath = ''; s.verify = null;
        out.push((fails === f0 ? '  pass ' : '  FAIL ') + name);
        next();
      })();
    }
    /* Test in game: a zone file of the picked steps, run, then switched off; a fight file's setup */
    function testTest(next) {
      if (!H.inGame || !G.__openicFakeGame) { next(); return; }
      var name = 'in game, Test through the next named (a zone file of its own, run, then switched off) and Test this fight', f0 = fails, t0 = Date.now(), stage = 0;
      A.load(clone(A.SAMPLES.zone), { name: 'sample.json', fromDisk: true });
      s.test = null;
      A.select('["steps",0]');
      A.runTest('next');
      (function wait() {
        try {
          if (stage === 0) {
            if ((!s.test || s.test.phase !== 'done' || A._testSave) && Date.now() - t0 < 4000) { setTimeout(wait, 50); return; }
            var T = s.test || {};
            ok(T.doc && T.doc.steps.length === 3 && T.doc.steps[1]['do'] === 'named' && T.doc.steps[2].op === 'none', 'the walk and the named, then a way out that stays: ' +
              JSON.stringify(T.doc && T.doc.steps.map(function (x) { return x['do'] + (x.op ? ':' + x.op : ''); })));
            ok(sent.some(function (l) { return /OpenIC_Test\]/.test(l); }) && T.state === 'done' && T.verdict === 'completed', 'run, and its state came back: ' + T.state + ' ' + T.verdict);
            ok(/"enabled":false/.test(document.getElementById('openic-arg-text').value) && /OpenIC_Reload/.test(sent[sent.length - 1]), 'then saved switched off, and reloaded');
            ok(/Test in game/.test(document.getElementById('openic-problems').textContent), 'shown over the checks');
            A.load(clone(A.SAMPLES.fight), { name: 'Sample Warden.json', fromDisk: true });
            s.gamePath = 'Sample/Sample Warden.json';
            A.fightTest();
            stage = 1; t0 = Date.now(); setTimeout(wait, 50); return;
          }
          if ((!s.test || s.test.phase !== 'done') && Date.now() - t0 < 4000) { setTimeout(wait, 50); return; }
          ok(s.test && s.test.state === 'running' && document.getElementById('openic-arg-named').value === 'Sample Warden', 'the fight test reloads, sets up and sees it running');
        } catch (e) { fails++; out.push('  FAIL ' + name + ' threw ' + (e && e.message)); }
        s.test = null; s.gamePath = '';
        out.push((fails === f0 ? '  pass ' : '  FAIL ') + name);
        next();
      })();
    }
    mapTest(function () { verifyTest(function () { testTest(function () {
      var report = out.join('\n') + '\n' + (fails ? 'SELFTEST FAILED: ' + fails + ' of ' + checks + ' checks' : 'SELFTEST OK: ' + checks + ' checks passed');
      var el = document.getElementById('openic-selftest');
      if (el) { el.textContent = report; el.style.display = 'block'; }
      document.title = fails ? 'SELFTEST FAILED ' + fails : 'SELFTEST OK ' + checks;
    }); }); });
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
