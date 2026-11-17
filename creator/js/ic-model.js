/* Open IC Creator - ic-model.js
   Document model for an ISXJQB instance file (IC.model): v2 steps[], v3 sequence[] or a difficulty wrapper, edited in
   place so unknown fields pass through; nested paths, selection and undo / redo snapshots. Pure logic, no DOM.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var M = IC.model = IC.model || {};
  var UNDO_MAX = 100;

  function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }

  M.st = {
    fmt: 'v2', doc: null, listKey: 'steps', sel: null, selAtCur: null,
    undo: [], redo: [], cur: '', saved: '', diff: 'solo', showInactive: false,
    path: '', folder: '', fromDisk: false, loadNote: ''
  };

  M.detect = function (o) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return 'other';
    if (typeof o.base_file === 'string' && o.base_file) return 'wrapper';
    if (Array.isArray(o.sequence)) return 'v3';
    if (Array.isArray(o.steps)) return 'v2';
    return 'other';
  };
  M.rtFmt = function () { return M.st.fmt === 'v3' ? 'v3' : 'v2'; };

  M.newDoc = function (meta) {
    meta = meta || {};
    var zone = meta.zone || '';
    var d = { name: zone, zone: zone, base_zone: zone, difficulty: meta.difficulty || 'heroic', version: '2.0', steps: [] };
    return d;
  };

  function begin(doc, fmt, meta) {
    var s = M.st;
    s.doc = doc;
    s.fmt = fmt;
    s.listKey = fmt === 'v3' ? 'sequence' : 'steps';
    s.sel = null;
    s.undo = []; s.redo = [];
    s.cur = JSON.stringify(doc);
    s.saved = meta && meta.fromDisk ? s.cur : '';
    s.selAtCur = null;
    s.path = (meta && meta.path) || '';
    s.folder = (meta && meta.folder) || '';
    s.fromDisk = !!(meta && meta.fromDisk);
    s.diff = 'solo';
    var L = M.list();
    if (L.length) s.sel = [0];
    s.selAtCur = s.sel;
  }

  M.reset = function (meta) { begin(M.newDoc(meta), 'v2', { fromDisk: false }); M.st.saved = M.st.cur; };

  M.loadText = function (text, meta) {
    var o;
    var t = String(text);
    if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
    try { o = JSON.parse(t); }
    catch (e) { return { ok: false, error: 'The file is not valid JSON: ' + e.message }; }
    return M.loadObj(o, meta);
  };
  M.loadObj = function (o, meta) {
    var fmt = M.detect(o);
    meta = meta || {};
    meta.fromDisk = meta.fromDisk !== false;
    begin(o, fmt, meta);
    return { ok: true, fmt: fmt };
  };

  M.list = function () {
    var d = M.st.doc;
    if (!d) return [];
    if (M.st.fmt === 'wrapper' || M.st.fmt === 'other') return [];
    if (!Array.isArray(d[M.st.listKey])) d[M.st.listKey] = [];
    return d[M.st.listKey];
  };
  M.editable = function () { return M.st.fmt === 'v2' || M.st.fmt === 'v3'; };

  M.pathStr = function (p) { return p ? p.join('.') : ''; };
  M.pathParse = function (s) {
    if (s == null || s === '') return null;
    if (typeof s === 'number') return [s];
    var a = String(s).split('.');
    for (var i = 0; i < a.length; i += 2) a[i] = parseInt(a[i], 10);
    return a;
  };
  M.samePath = function (a, b) { return M.pathStr(a) === M.pathStr(b); };
  M.parent = function (p) {
    if (!p || !p.length) return null;
    var arr = M.list();
    for (var i = 0; i + 2 < p.length; i += 2) {
      var e = arr[p[i]];
      if (!e) return null;
      arr = e[p[i + 1]];
      if (!Array.isArray(arr)) return null;
    }
    return { arr: arr, idx: p[p.length - 1] };
  };
  M.get = function (p) {
    var pr = M.parent(p);
    return pr ? pr.arr[pr.idx] : undefined;
  };
  M.selected = function () { return M.st.sel ? M.get(M.st.sel) : undefined; };

  M.flatten = function (opts) {
    opts = opts || {};
    var rows = [], fmt = M.rtFmt(), show = opts.showInactive !== undefined ? opts.showInactive : M.st.showInactive;
    function walk(arr, base, depth, only) {
      for (var i = 0; i < arr.length; i++) {
        var e = arr[i], p = base.concat([i]), s = IC.reg.forEntry(e);
        var active = IC.reg.typeActive(s, fmt), wrong = IC.reg.misplaced(s, only);
        if (wrong) active = false;
        if (!active && !show && !wrong) continue;
        rows.push({ kind: 'step', path: p, e: e, depth: depth, s: s, active: active });
        var nest = s.nested || [];
        for (var n = 0; n < nest.length; n++) {
          var k = nest[n];
          if (!Array.isArray(e[k]) && k !== 'sub_steps') continue;
          var bf = null;
          for (var fi = 0; fi < s.fields.length; fi++) if (s.fields[fi].key === k) bf = s.fields[fi];
          rows.push({ kind: 'branch', path: p, key: k, depth: depth + 1, label: bf ? bf.branch || bf.label : k, count: (e[k] || []).length });
          if (Array.isArray(e[k])) walk(e[k], p.concat([k]), depth + 1, bf ? IC.reg.onlyList(bf.only) : null);
        }
      }
    }
    walk(M.list(), [], 0);
    return rows;
  };
  M.count = function () {
    var n = 0;
    (function walk(arr) {
      for (var i = 0; i < arr.length; i++) {
        n++;
        var e = arr[i];
        for (var k = 0; k < IC.reg.NEST.length; k++) if (e && Array.isArray(e[IC.reg.NEST[k]])) walk(e[IC.reg.NEST[k]]);
      }
    })(M.list());
    return n;
  };
  M.each = function (fn) {
    (function walk(arr, base) {
      for (var i = 0; i < arr.length; i++) {
        var e = arr[i], p = base.concat([i]);
        fn(e, p);
        if (e && typeof e === 'object') {
          for (var k = 0; k < IC.reg.NEST.length; k++) {
            var nk = IC.reg.NEST[k];
            if (Array.isArray(e[nk])) walk(e[nk], p.concat([nk]));
          }
        }
      }
    })(M.list(), []);
  };

  M.insert = function (entry, where) {
    if (!M.editable()) return null;
    where = where || {};
    var arr, idx, base;
    if (where.into) {
      var host = M.get(where.into);
      if (!host) return null;
      if (!Array.isArray(host[where.key])) host[where.key] = [];
      arr = host[where.key]; idx = where.index != null ? where.index : arr.length;
      base = where.into.concat([where.key]);
    } else {
      var at = where.after !== undefined ? where.after : M.st.sel;
      var pr = at ? M.parent(at) : null;
      if (pr) { arr = pr.arr; idx = pr.idx + 1; base = at.slice(0, at.length - 1); }
      else { arr = M.list(); idx = arr.length; base = []; }
    }
    arr.splice(idx, 0, entry);
    M.st.sel = base.concat([idx]);
    return M.st.sel;
  };
  M.insertMany = function (entries, where) {
    var first = null, last = null;
    for (var i = 0; i < entries.length; i++) {
      last = M.insert(entries[i], i === 0 ? where : { after: last });
      if (!first) first = last;
    }
    return first;
  };
  M.remove = function (p) {
    var pr = M.parent(p);
    if (!pr || !pr.arr[pr.idx]) return false;
    pr.arr.splice(pr.idx, 1);
    if (pr.arr.length) {
      var ni = Math.min(pr.idx, pr.arr.length - 1);
      M.st.sel = p.slice(0, p.length - 1).concat([ni]);
    } else {
      M.st.sel = p.length > 1 ? p.slice(0, p.length - 2) : null;
    }
    return true;
  };
  M.move = function (p, dir) {
    var pr = M.parent(p);
    if (!pr) return false;
    var arr = pr.arr, i = pr.idx, j = i + dir, fmt = M.rtFmt();
    if (!M.st.showInactive) {
      while (j >= 0 && j < arr.length && !IC.reg.typeActive(IC.reg.forEntry(arr[j]), fmt)) j += dir;
    }
    if (j < 0 || j >= arr.length) return false;
    var e = arr.splice(i, 1)[0];
    arr.splice(j, 0, e);
    M.st.sel = p.slice(0, p.length - 1).concat([j]);
    return true;
  };
  M.dupe = function (p) {
    var pr = M.parent(p);
    if (!pr) return false;
    pr.arr.splice(pr.idx + 1, 0, clone(pr.arr[pr.idx]));
    M.st.sel = p.slice(0, p.length - 1).concat([pr.idx + 1]);
    return true;
  };
  M.select = function (p) { M.st.sel = p; M.st.selAtCur = p; };

  M.commit = function () {
    var s = M.st;
    if (!s.doc) return false;
    var j = JSON.stringify(s.doc);
    if (j === s.cur) { s.selAtCur = s.sel; return false; }
    s.undo.push({ json: s.cur, sel: s.selAtCur });
    if (s.undo.length > UNDO_MAX) s.undo.shift();
    s.redo = [];
    s.cur = j;
    s.selAtCur = s.sel;
    return true;
  };
  function restore(snap) {
    var s = M.st;
    s.doc = JSON.parse(snap.json);
    s.cur = snap.json;
    s.sel = snap.sel && M.get(snap.sel) ? snap.sel : (M.list().length ? [0] : null);
    s.selAtCur = s.sel;
  }
  M.undo = function () {
    var s = M.st;
    M.commit();
    if (!s.undo.length) return false;
    s.redo.push({ json: s.cur, sel: s.sel });
    restore(s.undo.pop());
    return true;
  };
  M.redo = function () {
    var s = M.st;
    if (!s.redo.length) return false;
    s.undo.push({ json: s.cur, sel: s.sel });
    restore(s.redo.pop());
    return true;
  };
  M.canUndo = function () { return M.st.undo.length > 0; };
  M.canRedo = function () { return M.st.redo.length > 0; };
  M.dirty = function () { return !!M.st.doc && M.st.cur !== M.st.saved; };
  M.markSaved = function () { M.st.saved = M.st.cur; M.st.fromDisk = true; };

  M.serialize = function (doc) { return IC.pack.toJson(doc || M.st.doc); };

  M.header = function (k) { var d = M.st.doc; return d && has(d, k) ? d[k] : undefined; };
  M.setHeader = function (k, v, opts) {
    var d = M.st.doc;
    if (!d) return;
    if ((v === '' || v == null) && !has(d, k)) return;
    if ((v === '' || v == null) && opts && opts.dropEmpty) { delete d[k]; return; }
    d[k] = v;
  };
  M.renameZone = function (oldName, newName) {
    var d = M.st.doc;
    if (!d || oldName === newName) return;
    var keys = ['name', 'zone', 'base_zone'], any = false;
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i], v = d[k];
      if (typeof v !== 'string') continue;
      if (v === oldName || v === '') { d[k] = newName; any = true; }
      else if (oldName && v.indexOf(oldName + ' [') === 0) { d[k] = newName + v.slice(oldName.length); any = true; }
    }
    if (!any) {
      for (var j = 0; j < keys.length; j++) if (!has(d, keys[j])) d[keys[j]] = newName;
    }
  };
  M.zoneName = function () {
    var d = M.st.doc || {};
    return String(d.base_zone || d.name || String(d.zone || '').replace(/\s*\[[^\]]*\]\s*$/, '') || '');
  };

  M.scan = function () {
    var fmt = M.rtFmt(), R = IC.reg, P = IC.pack;
    var out = { fmt: M.st.fmt, items: [] }, idx = {};
    function add(key, label, quiet, path, why) {
      var it = idx[key];
      if (!it) { it = idx[key] = { key: key, label: label, count: 0, quiet: !!quiet, paths: [], why: why || '' }; out.items.push(it); }
      it.count++;
      if (path && it.paths.length < 50) it.paths.push(path);
    }
    if (M.editable()) {
      M.each(function (e, p) {
        var s = R.forEntry(e);
        if (s === R.UNKNOWN) {
          var t = e && e.template ? 'template "' + e.template + '"' : '"' + (e && e.type) + '"';
          add('u:' + t, 'Step type ' + t + ' (the game skips it)', false, p, 'unknown');
          return;
        }
        if (!R.typeActive(s, fmt)) {
          add('t:' + s.key, s.name, false, p, fmt === 'v3' && s.rt === 'v2' ? 'Only runs in step-list files' : 'No game handler');
          return;
        }
        var known = {};
        for (var i = 0; i < s.fields.length; i++) {
          var f = s.fields[i];
          if (f.key) known[String(f.key).split('.')[0]] = 1;
          if (P.isSet(e, f, s) && !R.fieldActive(s, f, fmt)) {
            add('f:' + s.key + ':' + f.id, s.name + ': "' + f.label + '"', f.quiet, p,
              fmt === 'v3' && f.rt !== false ? 'Not read in template (sequence) files' : (f.help || 'Not read by the game'));
          }
        }
        var cdc = P.codecFor(s);
        if (cdc) for (var c = 0; c < cdc.src.length; c++) known[cdc.src[c]] = 1;
        if (fmt === 'v3' && !s.tpl) {
          for (var k in e) {
            if (!has(e, k) || R.V3_RAW_KEYS[k] || known[k]) continue;
            add('v3k:' + k, 'Field "' + k + '" on a raw entry', false, p, 'Not read in template (sequence) files');
          }
        }
        if (fmt === 'v2' && !s.tpl) {
          for (var k2 in e) {
            if (!has(e, k2) || R.V2_KEYS[k2] || known[k2]) continue;
            add('v2k:' + k2, 'Field "' + k2 + '" (kept, not read)', true, p, 'The step-list loader does not read it');
          }
        }
        var tr = s.truth ? (s.truth(e, s, P) || []) : [];
        for (var ti = 0; ti < tr.length; ti++) add(tr[ti].key, tr[ti].label, tr[ti].quiet, p, tr[ti].why);
      });
    }
    var d = M.st.doc || {};
    if (has(d, 'outside_zone') && d.outside_zone) add('h:hub', 'Hub zone', true, null, 'Kept for reference; the game works the outdoor zone out itself');
    if (has(d, 'short_name')) add('h:short', 'Short name (old editor key)', true, null, 'The game reads zone_short_name');
    if (M.st.fmt === 'wrapper') {
      if (has(d, 'prebuff_duration') && !has(d, 'prebuff_seconds')) add('w:pbd', 'Wrapper "prebuff_duration"', false, null, 'The game reads prebuff_seconds (default 11)');
      if (has(d, 'boss_list')) add('w:bl', 'Wrapper boss list', true, null, 'Editor list for the skip checkboxes');
    }
    return out;
  };
})(typeof window !== 'undefined' ? window : this);
