/* Open IC Creator - ic-ui-timeline.js
   Overlay UI (IC.tl): the timeline of steps (sections, nested IF / WHILE) and the step panel that hosts the form.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var T = IC.tl = IC.tl || {};
  var U = IC.ui = IC.ui || {};
  function $(id) { return (typeof document !== 'undefined') ? document.getElementById(id) : null; }
  function esc(s) { return IC.form.esc(s); }
  function str(v) { return v == null ? '' : String(v); }
  function M() { return IC.model; }
  function R() { return IC.reg; }
  T.collapsed = {};

  function norm(s) { return str(s).replace(/^\s*Boss\s+\d+\s*[-:]\s*/i, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function clean(s) { return str(s).replace(/^\s*Boss\s+\d+\s*[-:]\s*/i, '').trim() || '?'; }

  T.groups = function () {
    var L = M().list(), out = [], cur = null, n = 0;
    for (var i = 0; i < L.length; i++) {
      var e = L[i], s = R().forEntry(e), name = null, kind = 'boss';
      if (s.section === 'anchor') name = s.tpl ? e.boss : (e.boss || e.data);
      else if (s.section === true) {
        var nm = norm(e.data || e.target);
        if (!cur || cur.kind !== 'boss' || (nm && cur.norm && nm !== cur.norm)) name = e.data || e.target;
      } else if (s.section === 'label' && n > 0 && /^\s*===.*\b(clean ?up|exit|zone ?out|leave|leaving)\b/i.test(str(e.data))) {
        name = str(e.data).replace(/=+/g, '').trim(); kind = 'exit';
      }
      if (name !== null) {
        if (cur) out.push(cur);
        if (kind === 'boss') n++;
        cur = { kind: kind, label: kind === 'boss' ? 'Boss ' + n + ': ' + clean(name) : clean(name), start: i, idx: [i], norm: norm(name) };
      } else {
        if (!cur) cur = { kind: 'setup', label: 'Setup & zone-in', start: i, idx: [] };
        cur.idx.push(i);
      }
    }
    if (cur) out.push(cur);
    return out;
  };

  function rowHtml(r, rows, ctx, runnable) {
    if (r.kind === 'branch') {
      var pad = 8 + r.depth * 14;
      return '<div class="ic-tl-branch" style="padding-left:' + pad + 'px;">' + esc(r.label) + ' (' + r.count + ')' +
        '<span onclick="event.stopPropagation();icAddIntoPath(\'' + M().pathStr(r.path) + '\',\'' + r.key + '\')">+ add</span></div>';
    }
    var e = r.e, s = r.s, sel = M().samePath(r.path, M().st.sel), cat = R().catOf(s.cat);
    var label = R().labelFor(e), sec = s.section === 'label' && /^\s*===/.test(str(e.data));
    var probs = IC.val.step(e, ctx), bad = 0, err = 0;
    for (var i = 0; i < probs.length; i++) { if (probs[i].level === 'error') err++; else if (probs[i].level === 'warn') bad++; }
    var cls = 'ic-tl-node' + (sel ? ' selected' : '') + (r.active ? '' : ' ic-tl-dead') + (sec ? ' ic-tl-sec' : '');
    var h = '<div class="' + cls + '" style="padding-left:' + (8 + r.depth * 14) + 'px;"' + (r.active ? '' : ' data-ic-inactive="1"') +
      ' onclick="icSelectPath(\'' + M().pathStr(r.path) + '\')">';
    h += '<span class="ic-tl-dot2" style="background:' + (r.active ? cat.color : 'transparent') + ';border:1px solid ' + cat.color + ';"></span>';
    h += '<span class="ic-tl-label">' + esc(label) + '</span>';
    if (!r.active) h += '<span class="ic-tl-tag">not run</span>';
    if (err) h += '<span class="ic-tl-bad err">!</span>'; else if (bad) h += '<span class="ic-tl-bad">?</span>';
    if (r.depth === 0) h += '<span class="ic-tl-num">' + (r.path[0] + 1) + '</span>';
    if (runnable && r.depth === 0) h += '<span class="ic-tl-run" onclick="event.stopPropagation();icRunFromStep(' + r.path[0] + ')">&#9654;</span>';
    return h + '</div>';
  }

  T.html = function () {
    var st = M().st, ctx = U.ctx();
    if (st.fmt === 'wrapper') {
      var d = st.doc || {};
      return '<div class="ic-timeline-empty" style="color:var(--accent-cyan);">This is a <b>difficulty wrapper</b><br><br>Its steps come from:<br><b style="color:var(--header-gold);">' +
        esc(d.base_file || '?') + '</b><br><br><span style="font-size:var(--fs-10);">Edit the wrapper in Settings, or click <b>Open Base File</b> there.</span></div>';
    }
    if (st.fmt === 'other') {
      return '<div class="ic-timeline-empty">This file is not an instance (it has no steps).<br>It is shown as-is on the Check tab (File JSON).</div>';
    }
    var L = M().list();
    if (!L.length) {
      return '<div class="ic-timeline-empty"><div class="empty-icon">&#128466;</div>No steps yet.<br><br>Click <b>+ Add Step</b> below, or a quick button above' +
        ' (Quick Tools), or <b>Add Boss Section</b>.</div>';
    }
    var rows = M().flatten({ showInactive: st.showInactive }), byTop = {};
    for (var i = 0; i < rows.length; i++) { var k = rows[i].path[0]; (byTop[k] = byTop[k] || []).push(rows[i]); }
    var groups = T.groups(), runnable = st.fmt === 'v2' && st.fromDisk && !!st.path, h = '';
    var selTop = st.sel ? st.sel[0] : -1;
    var tools = runnable ? '<button class="btn btn-sm" title="Find the step closest to where you are standing, and offer to run from it" onclick="icNearestToMe()">&#128205; Nearest step to me</button>' : '';
    if (groups.length > 1) tools += '<span style="margin-left:auto;display:inline-flex;gap:6px;color:var(--text-secondary);"><span style="cursor:pointer;text-decoration:underline;" onclick="icExpandAllGroups()">expand all</span><span>&middot;</span><span style="cursor:pointer;text-decoration:underline;" onclick="icCollapseAllGroups()">collapse all</span></span>';
    if (tools) h += '<div style="display:flex;gap:8px;align-items:center;padding:0 4px 2px;font-size:var(--fs-9);white-space:nowrap;">' + tools + '</div>';
    if (runnable) h += '<div id="ic-nearest-msg" style="padding:0 4px;font-size:var(--fs-9);color:var(--text-secondary);"></div>';
    if (groups.length <= 1) {
      for (var a = 0; a < rows.length; a++) h += rowHtml(rows[a], rows, ctx, runnable);
      return h;
    }
    var big = L.length > 40;
    for (var g = 0; g < groups.length; g++) {
      var G = groups[g], key = G.start, hasSel = G.idx.indexOf(selTop) >= 0;
      if (!(key in T.collapsed)) T.collapsed[key] = big;
      if (hasSel && T._autoOpen) T.collapsed[key] = false;
      var col = !!T.collapsed[key], cnt = 0;
      for (var c = 0; c < G.idx.length; c++) if (byTop[G.idx[c]]) cnt++;
      var glyph = G.kind === 'boss' ? '&#9876;' : (G.kind === 'exit' ? '&#128682;' : '&#128295;');
      var color = G.kind === 'boss' ? 'var(--accent-red,#c44)' : (G.kind === 'exit' ? 'var(--accent-green)' : 'var(--accent-cyan)');
      h += '<div class="ic-tl-group-header" style="display:flex;align-items:center;gap:8px;padding:5px 8px;margin-top:5px;background:rgba(153,204,255,0.05);border:1px solid rgba(153,204,255,0.2);border-radius:4px;cursor:pointer;font-size:var(--fs-12);font-weight:bold;" onclick="icToggleGroup(' + key + ')">' +
        '<span style="font-size:var(--fs-10);color:var(--text-secondary);width:10px;">' + (col ? '&#9656;' : '&#9662;') + '</span>' +
        '<span style="color:' + color + ';font-size:var(--fs-13);">' + glyph + '</span>' +
        '<span style="flex:1;color:var(--header-gold);">' + esc(G.label) + '</span>' +
        '<span style="font-size:var(--fs-10);color:var(--text-secondary);font-weight:normal;">' + cnt + ' step' + (cnt === 1 ? '' : 's') + '</span></div>';
      if (col) continue;
      for (var j = 0; j < G.idx.length; j++) {
        var rr = byTop[G.idx[j]] || [];
        for (var q = 0; q < rr.length; q++) h += rowHtml(rr[q], rows, ctx, runnable);
      }
    }
    T._autoOpen = false;
    return h;
  };
  T.render = function () {
    var el = $('ic-timeline');
    if (!el) return;
    var top = el.scrollTop;
    el.innerHTML = T.html();
    el.scrollTop = top;
  };
  T.reveal = function () {
    T._autoOpen = true;
    T.render();
    try { var n = document.querySelector('#ic-timeline .ic-tl-node.selected'); if (n && n.scrollIntoView) n.scrollIntoView({ block: 'nearest' }); } catch (_e) {}
  };

  root.icToggleGroup = function (key) { T.collapsed[key] = !T.collapsed[key]; T.render(); };
  root.icExpandAllGroups = function () { var g = T.groups(); for (var i = 0; i < g.length; i++) T.collapsed[g[i].start] = false; T.render(); };
  root.icCollapseAllGroups = function () { var g = T.groups(); for (var i = 0; i < g.length; i++) T.collapsed[g[i].start] = true; T.render(); };
  root.icRenderTimeline = function () { T.render(); };
  root.icRenderList = root.icRenderTimeline;

  root.icSelectPath = function (ps) {
    U.flush();
    M().select(M().pathParse(ps));
    T.render();
    U.renderForm();
    if (root.icShowStepTab) root.icShowStepTab();
    if (root.icUpdateBreadcrumb) root.icUpdateBreadcrumb();
  };
  root.icSelectEnc = function (idx) { root.icSelectPath(String(idx)); };
  function op(fn) {
    U.flush();
    var p = M().st.sel;
    if (!p) { U.toast('Select a step first.'); return; }
    if (fn(p)) { U.changed(true); T.reveal(); }
  }
  root.icMoveUp = function () { op(function (p) { return M().move(p, -1); }); };
  root.icMoveDown = function () { op(function (p) { return M().move(p, 1); }); };
  root.icDupe = function () { op(function (p) { return M().dupe(p); }); };
  root.icDelete = function () { op(function (p) { return M().remove(p); }); };
  root.icAddIntoPath = function (ps, key) {
    var p = M().pathParse(ps);
    if (IC.picker && IC.picker.open) IC.picker.open({ into: p, key: key });
  };

  U.addEntry = function (entry, where) {
    U.flush();
    if (!M().editable()) { U.alert('Cannot add steps', 'This file is a ' + (M().st.fmt === 'wrapper' ? 'difficulty wrapper' : 'non-instance file') + '. Open its base file to edit steps.'); return null; }
    var p = Array.isArray(entry) ? M().insertMany(entry, where) : M().insert(entry, where);
    if (Array.isArray(entry) && p) {
      var base = p.slice(0, p.length - 1), i0 = p[p.length - 1], ctx = U.ctx();
      for (var k = 0; k < entry.length; k++) {
        var probs = IC.val.step(entry[k], ctx);
        if (probs.some(function (x) { return x.level === 'error' || x.level === 'warn'; })) { M().st.sel = base.concat([i0 + k]); break; }
        if (k === entry.length - 1) M().st.sel = p;
      }
    }
    U.changed(true);
    T.reveal();
    if (root.icShowStepTab) root.icShowStepTab();
    return p;
  };
  U.setSelectedField = function (key, val) {
    var e = M().selected(); if (!e) return;
    e[key] = val;
    U.changed(true);
  };

  U.renderForm = function () {
    var el = $('ic-form');
    if (!el) return;
    var st = M().st, e = M().selected();
    if (!M().editable() || !e) {
      el.innerHTML = '<div style="color:var(--text-secondary);text-align:center;padding:30px 16px;font-size:var(--fs-11);line-height:1.6;">' +
        (M().editable() ? 'Select a step in the timeline,<br>or click <b style="color:var(--accent-cyan);">+ Add Step</b>.' : 'No steps to edit in this file.') + '</div>';
      return;
    }
    var s = R().forEntry(e), ctx = U.ctx(), path = st.sel.slice(), num = path.length === 1 ? '#' + (path[0] + 1) : 'nested';
    var h = '<div class="icf-head"><span class="icf-icon">' + s.icon + '</span><span class="icf-title">' + esc(s.name) + '</span>' +
      '<span class="icf-num">' + num + '</span><span class="icf-jargon">' + esc(s.jargon || '') + '</span></div>';
    var help = (s.doHelp && R().inDoList(path)) ? s.doHelp : (s.help || '');
    h += '<div class="icf-desc">' + esc(help) + (s.more ? ' <span class="icf-morelink" onclick="icToggleSec(\'mhelp\')">more</span><div id="icsec-mhelp" style="display:none;margin-top:3px;">' + esc(s.more) + '</div>' : '') + '</div>';
    var pr = M().parent(path), probs = IC.val.step(e, ctx, pr ? pr.arr.slice(0, pr.idx) : []);
    for (var i = 0; i < probs.length; i++) {
      if (probs[i].f) continue;
      h += '<div class="icf-msg icf-' + probs[i].level + '"' + (probs[i].level === 'warn' && !R().typeActive(s, ctx.fmt) ? ' data-ic-inactive="1"' : '') + '>' + esc(probs[i].msg) + '</div>';
    }
    h += IC.form.render('m', e, {
      get: function () { return M().get(path); }, ctx: ctx, path: path,
      onChange: function (t, rr) { U.changed(rr); }
    });
    if (s.panel && IC.panels && IC.panels.extra && IC.panels.extra[s.panel]) h += IC.panels.extra[s.panel](e);
    var acts = '';
    if (R().typeActive(s, ctx.fmt) && (s.testAs || !s.tpl) && !s.noTest && s !== R().UNKNOWN) {
      acts += '<button class="btn btn-sm"' + IC.form.tip(s.testAs ? 'Fights just this named in game now (a quick check, not the whole block)' : 'Runs just this step in game now (your edits included)') + ' onclick="icTestStep()">&#9654; Test this step</button>';
    }
    if (st.fmt === 'v2' && st.fromDisk && path.length === 1) acts += '<button class="btn btn-sm" onclick="icRunFromStep(' + path[0] + ')">Run the saved file from here</button>';
    if (acts) h += '<div class="icf-actions">' + acts + '</div>';
    el.innerHTML = h;
  };
  root.icRenderForm = function () { U.renderForm(); };
  root.icSaveCurrentForm = function () { U.flush(); };
})(typeof window !== 'undefined' ? window : this);
