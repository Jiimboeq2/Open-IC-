/* Open IC Creator - openic-test.js
   Test in game. A zone file's steps: this step, from here through the next named, or from the start through here. Ogre
   runs whole zone files only (ISXOgreEQ2.IC:Run), so the steps go into a small zone file of their own, custom/
   _OpenIC_test.json, ending in a zoneOut with op none (it stays in the zone); the script reloads and runs it and sends
   the run's state until it ends; then the page saves that file switched off (enabled false) and reloads again, so it
   never runs by itself. Run would travel to the file's zone first, so a test is only offered while you stand in it.
   A fight file: Ogre reloads its fight files and sets up for the named (the named must be up in this zone).
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var A = IC.app = IC.app || {};

  function H() { return IC.host; }
  function str(v) { return v == null ? '' : String(v); }
  function isArr(v) { return Object.prototype.toString.call(v) === '[object Array]'; }
  function isObj(v) { return v != null && typeof v === 'object' && !isArr(v); }
  function esc(s) { return str(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  A.TEST_FILE = '_OpenIC_test.json';

  /* am I standing in the open file's zone (the game's zone name starts with the file's) */
  A.inFileZone = function () {
    var me = H().me, d = A.st.doc, fz = str(d && (isArr(d.zone) ? d.zone[0] : d.zone)).toLowerCase().split(' [')[0].trim();
    return !!(me && fz && str(me.zone).toLowerCase().indexOf(fz) === 0);
  };
  /* the steps a test runs, as their own zone file; null when the pick does not fit */
  A.testDoc = function (scope) {
    var s = A.st, d = s.doc, path = s.sel ? JSON.parse(s.sel) : null, steps = [], i;
    if (!isObj(d) || !isArr(d.steps) || !path) return null;
    var top = path.length === 2 && path[0] === 'steps' ? +path[1] : -1;
    if (scope === 'step') { var st = IC.ogf.at(d, path); if (!isObj(st)) return null; steps = [clone(st)]; }
    else if (top < 0) return null;
    else if (scope === 'next') { for (i = top; i < d.steps.length; i++) { steps.push(clone(d.steps[i])); if (isObj(d.steps[i]) && d.steps[i]['do'] === 'named') break; } }
    else if (scope === 'upto') steps = d.steps.slice(0, top + 1).map(clone);
    steps = steps.filter(function (x) { return !(isObj(x) && x['do'] === 'zoneOut'); });
    if (!steps.length) return null;
    var t = { _openicTest: 'A test from Open IC Creator: safe to delete.', zone: d.zone, variants: isArr(d.variants) ? clone(d.variants) : [], author: 'Open IC test',
      progression: 'open', enabled: true };
    if (d.expansion) t.expansion = d.expansion;
    if (isObj(d.entrance)) t.entrance = clone(d.entrance);
    if (isObj(d.options)) t.options = clone(d.options);
    if (isObj(d.fileOptions)) t.fileOptions = clone(d.fileOptions);
    if (scope === 'upto' && isArr(d.enter)) t.enter = clone(d.enter);
    t.steps = steps.concat([{ stepId: 'exit', 'do': 'zoneOut', op: 'none' }]);
    return t;
  };
  var WHAT = { step: 'this step', next: 'from here through the next named', upto: 'from the start through here' };

  A.runTest = function (scope) {
    var s = A.st;
    if (!H().inGame) { H().toast('Tests run in game: open this in the game window.', 'warn'); return; }
    if (s.kind !== 'zone') return;
    if (s.test && s.test.phase !== 'done') { H().toast('A test is still going: stop it first.', 'warn'); return; }
    if (!A.inFileZone()) { H().toast('Stand in ' + str(s.doc.zone) + ' first: a test runs where you stand (Ogre would travel there).', 'warn'); return; }
    var t = A.testDoc(scope);
    if (!t) { H().toast(scope === 'step' ? 'Pick a step to test (a way out is not tested: a test stays in the zone).' : 'Pick a step of the main list for this test.', 'warn'); return; }
    s.test = { kind: 'zone', what: WHAT[scope], phase: 'saving', lines: [], state: '', verdict: '', note: '', doc: t, at: Date.now() };
    saveTest(t, function (ok) {
      if (!ok) { s.test.phase = 'done'; s.test.state = 'not saved'; A.renderProblems(); return; }
      s.test.phase = 'running';
      H().call('Test', { path: A.TEST_FILE });
      A.renderProblems();
    });
    A.renderProblems();
  };
  function saveTest(t, then) {
    A._testSave = then;
    H().set('openic-arg-text', JSON.stringify(t));
    H().call('Save', { kind: 'zone', path: A.TEST_FILE });
  }
  /* the script's "ok:saved" / "err:" for the test file (openic-game.js hands it on) */
  A.testSaid = function (p) {
    if (!A._testSave || !/^(ok:saved|err:)/.test(str(p))) return false;
    var f = A._testSave;
    A._testSave = null;
    f(/^ok:/.test(str(p)));
    return true;
  };
  /* the test file switched off and Ogre's list reloaded, so it never runs by itself */
  function switchOff() {
    var T = A.st.test;
    if (!T || !T.doc) return;
    var off = clone(T.doc);
    off.enabled = false;
    saveTest(off, function () { H().call('Reload', { kind: 'zone' }); });
  }
  A.fightTest = function () {
    var s = A.st, n = IC.ogf && IC.ogf.namedOf ? IC.ogf.namedOf(s.doc) : '';
    if (s.kind !== 'fight' || !n) return;
    if (!H().inGame) { H().showLine('ogre encounter reload', 'reload the fight files'); H().showLine('OgreBotAPI.Bot:SetUpFor[igw:${Me.Name},"' + n + '",TRUE]', 'then set up for the named'); return; }
    if (!A.tierPath()) { H().toast('Save the fight file first (My fight files): Ogre reads it as saved.', 'warn'); return; }
    s.test = { kind: 'fight', what: 'the fight for ' + n, phase: 'running', lines: [], state: 'reloading the fight files', at: Date.now() };
    H().call('FightTest', { named: n });
    A.renderProblems();
  };

  /* the script's lines: out|<what Ogre printed>, state|<RunState>|<Verdict>|<Note>, end|..., fight|<TRUE, FALSE or
     asked>, fightend|... */
  A.onTest = function (p) {
    var T = A.st.test, a = str(p).split('|'), k = a[0];
    if (!T) return;
    var clean = function (x) { return str(x).replace(/\x07./g, '').replace(/^\[[\d:.]+\]\s*/, '').replace(/^\[Ogre\]\[[A-Za-z]+\]\s*/, '').trim(); };
    if (k === 'out') T.lines.push(clean(a.slice(1).join('|')));
    else if (k === 'state' || k === 'end') { T.state = a[1] || ''; T.verdict = a[2] || ''; T.note = clean(a.slice(3).join('|')); if (k === 'end') { T.phase = 'done'; switchOff(); } }
    else if (k === 'fight' || k === 'fightend') { T.state = a[1] === 'asked' ? 'setting up' : (a[1] === 'TRUE' ? 'running' : (a[1] === 'FALSE' ? 'not running' : a[1])); if (k === 'fightend') T.phase = 'done'; }
    A.renderProblems();
  };
  var STATE = { idle: 'it did not start (Ogre\'s lines say why)', 'zoning in': 'travelling to the zone', launching: 'starting', running: 'running',
    done: 'done', failed: 'failed', unknown: 'this Ogre does not report a run (watch the IC window)' };
  A.testHtml = function () {
    var T = A.st.test;
    if (!T) return '';
    var st = T.phase === 'saving' ? 'saving the test file' : (T.kind === 'fight' ? (T.state === 'not running' ? 'not running: the named must be up in this zone (in range or fighting), and Enable Heroic or Raid Setups ticked' : T.state) : (STATE[T.state] || T.state || 'asked'));
    var h = '<div class="oic-test"><b>Test in game</b>, ' + esc(T.what) + ': ' + esc(st) +
      (T.verdict && T.verdict !== 'idle' && T.verdict !== 'pending' ? ' (' + esc(T.verdict === 'completedWithFailures' ? 'done, with failures' : T.verdict) + ')' : '') +
      (T.note ? ': ' + esc(T.note) : '') +
      (T.phase === 'running' && T.kind === 'zone' ? ' <span class="oic-link" data-oic="test:stop">Stop it</span>' : '') +
      (T.phase === 'done' ? ' <span class="oic-link" data-oic="test:clear">clear</span>' : '') + '</div>';
    for (var i = 0; i < T.lines.length && i < 8; i++) h += '<div class="oic-note">Ogre: ' + esc(T.lines[i]) + '</div>';
    if (T.kind === 'zone' && T.what !== WHAT.upto && T.phase !== 'done') h += '<div class="oic-note">A step that reads a value an earlier step saved can fail on its own.</div>';
    return h;
  };
  /* the step form's Test row (zone files, in game) */
  A.testRowHtml = function (st, path) {
    if (!H().inGame || A.st.kind !== 'zone' || !isObj(st)) return '';
    var top = path.length === 2 && path[0] === 'steps', named = st['do'] === 'named', here = A.inFileZone();
    return '<div class="oic-row oic-testrow"><span class="oic-note">Test in game:</span>' +
      '<button class="oic-btn" data-oic="test:step"' + (st['do'] === 'zoneOut' ? ' disabled' : '') + ' title="Runs only this step, where you stand">This step</button>' +
      (top ? '<button class="oic-btn" data-oic="test:next" title="Runs this step and the ones after it, through the next named">Through the next named</button>' +
        '<button class="oic-btn" data-oic="test:upto" title="Runs the file from its start through this step">From the start' + (named ? ' through this named' : ' to here') + '</button>' : '') +
      (here ? '' : '<span class="oic-note">(stand in the zone first)</span>') + '</div>';
  };

  var ec0 = A.editClick;
  A.editClick = function (v, el) {
    var m = /^test:(\w+)$/.exec(str(v));
    if (!m) return ec0 ? ec0(v, el) : false;
    if (m[1] === 'stop') H().call('TestStop', {});
    else if (m[1] === 'clear') { A.st.test = null; A.renderProblems(); }
    else if (m[1] === 'fight') A.fightTest();
    else A.runTest(m[1]);
    return true;
  };
})(typeof window !== 'undefined' ? window : this);
