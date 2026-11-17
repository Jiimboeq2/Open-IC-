/* Open IC Creator - openic-app.js
   The page (IC.app): open, new, save; the views (Flowchart, Words, JSON, Spots); the side panel (the file's settings,
   or the selected step: its words, its problems, its text, its keys); the checks; undo / redo; and the in-game menu
   that reaches OgreBot, and ISXJQB and ISXADD when they are loaded. Works on three kinds of file: OgreBot zone files
   and fight files (native), and ISXJQB instance files. Every element id starts with openic-.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var A = IC.app = IC.app || {};
  var G = (typeof globalThis === 'object' && globalThis) || Function('return this')();

  function H() { return IC.host; }
  function Z() { return IC.oic; }
  function O() { return IC.ogf; }
  function M() { return IC.model; }
  function $(id) { return document.getElementById(id); }
  function str(v) { return v == null ? '' : String(v); }
  function isArr(v) { return Object.prototype.toString.call(v) === '[object Array]'; }
  function isObj(v) { return v != null && typeof v === 'object' && !isArr(v); }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function esc(s) { return str(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function ref(p) { return JSON.stringify(p); }
  function parseRef(r) { try { var p = JSON.parse(r); return isArr(p) ? p : null; } catch (e) { return null; } }
  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function n2(v) { return Math.round(+v * 100) / 100; }

  A.st = { kind: '', doc: null, name: '', path: '', gamePath: '', handle: null, saved: '', undo: [], redo: [], sel: '', view: 'flow',
    probs: [], fv: { z: 0.9, x: 10, y: 34 }, chart: null, route: null, quest: { path: '', minutes: 90 } };
  var UNDO_MAX = 100;

  /* ------------------------------------------------------------ the document */
  /* JSON with two-space indents, and a short list of plain values ([x, y, z], the variants) on one line, as Ogre's
     shipped files write them */
  A.pretty = function (v, ind) {
    ind = ind || '';
    var inner = ind + '  ';
    if (isArr(v)) {
      if (!v.length) return '[]';
      if (v.every(function (x) { return x === null || typeof x !== 'object'; })) {
        var one = '[' + v.map(function (x) { return JSON.stringify(x === undefined ? null : x); }).join(', ') + ']';
        if (one.length <= 100) return one;
      }
      return '[\n' + v.map(function (x) { return inner + A.pretty(x === undefined ? null : x, inner); }).join(',\n') + '\n' + ind + ']';
    }
    if (isObj(v)) {
      var keys = Object.keys(v).filter(function (k) { return v[k] !== undefined && typeof v[k] !== 'function'; });
      if (!keys.length) return '{}';
      return '{\n' + keys.map(function (k) { return inner + JSON.stringify(k) + ': ' + A.pretty(v[k], inner); }).join(',\n') + '\n' + ind + '}';
    }
    var s = JSON.stringify(v);
    return s === undefined ? 'null' : s;
  };
  A.text = function (doc) { return A.pretty(doc === undefined ? A.st.doc : doc).replace(/\n/g, '\r\n') + '\r\n'; };
  A.dirty = function () { return !!A.st.doc && JSON.stringify(A.st.doc) !== A.st.saved; };
  A.load = function (doc, meta) {
    meta = meta || {};
    var kind = Z().kindOf(doc);
    if (!kind) { H().alert('Not a file the Creator knows', 'This JSON is not an OgreBot zone file, an OgreBot fight file or an ISXJQB instance file.'); return false; }
    var s = A.st;
    s.kind = kind; s.doc = doc; s.name = str(meta.name) || Z().fileName(doc); s.path = str(meta.path); s.gamePath = str(meta.gamePath);
    s.handle = meta.handle || null; s.saved = meta.fromDisk ? JSON.stringify(doc) : ''; s.undo = []; s.redo = []; s.sel = ''; s.route = null;
    s.fv = { z: 0.9, x: 10, y: 34, abicons: A.iconPref ? A.iconPref.abicons : true };
    s.ogre = null;
    if (kind === 'jb') { M().loadObj(doc, { path: s.path, fromDisk: !!meta.fromDisk }); M().select(null); }
    s.quest.path = s.gamePath || s.name;
    A.refresh();
    if (s.chart) setTimeout(function () { if (s.chart) s.chart.fit(); }, 30);
    return true;
  };
  A.loadText = function (text, meta) {
    var t = str(text);
    if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
    var doc;
    try { doc = JSON.parse(t); } catch (e) { H().alert('Not valid JSON', 'The file could not be read: ' + e.message); return false; }
    return A.load(doc, meta);
  };
  /* every edit: one undo step (the text before it), then everything is drawn again */
  A.commit = function (before) {
    var s = A.st, now = JSON.stringify(s.doc);
    if (before != null && before !== now) {
      s.undo.push({ json: before, sel: s.sel });
      if (s.undo.length > UNDO_MAX) s.undo.shift();
      s.redo = [];
    }
    A.refresh();
  };
  A.edit = function (fn) {
    var before = JSON.stringify(A.st.doc), r;
    try { r = fn(A.st.doc); } catch (e) { H().toast('That did not work: ' + e.message, 'err'); return false; }
    A.commit(before);
    return r;
  };
  function restore(snap) {
    var s = A.st;
    s.doc = JSON.parse(snap.json);
    s.kind = Z().kindOf(s.doc) || s.kind;
    s.sel = snap.sel || '';
    if (s.kind === 'jb') { M().loadObj(s.doc, { path: s.path, fromDisk: true }); M().select(s.sel ? M().pathParse(s.sel) : null); }
  }
  A.undo = function () {
    var s = A.st;
    if (!s.undo.length) { H().toast('Nothing to undo.', 'warn'); return; }
    s.redo.push({ json: JSON.stringify(s.doc), sel: s.sel });
    restore(s.undo.pop());
    A.refresh();
  };
  A.redo = function () {
    var s = A.st;
    if (!s.redo.length) { H().toast('Nothing to redo.', 'warn'); return; }
    s.undo.push({ json: JSON.stringify(s.doc), sel: s.sel });
    restore(s.redo.pop());
    A.refresh();
  };

  /* ------------------------------------------------------------ steps by reference */
  /* zone and fight files: a JSON path ('["steps",3]'); ISXJQB files: the model's dotted path ('3.sub_steps.0') */
  A.at = function (r) {
    var s = A.st;
    if (!s.doc || r === '' || r == null) return undefined;
    if (s.kind === 'jb') return M().get(M().pathParse(r));
    var p = parseRef(r);
    return p ? O().at(s.doc, p) : undefined;
  };
  A.replaceAt = function (r, obj) {
    var s = A.st;
    if (s.kind === 'jb') { var pr = M().parent(M().pathParse(r)); if (!pr) return false; pr.arr[pr.idx] = obj; return true; }
    var p = parseRef(r);
    if (!p || !p.length) return false;
    var host = O().at(s.doc, p.slice(0, -1));
    if (host == null || typeof host !== 'object') return false;
    host[p[p.length - 1]] = obj;
    return true;
  };
  A.select = function (r) {
    A.st.sel = str(r);
    A.st.snip = null;
    if (A.st.kind === 'jb') M().select(r ? M().pathParse(r) : null);
    A.refresh(true);
  };

  /* ------------------------------------------------------------ the checks */
  A.check = function () {
    var s = A.st;
    if (!s.doc) return (s.probs = []);
    if (s.kind === 'jb') {
      var L = IC.val ? IC.val.doc() : [];
      s.probs = L.map(function (p) { return { level: p.level, ref: M().pathStr(p.path), path: null, msg: (p.label ? p.label + ': ' : '') + p.msg }; });
    } else s.probs = Z().check(s.doc, s.kind);
    return s.probs;
  };
  function probMap() {
    var s = A.st, m = {};
    if (s.kind !== 'jb') return Z().probMap(s.probs);
    for (var i = 0; i < s.probs.length; i++) if (s.probs[i].level !== 'info' && m[s.probs[i].ref] !== 'error') m[s.probs[i].ref] = s.probs[i].level;
    return m;
  }

  /* ------------------------------------------------------------ the chart */
  function graph(split) {
    var s = A.st;
    if (s.kind === 'zone') return Z().graph(s.doc, { sel: s.sel, probs: probMap(), split: split });
    if (s.kind === 'fight') {
      var g = O().graph(s.doc, { sel: s.sel }), pm = probMap();
      (function mark(items) {
        for (var i = 0; i < (items || []).length; i++) {
          var it = items[i], n = it.t === 'n' ? it : it.node;
          if (n && n.ref && pm[n.ref]) { if (pm[n.ref] === 'error') n.err = true; else n.warn = true; }
          if (it.items) mark(it.items);
          if (it.body) mark(it.body.items);
          if (it.yes) mark(it.yes.items);
          if (it.no) mark(it.no.items);
        }
      })([].concat.apply([], g.lanes.map(function (l) { return l.items; })));
      return g;
    }
    if (s.kind === 'jb') return IC.icflow.graph({ split: split, reveal: true });
    return { lanes: [] };
  }
  A.palette = function () {
    var k = A.st.kind, out = [];
    if (k === 'zone') {
      Z().PALETTE.forEach(function (p) { out.push({ key: p.key, label: p.label, role: p.role, more: p.more }); });
      if (IC.snip) IC.snip.list('oic').forEach(function (sn) { out.push({ key: 'snip:' + sn.id, label: sn.label, role: sn.role || 'action', more: true }); });
    } else if (k === 'fight') {
      Z().fightPalette().forEach(function (p) { out.push({ key: p.key, label: p.label, role: p.role }); });
    } else if (k === 'jb') {
      (IC.icflow.PALETTE || []).forEach(function (p) { if (p.make || /^T:/.test(p.key)) out.push({ key: p.key, label: p.label, role: p.role, icon: p.icon, more: p.more }); });
    }
    if (A.chipIcon) for (var i = 0; i < out.length; i++) out[i].gi = A.chipIcon(k, out[i]);
    return out;
  };
  function makeItem(key) {
    var k = A.st.kind, p;
    if (k === 'zone') { p = Z().paletteItem(key); return p ? p.make() : null; }
    if (k === 'fight') { p = O().paletteItem(key); return p ? p.make() : null; }
    if (k === 'jb') {
      p = IC.icflow.paletteItem(key);
      if (p && p.make) return p.make();
      var sch = IC.reg.byKey ? IC.reg.byKey(key) : null;
      return sch ? IC.reg.newEntry(sch) : null;
    }
    return null;
  }
  /* where a palette click lands: the + picked, else after the selected box, else the end of the main list */
  function slotFor(slot) {
    var s = A.st;
    if (s.kind === 'jb') return slot && slot.seq ? slot : { seq: { p: '', k: '' }, idx: M().list().length };
    if (slot && slot.how === 'armed' && typeof slot.seq === 'string') return slot;
    var p = parseRef(s.sel);
    if (p && p.length) {
      var o = O().at(s.doc, p), par = p.length > 1 ? O().at(s.doc, p.slice(0, -1)) : null;
      if (isObj(o) && isArr(o['do'])) return { seq: ref(p.concat(['do'])), idx: o['do'].length };
      if (isArr(par) && typeof p[p.length - 1] === 'number') return { seq: ref(p.slice(0, -1)), idx: p[p.length - 1] + 1 };
    }
    var main = s.kind === 'zone' ? 'steps' : 'setup', L = isArr(s.doc[main]) ? s.doc[main] : [];
    if (s.kind === 'zone' && L.length && isObj(L[L.length - 1]) && L[L.length - 1]['do'] === 'zoneOut') return { seq: ref([main]), idx: L.length - 1 };
    return { seq: ref([main]), idx: L.length };
  }
  A.addAt = function (key, seq, idx) {
    var s = A.st;
    if (!s.doc) { H().toast('Start a file first: New zone file, New fight file or Open.', 'warn'); return; }
    if (key.indexOf('snip:') === 0) { A.snippet(key.slice(5), seq, idx); return; }
    var made = makeItem(key);
    if (!made) { H().toast('That cannot be added here.', 'warn'); return; }
    A.insert(made, seq, idx);
  };
  A.insert = function (made, seq, idx) {
    var s = A.st, many = isArr(made) ? made : [made], newSel = '';
    A.edit(function (doc) {
      if (s.kind === 'jb') {
        var only = IC.icflow.onlyFor(seq);
        if (only && many.some(function (e) { return only.indexOf(e.type) < 0; })) throw new Error('that step cannot run inside a fight rule');
        var at = isArr(made) ? M().insertMany(made, IC.icflow.target(seq, idx)) : M().insert(made, IC.icflow.target(seq, idx));
        newSel = at ? M().pathStr(at) : '';
        return;
      }
      var p = parseRef(seq) || [], list = O().listAt(doc, p, true) || [];
      if (s.kind === 'zone') many = many.map(function (st, i) { return Z().withId(doc, list, idx + i, st); });
      O().insert(doc, seq, idx, many.length === 1 ? many[0] : many);
      newSel = ref(p.concat([idx]));
    });
    s.sel = newSel;
    if (IC.fv.armNext) IC.fv.armNext(s.fv, seq, idx + many.length);
    A.refresh(true);
    H().toast('Added ' + (many.length === 1 ? 'a step' : many.length + ' steps') + '. Fill it in on the right.');
  };
  A.act = function (act, r, node) {
    var s = A.st, span = node && node.span > 1 ? node.span : 1;
    if (act === 'del' && span > 1) {
      H().confirm('Delete ' + span + ' steps?', '"' + (node.title || '') + '" stands for ' + span + ' steps. Delete them all? Undo brings them back.', function (yes) {
        if (yes) { A.edit(function () { IC.icflow.removeSpan(r, span); }); A.st.sel = ''; A.refresh(); }
      });
      return;
    }
    A.edit(function (doc) {
      if (s.kind === 'jb') {
        var p = M().pathParse(r);
        if (act === 'up') M().move(p, -1); else if (act === 'down') M().move(p, 1); else if (act === 'dup') M().dupe(p); else if (act === 'del') M().remove(p);
        s.sel = M().st.sel ? M().pathStr(M().st.sel) : '';
        return;
      }
      var pp = parseRef(r);
      if (act === 'up' || act === 'down') {
        if (O().shift(doc, r, act === 'up' ? -1 : 1)) s.sel = ref(pp.slice(0, -1).concat([pp[pp.length - 1] + (act === 'up' ? -1 : 1)]));
      } else if (act === 'dup') { if (O().copy(doc, r)) s.sel = ref(pp.slice(0, -1).concat([pp[pp.length - 1] + 1])); }
      else if (act === 'del') { O().remove(doc, r); s.sel = ''; }
    });
  };
  A.move = function (r, seq, idx, node) {
    var s = A.st, why = '';
    A.edit(function (doc) {
      why = s.kind === 'jb' ? IC.icflow.move(r, node && node.span > 1 ? node.span : 1, seq, idx) : O().move(doc, r, seq, idx);
    });
    if (why) H().toast(why, 'warn');
    s.sel = '';
    A.refresh();
  };
  A.toggle = function (key) {
    var k = A.st.kind;
    if (k === 'zone') Z().open[key] = !(has(Z().open, key) ? Z().open[key] : true);
    else if (k === 'jb') IC.icflow.open[key] = !IC.icflow.open[key];
    else if (O().open) O().open[key] = !O().open[key];
    A.renderFlow();
  };

  /* ------------------------------------------------------------ snippets (zone files): their own form on the right */
  A.snippet = function (id, seq, idx) {
    if (!IC.snip || !IC.snip.get(id)) return;
    A.st.sel = '';
    A.st.snip = { id: id, seq: seq, idx: idx };
    A.refresh();
  };
  A.snipForm = function (host) {
    var S = IC.snip, s = A.st, sp = s.snip, sn = S.get(sp.id), seq = sp.seq, idx = sp.idx;
    var list = O().listAt(s.doc, parseRef(seq) || ['steps'], true) || [];
    var ctx = function () { return { used: S.usedIds(s.doc), prefix: Z().prefixAt(list, idx) }; };
    var close = function () { s.snip = null; A.refresh(); };
    host.innerHTML = '<div class="oic-h">Add: ' + esc(sn.label) + '</div><div id="openic-snip"></div>';
    host._snip = sp;
    IC.fv.snipForm($('openic-snip'), sn, 'oic', {
      title: false, ctx: ctx,
      grab: H().inGame ? function (what, cb) { if (what === 'pos' && H().me) cb([H().me.x, H().me.y, H().me.z]); else if (what === 'target' && H().me) cb(H().me.target); else H().toast('Not known yet: stand in game with the window open.', 'warn'); } : null,
      points: function () { return Z().spots(s.doc).map(function (x) { return { t: x.kind + ' ' + x.label + ' (' + Math.round(x.p[0]) + ', ' + Math.round(x.p[1]) + ', ' + Math.round(x.p[2]) + ')', spot: x.p }; }); },
      preview: function (steps) { return steps.map(function (st) { return '<div>' + esc(Z().stepWords(st, Z().ctxOf(s.doc), 'zone').title) + '</div>'; }).join(''); },
      onAdd: function (vals) { var b = S.build(sn, vals, 'oic', ctx()); s.snip = null; if (b.steps.length) A.insert(b.steps, seq, idx); else A.refresh(); },
      onCancel: close
    });
  };

  /* ------------------------------------------------------------ fight files: new rules */
  A.RULES = [
    { key: 'whenLine', label: 'When a line shows...', ask: 'The words of the line (part of it is enough)' },
    { key: 'whenRed', label: 'When red text shows...', ask: 'The words of the red text (part of it is enough)' },
    { key: 'whenSpawn', label: 'When a mob appears...', ask: 'The mob\'s name' },
    { key: 'healthAt', label: 'When its health drops to...', ask: 'Health percent', def: '50' },
    { key: 'whenDies', label: 'When it dies' },
    { key: 'loopCombat', label: 'Loop while in combat' }
  ];
  A.addRule = function (key) {
    var R = null;
    for (var i = 0; i < A.RULES.length; i++) if (A.RULES[i].key === key) R = A.RULES[i];
    if (!R || A.st.kind !== 'fight') return;
    var go = function (v) {
      var r = '';
      A.edit(function (doc) {
        if (key === 'whenLine') r = O().addTrigger(doc, O().whenLine(v, false));
        else if (key === 'whenRed') r = O().addTrigger(doc, O().whenLine(v, true));
        else if (key === 'whenSpawn') r = O().addTrigger(doc, O().whenSpawn(v));
        else if (key === 'healthAt') r = O().addPulse(doc, O().healthAt(doc, +v || 50));
        else if (key === 'whenDies') r = O().whenDies(doc);
        else if (key === 'loopCombat') r = O().addPulse(doc, O().loopCombat(doc));
      });
      A.st.sel = r && /^\["(triggers|onPulse)",\d+\]$/.test(r) ? r : '';
      A.refresh(true);
      H().toast('A new rule: drag steps into it from the chips under the chart.');
    };
    if (R.ask) H().prompt(R.label, R.ask, R.def || '', function (v) { if (v != null) go(v); });
    else go('');
  };

  /* ------------------------------------------------------------ drawing */
  A.refresh = function (keepView) {
    if (typeof document === 'undefined' || !$('openic-root')) return;
    A.check();
    A.renderHead();
    if (A.st.view === 'flow') A.renderFlow();
    if (A.st.view === 'words') A.renderWords();
    if (A.st.view === 'json') A.renderJson();
    if (A.st.view === 'map') A.renderMap();
    A.renderSide();
    A.renderProblems();
  };
  A.renderHead = function () {
    var s = A.st, k = $('openic-kind'), n = $('openic-name'), d = $('openic-dirty');
    if (k) { k.textContent = s.kind ? Z().KIND_WORDS[s.kind] : 'no file'; k.className = 'oic-badge' + (s.kind ? ' oic-k-' + s.kind : ''); }
    if (n) n.textContent = s.doc ? (s.gamePath || s.path || s.name) : 'Start a new file or open one';
    if (d) d.textContent = A.dirty() ? ' (not saved)' : '';
    var u = $('openic-undo'), r = $('openic-redo');
    if (u) u.disabled = !s.undo.length;
    if (r) r.disabled = !s.redo.length;
    var c = Z().counts(s.probs), b = $('openic-checkbtn');
    if (b) { b.textContent = s.doc ? (c.error ? c.error + ' problem' + (c.error === 1 ? '' : 's') : 'No problems') + (c.warn ? ', ' + c.warn + ' to check' : '') : 'Check'; b.className = 'oic-btn' + (c.error ? ' oic-bad' : (c.warn ? ' oic-warnb' : '')); }
    var segs = document.querySelectorAll('#openic-views [data-oic-view]');
    for (var i = 0; i < segs.length; i++) segs[i].className = segs[i].getAttribute('data-oic-view') === s.view ? 'oic-on' : '';
    var views = ['flow', 'words', 'json', 'map'];
    for (var v = 0; v < views.length; v++) { var el = $('openic-v-' + views[v]); if (el) el.style.display = views[v] === s.view ? '' : 'none'; }
    A.renderExt();
    if (A.renderClassButton) A.renderClassButton();
  };
  A.renderExt = function () {
    var el = $('openic-ext'), e = H().ext, inGame = H().inGame;
    if (!el) return;
    var pill = function (name, on, tip) { return '<span class="oic-pill ' + (on === true ? 'oic-yes' : (on === false ? 'oic-no' : 'oic-unk')) + '" title="' + esc(tip) + '">' + name + '</span>'; };
    if (!inGame) { el.innerHTML = pill('Browser', true, 'Running in a browser: open, edit, check and save files. The game actions show their console lines to copy.'); return; }
    el.innerHTML = pill('OgreBot', e.ogreEq2, e.ogreEq2 ? 'ISXOgreX and ISXOgreEQ2 are loaded.' : 'ISXOgreEQ2 is not loaded: the reloads and runs need it.') +
      pill('ISXJQB', e.jqb, e.jqb ? 'ISXJQB is loaded: Run with ISXJQB and the quest lines work.' : 'ISXJQB is not loaded (optional).') +
      pill('ISXADD', e.add, e.add ? 'ISXADD is ready: route previews work.' : 'ISXADD is not loaded or not ready (optional).');
  };
  A.renderFlow = function () {
    var host = $('openic-flow'), s = A.st;
    if (!host) return;
    if (!s.doc) { host.innerHTML = '<div class="oic-empty">' + A.welcome() + '</div>'; host._fv = null; s.chart = null; return; }
    if (host.firstChild && host.firstChild.className === 'oic-empty') host.innerHTML = '';
    var split = !!s.fv.mode && s.fv.mode !== 'steps';
    if (A.applyIcons) A.applyIcons();
    var g = graph(split);
    s.chart = IC.fv.render(host, g, {
      view: s.fv, palette: A.palette(), legendRoles: ['action', 'move', 'cond', 'loop', 'alt', 'state'], foldTools: true, palFold: true,
      emptyText: 'No steps yet: click a chip at the bottom, or drag it onto the +.',
      onView: function (v) { s.fv = v; },
      onMode: function () { A.renderFlow(); },
      onSelect: function (r) { A.select(r || ''); },
      onInsert: function (seq, idx) { A.addMenu(seq, idx); },
      onAct: A.act, onMove: A.move, onDropNew: A.addAt,
      onPick: function (key, slot) { var w = slotFor(slot); A.addAt(key, w.seq, w.idx); },
      onToggle: A.toggle,
      gameIcon: A.gameIcon, abilIcon: A.abilIcon, iconById: A.iconById, onAbIcons: A.setAbIcons
    });
  };
  A.welcome = function () {
    return '<b>Open IC Creator</b><br>Make and edit OgreBot zone files (the instance controller) and fight files.<br><br>' +
      '<span class="oic-link" data-oic="new-zone">New zone file</span> &middot; <span class="oic-link" data-oic="new-fight">New fight file</span> &middot; ' +
      '<span class="oic-link" data-oic="open">Open a file</span>' + (H().inGame ? '' : '<br><br>or drop a .json file here.');
  };
  A.renderWords = function () {
    var host = $('openic-words'), s = A.st;
    if (!host) return;
    if (!s.doc) { host.innerHTML = '<div class="oic-empty">' + A.welcome() + '</div>'; return; }
    if (A.applyIcons) A.applyIcons();
    var lines = Z().lines(graph(false)), h = '<div class="oic-wordhead">' + esc(Z().KIND_WORDS[s.kind]) + ' in plain words. Click a line to pick that step.</div>';
    var roles = IC.fv.ROLES || {}, icons = s.fv.abicons !== false && A.gameIcon;
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i], c = (roles[L.role] || roles.action || { c: '#4a90e2' }).c, gi = icons && L.gi ? A.gameIcon(L.gi, 14) : '';
      var plain = IC.words && IC.words.plain ? IC.words.plain(L.text) : L.text, sub = IC.words && IC.words.plain ? IC.words.plain(L.sub) : L.sub;
      h += '<div class="oic-wl' + (L.lane || L.head ? ' oic-wl-h' : '') + (L.ref && L.ref === s.sel ? ' oic-wl-sel' : '') + '" style="padding-left:' + (8 + L.depth * 18) + 'px"' +
        (L.ref ? ' data-oic-ref="' + esc(L.ref) + '"' : '') + '>' + (gi ? '<span class="oic-wi">' + gi + '</span>' : '<i style="background:' + c + '"></i>') + '<span>' + esc(plain) +
        (L.err ? ' <b class="oic-e">!</b>' : (L.warn ? ' <b class="oic-w">?</b>' : '')) + '</span>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>';
    }
    host.innerHTML = h;
  };
  A.renderJson = function () {
    var ta = $('openic-json'), s = A.st;
    if (!ta || ta === document.activeElement && ta._dirty) return;
    ta.value = s.doc ? A.text() : '';
    ta._dirty = false;
    var m = $('openic-json-msg');
    if (m) m.textContent = s.doc ? 'The whole file as text. Edit it, then Apply.' : '';
  };
  A.applyJson = function () {
    var ta = $('openic-json'), s = A.st, doc;
    try { doc = JSON.parse(ta.value); } catch (e) { $('openic-json-msg').textContent = 'Not valid JSON: ' + e.message; return; }
    var kind = Z().kindOf(doc);
    if (!kind) { $('openic-json-msg').textContent = 'This is not a zone file, a fight file or an instance file.'; return; }
    var before = s.doc ? JSON.stringify(s.doc) : null;
    s.doc = doc; s.kind = kind; s.sel = '';
    if (kind === 'jb') { M().loadObj(doc, { path: s.path, fromDisk: true }); M().select(null); }
    ta._dirty = false;
    A.commit(before);
    H().toast('The text is in. Undo takes it back.');
  };

  /* the Spots view: every spot the file names, seen from above (x across, z down), with a route preview when there is one */
  A.renderMap = function () {
    var svg = $('openic-map'), note = $('openic-map-note'), s = A.st;
    if (!svg) return;
    var pts = s.doc && s.kind !== 'jb' ? Z().spots(s.doc) : [], route = s.route || [], me = H().me, all = [];
    pts.forEach(function (p) { all.push(p.p); });
    route.forEach(function (p) { all.push(p); });
    if (me) all.push([me.x, me.y, me.z]);
    if (!all.length) { svg.innerHTML = ''; if (note) note.textContent = s.kind === 'jb' ? 'The Spots view is for OgreBot zone and fight files.' : 'No spots in this file yet.'; return; }
    var W = svg.clientWidth || 600, Hh = svg.clientHeight || 400, x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    all.forEach(function (p) { x0 = Math.min(x0, +p[0]); x1 = Math.max(x1, +p[0]); z0 = Math.min(z0, +p[2]); z1 = Math.max(z1, +p[2]); });
    var span = Math.max(x1 - x0, z1 - z0, 20), sc = Math.min((W - 40) / span, (Hh - 40) / span);
    var X = function (p) { return (20 + (+p[0] - x0) * sc).toFixed(1); }, Y = function (p) { return (20 + (+p[2] - z0) * sc).toFixed(1); };
    var h = '', i, colors = { path: '#2fd6c3', named: '#e0b050', entrance: '#9fb2c8', spot: '#b388ff' };
    var byRef = {};
    pts.forEach(function (p) { if (p.kind === 'path') (byRef[p.ref] = byRef[p.ref] || []).push(p.p); });
    for (var r in byRef) if (has(byRef, r) && byRef[r].length > 1) h += '<polyline fill="none" stroke="#2fd6c3" stroke-opacity="0.5" stroke-width="2" points="' + byRef[r].map(function (p) { return X(p) + ',' + Y(p); }).join(' ') + '"/>';
    if (route.length > 1) h += '<polyline fill="none" stroke="#f2c94c" stroke-width="2" stroke-dasharray="6 4" points="' + route.map(function (p) { return X(p) + ',' + Y(p); }).join(' ') + '"/>';
    for (i = 0; i < pts.length; i++) {
      var p = pts[i], sel = p.ref && p.ref === s.sel;
      h += '<circle cx="' + X(p.p) + '" cy="' + Y(p.p) + '" r="' + (p.kind === 'named' ? 6 : 4) + '" fill="' + (colors[p.kind] || '#4a90e2') + '"' + (sel ? ' stroke="#fff" stroke-width="2"' : '') +
        (p.ref ? ' data-oic-ref="' + esc(p.ref) + '"' : '') + '><title>' + esc(p.kind + (p.label ? ': ' + p.label : '') + ' (' + n2(p.p[0]) + ', ' + n2(p.p[1]) + ', ' + n2(p.p[2]) + ')') + '</title></circle>';
      if (p.kind === 'named' && p.label) h += '<text x="' + (+X(p.p) + 8) + '" y="' + (+Y(p.p) + 4) + '" fill="#dde6f3" font-size="11">' + esc(p.label) + '</text>';
    }
    if (me) h += '<rect x="' + (+X([me.x, 0, me.z]) - 5) + '" y="' + (+Y([me.x, 0, me.z]) - 5) + '" width="10" height="10" fill="none" stroke="#ffffff" stroke-width="2"><title>you</title></rect>';
    svg.innerHTML = h;
    if (note) note.textContent = pts.length + ' spot' + (pts.length === 1 ? '' : 's') + ' from the file, seen from above' + (route.length ? '; the dashed line is the route ISXADD found' : '') + (me ? '; the square is you' : '') + '. Click a dot to pick its step.';
  };

  /* ------------------------------------------------------------ the side panel */
  A.renderSide = function () {
    var host = $('openic-side'), s = A.st;
    if (!host) return;
    if (s.snip && s.doc && s.kind === 'zone') { if (host._snip !== s.snip || !host.querySelector('#openic-snip')) A.snipForm(host); return; }
    host._snip = null;
    s.snip = null;
    if (!s.doc) { host.innerHTML = '<div class="oic-h">Nothing open</div><div class="oic-note">New zone file, New fight file, or Open. Your files stay on your PC.</div>' + A.helpHtml(); return; }
    var st = s.sel ? A.at(s.sel) : undefined;
    host.innerHTML = st !== undefined ? A.stepHtml(st) : A.fileHtml();
  };
  A.helpHtml = function () {
    return '<div class="oic-h">Where files go</div><div class="oic-note">Zone files: Scripts\\OgreSave\\EQ2\\IC\\custom\\ (any folder inside it).<br>' +
      'Fight files: Scripts\\OgreSave\\EQ2\\Encounters\\custom\\&lt;Expansion&gt;\\&lt;Zone&gt;\\&lt;Named&gt;.json.<br>Never under Scripts\\Ogre: updates replace that folder.</div>';
  };
  function stepVerbSpec(st) {
    var V = IC.vocab, k = A.st.kind;
    if (!V || !isObj(st)) return null;
    var d = str(st['do']);
    if (d) return (k === 'zone' && V.zoneFile.verbs[d]) || V.fightFile.actions[d] || V.fightFile.controlVerbs[d] || null;
    if (has(st, 'wait')) return { keys: V.zoneFile.waitKeys };
    if (has(st, 'on')) return { keys: V.fightFile.triggerKeys };
    if (has(st, 'everyPulse') || has(st, 'activeWhile') || (has(st, 'id') && has(st, 'do'))) return { keys: V.fightFile.pulseKeys };
    return null;
  }
  A.stepHtml = function (st) {
    var s = A.st, words = '', sub = '';
    if (s.kind === 'jb') { words = IC.reg.labelFor(st); }
    else if (isObj(st) && has(st, 'on')) { var w0 = O().whenText(st); words = 'When ' + w0.title; sub = w0.sub || ''; }
    else if (isObj(st) && (has(st, 'everyPulse') || has(st, 'activeWhile'))) { words = 'A check while the fight runs'; sub = st.when ? 'when ' + Z().condWords(st.when) : ''; }
    else if (isArr(st)) { words = 'A list of ' + st.length + ' step' + (st.length === 1 ? '' : 's'); }
    else { var w = Z().stepWords(st, Z().ctxOf(s.doc), s.kind); words = w.title; sub = w.sub; }
    if (IC.words && IC.words.plain) { words = IC.words.plain(words); sub = IC.words.plain(sub); }
    var h = '<div class="oic-h">Selected <span class="oic-x" data-oic="unselect" title="Back to the file\'s settings">close</span></div>' +
      '<div class="oic-words"><b>' + esc(words) + '</b>' + (sub ? '<div>' + esc(sub) + '</div>' : '') + '</div>';
    var pre = s.kind === 'jb' ? s.sel + '.' : s.sel.slice(0, -1) + ',';
    var mine = s.probs.filter(function (p) { return p.ref === s.sel || (!!p.ref && !!s.sel && p.ref.indexOf(pre) === 0); });
    for (var i = 0; i < mine.length && i < 12; i++) h += '<div class="oic-pr oic-pr-' + mine[i].level + '">' + esc(mine[i].msg) + '</div>';
    h += '<div class="oic-row"><button class="oic-btn" data-oic="act:up">Up</button><button class="oic-btn" data-oic="act:down">Down</button>' +
      '<button class="oic-btn" data-oic="act:dup">Copy</button><button class="oic-btn oic-danger" data-oic="act:del">Delete</button></div>';
    if (H().inGame && isObj(st)) {
      var gb = '';
      if (isArr(st.spots)) gb += '<button class="oic-btn" data-oic="here:spots" title="Add the spot you stand on to this walk">Add my spot</button>';
      if (has(st, 'loc') || has(st, 'spot')) gb += '<button class="oic-btn" data-oic="here:' + (has(st, 'loc') ? 'loc' : 'spot') + '" title="Use the spot you stand on">Here</button>';
      if (has(st, 'name')) gb += '<button class="oic-btn" data-oic="here:name" title="Use your current target\'s name">My target</button>';
      if (gb) h += '<div class="oic-row">' + gb + '</div>';
    }
    h += '<div class="oic-h2">As text</div><textarea id="openic-step-json" class="oic-ta" spellcheck="false">' + esc(A.pretty(st)) + '</textarea>' +
      '<div class="oic-row"><button class="oic-btn oic-primary" data-oic="step-apply">Apply</button><button class="oic-btn" data-oic="step-revert">Revert</button><span id="openic-step-msg" class="oic-note"></span></div>';
    var spec = stepVerbSpec(st);
    if (spec && spec.keys) {
      var rows = '', keys = Object.keys(spec.keys).sort();
      for (var k = 0; k < keys.length; k++) {
        var ks = spec.keys[keys[k]] || {}, set = isObj(st) && has(st, keys[k]);
        var t = ks.type === 'enum' ? (ks.values || []).join(' | ') : ((IC.vocab && IC.vocab.types && IC.vocab.types[ks.type]) || ks.type || '');
        rows += '<div class="oic-key' + (set ? ' oic-key-set' : '') + '" data-oic="key:' + esc(keys[k]) + '" title="' + esc((ks.about || '') + (set ? ' (set)' : ' Click to add it.')) + '"><b>' + esc(keys[k]) + '</b>' +
          (ks.required ? '<i>needed</i>' : '') + '<span>' + esc(t) + (ks['default'] !== undefined ? ' (default ' + esc(JSON.stringify(ks['default'])) + ')' : '') + '</span></div>';
      }
      h += '<div class="oic-h2">Its keys</div><div class="oic-note">Click a key to add it with its default.</div><div class="oic-keys">' + rows + '</div>';
    }
    return h;
  };
  A.fileHtml = function () {
    var s = A.st, d = s.doc, h = '';
    if (s.kind === 'zone') {
      var ent = isObj(d.entrance) && isArr(d.entrance.loc) ? d.entrance.loc.map(n2).join(', ') : '';
      h += '<div class="oic-h">Zone file</div>' +
        field('Zone', 'zone', str(d.zone), 'The zone name as the game shows it, without the difficulty tag') +
        field('Variants', 'variants', isArr(d.variants) ? d.variants.join(', ') : '', 'The difficulty tags, comma separated, for example [Solo], [Heroic]') +
        field('Expansion', 'expansion', str(d.expansion), '') + field('Author', 'author', str(d.author), '') +
        field('Entrance', 'entrance', ent, 'x, y, z of the zone-in spot (a wipe recovery walks back from it)') +
        '<div class="oic-row"><label class="oic-tick"><input type="checkbox" data-oic-tick="open"' + (d.progression === 'open' ? ' checked' : '') + '> Nameds in any order (progression open)</label></div>' +
        '<div class="oic-row"><label class="oic-tick"><input type="checkbox" data-oic-tick="rerun"' + (d.rerunWholeZoneAfterWipe === true ? ' checked' : '') + '> After a wipe, run the whole zone again</label></div>' +
        (H().inGame ? '<div class="oic-row"><button class="oic-btn" data-oic="here:entrance">Entrance: here</button></div>' : '') +
        '<div class="oic-note">File name by Ogre\'s rule: <code>' + esc(Z().fileName(d)) + '</code><br>Put it under Scripts\\OgreSave\\EQ2\\IC\\custom\\ (a folder of your own is fine).</div>';
    } else if (s.kind === 'fight') {
      var named = isArr(d.named) ? d.named.map(function (n) { return isObj(n) ? str(n.name) : str(n); }).join(', ') : '';
      h += '<div class="oic-h">Fight file</div>' +
        field('Named', 'named', named, 'The mob (or mobs, comma separated) this file is for') +
        field('Zone', 'fzone', isArr(d.zone) ? d.zone.join(' | ') : str(d.zone), 'The zone with its tag, for example Zone Name [Heroic]; several with |') +
        field('Expansion', 'expansion', str(d.expansion), '') +
        '<div class="oic-h2">New rule</div><div class="oic-row oic-wrap">' + A.RULES.map(function (r) { return '<button class="oic-btn" data-oic="rule:' + r.key + '">' + esc(r.label) + '</button>'; }).join('') + '</div>' +
        '<div class="oic-note">Put it at Scripts\\OgreSave\\EQ2\\Encounters\\custom\\<code>' + esc(Z().fightFolder(d) + '/' + Z().fileName(d)) + '</code>. At the shipped file\'s path it is laid over the shipped file; add "noMerge": true to replace it whole.</div>';
    } else if (s.kind === 'jb') {
      h += '<div class="oic-h">ISXJQB instance file</div><div class="oic-note">' + esc(str(d.name || d.zone || d.base_zone)) + (d.difficulty ? ' (' + esc(d.difficulty) + ')' : '') +
        '<br>Pick a step in the chart to edit it as text. ISXJQB runs this format; OgreBot alone does not.</div>';
    }
    h += A.questHtml();
    return h;
  };
  function field(label, key, val, tip) {
    return '<div class="oic-f"><span title="' + esc(tip) + '">' + esc(label) + '</span><input type="text" data-oic-field="' + key + '" value="' + esc(val) + '" spellcheck="false"></div>';
  }
  A.questHtml = function () {
    var s = A.st;
    if (s.kind === 'fight') return '';
    var q = Z().questSteps(s.quest.path || s.name, { minutes: s.quest.minutes, zone: str(s.doc.zone || s.doc.name) + (isArr(s.doc.variants) && s.doc.variants.length === 1 ? ' ' + s.doc.variants[0] : '') });
    return '<div class="oic-h2">Run it from a quest (ISXJQB)</div>' +
      '<div class="oic-note">A quest pack step that runs this file and waits for it. The path is the one ISXJQB reads (a path starting JB/ is in ISXJQB\'s own folder).</div>' +
      '<div class="oic-f"><span>Path</span><input type="text" data-oic-field="qpath" value="' + esc(s.quest.path) + '" spellcheck="false"></div>' +
      '<div class="oic-f"><span>Minutes</span><input type="text" data-oic-field="qmin" value="' + esc(s.quest.minutes) + '"></div>' +
      '<div class="oic-code">' + esc(JSON.stringify(q.team)) + '</div><div class="oic-code">' + esc(JSON.stringify(q.solo)) + '</div>' +
      '<div class="oic-note">TeamRunIC: the group runs it together. RunIC: each box on its own run. In the console: <code>' + esc(q.lines.console) + '</code></div>';
  };
  A.setField = function (key, val) {
    var s = A.st;
    if (key === 'qpath') { s.quest.path = val; A.renderSide(); return; }
    if (key === 'qmin') { s.quest.minutes = +val || 90; A.renderSide(); return; }
    A.edit(function (d) {
      if (key === 'zone') d.zone = val;
      else if (key === 'variants') d.variants = val.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
      else if (key === 'expansion' || key === 'author') { if (val) d[key] = val; else delete d[key]; }
      else if (key === 'entrance') {
        var p = val.split(/[\s,]+/).filter(Boolean).map(Number);
        if (!val.trim()) delete d.entrance;
        else if (p.length === 3 && p.every(isFinite)) d.entrance = { loc: p, tolerance: isObj(d.entrance) && d.entrance.tolerance ? d.entrance.tolerance : 30 };
        else throw new Error('the entrance is three numbers: x, y, z');
      } else if (key === 'named') {
        var names = val.split(',').map(function (x) { return x.trim(); }).filter(Boolean), old = isArr(d.named) ? d.named : [];
        d.named = names.map(function (n, i) { var o = isObj(old[i]) ? clone(old[i]) : { distance: 50 }; o.name = n; return o; });
      } else if (key === 'fzone') {
        var zs = val.split('|').map(function (x) { return x.trim(); }).filter(Boolean);
        if (!zs.length) delete d.zone; else d.zone = zs.length === 1 ? zs[0] : zs;
      }
    });
  };
  A.setTick = function (key, on) {
    A.edit(function (d) {
      if (key === 'open') d.progression = on ? 'open' : 'sequential';
      if (key === 'rerun') { if (on) d.rerunWholeZoneAfterWipe = true; else delete d.rerunWholeZoneAfterWipe; }
    });
  };
  A.applyStep = function () {
    var ta = $('openic-step-json'), s = A.st, v;
    try { v = JSON.parse(ta.value); } catch (e) { $('openic-step-msg').textContent = 'Not valid JSON: ' + e.message; return; }
    var r = s.sel;
    A.edit(function () { if (!A.replaceAt(r, v)) throw new Error('that step is gone'); });
    s.sel = r;
    A.refresh(true);
  };
  A.addKey = function (key) {
    var s = A.st, st = A.at(s.sel), spec = stepVerbSpec(st);
    if (!isObj(st) || has(st, key)) return;
    var ks = spec && spec.keys && spec.keys[key] || {}, v = ks['default'];
    if (v === undefined) {
      var t = ks.type || '';
      v = ks.type === 'enum' ? (ks.values || [''])[0] : (/^int|^num/.test(t) ? 0 : (t === 'bool' ? true : (t === 'loc' ? [0, 0, 0] : (t === 'spots' || t === 'list' || t === 'steps' || t === 'conditions' ? [] : (t === 'object' ? {} : '')))));
    }
    A.edit(function () { st[key] = clone(v); });
  };
  A.here = function (what) {
    var me = H().me, s = A.st;
    if (!me) { H().toast('Your spot is not known yet: the window needs ISXEQ2 loaded and a few seconds.', 'warn'); return; }
    var p = [n2(me.x), n2(me.y), n2(me.z)];
    if (what === 'entrance') { A.edit(function (d) { d.entrance = { loc: p, tolerance: isObj(d.entrance) && d.entrance.tolerance ? d.entrance.tolerance : 30 }; }); return; }
    var st = A.at(s.sel);
    if (!isObj(st)) return;
    A.edit(function () {
      if (what === 'spots') { if (!isArr(st.spots)) st.spots = []; st.spots.push(p); }
      else if (what === 'loc' || what === 'spot') st[what] = p;
      else if (what === 'name') { if (me.target) st.name = me.target; else throw new Error('you have no target'); }
    });
  };

  /* ------------------------------------------------------------ the problems list */
  A.renderProblems = function () {
    var el = $('openic-problems'), s = A.st;
    if (!el) return;
    if (!s.doc) { el.innerHTML = ''; return; }
    var c = Z().counts(s.probs), h = '<div class="oic-ph">' + (s.probs.length ? 'Checks: ' + c.error + ' problem' + (c.error === 1 ? '' : 's') + ', ' + c.warn + ' to check, ' + c.info + ' tip' + (c.info === 1 ? '' : 's') :
      'Checks: nothing found.') + (s.kind !== 'jb' ? ' Then Reload in Ogre: its log line is the final word.' : '') + '</div>';
    for (var i = 0; i < s.probs.length && i < 200; i++) {
      var p = s.probs[i];
      h += '<div class="oic-pr oic-pr-' + p.level + '"' + (p.ref ? ' data-oic-ref="' + esc(p.ref) + '"' : '') + '><b>' + (p.level === 'error' ? '!' : (p.level === 'warn' ? '?' : 'i')) + '</b>' +
        esc(p.msg) + (p.fix ? ' <span class="oic-link" data-oic="fix:' + esc(p.fix) + '">fix it</span>' : '') + '</div>';
    }
    if (A.ogreCheckHtml) h += A.ogreCheckHtml();
    el.innerHTML = h;
  };

  /* ------------------------------------------------------------ menus */
  A.menu = function (anchor, items) {
    var m = $('openic-menu');
    if (!m) return;
    var h = '';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.head) { h += '<div class="oic-mh">' + esc(it.head) + '</div>'; continue; }
      h += '<div class="oic-mi' + (it.off ? ' oic-off' : '') + '" data-oic-mi="' + i + '" title="' + esc(it.tip || '') + '">' + esc(it.label) + '</div>';
    }
    m.innerHTML = h;
    m._items = items;
    m.className = 'oic-menu';
    m.style.display = 'block';
    var r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: 60, bottom: 60 }, x = Math.round(r.left), y = Math.round(r.bottom + 2);
    if (typeof G.ogrePlaceFixed === 'function') G.ogrePlaceFixed(m, x, y);
    else { m.style.left = Math.max(4, Math.min(x, (G.innerWidth || 1200) - 280)) + 'px'; m.style.top = Math.max(4, Math.min(y, (G.innerHeight || 800) - m.offsetHeight - 4)) + 'px'; }
  };
  A.closeMenu = function () { var m = $('openic-menu'); if (m) m.style.display = 'none'; };
  A.addMenu = function (seq, idx) {
    var items = [{ head: 'Add here' }], P = A.palette();
    for (var i = 0; i < P.length; i++) (function (p) { items.push({ label: p.label, run: function () { A.addAt(p.key, seq, idx); } }); })(P[i]);
    var at = A._lastMouse || null;
    setTimeout(function () { A.menu(at, items); }, 0);
  };
  A.openMenu = function (btn) {
    var items = [];
    if (!H().inGame) {
      items.push({ label: 'Open a file from this PC...', run: A.openLocal });
    } else {
      items.push({ label: 'Open a zone file (from IC\\custom)...', run: function () { A.openGame('zone'); } });
      items.push({ label: 'Open a fight file (from Encounters\\custom)...', run: function () { A.openGame('fight'); } });
      items.push({ label: 'Open an ISXJQB file (from Eq2JCommon)...', run: function () { A.openGame('jb'); } });
      items.push({ label: 'Open by full path...', run: function () { A.openGame('full'); } });
    }
    A.menu(btn, items);
  };

  /* ------------------------------------------------------------ open and save */
  A.newZone = function () {
    var go = function () {
      H().prompt('New zone file', 'The zone name, as the game shows it, without the difficulty tag:', '', function (z) {
        if (z == null) return;
        H().prompt('New zone file', 'Its difficulty tags (comma separated), for example [Solo], [Heroic]:', '[Heroic]', function (v) {
          if (v == null) return;
          var doc = Z().newZone({ zone: z, variants: v.split(',').map(function (x) { return x.trim(); }).filter(Boolean) });
          A.load(doc, { fromDisk: false });
        });
      });
    };
    if (A.dirty()) H().confirm('Leave this file?', 'It has changes that are not saved.', function (y) { if (y) go(); }); else go();
  };
  A.newFight = function () {
    var go = function () {
      H().prompt('New fight file', 'The named\'s name:', '', function (n) {
        if (n == null) return;
        H().prompt('New fight file', 'The zone with its tag, for example Zone Name [Heroic] (empty: any zone):', '', function (z) {
          if (z == null) return;
          A.load(Z().newFight({ named: n, zone: z }), { fromDisk: false });
        });
      });
    };
    if (A.dirty()) H().confirm('Leave this file?', 'It has changes that are not saved.', function (y) { if (y) go(); }); else go();
  };
  A.openLocal = function () {
    var go = function () {
      if (typeof G.showOpenFilePicker === 'function') {
        G.showOpenFilePicker({ types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] }).then(function (hs) {
          var h = hs[0];
          return h.getFile().then(function (f) { return f.text().then(function (t) { A.loadText(t, { name: f.name, path: f.name, fromDisk: true, handle: h }); }); });
        }).catch(function (e) { if (e && e.name !== 'AbortError') H().toast('Could not open: ' + e.message, 'err'); });
        return;
      }
      var inp = $('openic-file');
      if (inp) { inp.value = ''; inp.click(); }
    };
    if (A.dirty()) H().confirm('Leave this file?', 'It has changes that are not saved.', function (y) { if (y) go(); }); else go();
  };
  A.readFile = function (file) {
    if (!file) return;
    var r = new FileReader();
    r.onload = function () { A.loadText(r.result, { name: file.name, path: file.name, fromDisk: true }); };
    r.onerror = function () { H().toast('Could not read ' + file.name, 'err'); };
    r.readAsText(file);
  };
  A.save = function (as) {
    var s = A.st;
    if (!s.doc) return;
    var c = Z().counts(s.probs);
    var go = function () {
      if (H().inGame) { A.saveGame(as); return; }
      var text = A.text();
      if (s.handle && !as && s.handle.createWritable) {
        s.handle.createWritable().then(function (w) { return w.write(text).then(function () { return w.close(); }); })
          .then(function () { A.saved(); H().toast('Saved ' + s.name + '.'); }).catch(function (e) { H().toast('Could not save: ' + e.message, 'err'); });
        return;
      }
      if (typeof G.showSaveFilePicker === 'function') {
        G.showSaveFilePicker({ suggestedName: s.name || Z().fileName(s.doc), types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] }).then(function (h) {
          s.handle = h; s.name = h.name || s.name;
          return h.createWritable().then(function (w) { return w.write(text).then(function () { return w.close(); }); });
        }).then(function () { A.saved(); H().toast('Saved ' + s.name + '.'); }).catch(function (e) { if (e && e.name !== 'AbortError') H().toast('Could not save: ' + e.message, 'err'); });
        return;
      }
      A.download(text, s.name || Z().fileName(s.doc));
      A.saved();
    };
    if (c.error) H().confirm('Save with problems?', c.error + ' problem' + (c.error === 1 ? '' : 's') + ' found: OgreBot may list the file in red and refuse it. Save anyway?', function (y) { if (y) go(); });
    else go();
  };
  A.download = function (text, name) {
    try {
      var blob = new Blob([text], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 500);
      H().toast('Downloaded ' + name + '. Move it to the folder named on the right.');
    } catch (e) { H().toast('Could not download: ' + e.message, 'err'); }
  };
  A.saved = function () { A.st.saved = JSON.stringify(A.st.doc); A.renderHead(); };

  /* ------------------------------------------------------------ the page's clicks and keys */
  A.onClick = function (e) {
    var t = e.target, v = null, mi = null, rf = null;
    A._lastMouse = { getBoundingClientRect: function () { return { left: e.clientX, bottom: e.clientY }; } };
    for (; t && t.getAttribute; t = t.parentNode) {
      if (mi == null) mi = t.getAttribute('data-oic-mi');
      if (v == null) v = t.getAttribute('data-oic') || t.getAttribute('data-oic-view') && 'view:' + t.getAttribute('data-oic-view');
      if (rf == null) rf = t.getAttribute('data-oic-ref');
      if (mi != null || v != null) break;
    }
    var menu = $('openic-menu');
    if (mi != null && menu && menu._items) { var it = menu._items[+mi]; A.closeMenu(); if (it && !it.off && it.run) it.run(); return; }
    if (v != null && A.onClickExtra && A.onClickExtra(v, t, menu)) return;
    if (menu && menu.style.display === 'block' && !(v === 'open' || v === 'game')) A.closeMenu();
    if (v == null && rf != null) { A.select(rf); return; }
    if (v == null) return;
    var anchor = t;
    if (v === 'modal-ok' || v === 'modal-cancel') { H().modalDone(v === 'modal-ok'); return; }
    if (v === 'new-zone') A.newZone();
    else if (v === 'new-fight') A.newFight();
    else if (v === 'open') { if (menu && menu.style.display === 'block') A.closeMenu(); else A.openMenu(anchor); }
    else if (v === 'save') A.save(false);
    else if (v === 'save-as') A.save(true);
    else if (v === 'undo') A.undo();
    else if (v === 'redo') A.redo();
    else if (v === 'check') { A.refresh(); var pe = $('openic-problems'); if (pe && pe.scrollIntoView) pe.scrollIntoView({ block: 'nearest' }); }
    else if (v === 'game') { if (menu && menu.style.display === 'block') A.closeMenu(); else A.gameMenu(anchor); }
    else if (v.indexOf('view:') === 0) { A.st.view = v.slice(5); A.refresh(); if (A.st.view === 'flow' && A.st.chart) setTimeout(function () { A.st.chart.fit(); }, 30); }
    else if (v === 'json-apply') A.applyJson();
    else if (v === 'json-revert') { var ta = $('openic-json'); if (ta) ta._dirty = false; A.renderJson(); }
    else if (v === 'step-apply') A.applyStep();
    else if (v === 'step-revert') A.renderSide();
    else if (v === 'unselect') A.select('');
    else if (v.indexOf('act:') === 0) { if (A.st.sel) A.act(v.slice(4), A.st.sel, null); }
    else if (v.indexOf('key:') === 0) A.addKey(v.slice(4));
    else if (v.indexOf('here:') === 0) A.here(v.slice(5));
    else if (v.indexOf('rule:') === 0) A.addRule(v.slice(5));
    else if (v.indexOf('fix:') === 0) { var fx = v.slice(4); A.edit(function (d) { IC.nmap.fixProblem(d, fx); }); }
    else if (v === 'lines-clear') { H().lines = []; var lb = $('openic-linebox'); if (lb) lb.style.display = 'none'; }
  };
  A.bind = function () {
    if (A._bound || typeof document === 'undefined') return;
    A._bound = true;
    var root0 = $('openic-root');
    root0.addEventListener('click', A.onClick);
    root0.addEventListener('change', function (e) {
      var t = e.target;
      if (t.getAttribute('data-oic-field') != null) A.setField(t.getAttribute('data-oic-field'), t.value);
      else if (t.getAttribute('data-oic-tick') != null) A.setTick(t.getAttribute('data-oic-tick'), t.checked);
      else if (t.id === 'openic-file') A.readFile(t.files && t.files[0]);
    });
    root0.addEventListener('input', function (e) { if (e.target.id === 'openic-json') e.target._dirty = true; });
    root0.addEventListener('dragover', function (e) { if (e.dataTransfer && !H().inGame) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
    root0.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f || H().inGame) return;
      e.preventDefault();
      if (A.dirty()) H().confirm('Leave this file?', 'It has changes that are not saved.', function (y) { if (y) A.readFile(f); }); else A.readFile(f);
    });
    document.addEventListener('keydown', function (e) {
      if (e.target && e.target.id === 'openic-modal-input' && (e.key === 'Enter' || e.key === 'Escape')) { e.preventDefault(); H().modalDone(e.key === 'Enter'); return; }
      if (!(e.ctrlKey || e.metaKey)) return;
      var tag = e.target && e.target.tagName, inText = tag === 'TEXTAREA' || tag === 'INPUT';
      var k = String(e.key || '').toLowerCase();
      if (k === 's') { e.preventDefault(); A.save(false); }
      else if (!inText && k === 'z') { e.preventDefault(); A.undo(); }
      else if (!inText && k === 'y') { e.preventDefault(); A.redo(); }
    });
    if (!H().inGame) G.addEventListener('beforeunload', function (e) { if (A.dirty()) { e.preventDefault(); e.returnValue = ''; } });
  };
  A.start = function () {
    H().bind();
    A.bindGame();
    A.bind();
    var mode = $('openic-mode');
    if (mode) mode.textContent = H().inGame ? 'in game' : 'in a browser';
    if (A.startIcons) A.startIcons();
    A.refresh();
    H().hello();
    if (A.onStart) A.onStart();
  };
})(typeof window !== 'undefined' ? window : this);
