/* Open IC Creator - ic-flow-ui.js
   Overlay UI (IC.flowui): List / Flowchart / Both over the timeline, the chart's palette and quick add.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var FU = IC.flowui = IC.flowui || {};
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function U() { return IC.ui; }
  function M() { return IC.model; }
  function me() { return String(root._myCharName || ''); }
  function store(k, v) { try { if (v === undefined) return root.localStorage ? localStorage.getItem(k) : null; localStorage.setItem(k, v); } catch (_e) {} return null; }
  FU.mode = 'list'; FU.on = false; FU.find = ''; FU.view = { z: 0.9, x: 10, y: 10, mode: /^(parts|steps|side|part)$/.test(store('ic_flow_vmode') || '') ? store('ic_flow_vmode') : 'steps', compact: store('ic_flow_cmp') === '1', legend: store('ic_flow_legend') === '1',
    abicons: store('ic_flow_abicons') !== '0', palShut: store('ic_flow_palshut') === '1' ? true : (store('ic_flow_palshut') === '0' ? false : null) }; FU.handle = null; FU.problems = [];
  FU.mouse = { x: 200, y: 200 };
  FU.icons = null; FU.iconsAsked = false; FU.catchAsked = false; FU.itemsAsked = false;
  FU.loadIcons = function () {
    if (typeof requestFileWith !== 'function' || !IC.words) return;
    if (!FU.catchAsked && IC.catch) { FU.catchAsked = true; IC.catch.load(function () { if (FU.on) FU.render(); }, false); }
    if (FU.view.abicons === false) return;
    if (!FU.iconsAsked) {
      FU.iconsAsked = true;
      requestFileWith('Data/census/spell_icons.txt', function (p, c) {
        FU.icons = c ? IC.words.parseSpellIconPairs(c) : null;
        FU.cls = c && IC.words.parseSpellClasses ? IC.words.parseSpellClasses(c) : null;
        if (FU.on) FU.render();
      });
    }
    if (!IC.itemIcons && !FU.itemsAsked && typeof lazyLoadJS === 'function') {
      FU.itemsAsked = true;
      lazyLoadJS('js/ic-itemicons.js', function () { if (FU.on) FU.render(); });
    }
  };
  FU.applyIcons = function () {
    var on = FU.view.abicons !== false, I = IC.icons, X = IC.itemIcons;
    if (X) { X.enabled = on; X.onChange = function () { if (FU.on) FU.render(); }; }
    if (I) { I.off = !on; I.abilPair = on ? FU.abilPair : null; I.itemPair = on && X ? X.idFor : null; }
    if (I) {
      var me = FU.classes();
      I.myClass = me.mine; I.groupClasses = me.grp; I.canClass = typeof jbClassIcon === 'function';
      I.abilClasses = FU.cls && IC.words.spellClasses ? function (n) { return IC.words.spellClasses(FU.cls, n) || []; } : null;
    }
    if (on && FU.on) FU.loadIcons();
  };
  FU.classes = function () {
    var d = null, mine = '', grp = [];
    try { d = (typeof _allCharacters !== 'undefined' && _allCharacters[_selectedCharIdx]) || null; } catch (e) { d = null; }
    if (d) {
      mine = String(d.player_subclass || '').toLowerCase();
      if (mine) grp.push(mine);
      var ro = d.group_roster || [];
      for (var i = 0; i < ro.length; i++) {
        var m = ro[i], c = m && !m.self && (!m.type || String(m.type).toLowerCase() === 'pc') ? String(m['class'] || '').toLowerCase() : '';
        if (c && grp.indexOf(c) < 0) grp.push(c);
      }
    }
    return { mine: mine, grp: grp };
  };
  FU.setAbIcons = function (on) {
    FU.view.abicons = !!on;
    FU.saveView();
    FU.render();
  };
  FU.abilPair = function (name) { return FU.icons && IC.words ? IC.words.spellIconPair(FU.icons, name) : null; };
  FU.abilIcon = function (name, px) {
    var p = IC.icons && IC.icons.forAbil ? IC.icons.forAbil(name) : null;
    return p && p.id > 0 ? FU.gameIcon(p, px || 16) : '';
  };
  FU.iconById = function (id, back) { return +id > 0 ? FU.gameIcon({ id: +id, back: back == null ? -1 : back }, 15) : ''; };
  function layer(html) { return html.replace('display:inline-block;', 'position:absolute;left:0;top:0;display:block;'); }
  FU.gameIcon = function (gi, px) {
    if (gi && gi.cls && typeof jbClassIcon === 'function') return jbClassIcon(gi.cls, px || 16);
    if (!gi || !(+gi.id > 0) || typeof invItemIcon !== 'function') return '';
    px = px || 16;
    if (gi.item) return invItemIcon({ icon_id: +gi.id }, px, false);
    var bt = IC.icons && IC.icons.backTile ? IC.icons.backTile(gi.back) : (+gi.back > 0 ? +gi.back : -1);
    var main = invItemIcon({ icon_id: +gi.id }, px, true), back = bt > 0 ? invItemIcon({ icon_id: bt }, px, true) : '';
    if (!back) return main;
    return '<span style="position:relative;display:inline-block;width:' + px + 'px;height:' + px + 'px;vertical-align:middle;">' + layer(back) + layer(main) + '</span>';
  };
  FU.palette = function () {
    var P = IC.icflow.PALETTE, out = [];
    if (IC.icflow.palIcons) IC.icflow.palIcons();
    if (FU._armPath !== M().st.path) { FU.view.armed = null; FU._pend = null; FU._armPath = M().st.path; }
    var pd = FU._pend;
    if (pd) {
      var grew = listLen(pd.seq) - pd.len;
      if (grew > 0) { FU._pend = null; if (IC.fv.armNext) IC.fv.armNext(FU.view, pd.seq, pd.idx + grew); }
      else if (!(IC.picker && IC.picker.state && IC.picker.state.page) && !(IC.impui && IC.impui.isOpen && IC.impui.isOpen()) && !$('icc-menu')) FU._pend = null;
    }
    for (var i = 0; i < P.length; i++) {
      var c = {};
      for (var k in P[i]) if (P[i].hasOwnProperty(k)) c[k] = P[i][k];
      if (IC.icons) c.gi = IC.icons.forPalette(c.key, c.role);
      var made = null;
      try { made = typeof P[i].make === 'function' ? P[i].make() : null; } catch (_e) { made = null; }
      var ap = made && made.ability && IC.icons && IC.icons.forAbil ? IC.icons.forAbil(made.ability) : null;
      if (ap) c.gi = ap;
      out.push(c);
    }
    return out;
  };

  FU.injectStyle = function () {
    if ($('ic-flow-style')) return;
    var css = [
      '#creator-ic.ic-flow-on .ic-panel-left{width:64% !important;max-width:none !important;min-width:420px !important;}',
      '#creator-ic.ic-flow-on.ic-flow-only #ic-timeline{display:none !important;}',
      '#creator-ic.ic-flow-both #ic-flow{flex:none;height:48vh;min-height:260px;}',
      '#creator-ic.ic-flow-both #ic-timeline{border-top:1px solid var(--border-dark,#2a3346);margin-top:4px;}',
      '#creator-ic.ic-flow-only .ic-tl-edit{display:none !important;}',
      '#creator-ic.ic-flow-only .ic-tl-acts{flex-direction:row !important;gap:4px !important;}',
      '#creator-ic.ic-flow-only .ic-tl-acts>button{flex:1;width:auto !important;}',
      '#creator-ic.ic-flow-only .ic-tl-btns button{min-width:56px;}',
      '.icfl-sw{display:inline-block;flex:none;white-space:nowrap;margin-left:2px;border:1px solid var(--border-dark,#2a3346);border-radius:4px;overflow:hidden;vertical-align:middle;}',
      '.icfl-sw span{display:inline-block;padding:1px 6px;font-size:var(--fs-10);cursor:pointer;color:var(--text-secondary,#8a96a8);}',
      '.icfl-sw span.on{background:var(--tint-on,rgba(153,204,255,0.16));color:var(--accent-cyan,#9cf);box-shadow:inset 0 -2px 0 var(--accent-cyan,#9cf);font-weight:bold;}',
      '.icfl-bar{display:none;position:relative;align-items:center;flex-wrap:nowrap;flex-shrink:0;padding:3px 2px;font-size:var(--fs-10);color:var(--text-secondary,#8a96a8);white-space:nowrap;}',
      '#creator-ic.ic-flow-on .icfl-bar{display:flex;}',
      '.icfl-bar>*{margin-right:6px;}',
      '.icfl-bar input[type=text]{flex:0 1 150px;min-width:70px;font-size:var(--fs-10);padding:2px 6px;}',
      '.icfl-hint{flex:1;min-width:0;margin-right:0;overflow:hidden;text-overflow:ellipsis;text-align:right;opacity:.75;}',
      '.icfl-more{display:none;position:absolute;top:100%;z-index:40;min-width:200px;padding:2px 10px 8px;background:var(--bg-panel);border:1px solid var(--border-med);border-radius:4px;box-shadow:0 6px 18px rgba(0,0,0,0.55);white-space:normal;}',
      '.icfl-more.open{display:block;}',
      '.icfl-more .icfl-mh{margin:6px 0 3px;font-size:var(--fs-9);color:var(--text-secondary,#8a96a8);}',
      '.icfl-more .icfl-btn{display:inline-block;margin:0 4px 2px 0;}',
      '.fv-tools.fv-topen{z-index:30;}',
      '.fv-tools .fv-tmenu{display:none;position:absolute;right:0;top:23px;padding:4px;background:var(--bg-panel);border:1px solid var(--border-med);border-radius:4px;box-shadow:0 6px 18px rgba(0,0,0,0.55);}',
      '.fv-tools.fv-topen .fv-tmenu{display:block;}',
      '.fv-tools .fv-tmenu span{display:block;position:relative;margin:0 0 3px 0;padding-left:20px;}',
      '.fv-tools .fv-tmenu span:last-child{margin-bottom:0;}',
      '.fv-tools .fv-tmenu span.fv-on{border-color:rgba(140,160,190,0.35);color:var(--accent-cyan,#9cf);}',
      '.fv-tools .fv-tmenu span.fv-on::before{content:"\\2713";position:absolute;left:6px;}',
      '.icfl-bar label{display:inline-flex;align-items:center;gap:3px;cursor:pointer;}',
      '.icfl-btn{padding:1px 8px;border:1px solid var(--border-dark,#2a3346);border-radius:4px;cursor:pointer;color:var(--text-primary,#dde);background:var(--tint-hover,rgba(255,255,255,0.03));}',
      '.icfl-btn:hover{background:var(--tint-on,rgba(153,204,255,0.12));}',
      '.icfl-btn.bad{border-color:var(--line-bad,#e05a5a);color:var(--text-bad,#ff9a9a);}',
      '.icfl-btn.live{border-color:var(--accent-cyan,#9cf);color:var(--accent-cyan,#9cf);}',
      '#ic-flow{display:none;flex:1;min-height:150px;margin-top:2px;}',
      '#ic-flow .fv-parts{max-height:50px;}',
      '@media (max-width:860px){#ic-flow .fv-vw span{padding:0 6px;}#ic-flow .fv-tools>span{padding:0 6px;}#creator-ic.ic-flow-on .icf-row{grid-template-columns:110px 1fr;}}',
      '@media (max-height:600px){#creator-ic.ic-flow-both #ic-flow{flex:7 1 0;height:auto;min-height:130px;}#creator-ic.ic-flow-both #ic-timeline{flex:3 1 0;}}',
      '@media (max-height:470px){#ic-flow .fv-mini{display:none !important;}#ic-flow .fv-legend{bottom:6px !important;max-height:calc(100% - 50px) !important;}}',
      '#creator-ic.ic-flow-on #ic-flow{display:block;}',
      '#icfl-probs{display:none;position:absolute;z-index:60;max-height:260px;width:360px;overflow-y:auto;background:var(--bg-deep,#0b1120);border:1px solid var(--line-bad,#e05a5a);border-radius:5px;padding:4px 0;box-shadow:0 6px 18px rgba(0,0,0,0.6);}',
      '#icfl-probs div{padding:3px 10px;font-size:var(--fs-10);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '#icfl-probs div:hover{background:var(--tint-hover,rgba(255,255,255,0.06));}',
      '#icfl-probs b{color:var(--text-bad,#ff8080);margin-right:6px;}',
      '#icfl-probs b.w{color:var(--text-warn,#f2c94c);}'
    ].join('\n');
    var st = document.createElement('style');
    st.id = 'ic-flow-style';
    st.textContent = css;
    document.head.appendChild(st);
  };

  FU.build = function () {
    var tl = $('ic-timeline');
    if (!tl || $('ic-flow')) return !!$('ic-flow');
    FU.injectStyle();
    var head = $('ic-tl-head') || tl.previousElementSibling, qt = $('ic-quicktools-bar');
    if (head) {
      var sw = document.createElement('span');
      sw.className = 'icfl-sw';
      sw.innerHTML = '<span data-icfl="list">List</span><span data-icfl="flow">Flowchart</span><span data-icfl="both">Both</span>';
      if (qt && qt.parentNode === head) head.insertBefore(sw, qt); else head.appendChild(sw);
    }
    var bar = document.createElement('div');
    bar.className = 'icfl-bar';
    bar.id = 'icfl-bar';
    bar.innerHTML = '<span>Find</span><input type="text" class="input-text" id="icfl-find" placeholder="a name, a verb, a spot...">' +
      '<span class="icfl-btn" data-icfl="probs" id="icfl-probbtn" title="What the checks found in this file: click one to go to its box">Problems: 0</span>' +
      '<span class="icfl-btn" data-icfl="more" id="icfl-morebtn" title="A rule from a fight, grabbing names">More &#9662;</span>' +
      '<span class="icfl-hint">drag boxes onto a + to move them</span>' +
      '<div class="icfl-more" id="icfl-more">' +
      '<div class="icfl-mh">From JB Analysis</div>' +
      '<span class="icfl-btn" data-icfl="catch" title="Make a rule from what happened in a fight: a line, red text, a spawn, a cast, a detriment. With a fight selected it goes into that fight">From fights...</span>' +
      '<div class="icfl-mh">New steps</div>' +
      '<label title="A new step that needs a name (a mob, an object, an NPC) grabs it from your mouse in game after 3 seconds">' +
      '<input type="checkbox" id="icfl-auto"> Grab names by hovering</label></div>';
    tl.parentNode.insertBefore(bar, tl);
    var host = document.createElement('div');
    host.id = 'ic-flow';
    tl.parentNode.insertBefore(host, tl);
    var pr = document.createElement('div');
    pr.id = 'icfl-probs';
    document.body.appendChild(pr);
    document.addEventListener('click', FU.onClick);
    document.addEventListener('mousemove', function (e) { FU.mouse = { x: e.clientX, y: e.clientY }; });
    var f = $('icfl-find');
    if (f) {
      var go = function () { FU.find = f.value; FU.render(); };
      f.addEventListener('input', go);
      f.addEventListener('keyup', go);
    }
    var au = $('icfl-auto');
    if (au && IC.catch) {
      au.checked = IC.catch.autoOn();
      au.addEventListener('change', function () { IC.catch.setAuto(au.checked); });
    }
    return true;
  };
  FU.onClick = function (e) {
    var t = e.target, v = null;
    for (; t && t.getAttribute; t = t.parentNode) { v = t.getAttribute('data-icfl'); if (v) break; }
    var pp = $('icfl-probs');
    if (v !== 'probs' && pp && pp.style.display === 'block' && !(t && t.id === 'icfl-probs')) pp.style.display = 'none';
    if (!v) { FU.closeFolds(e, v); return; }
    if (v === 'list' || v === 'flow' || v === 'both') FU.set(v);
    else if (v === 'probs') FU.showProblems(t);
    else if (v === 'more') FU.toggleMore(t);
    else if (v === 'catch') FU.fromFights(t, null);
    else if (v.indexOf('pr:') === 0) { if (pp) pp.style.display = 'none'; FU.select(v.slice(3), true); }
    FU.closeFolds(e, v);
  };
  FU.toggleMore = function (btn) {
    var mr = $('icfl-more');
    if (!mr) return;
    if (mr.classList.contains('open')) { mr.classList.remove('open'); return; }
    mr.classList.add('open');
    mr.style.left = Math.max(0, Math.min(btn ? btn.offsetLeft : 0, mr.parentNode.clientWidth - mr.offsetWidth - 2)) + 'px';
    if (root.jbTip && root.jbTip.hide) root.jbTip.hide();
  };
  FU.toggleTools = function () {
    var host = $('ic-flow'), tb = host ? host.querySelector('.fv-tools') : null;
    FU.view.toolsOpen = !FU.view.toolsOpen;
    if (tb) tb.classList[FU.view.toolsOpen ? 'add' : 'remove']('fv-topen');
    if (FU.view.toolsOpen && root.jbTip && root.jbTip.hide) root.jbTip.hide();
  };
  function within(el, cls) {
    for (; el && el.getAttribute; el = el.parentNode) if ((' ' + el.getAttribute('class') + ' ').indexOf(' ' + cls + ' ') >= 0) return true;
    return false;
  }
  function toolOf(el) {
    for (; el && el.getAttribute; el = el.parentNode) { var a = el.getAttribute('data-fv-tool'); if (a) return a; }
    return '';
  }
  FU.closeFolds = function (e, v) {
    var mr = $('icfl-more');
    if (mr && mr.classList.contains('open') && v !== 'more' && (v || !within(e.target, 'icfl-more'))) mr.classList.remove('open');
    if (FU.view.toolsOpen && (!within(e.target, 'fv-tools') || toolOf(e.target) === 'all')) FU.toggleTools();
  };
  FU.set = function (mode) {
    if (mode === true) mode = 'flow';
    if (mode === false || (mode !== 'flow' && mode !== 'both')) mode = 'list';
    FU.mode = mode;
    FU.on = mode !== 'list';
    store('ic_flow_mode', mode);
    var box = $('creator-ic');
    if (box) {
      box.classList[FU.on ? 'add' : 'remove']('ic-flow-on');
      box.classList[mode === 'flow' ? 'add' : 'remove']('ic-flow-only');
      box.classList[mode === 'both' ? 'add' : 'remove']('ic-flow-both');
    }
    var sws = document.querySelectorAll('.icfl-sw span');
    for (var i = 0; i < sws.length; i++) sws[i].className = sws[i].getAttribute('data-icfl') === mode ? 'on' : '';
    if (FU.on) { FU.loadIcons(); FU.render(true); setTimeout(function () { if (FU.handle) FU.handle.fit(); }, 30); }
    if (mode !== 'flow' && IC.tl && IC.tl.render) IC.tl.render();
  };

  FU.render = function (reveal) {
    var host = $('ic-flow');
    if (!FU.on || !host || !IC.icflow) return;
    FU.applyIcons();
    var g = IC.icflow.graph({ reveal: !!reveal || FU._reveal, find: FU.find, split: !!FU.view.mode && FU.view.mode !== 'steps' });
    FU._reveal = false;
    FU.problems = g.problems || [];
    var pb = $('icfl-probbtn');
    if (pb) { pb.textContent = 'Problems: ' + FU.problems.length; pb.className = 'icfl-btn' + (FU.problems.length ? ' bad' : ''); }
    FU.handle = IC.fv.render(host, g, {
      view: FU.view, palette: FU.palette(), abilIcon: FU.abilIcon, iconById: FU.iconById, gameIcon: FU.gameIcon, onAbIcons: FU.setAbIcons,
      foldTools: true, palFold: true, onTool: function (t) { if (t === 'viewmenu') FU.toggleTools(); },
      emptyText: 'No steps yet: click a chip at the bottom (or drag it onto the +), or use + Add Step.',
      onView: function (v) { FU.view = v; FU.saveView(); },
      onMode: function () { FU.saveView(); FU.render(); },
      onSelect: function (ref) { FU.select(ref, false); },
      onInsert: function (seq, idx) { if (IC.picker && IC.picker.open) IC.picker.open(IC.icflow.target(seq, idx)); },
      onToggle: function (key) { IC.icflow.open[key] = !IC.icflow.open[key]; FU.render(); },
      onAct: FU.act, onMove: FU.move, onDropNew: FU.dropNew, onPick: FU.quickAdd
    });
    if (g.hits && g.hits.length && FU.handle) FU.handle.reveal(g.hits[0]);
    else if (reveal && FU.handle && M().st.sel) FU.handle.reveal('p' + M().pathStr(M().st.sel));
  };
  FU.saveView = function () {
    var v = FU.view, k = (v.mode || 'steps') + '|' + (v.compact ? 1 : 0) + '|' + (v.legend ? 1 : 0) + '|' + (v.abicons === false ? 0 : 1) + '|' + (v.palShut == null ? '' : v.palShut ? 1 : 0);
    if (k === FU._viewKey) return;
    FU._viewKey = k;
    store('ic_flow_vmode', v.mode || 'steps');
    store('ic_flow_cmp', v.compact ? '1' : '0');
    store('ic_flow_legend', v.legend ? '1' : '0');
    store('ic_flow_abicons', v.abicons === false ? '0' : '1');
    if (v.palShut != null) store('ic_flow_palshut', v.palShut ? '1' : '0');
  };
  FU.select = function (ref, reveal) {
    if (ref == null) return;
    if (typeof root.icSelectPath === 'function') root.icSelectPath(ref);
    FU._reveal = !!reveal;
    FU.render(reveal);
  };
  FU.act = function (act, ref, node) {
    U().flush();
    var span = node && node.span > 1 ? node.span : 1;
    if (act === 'del' && span > 1) {
      U().confirm('Delete ' + span + ' steps?', '"' + node.title + '" stands for ' + span + ' steps. Delete them all? (Undo brings them back.)', function (yes) {
        if (yes && IC.icflow.removeSpan(ref, span)) U().changed(true);
      });
      return;
    }
    M().select(M().pathParse(ref));
    if (act === 'up' && typeof root.icMoveUp === 'function') root.icMoveUp();
    else if (act === 'down' && typeof root.icMoveDown === 'function') root.icMoveDown();
    else if (act === 'dup' && typeof root.icDupe === 'function') root.icDupe();
    else if (act === 'del' && typeof root.icDelete === 'function') root.icDelete();
  };
  FU.move = function (ref, seq, idx, node) {
    U().flush();
    var why = IC.icflow.move(ref, node && node.span > 1 ? node.span : 1, seq, idx);
    if (why) { U().toast(why, 'warn'); FU.render(); return; }
    FU._reveal = true;
    U().changed(true);
  };
  FU.dropNew = function (key, seq, idx) {
    U().flush();
    var item = IC.icflow.paletteItem(key), target = IC.icflow.target(seq, idx), only = IC.icflow.onlyFor(seq);
    if (key === 'catch') { FU.pendArm(seq, idx); FU.fromFights(FU.mouse, { target: target, only: only }); return; }
    if (key === 'import' || key.indexOf('snip:') === 0) {
      if (!M().editable()) { U().toast('Open an instance file (or start a new one) first.', 'warn'); return; }
      if (only) { U().toast('Steps from a snippet or another file cannot go inside a fight rule.', 'warn'); return; }
      if (!IC.impui) { U().toast('The import dialog is still loading. Try again in a moment.', 'warn'); return; }
      var ls = FU._lastSlot && FU._lastSlot.seq === seq && FU._lastSlot.idx === idx ? FU._lastSlot : { seq: seq, idx: idx };
      FU._lastSlot = null;
      if (key === 'import') IC.impui.open(ls); else IC.impui.snip(key.slice(5), ls);
      return;
    }
    if (item && item.make) {
      var e = item.make();
      if (only && only.indexOf(e.type) < 0) { U().toast('"' + item.label + '" cannot run there.', 'warn'); return; }
      FU.insertAt(e, { seq: seq, idx: idx });
      return;
    }
    var K = IC.picker;
    if (!K) return;
    if (key.indexOf('tpl:') === 0) {
      if (only) { U().toast('A ready-made section cannot go inside a fight rule.', 'warn'); return; }
      FU.pendArm(seq, idx);
      K.open(target);
      if (typeof root.icWizCombo === 'function') root.icWizCombo(key.slice(4));
      return;
    }
    if (only && only.indexOf(key.replace(/^T:/, '')) < 0) { U().toast('That step cannot run there.', 'warn'); return; }
    FU.pendArm(seq, idx);
    K.open(target);
    K.pick(key);
  };
  FU.quickAdd = function (key, slot) {
    if (!slot || !slot.seq) slot = { seq: { p: '', k: '' }, idx: M().list().length, how: 'end' };
    FU._lastSlot = slot;
    FU.dropNew(key, slot.seq, slot.idx);
    FU._lastSlot = null;
  };
  FU.insertAt = function (entries, slot) {
    var n = Array.isArray(entries) ? entries.length : (entries ? 1 : 0);
    if (!n) return null;
    var target = slot && slot.seq ? IC.icflow.target(slot.seq, slot.idx) : (slot && slot.target) || undefined;
    if (slot && slot.seq && IC.fv.armNext) IC.fv.armNext(FU.view, slot.seq, slot.idx + n);
    FU._reveal = true;
    return U().addEntry(entries, target);
  };
  function listLen(seq) {
    if (!seq || (seq.p === '' && seq.k === '')) return M().list().length;
    var host = M().get(M().pathParse(seq.p));
    return host && Array.isArray(host[seq.k]) ? host[seq.k].length : 0;
  }
  FU.pendArm = function (seq, idx) { FU._pend = { seq: seq, idx: idx, len: listLen(seq) }; };

  function isFight(e) { return !!e && (e.type === 'COMBAT' || e.type === 'KILL' || e.template === 'named_encounter'); }
  function ruleTarget() {
    var sel = M().st.sel, top = sel ? M().get([sel[0]]) : null;
    if (isFight(top)) return { target: { into: [sel[0]], key: 'fight_rules' }, fight: top };
    return { target: sel ? { after: [sel[0]] } : { after: [M().list().length - 1] }, fight: null };
  }
  FU.addRule = function (item, at) {
    if (!IC.catch || !M().editable()) { U().toast('Open an instance file (or start a new one) first.', 'warn'); return false; }
    var rule = IC.catch.ruleFor(item);
    if (!rule) { U().toast('That one cannot start a rule (a detriment needs its icon: open the Detriments tab once in a fight).', 'warn'); return false; }
    var where = at || ruleTarget();
    if (where.only && where.only.indexOf('ON_EVENT') < 0) { U().toast('A rule cannot go inside another rule\'s steps.', 'warn'); return false; }
    U().flush();
    FU._reveal = true;
    U().addEntry(rule, where.target);
    U().toast('Rule added: when "' + (item.text || item.name || 'this') + '"' + (where.fight ? ' during ' + (where.fight.data || where.fight.boss || 'the fight') : '') +
      '. Now add what to do: drop steps on its "then do" +.', 'ok');
    return true;
  };
  FU.addStep = function (item) {
    if (!M().editable()) { U().toast('Open an instance file (or start a new one) first.', 'warn'); return false; }
    var doc = M().st.doc, zone = !!(IC.imp && IC.imp.isZoneFile && IC.imp.isZoneFile(doc)), e = item && (zone ? item.native : item.step);
    if (!e || typeof e !== 'object') { U().toast('That pick has no step to add.', 'warn'); return false; }
    e = JSON.parse(JSON.stringify(e));
    var sl = M().st.sel, where;
    if (zone && !e.stepId && IC.snip) {
      var L = M().list(), at = sl ? sl[0] + 1 : L.length, o = { stepId: IC.snip.freeId(IC.snip.usedIds(doc), IC.snip.prefixAt(L, at), 'verb') };
      for (var k in e) if (e.hasOwnProperty(k)) o[k] = e[k];
      e = o;
    }
    var only = IC.picker && IC.picker.onlyFor && sl ? IC.picker.onlyFor({ after: sl }) : null;
    if (only && only.indexOf(String(e.type)) < 0) where = { after: [sl[0]] };
    U().flush();
    FU._reveal = true;
    U().addEntry(e, where);
    U().toast('Step added: ' + (item.verb ? '"' + item.verb + '"' : 'a verb') + (item.name ? ' on ' + item.name : '') + '.', 'ok');
    return true;
  };
  FU.fromFights = function (anchor, at) {
    if (!IC.catch) return;
    if (!M().editable()) { U().toast('Open an instance file (or start a new one) first.', 'warn'); return; }
    IC.catch.menu(anchor, 'rule', function (v, item) { FU.addRule(item, at); });
  };
  var catchLast = parseFloat(store('ic_catch_last'));
  FU.inbox = { last: (catchLast > 0 && catchLast < Date.now() + 864e5) ? catchLast : 0 };
  FU.pollInbox = function () {
    var box = $('creator-ic');
    if (!me() || !box || box.offsetParent === null || typeof requestFileWith !== 'function') return;
    requestFileWith('Data/jbcatch_' + me() + '.json', function (p, c) {
      var d = null;
      try { d = c ? JSON.parse(c) : null; } catch (_e) { d = null; }
      if (!d || !d.picks || !d.picks.length) return;
      var fresh = [];
      for (var i = 0; i < d.picks.length; i++) if (d.picks[i] && d.picks[i].id > FU.inbox.last && d.picks[i].item) fresh.push(d.picks[i]);
      if (!fresh.length) return;
      IC.catch.load(function () {
        var took = 0;
        for (var j = 0; j < fresh.length; j++) {
          FU.inbox.last = Math.max(FU.inbox.last, fresh[j].id);
          if (fresh[j].item.k === 'step' ? FU.addStep(fresh[j].item) : FU.addRule(fresh[j].item, null)) took++;
        }
        store('ic_catch_last', String(FU.inbox.last));
        if (took && typeof sendCommand === 'function') sendCommand('delete_file', 'Data/jbcatch_' + me() + '.json');
      }, false);
    });
  };

  FU.showProblems = function (btn) {
    var pp = $('icfl-probs');
    if (!pp) return;
    if (pp.style.display === 'block') { pp.style.display = 'none'; return; }
    var h = '';
    for (var i = 0; i < FU.problems.length && i < 200; i++) {
      var p = FU.problems[i];
      h += '<div data-icfl="pr:' + esc(p.ref) + '"><b class="' + (p.level === 'error' ? '' : 'w') + '">' + (p.level === 'error' ? '!' : '?') + '</b>' + esc(p.title) + ' -- ' + esc(p.msg) + '</div>';
    }
    pp.innerHTML = h || '<div>No problems found.</div>';
    var r = btn.getBoundingClientRect();
    pp.style.left = Math.round(r.left) + 'px';
    pp.style.top = Math.round(r.bottom + 4) + 'px';
    pp.style.display = 'block';
  };

  FU.init = function () {
    if (!FU.build()) return;
    var orig = U().refresh;
    if (!orig._icfl) {
      U().refresh = function () {
        var r = orig.apply(this, arguments);
        if (FU.on) FU.render(FU._reveal);
        return r;
      };
      U().refresh._icfl = true;
    }
    var saved = store('ic_flow_mode') || (store('ic_flow_on') === '1' ? 'flow' : 'list');
    FU.set(saved);
    if (!FU._inboxTimer) FU._inboxTimer = setInterval(FU.pollInbox, 2000);
  };
  if (IC.whenReady) IC.whenReady(function () { setTimeout(FU.init, 0); });
})(typeof window !== 'undefined' ? window : this);
