/* Open IC Creator - openic-game.js
   The page's game side (IC.app): the In game menu, one game action (in game through host/OpenIC.iss, in a browser
   the console line to type), file paths in game, opening and saving through the script, Ogre's own check of the open
   file (ISXOgreEQ2.IC:Validate / ISXOgreEQ2.Encounter:Validate), the route preview, and what the script sends back.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var A = IC.app = IC.app || {};
  var G = (typeof globalThis === 'object' && globalThis) || Function('return this')();

  function H() { return IC.host; }
  function Z() { return IC.oic; }
  function O() { return IC.ogf; }
  function str(v) { return v == null ? '' : String(v); }
  function isArr(v) { return Object.prototype.toString.call(v) === '[object Array]'; }
  function isObj(v) { return v != null && typeof v === 'object' && !isArr(v); }
  function esc(s) { return str(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function n2(v) { return Math.round(+v * 100) / 100; }

  /* the lines each action runs (Ogre's developer API reference; the script runs the same calls in game) */
  A.LINES = {
    reloadZone: 'ogre ic reload',
    reloadFight: 'ogre encounter reload',
    queue: function (p) { return 'ISXOgreEQ2.IC:Queue[add,custom,"' + p + '"]'; },
    run: function (p) { return 'ISXOgreEQ2.IC:Run[custom,"' + p + '"]'; },
    setUp: function (n) { return 'OgreBotAPI.Bot:SetUpFor[igw:${Me.Name},"' + n + '",TRUE]'; },
    check: function (kind, p) { return (kind === 'fight' ? 'ISXOgreEQ2.Encounter' : 'ISXOgreEQ2.IC') + ':Validate[custom,"' + p + '"]'; },
    checkResult: function (kind) { return 'echo ${' + (kind === 'fight' ? 'ISXOgreEQ2.Encounter' : 'ISXOgreEQ2.IC') + '.Validation}'; }
  };

  A.gameMenu = function (btn) {
    var s = A.st, e = H().ext, inGame = H().inGame, zone = s.kind === 'zone', fight = s.kind === 'fight', L = A.LINES;
    var items = [{ head: 'OgreBot' }];
    items.push({ label: 'Reload zone files (ogre ic reload)', run: function () { A.game('Reload', { kind: 'zone' }, L.reloadZone); } });
    items.push({ label: 'Reload fight files (ogre encounter reload)', run: function () { A.game('Reload', { kind: 'fight' }, L.reloadFight); } });
    if (zone || fight) items.push({ label: 'Check this file by Ogre\'s own rules', tip: 'Ogre loads nothing and changes nothing: it only says whether the file would load',
      run: A.ogreCheck });
    if (zone) {
      items.push({ label: 'Queue this zone file', tip: L.queue('<path>'), run: function () { A.withGamePath('zone', function (p) { A.game('Queue', { path: p }, L.queue(p)); }); } });
      items.push({ label: 'Run this zone file now', tip: L.run('<path>'), run: function () { A.withGamePath('zone', function (p) { A.game('Run', { path: p }, L.run(p)); }); } });
    }
    if (fight) items.push({ label: 'Start the fight setup now', tip: L.setUp('<named>'), run: function () { var n = O().namedOf(s.doc); A.game('SetUp', { named: n }, L.setUp(n)); } });
    items.push({ head: 'ISXJQB' + (inGame && !e.jqb ? ' (not loaded)' : '') });
    items.push({ label: 'Run this file with ISXJQB (jb ic rundirect)', off: inGame && !e.jqb || fight, run: function () { A.withGamePath(s.kind, function (p) { A.game('JbRun', { path: p, kind: s.kind }, 'jb ic rundirect "' + p + '"'); }); } });
    if (zone) items.push({ label: 'Queue the zone in ISXJQB (jb ic queue)', off: inGame && !e.jqb, run: function () {
      var z = str(s.doc.zone), v = isArr(s.doc.variants) && s.doc.variants.length ? str(s.doc.variants[0]) : '';
      var diff = v.replace(/[\[\]]/g, '').trim().toLowerCase().replace(/\s+/g, '_');
      A.game('JbQueue', { zone: z, variant: diff }, 'jb ic queue "' + z + '"' + (diff ? ' ' + diff : ''));
    } });
    items.push({ head: 'ISXADD' + (inGame && !e.add ? ' (not ready)' : '') });
    items.push({ label: 'Route preview to the picked spot (u1nav path)', off: inGame && !e.add || s.kind === 'jb', run: A.routePreview });
    A.menu(btn, items);
  };
  /* one game action: in game through the script; in a browser the line to type */
  A.game = function (action, fields, line) {
    if (H().inGame) { H().call(action, fields); H().toast('Sent to the game: ' + line); return; }
    H().showLine(line, 'type it in the InnerSpace console (the page is not in game)');
    H().toast('In a browser: the console line is under the checks.');
  };
  A.withGamePath = function (kind, cb) {
    var s = A.st, def = s.gamePath || (kind === 'fight' ? Z().fightFolder(s.doc) + '/' + Z().fileName(s.doc) : (kind === 'jb' ? 'JB/Instances/' + s.name : Z().fileName(s.doc)));
    var where = kind === 'zone' ? 'inside Scripts\\OgreSave\\EQ2\\IC\\custom, with / between folders' : (kind === 'fight' ? 'inside Scripts\\OgreSave\\EQ2\\Encounters\\custom' : 'inside Scripts\\Eq2JCommon, or a full path');
    H().prompt('The file in game', 'Its path ' + where + ':', def, function (v) {
      if (v == null || !str(v).trim()) return;
      if (str(v).indexOf('..') >= 0) { H().toast('A path cannot climb out of its folder (..).', 'warn'); return; }
      s.gamePath = str(v).trim().replace(/\\/g, '/');
      A.renderHead();
      cb(s.gamePath);
    });
  };
  A.routePreview = function () {
    var s = A.st, st = s.sel ? A.at(s.sel) : null, p = null;
    if (isObj(st)) p = isArr(st.spots) && st.spots.length ? st.spots[0] : (isArr(st.spot) ? st.spot : (isArr(st.loc) ? st.loc : null));
    if (!p && s.doc && isObj(s.doc.entrance) && isArr(s.doc.entrance.loc)) p = s.doc.entrance.loc;
    if (!p) { H().toast('Pick a step with a spot first (a walk, a named with a spot, a camp spot).', 'warn'); return; }
    var loc = n2(p[0]) + ',' + n2(p[1]) + ',' + n2(p[2]);
    s.view = 'map';
    A.game('Route', { loc: loc }, 'u1nav path ' + loc);
    A.refresh();
  };

  /* ------------------------------------------------------------ Ogre's own check of the open file */
  A.b64 = function (text) { return G.btoa(unescape(encodeURIComponent(str(text)))); };
  A.ogreCheck = function () {
    var s = A.st;
    if (!s.doc || (s.kind !== 'zone' && s.kind !== 'fight')) { H().toast('Ogre checks zone files and fight files.', 'warn'); return; }
    if (H().inGame) {
      s.ogre = { asked: Date.now(), kind: s.kind };
      H().call('Check', { kind: s.kind, b64: A.b64(JSON.stringify(s.doc)) });
      H().toast('Asked Ogre to check the file.');
      return;
    }
    A.withGamePath(s.kind, function (p) {
      H().showLine(A.LINES.checkResult(s.kind), 'then this prints Ogre\'s answer');
      H().showLine(A.LINES.check(s.kind, p), 'after saving the file there: Ogre\'s own check');
      H().toast('In a browser: the console lines are under the checks.');
    });
  };
  /* the answer: { ok, errors, warnings, issues: [ { list, step (from 1), message, warning } ] } */
  A.ogreResult = function (text) {
    var r = null;
    try { r = JSON.parse(str(text)); } catch (e) { r = null; }
    if (!isObj(r)) { H().toast('Ogre\'s check gave no answer the page can read.', 'warn'); return; }
    var out = [], L = isArr(r.issues) ? r.issues : [];
    for (var i = 0; i < L.length; i++) {
      var it = L[i] || {}, step = +it.step, list = typeof it.list === 'string' ? it.list : '';
      var warn = it.warning === true || it.isWarning === true || /warn/i.test(str(it.level || it.severity || it.kind));
      out.push({ level: warn ? 'warn' : 'error', msg: str(it.message || it.msg || it.text || JSON.stringify(it)),
        ref: list && step > 0 ? JSON.stringify([list, step - 1]) : '' });
    }
    A.st.ogre = { ok: r.ok === true, errors: +r.errors || 0, warnings: +r.warnings || 0, issues: out, kind: A.st.kind, at: Date.now() };
    A.renderProblems();
    H().toast(r.ok === true ? 'Ogre: the file would load.' : 'Ogre: the file would not load.', r.ok === true ? 'ok' : 'err');
  };
  A.ogreCheckHtml = function () {
    var o = A.st.ogre;
    if (!o || o.ok == null || o.kind !== A.st.kind) return '';
    var h = '<div class="oic-ph"><b>Ogre\'s own check:</b> ' + (o.ok ? 'the file would load' : 'the file would not load') + ' (' + o.errors + ' error' + (o.errors === 1 ? '' : 's') +
      ', ' + o.warnings + ' warning' + (o.warnings === 1 ? '' : 's') + '). It was the text at the time of the check.</div>';
    for (var i = 0; i < o.issues.length && i < 100; i++) {
      var p = o.issues[i];
      h += '<div class="oic-pr oic-pr-' + p.level + '"' + (p.ref ? ' data-oic-ref="' + esc(p.ref) + '"' : '') + '><b>' + (p.level === 'error' ? '!' : '?') + '</b>Ogre: ' + esc(p.msg) + '</div>';
    }
    return h;
  };

  /* ------------------------------------------------------------ open and save through the script */
  A.openGame = function (kind) {
    H().prompt('Open in game', kind === 'full' ? 'The full path of the file:' : 'The path inside the ' + (kind === 'zone' ? 'IC\\custom' : (kind === 'fight' ? 'Encounters\\custom' : 'Eq2JCommon')) + ' folder:', A.st.gamePath || '', function (v) {
      if (v == null || !str(v).trim()) return;
      if (str(v).indexOf('..') >= 0) { H().toast('A path cannot climb out of its folder (..).', 'warn'); return; }
      A._opening = { kind: kind, path: str(v).trim().replace(/\\/g, '/') };
      H().call('Open', { kind: kind, path: A._opening.path });
    });
  };
  A.saveGame = function (as) {
    var s = A.st, go = function (p) {
      H().set('openic-arg-text', JSON.stringify(s.doc));
      A._saving = JSON.stringify(s.doc);
      H().call('Save', { kind: s.kind === 'jb' ? 'jb' : s.kind, path: p });
    };
    if (s.gamePath && !as) go(s.gamePath); else A.withGamePath(s.kind, go);
  };

  /* ------------------------------------------------------------ messages from the game */
  A.bindGame = function () {
    var h = H();
    h.on('file', function (p) {
      var o = A._opening || {};
      A._opening = null;
      if (A.loadText(p, { name: str(o.path).split('/').pop(), gamePath: o.kind === 'full' ? '' : o.path, path: o.path, fromDisk: true })) H().toast('Opened ' + (o.path || 'the file') + '.');
    });
    h.on('say', function (p) { if (/^ok:saved/.test(p) && A._saving) { A.st.saved = A._saving; A._saving = null; A.renderHead(); } });
    h.on('check', function (p) { A.ogreResult(p); });
    h.on('route', function (p) {
      var pts = str(p).split(';').map(function (t) { return t.split(',').map(Number); }).filter(function (q) { return q.length === 3 && q.every(isFinite); });
      A.st.route = pts;
      if (A.st.view !== 'map') A.st.view = 'map';
      A.refresh();
      H().toast(pts.length ? 'Route: ' + pts.length + ' points.' : 'ISXADD found no route.', pts.length ? 'ok' : 'warn');
    });
    h.onExt = function () { A.renderExt(); };
    h.onMe = function (me) {
      if (A.gameClass && me && me.subclass) A.gameClass(me.subclass);
      if (A.st.view === 'map') A.renderMap();
    };
  };
})(typeof window !== 'undefined' ? window : this);
