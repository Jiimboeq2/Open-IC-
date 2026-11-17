/* Open IC Creator - ic-panels.js
   Overlay UI (IC.panels): zone info, difficulty buttons, file settings and difficulty-wrapper panels.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var PN = IC.panels = IC.panels || {};
  var U = IC.ui = IC.ui || {};
  function $(id) { return (typeof document !== 'undefined') ? document.getElementById(id) : null; }
  function esc(s) { return IC.form.esc(s); }
  function str(v) { return v == null ? '' : String(v); }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function M() { return IC.model; }
  function setVal(id, v) { var el = $(id); if (el) el.value = v; }
  function val(id) { var el = $(id); return el ? str(el.value).trim() : ''; }

  PN.FILE_SCHEMA = { key: 'HDR', pseudo: true, deps: {}, fields: [
    { key: 'travel_method', kind: 'select', label: 'Travel to the zone by', rt: true, id: 'travel_method',
      opts: [['', 'Automatic'], ['druid', 'Druid rings'], ['spire', 'Spires'], ['bell', 'Bells'], ['fast', 'Fast travel'], ['gh', 'Guild hall'], ['tele', 'Teleporter'], ['route', 'Route']],
      help: 'How the group travels to the zone when the run is queued.' },
    { key: 'zone_in_actor', kind: 'text', label: 'Door you click to enter', rt: true, id: 'zone_in_actor', grab: ['hover', 'target'],
      help: 'A "Use a door" step on this object is skipped when the run starts inside the zone.' },
    { key: 'required_items', kind: 'list', label: 'Items everyone must carry', rt: true, id: 'required_items', itemName: 'Item', strItems: 'name',
      help: 'Checked when the run starts; warns, never blocks.',
      item: [{ key: 'name', kind: 'text', label: 'Item' }, { key: 'note', kind: 'text', label: 'Why' }] },
    { key: 'options', kind: 'list', label: 'Run options', rt: true, id: 'options', itemName: 'Option',
      help: 'Switches users can toggle (jb ic option ...). When on, the run skips the steps between two notes, or the steps with a skip-group tag.',
      newItem: function () { return { id: '', label: '', description: '', 'default': false }; },
      item: [{ key: 'id', kind: 'text', label: 'Id' }, { key: 'label', kind: 'text', label: 'Label' },
        { key: 'description', kind: 'text', label: 'Help' }, { key: 'default', kind: 'check', label: 'On by default', on: true, off: false },
        { key: 'skip_between', kind: 'pair', label: 'Skip from note .. to note', ph0: '=== NamedN ... ===', ph1: '=== NamedM ... ===' },
        { key: 'skip_group', kind: 'text', label: 'Or skip-group tag' }] }
  ] };
  PN.WRAP_SCHEMA = { key: 'WRAP', pseudo: true, deps: {}, fields: [
    { key: 'difficulty', kind: 'select', label: 'Difficulty', rt: true, id: 'difficulty', allowOther: true,
      opts: [['solo', 'Solo'], ['heroic', 'Heroic'], ['untold_heroic', 'Untold Heroic'], ['raid', 'Raid']] },
    { key: 'prebuff', kind: 'check', label: 'Add a buff pause before every named', rt: true, id: 'prebuff', on: true, off: false },
    { key: 'prebuff_seconds', kind: 'int', label: 'Buff pause', unit: 's', rt: true, id: 'prebuff_seconds', store: 'number', min: 1, max: 600, help: 'Default 11.' },
    { key: 'positioning', kind: 'check', label: 'Positioning', rt: true, id: 'positioning', on: true, off: false },
    { key: 'skip_bosses', kind: 'names', label: 'Skip these bosses', rt: true, id: 'skip_bosses', store: 'array',
      help: 'Each named section (checkpoint to chest) is left out for this difficulty.' },
    { key: 'prebuff_duration', kind: 'int', label: 'Buff pause (old key)', rt: false, id: 'prebuff_duration', help: 'Not read: the game reads "Buff pause" (prebuff_seconds).' }
  ] };

  function hdrRender(sc, schema, boxId) {
    var box = $(boxId); if (!box) return;
    var d = M().st.doc;
    if (!d) { box.innerHTML = ''; return; }
    box.innerHTML = IC.form.render(sc, d, { schema: schema, noCommon: true, ctx: U.ctx(), get: function () { return M().st.doc; },
      onChange: function (t, rr) { IC.model.commit(); U.updateToolbar(); if (rr) hdrRender(sc, schema, boxId); } });
  }
  PN.renderSettings = function () {
    var fmt = M().st.fmt, fs = $('ic-file-settings');
    if (fs) { if (fmt === 'v2' || fmt === 'v3') hdrRender('h', PN.FILE_SCHEMA, 'ic-file-settings'); else fs.innerHTML = ''; }
    PN.renderWrapper();
    root.icRenderIpcVars();
  };

  var DIFF_IN = { solo: 'solo', heroic: 'heroic', heroic1: 'heroic', untold_heroic: 'heroic2', heroic2: 'heroic2', raid: 'raid' };
  PN.fromDoc = function () {
    var d = M().st.doc || {};
    setVal('ic-zone-name', M().zoneName());
    var sn = $('ic-short-name'); if (sn) { sn.value = str(d.zone_short_name || d.short_name || ''); sn._lastAuto = sn.value; }
    setVal('ic-hub-zone', str(d.outside_zone || ''));
    var diff = DIFF_IN[str(d.difficulty).toLowerCase()] || 'solo';
    M().st.diff = diff;
    highlightDiff(diff);
    PN._zoneOld = M().zoneName();
    if (root.icSetFileMode) root.icSetFileMode(d.is_common === true ? 'common' : 'single');
    root.icUpdateZoneDisplay();
    PN.renderSettings();
  };
  PN.onZone = function () {
    var z = $('ic-zone-name'); if (!z || !M().st.doc) return;
    M().renameZone(PN._zoneOld || M().zoneName(), z.value.trim());
    PN._zoneOld = z.value.trim();
    U.changed(false);
  };
  PN.onShort = function () {
    var sn = $('ic-short-name'), d = M().st.doc; if (!sn || !d) return;
    M().setHeader('zone_short_name', sn.value.trim());
    if (has(d, 'short_name')) d.short_name = sn.value.trim();
    U.changed(false);
  };
  PN.onHub = function () {
    var h = $('ic-hub-zone'); if (!h || !M().st.doc) return;
    M().setHeader('outside_zone', h.value.trim());
    U.changed(false);
  };
  PN.bindInputs = function () {
    var z = $('ic-zone-name'), s = $('ic-short-name'), h = $('ic-hub-zone');
    if (z && !z._icBound) {
      z._icBound = true;
      z.addEventListener('focus', function () { PN._zoneOld = M().zoneName(); });
      z.addEventListener('change', PN.onZone);
    }
    if (s && !s._icBound) { s._icBound = true; s.addEventListener('change', PN.onShort); }
    if (h && !h._icBound) { h._icBound = true; h.addEventListener('change', PN.onHub); }
  };
  root.icUpdateZoneDisplay = function () {
    var zn = val('ic-zone-name') || 'Instance Creator', el = $('ic-zone-display');
    if (el) el.textContent = zn;
    var dd = $('ic-diff-display');
    if (dd) dd.textContent = M().st.diff;
    if (root.icUpdateCommonUI) root.icUpdateCommonUI();
  };
  root.icAutoFillShortName = function () {};
  root.icAutoShortName = function () { root.icAutoShortNameFromTLO(); };
  root.icAutoShortNameFromTLO = function () {
    var d = IC.form.me(), sn = $('ic-short-name');
    if (!sn) return;
    if (d && d.zone_short) { sn.value = d.zone_short; PN.onShort(); }
    else U.toast('Zone short name not known yet (status feed).', 'warn');
  };
  root.icAutoZone = function () {
    var d = IC.form.me(), z = $('ic-zone-name');
    if (d && d.zone && d.zone !== '--' && z) { PN._zoneOld = M().zoneName(); z.value = d.zone; PN.onZone(); root.icUpdateZoneDisplay(); }
    else if (z) U.toast('Zone not known yet (status feed).', 'warn');
  };
  root.icAutoHubZone = function () {
    var d = IC.form.me(), h = $('ic-hub-zone');
    if (d && d.zone && h) { h.value = d.zone; PN.onHub(); }
    else if (h) U.toast('Zone not known yet (status feed).', 'warn');
  };

  function highlightDiff(d) {
    var b = ['solo', 'heroic', 'heroic2', 'raid'];
    for (var i = 0; i < b.length; i++) { var el = $('ic-diff-' + b[i]); if (el) el.className = (b[i] === d) ? 'btn btn-success btn-sm' : 'btn btn-sm'; }
    if ($('ic-diff-dd') && typeof jbSetVal === 'function') jbSetVal('ic-diff-dd', d);
  }
  root.icSetDiff = function (d) {
    U.flush();
    var st = M().st;
    st.diff = d;
    highlightDiff(d);
    var doc = st.doc;
    if (doc && st.fmt !== 'other') {
      var cur = str(doc.difficulty).toLowerCase(), want = d;
      if (d === 'heroic2' && (cur === 'untold_heroic' || st.fmt === 'wrapper')) want = 'untold_heroic';
      if ((DIFF_IN[cur] || cur) !== d) { doc.difficulty = want; U.changed(true); }
      else U.refresh(true);
    }
    root.icUpdateZoneDisplay();
    PN.renderSettings();
  };
  var PD_KEYS = ['boss', 'prebuff', 'position', 'shinies', 'combat_style', 'rune_swap', 'ho_mode', 'pre_oc', 'post_oc', 'adds'];
  root.icCopyFromSolo = function () {
    var e = M().selected(), d = M().st.diff;
    if (!e || d === 'solo') return;
    var o = {};
    for (var i = 0; i < PD_KEYS.length; i++) if (has(e, PD_KEYS[i])) o[PD_KEYS[i]] = JSON.parse(JSON.stringify(e[PD_KEYS[i]]));
    e[d] = o;
    U.changed(true);
  };
  root.icClearDiffOverride = function () {
    var e = M().selected(), d = M().st.diff;
    if (!e || d === 'solo' || !has(e, d)) return;
    delete e[d];
    U.changed(true);
  };

  root.icWizGoto = function (step) {
    var chips = document.querySelectorAll('#creator-ic .ic-wstep');
    for (var i = 0; i < chips.length; i++) chips[i].classList.toggle('active', chips[i].getAttribute('data-step') === step);
    var panes = document.querySelectorAll('#creator-ic .ic-wpane');
    for (var j = 0; j < panes.length; j++) {
      var on = panes[j].id === 'ic-wpane-' + step;
      panes[j].classList.toggle('active', on);
      panes[j].style.display = on ? 'flex' : 'none';
    }
    if (step === 'file') root.icLoadFolderList();
  };
  root.icSwitchSubTab = function (name, tabEl) {
    var tabs = document.querySelectorAll('#creator-ic .ic-sub-tab');
    for (var i = 0; i < tabs.length; i++) {
      var match = tabEl ? tabs[i] === tabEl : (tabs[i].getAttribute('onclick') || '').indexOf("'" + name + "'") >= 0;
      tabs[i].classList.toggle('active', match);
    }
    var panes = document.querySelectorAll('#creator-ic .ic-sub-pane');
    for (var j = 0; j < panes.length; j++) panes[j].classList.toggle('active', panes[j].id === 'ic-pane-' + name);
    PN.tab = name;
    if (name === 'advanced') { root.icUpdateJsonPreview(); root.icCheckFile(); }
    if (name === 'run') root.icLoadRunList();
    if (name === 'zone') PN.renderSettings();
    root.icUpdateBreadcrumb();
  };
  root.icShowStepTab = function () { if (PN.tab && PN.tab !== 'encounter') root.icSwitchSubTab('encounter', null); };
  root.icUpdateBreadcrumb = function () {
    var el = $('ic-breadcrumb'); if (!el) return;
    var st = M().st, e = M().selected();
    var h = '<b>' + esc(val('ic-zone-name') || 'Instance Creator') + '</b>';
    if (st.path) h += '<span class="bc-sep">&rsaquo;</span>' + esc(st.path) + '.json';
    if (st.fmt === 'v3') h += ' <span style="color:var(--accent-orange);">(template file)</span>';
    if (e) h += '<span class="bc-sep">&rsaquo;</span><span class="bc-step">' + esc(IC.reg.labelFor(e)) + '</span>';
    el.innerHTML = h;
  };
  root.icToggleQuickTools = function () {
    var body = $('ic-quicktools-body'), arrow = $('ic-quicktools-arrow');
    if (!body) return;
    var show = body.style.display === 'none' || !body.style.display;
    body.style.display = show ? 'flex' : 'none';
    if (arrow) arrow.innerHTML = show ? '&#9662;' : '&#9656;';
    if (show && IC.picker) IC.picker.renderQuickBar();
  };

  PN.openFold = function (id) {
    var body = $(id);
    if (!body || body.classList.contains('open')) return;
    body.classList.add('open');
    var ar = body.previousElementSibling ? body.previousElementSibling.querySelector('.arrow') : null;
    if (ar) ar.classList.add('open');
  };

  PN.fileMode = 'single';
  PN.diffChecks = { solo: true, heroic: true, heroic2: true, raid: false };
  root.icSetFileMode = function (mode) {
    PN.fileMode = mode;
    var s = $('ic-mode-single'), c = $('ic-mode-common');
    if (s) s.className = mode === 'single' ? 'btn btn-success btn-sm' : 'btn btn-sm';
    if (c) c.className = mode === 'common' ? 'btn btn-success btn-sm' : 'btn btn-sm';
    var row = $('ic-diff-checkboxes'), btns = $('ic-diff-buttons');
    if (row) row.style.display = mode === 'common' ? 'flex' : 'none';
    if (btns) btns.style.display = mode === 'common' ? 'none' : 'flex';
    if (mode === 'common') PN.openFold('ic-file-adv');
    root.icUpdateCommonUI();
  };
  root.icDiffChkChanged = function () {
    var k = ['solo', 'heroic', 'heroic2', 'raid'];
    for (var i = 0; i < k.length; i++) { var el = $('ic-diff-chk-' + k[i]); if (el) PN.diffChecks[k[i]] = !!el.checked; }
  };
  root.icUpdateCommonUI = function () {
    var d = M().st.doc || {}, isCommon = d.is_common === true, isWrap = M().st.fmt === 'wrapper';
    var cb = $('ic-common-badge'); if (cb) cb.style.display = isCommon ? 'inline-block' : 'none';
    var wb = $('ic-wrapper-badge');
    if (wb) { wb.style.display = isWrap ? 'inline-block' : 'none'; if (isWrap) { wb.innerHTML = 'Wrapper &#8594; ' + esc(d.base_file || ''); wb.onclick = root.icLoadBaseFile; } }
    var gb = $('ic-gen-wrappers-btn'); if (gb) gb.style.display = (isCommon && PN.fileMode === 'common') ? 'inline-block' : 'none';
    var we = $('ic-wrapper-editor'); if (we) we.style.display = isWrap ? 'block' : 'none';
  };
  function diffLabel(d) { return d === 'heroic2' ? 'Untold Heroic' : d.charAt(0).toUpperCase() + d.slice(1); }
  var WRAP_DEF = { solo: { difficulty: 'solo', prebuff: false, positioning: true }, heroic: { difficulty: 'heroic', prebuff: true, positioning: true },
    heroic2: { difficulty: 'untold_heroic', prebuff: true, positioning: false }, raid: { difficulty: 'raid', prebuff: true, positioning: true } };
  function bossList() {
    var out = [];
    M().each(function (e) {
      if (!e) return;
      if (e.type === 'COMBAT' && e.data && out.indexOf(e.data) < 0) out.push(e.data);
      if (e.template === 'named_encounter' && e.boss && out.indexOf(e.boss) < 0) out.push(e.boss);
    });
    return out;
  }
  function wrapperDoc(zone, file, d) {
    var def = WRAP_DEF[d], w = { name: zone + ' [' + diffLabel(d) + ']', base_zone: zone, zone: zone + ' [' + diffLabel(d) + ']',
      difficulty: def.difficulty, base_file: file + '.json', version: '2.0' };
    if (def.prebuff) { w.prebuff = true; w.prebuff_seconds = 11; }
    if (!def.positioning) w.positioning = false;
    var b = bossList(); if (b.length) w.boss_list = b;
    return w;
  }
  function selectedDiffs() { root.icDiffChkChanged(); var o = []; for (var k in PN.diffChecks) if (PN.diffChecks[k]) o.push(k); return o; }
  root.icSaveAllDifficulties = function () {
    U.flush();
    if (!M().editable()) { U.alert('Not available', 'Open an instance (step) file first.'); return; }
    var diffs = selectedDiffs(), zone = M().zoneName() || 'Unknown Zone';
    var file = IC.io.fileName() || zone.replace(/[^a-zA-Z0-9 ]/g, '_');
    if (!diffs.length) { U.alert('Pick a difficulty', 'Tick at least one difficulty to make a wrapper for.'); return; }
    var msg = 'This saves:\n  1. Common file: ' + file + '.json (buff pauses removed; wrappers add their own)\n';
    for (var i = 0; i < diffs.length; i++) msg += '  ' + (i + 2) + '. ' + diffLabel(diffs[i]) + ' wrapper: ' + file + ' ' + diffLabel(diffs[i]) + '.json\n';
    U.confirm('Save all difficulties', msg + '\nContinue?', function (yes) {
      if (!yes) return;
      var doc = M().st.doc, key = M().st.listKey;
      doc.is_common = true;
      doc[key] = (doc[key] || []).filter(function (e) { return !(e && (e.type === 'PREBUFF' || e.type === 'BUFF')); });
      M().st.sel = doc[key].length ? [0] : null;
      U.changed(true);
      setVal('ic-filename', file);
      IC.io.write(root.icGetSavePath(file), M().serialize(), function (ok) {
        if (ok) { M().markSaved(); M().st.path = root.icGetSavePath(file); }
        U.refresh(true);
      });
      for (var j = 0; j < diffs.length; j++) {
        var w = wrapperDoc(zone, file, diffs[j]);
        sendCommand('ic_save_json', root.icGetSavePath(file + ' ' + diffLabel(diffs[j])) + '|' + IC.pack.toJson(w));
      }
      U.toast('Saved the common file + ' + diffs.length + ' wrapper' + (diffs.length > 1 ? 's' : ''));
      root.icUpdateCommonUI();
    });
  };
  root.icGenerateWrappers = function () {
    var d = M().st.doc || {};
    if (d.is_common !== true) { U.alert('Not a common file', 'Save as Common + Wrappers first.'); return; }
    var diffs = selectedDiffs(), zone = M().zoneName() || 'Unknown Zone', file = IC.io.fileName();
    if (!diffs.length) { U.alert('Pick a difficulty', 'Tick at least one difficulty.'); return; }
    U.confirm('Make wrappers', 'Write ' + diffs.length + ' wrapper file(s) for ' + file + '? Existing wrappers with the same names are replaced.', function (yes) {
      if (!yes) return;
      for (var i = 0; i < diffs.length; i++) sendCommand('ic_save_json', root.icGetSavePath(file + ' ' + diffLabel(diffs[i])) + '|' + IC.pack.toJson(wrapperDoc(zone, file, diffs[i])));
      U.toast('Wrote ' + diffs.length + ' wrapper file(s).');
    });
  };

  PN.renderWrapper = function () {
    var box = $('ic-wrapper-fields'), skip = $('ic-wrapper-skip-bosses');
    if (skip) skip.innerHTML = '';
    if (!box) return;
    if (M().st.fmt !== 'wrapper') { box.innerHTML = ''; return; }
    var d = M().st.doc;
    box.style.display = 'block';
    box.innerHTML = '<div class="icf-help">Steps come from <b>' + esc(d.base_file || '?') + '</b>.' +
      (d.boss_list && d.boss_list.length ? ' Bosses: ' + esc(d.boss_list.join(', ')) + '.' : '') + '</div><div id="ic-wrap-form"></div>';
    hdrRender('w', PN.WRAP_SCHEMA, 'ic-wrap-form');
  };
  root.icRenderWrapperEditor = function () { PN.renderWrapper(); };
  root.icWrapperFieldChanged = function () {};
  root.icSaveWrapper = function () { root.icSave(); };
  root.icLoadBaseFile = function () {
    var d = M().st.doc || {};
    if (!d.base_file) { U.toast('This file has no base file set.', 'warn'); return; }
    var parts = (IC.io.folder() ? IC.io.folder().split('/') : []).concat(str(d.base_file).replace(/\\/g, '/').split('/'));
    var out = [];
    for (var i = 0; i < parts.length; i++) { if (parts[i] === '..') out.pop(); else if (parts[i] && parts[i] !== '.') out.push(parts[i]); }
    IC.io.loadRel(out.join('/'));
  };
})(typeof window !== 'undefined' ? window : this);
