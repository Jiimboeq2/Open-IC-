/* Open IC Creator - ic-ui-picker.js
   Overlay UI (IC.picker): the "+ Add Step" picker, the quick-add bar and multi-step section templates.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var K = IC.picker = IC.picker || {};
  var U = IC.ui = IC.ui || {};
  function $(id) { return (typeof document !== 'undefined') ? document.getElementById(id) : null; }
  function esc(s) { return IC.form.esc(s); }
  function str(v) { return v == null ? '' : String(v); }
  function M() { return IC.model; }
  function R() { return IC.reg; }

  K.TEMPLATES = [
    { id: 'boss', icon: '&#9876;', name: 'Boss section',
      desc: 'Checkpoint, note, camp spot, buff, fight, loot -- the group fights from the camp spot.',
      fields: [
        { key: 'boss', kind: 'text', label: 'Named', req: true, grab: ['target'], help: 'Exact boss name.' },
        { key: 'spot', kind: 'pos', label: 'Fight from here', grab: ['pos'], help: 'Where the group stands for the fight. Fill it later if you are not there yet.' },
        { key: 'buff', kind: 'check', label: 'Buff up before the pull (11 s)', on: '1' }
      ],
      init: function (ctx) { return { boss: '', spot: '', buff: (ctx.diffName === 'solo' ? '' : '1') }; },
      build: function (v, n) {
        var b = str(v.boss);
        var out = [{ type: 'WIPE_RECOVERY', data: b, boss: b, wipe_num: String(n) }, { type: 'COMMENT', data: '=== Named ' + n + ': ' + b + ' ===' },
          { type: 'CAMPSPOT', data: str(v.spot), distance: '5' }];
        if (v.buff) out.push({ type: 'PREBUFF', data: '11' });
        out.push({ type: 'COMBAT', data: b }, { type: 'CHEST', data: '' });
        return out;
      } },
    { id: 'exit', icon: '&#128682;', name: 'Leave the zone (evac)',
      desc: 'Wait for the fight to end, evac the group, wait for the zone change.',
      fields: [], init: function () { return {}; },
      build: function () { return [{ type: 'COMMENT', data: '=== Zone exit ===' }, { type: 'WAITCOMBAT', data: '' }, { type: 'EVAC', data: '' }, { type: 'WAITZONE', data: '' }]; } },
    { id: 'door', icon: '&#128273;', name: 'Leave by the exit door',
      desc: 'Move the group to the door, use it, wait for the zone change.',
      fields: [
        { key: 'spot', kind: 'pos', label: 'At the door', grab: ['pos'] },
        { key: 'door', kind: 'text', label: 'Door', req: true, grab: ['hover', 'target'], help: 'Hover the door in game and click Hover.' },
        { key: 'verb', kind: 'text', label: 'Verb', help: 'Optional. Example: use' }
      ], init: function () { return { spot: '', door: '', verb: 'use' }; },
      build: function (v) {
        var c = { type: 'CLICK', data: str(v.door) }; if (str(v.verb)) c.verb = str(v.verb);
        return [{ type: 'COMMENT', data: '=== Zone exit ===' }, { type: 'WAYPOINT', data: str(v.spot) }, c, { type: 'WAITZONE', data: '' }];
      } },
    { id: 'teleporter', icon: '&#10024;', name: 'Use a teleporter',
      desc: 'Move the group next to it, use it, wait 3 s.',
      fields: [
        { key: 'spot', kind: 'pos', label: 'Next to it', grab: ['pos'] },
        { key: 'actor', kind: 'text', label: 'Teleporter', req: true, grab: ['hover', 'target'] },
        { key: 'verb', kind: 'text', label: 'Verb', help: 'Optional. Example: Teleport' }
      ], init: function () { return { spot: '', actor: '', verb: '' }; },
      build: function (v) {
        var c = { type: 'CLICK', data: str(v.actor) }; if (str(v.verb)) c.verb = str(v.verb);
        return [{ type: 'WAYPOINT', data: str(v.spot) }, c, { type: 'WAIT', data: '3' }];
      } },
    { id: 'trash', icon: '&#128481;', name: 'Clear a room',
      desc: 'Move the group in and keep killing every mob with this name in range.',
      fields: [
        { key: 'spot', kind: 'pos', label: 'Room spot', grab: ['pos'] },
        { key: 'mob', kind: 'text', label: 'Mob name', req: true, grab: ['target'] },
        { key: 'radius', kind: 'int', label: 'Within', unit: 'm', min: 1, max: 500 }
      ], init: function () { return { spot: '', mob: '', radius: '35' }; },
      build: function (v) { return [{ type: 'WAYPOINT', data: str(v.spot) }, { type: 'CLEARAREA', data: str(v.mob), radius: str(v.radius || '35') }]; } }
  ];
  K.snipTemplates = function () { if (!K._snipTpl && IC.snip && IC.snip.asTemplates) K._snipTpl = IC.snip.asTemplates('jqb'); return K._snipTpl || []; };
  K.allTemplates = function () { return K.TEMPLATES.concat(K.snipTemplates()); };
  K.tplById = function (id) { var T = K.allTemplates(); for (var i = 0; i < T.length; i++) if (T[i].id === id) return T[i]; return null; };

  K.LEGACY = { campspot: 'CAMPSPOT', navigate: 'WAYPOINT', boss: 'COMBAT', chest: 'CHEST', wait: 'WAIT', comment: 'COMMENT',
    oc: 'OC', target: 'TARGET', prebuff: 'PREBUFF', wipe_recovery: 'WIPE_RECOVERY', waitactor: 'WAITACTOR', movetoactor: 'MOVETOACTOR',
    click: 'CLICK', talk: 'TALK', zoneout: 'ZONEOUT', setup: 'SETUP', custom: 'CMD', rune: 'RUNE', ifblock: 'IF', whileloop: 'WHILE',
    trash: 'CLEARAREA', teleporter: 'CLICK', shinies: 'CMD', waittext: 'WAITTEXT', onevent: 'ON_EVENT', phase: 'PHASE', ogresettings: 'OC' };
  K.schemaFor = function (key) {
    if (!key) return null;
    var s = R().byKey(key) || R().types[str(key).toUpperCase()] || (K.LEGACY[key] && R().types[K.LEGACY[key]]);
    if (!s && R().alias[key]) s = R().types[R().alias[key]];
    return s || null;
  };

  K.state = { page: 0, target: null, schema: null, tpl: null, draft: null, q: '' };
  K.menuHtml = function (ctx, q) {
    q = str(q).toLowerCase();
    var groups = R().menu(ctx), h = '';
    for (var g = 0; g < groups.length; g++) {
      var cat = groups[g].cat, cards = '';
      for (var i = 0; i < groups[g].items.length; i++) {
        var s = groups[g].items[i];
        if (q && (s.name + ' ' + s.help + ' ' + s.jargon + ' ' + (s.aliases || []).join(' ')).toLowerCase().indexOf(q) < 0) continue;
        cards += '<div class="ic-wizard-card" style="border-left:2px solid ' + cat.color + ';"' + (R().typeActive(s, ctx.fmt) ? '' : ' data-ic-inactive="1"') +
          ' onclick="icWizPickType(\'' + s.key + '\')"><div class="ic-wizard-card-icon">' + s.icon + '</div><div class="ic-wizard-card-body">' +
          '<div class="ic-wizard-card-title">' + esc(s.name) + '</div><div class="ic-wizard-card-desc">' + esc((ctx.only && s.doHelp) || s.help) + '</div>' +
          '<div class="ic-wizard-card-jargon">' + esc(s.jargon) + '</div></div></div>';
      }
      if (!cards) continue;
      h += '<div class="ic-wiz-category"' + (cat.id === 'inactive' ? ' data-ic-inactive="1"' : '') + '><div class="ic-wiz-cat-header" style="color:' + cat.color + ';" onclick="icWizToggleCat(this)">' +
        '<span class="cat-arrow">&#9654;</span><span class="cat-label">' + esc(cat.name) + '</span></div><div class="ic-wiz-cat-body two-col">' + cards + '</div></div>';
    }
    if (!q && !ctx.only) {
      h += '<div class="ic-wiz-combos"><div class="ic-wiz-cat-header" style="color:var(--accent-cyan);border-bottom:none;cursor:default;"><span class="cat-label">Ready-made sections</span><span class="cat-count">several steps at once</span></div><div class="ic-wiz-combo-grid">';
      var TT = K.allTemplates();
      for (var t = 0; t < TT.length; t++) {
        var T = TT[t];
        h += '<div class="ic-wiz-combo" onclick="icWizCombo(\'' + T.id + '\')"><div class="ic-wiz-combo-icon">' + T.icon + '</div><div class="ic-wiz-combo-body">' +
          '<div class="ic-wiz-combo-title">' + esc(T.name) + '</div><div class="ic-wiz-combo-desc">' + esc(T.desc) + '</div></div></div>';
      }
      if (IC.impui) h += '<div class="ic-wiz-combo" onclick="icWizImport()"><div class="ic-wiz-combo-icon">&#128229;</div><div class="ic-wiz-combo-body">' +
        '<div class="ic-wiz-combo-title">Import from a file...</div><div class="ic-wiz-combo-desc">Steps from a snippet, an OgreBot zone file\'s nameds, or another of your instance files.</div></div></div>';
      h += '</div></div>';
    }
    return h;
  };

  K.pageHtml = function (ctx, q) {
    return '<input type="text" class="input-text ic-wiz-search" id="ic-wiz-q" placeholder="Search steps (move, wait, fight, door...)" value="' + esc(q) + '" oninput="icWizSearch(this.value)">' +
      '<div id="ic-wiz-list">' + K.menuHtml(ctx, q) + '</div>';
  };
  function show(page) {
    K.state.page = page;
    var s1 = $('ic-wiz-step1'), s2 = $('ic-wiz-step2');
    if (s1) s1.classList.toggle('active', page === 1);
    if (s2) s2.classList.toggle('active', page === 2);
    for (var d = 1; d <= 2; d++) {
      var dot = $('ic-wiz-dot' + d); if (!dot) continue;
      dot.className = 'ic-wizard-dot' + (d < page ? ' done' : (d === page ? ' active' : ''));
    }
    var back = $('ic-wiz-back'); if (back) back.disabled = page <= 1;
    var next = $('ic-wiz-next');
    if (next) { next.style.display = page === 2 ? '' : 'none'; next.textContent = 'Add to timeline'; }
    var prev = $('ic-wiz-preview');
    if (prev) {
      var nm = K.state.schema ? K.state.schema.name : (K.state.tpl ? K.state.tpl.name : '');
      prev.style.display = page === 2 && nm ? 'block' : 'none';
      prev.textContent = nm ? 'Adding: ' + nm + (K.state.target && K.state.target.into ? ' (inside the selected step)' : '') : '';
    }
  }
  K.onlyFor = function (target) {
    var host = null, key = null;
    if (target && target.into) { host = target.into; key = target.key; }
    else if (target && target.after && target.after.length > 1) { host = target.after.slice(0, target.after.length - 2); key = target.after[target.after.length - 2]; }
    return host ? R().onlyFor(M().get(host), key) : null;
  };
  K.ctx = function () { var c = U.ctx(); c.only = K.state.only || null; return c; };
  K.open = function (target) {
    U.flush();
    if (!M().editable()) { U.alert('Cannot add steps', 'Open an instance file (or start a new one) first.'); return; }
    target = target || { after: M().st.sel };
    var only = K.onlyFor(target);
    K.state = { page: 1, target: target, schema: null, tpl: null, draft: null, q: '', only: only };
    var wiz = $('ic-wizard'); if (wiz) wiz.style.display = 'flex';
    if (only && only.length === 1 && target.into) { K.pick('T:' + only[0]); return; }
    K.refresh();
    show(1);
    setTimeout(function () { var q = $('ic-wiz-q'); if (q) try { q.focus(); } catch (_e) {} }, 30);
  };
  K.refresh = function () {
    var c = $('ic-wiz-cards'); if (c && K.state.page === 1) c.innerHTML = K.pageHtml(K.ctx(), K.state.q);
    var s1 = $('ic-wiz-step1'), only = K.state.only;
    if (s1 && s1.querySelector) {
      var ti = s1.querySelector('.ic-wizard-title'), su = s1.querySelector('.ic-wizard-subtitle');
      if (ti) ti.textContent = only ? (only.length === 1 ? 'Add a fight rule' : 'What should the rule do?') : 'What happens next?';
      if (su) su.textContent = only ? 'Only steps that can run during a fight are listed. They run in order when the rule fires; the fight goes on.'
        : 'Choose the type of step to add to the instance timeline.';
    }
    if (K.state.page === 2) K.renderDraft();
  };
  K.close = function () { var wiz = $('ic-wizard'); if (wiz) wiz.style.display = 'none'; K.state.page = 0; };

  K.pick = function (key) {
    var s = K.schemaFor(key);
    if (!s) { U.toast('Unknown step type ' + key, 'err'); return; }
    K.state.schema = s; K.state.tpl = null;
    K.state.draft = R().newEntry(s, U.ctx());
    var hasEss = false;
    for (var i = 0; i < s.fields.length; i++) if ((s.fields[i].essential || s.fields[i].req) && R().fieldActive(s, s.fields[i], U.ctx().fmt)) hasEss = true;
    if (!hasEss) { K.commit(); return; }
    show(2);
    K.renderDraft();
  };
  K.renderDraft = function () {
    var f = $('ic-wiz-fields'), t = $('ic-wiz-step2-title'), d = $('ic-wiz-step2-desc');
    if (!f) return;
    var st = K.state, ctx = U.ctx();
    if (st.tpl) {
      if (t) t.textContent = st.tpl.name;
      if (d) d.textContent = st.tpl.desc;
      var schema = { key: 'TPLDRAFT', pseudo: true, fields: st.tpl.fields.map(function (x) { if (x.rt === undefined) x.rt = true; x.id = x.key; return x; }), deps: {} };
      f.innerHTML = '<div class="ic-wiz-back-link" onclick="icWizBack()">&larr; Back to the list</div>' +
        IC.form.render('d', st.draft, { schema: schema, noCommon: true, get: function () { return K.state.draft; }, ctx: ctx, onChange: function (x, rr) { if (rr) K.renderDraft(); else K.nextState(); } });
      K.nextState();
      return;
    }
    var s = st.schema;
    if (t) t.textContent = s.name;
    if (d) d.textContent = s.help + ' You can change everything after adding.';
    f.innerHTML = '<div class="ic-wiz-back-link" onclick="icWizBack()">&larr; Back to the list</div>' +
      IC.form.render('d', st.draft, { get: function () { return K.state.draft; }, ctx: ctx, essentialOnly: true, onChange: function (x, rr) { if (rr) K.renderDraft(); else K.nextState(); } });
    K.nextState();
  };
  K.problems = function () {
    var st = K.state, ctx = U.ctx(), probs = [], i, f, r;
    if (st.tpl) {
      for (i = 0; i < st.tpl.fields.length; i++) {
        f = st.tpl.fields[i]; r = IC.val.field(f, IC.pack.get(st.draft, f, { fields: [] }, ctx), st.draft, null, ctx);
        if (r && r.level === 'error') probs.push(f.label + ': ' + r.msg);
      }
    } else if (st.schema) {
      for (i = 0; i < st.schema.fields.length; i++) {
        f = st.schema.fields[i];
        if (!(f.essential || f.req) || !IC.val.visible(f, st.draft, st.schema, ctx) || !R().fieldActive(st.schema, f, ctx.fmt)) continue;
        r = IC.val.field(f, IC.pack.get(st.draft, f, st.schema, ctx), st.draft, st.schema, ctx);
        if (r && r.level === 'error') probs.push(f.label + ': ' + r.msg);
      }
    }
    return probs;
  };
  K.nextState = function () {
    var next = $('ic-wiz-next');
    if (!next || K.state.page !== 2) return;
    var probs = [];
    try { probs = K.problems(); } catch (_e) { probs = []; }
    next.disabled = probs.length > 0;
    next.title = probs.length ? 'Still needed: ' + probs.join('; ') : '';
  };
  K.commit = function () {
    U.flush();
    var st = K.state, ctx = U.ctx(), probs = [];
    if (st.tpl) {
      for (var i = 0; i < st.tpl.fields.length; i++) {
        var f = st.tpl.fields[i], r = IC.val.field(f, IC.pack.get(st.draft, f, { fields: [] }, ctx), st.draft, null, ctx);
        if (r && r.level === 'error') probs.push(f.label + ': ' + r.msg);
      }
      if (probs.length) { U.alert('Almost there', probs.join('\n')); return; }
      var n = 1; IC.model.each(function (e) { if (e && e.type === 'WIPE_RECOVERY') n++; });
      var steps = st.tpl.build(st.draft, n);
      K.close();
      U.addEntry(steps, st.target);
      return;
    }
    var s = st.schema;
    for (var j = 0; j < s.fields.length; j++) {
      var g = s.fields[j];
      if (!(g.essential || g.req) || !IC.val.visible(g, st.draft, s, ctx) || !R().fieldActive(s, g, ctx.fmt)) continue;
      var r2 = IC.val.field(g, IC.pack.get(st.draft, g, s, ctx), st.draft, s, ctx);
      if (r2 && r2.level === 'error') probs.push(g.label + ': ' + r2.msg);
    }
    if (probs.length && K.state.page === 2) { U.alert('Almost there', probs.join('\n')); return; }
    var entry = st.draft;
    K.close();
    U.addEntry(entry, st.target);
  };

  root.icOpenWizard = function () { K.open({ after: M().st.sel }); };
  root.icWizCancel = function () { K.close(); };
  root.icWizBack = function () { if (K.state.page === 2) { K.state.page = 1; K.refresh(); show(1); } };
  root.icWizNext = function () { if (K.state.page === 2) K.commit(); };
  root.icWizPickType = function (key) { K.pick(key); };
  root.icWizSearch = function (q) {
    K.state.q = q;
    var c = $('ic-wiz-list'); if (c) c.innerHTML = K.menuHtml(K.ctx(), q);
  };
  root.icWizToggleCat = function (el) { if (el && el.classList) el.classList.toggle('collapsed'); };
  root.icWizPickCategory = function () {};
  root.icWizCombo = function (id) {
    var map = { zoneexit: 'exit', boss: 'boss', teleporter: 'teleporter', trash: 'trash' };
    var T = K.tplById(map[id] || id);
    if (!T) return;
    if (!K.state.page) K.open({ after: M().st.sel });
    if (K.state.only) { var sl = M().st.sel; K.state.target = { after: sl ? [sl[0]] : undefined }; K.state.only = null; }
    K.state.tpl = T; K.state.schema = null;
    K.state.draft = T.init({ diffName: M().st.diff });
    if (!T.fields.length) { K.commit(); return; }
    show(2);
    K.renderDraft();
  };
  root.icWizImport = function () {
    var tg = K.state.target;
    K.close();
    if (IC.impui) IC.impui.open(tg ? { target: tg } : null);
  };
  root.icAddBossSection = function () { root.icWizCombo('boss'); };
  root.icAddZoneExitSection = function () { root.icWizCombo('exit'); };

  root.icQuickAdd = function (key) {
    var s = K.schemaFor(key);
    if (!s) return;
    if (s.type === 'OC' && key !== 'OC' && key !== 'oc') { root.icToggleOcQuick(); return; }
    var sl = M().st.sel, only = K.onlyFor({ after: sl });
    if (only && only.indexOf(s.type) < 0 && sl) { U.addEntry(R().newEntry(s, U.ctx()), { after: [sl[0]] }); return; }
    U.addEntry(R().newEntry(s, U.ctx()));
  };
  root.icAddEnc = function (legacyType) { root.icQuickAdd(legacyType); };
  K.quickBarHtml = function (ctx) {
    var list = R().quickList(ctx), h = '';
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      h += '<span class="ic-quickadd-btn"' + IC.form.tip(s.help) + ' onclick="icQuickAdd(\'' + s.key + '\')"><span class="qa-icon">' + s.icon + '</span> ' + esc(s.short || s.name) + '</span>';
    }
    h += '<span class="ic-quickadd-btn" onclick="icToggleOcQuick()"><span class="qa-icon">&#9889;</span> OgreBot &#9660;</span>';
    return h;
  };
  K.renderQuickBar = function () { var el = $('ic-quickadd'); if (el) el.innerHTML = K.quickBarHtml(U.ctx()); };
})(typeof window !== 'undefined' ? window : this);
