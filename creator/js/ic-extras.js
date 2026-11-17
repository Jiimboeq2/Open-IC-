/* Open IC Creator - ic-extras.js
   Overlay UI: fight-file link, run list, script viewer, roles and the Advanced tab.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var EN = IC.enc = IC.enc || {};
  var U = IC.ui = IC.ui || {};
  function $(id) { return (typeof document !== 'undefined') ? document.getElementById(id) : null; }
  function esc(s) { return IC.form.esc(s); }
  function str(v) { return v == null ? '' : String(v); }
  function M() { return IC.model; }

  function encList() { return (typeof _encList !== 'undefined' && _encList) ? _encList : []; }
  EN.linked = function (named) {
    var b = str(named).toLowerCase(), L = encList();
    if (!b) return null;
    for (var i = 0; i < L.length; i++) if (str(L[i].named).toLowerCase() === b) return L[i];
    return null;
  };
  IC.panels = IC.panels || {};
  IC.panels.extra = IC.panels.extra || {};
  IC.panels.extra.encounter = function (e) { return EN.panelHtml(e); };
  EN.panelHtml = function (e) {
    var named = str(e.data || e.target), enc = EN.linked(named), h = '';
    if (enc) {
      h += '<div class="icf-say">&#9679; <b>' + esc(enc.named) + '</b> <span class="icf-help">' + esc(enc.zone || '') + ' &middot; ' +
        ((enc.mechanics || []).length) + ' mechanics</span></div><div class="icf-name-add"><button class="btn btn-sm btn-primary" onclick="icEditLinkedEncounter()">Edit the mechanics</button></div>';
    } else {
      h += '<div class="icf-help">No mechanics file for "' + esc(named || '?') + '". During the fight the game runs the file whose boss name matches exactly and whose zone matches this zone.</div>' +
        '<div class="icf-name-add"><button class="btn btn-sm btn-success" onclick="icCreateLinkedEncounter()">+ New mechanics file</button>' +
        '<button class="btn btn-sm" onclick="icImportEncounter()">Browse mechanics files</button></div>' +
        '<input type="text" class="input-text icf-in" id="icf-enc-search" placeholder="Find by boss or zone..." oninput="icSearchEncounters(this.value)">' +
        '<div id="icf-enc-results" style="display:none;max-height:90px;overflow-y:auto;border:1px solid var(--border-dark);border-radius:3px;"></div>';
    }
    return IC.form.section('menc', 'Fight mechanics file (Encounters tab)', h, !!enc);
  };
  function creatorTab(label) {
    var tabs = document.querySelectorAll('#panel-creator .sub-tab'), id = "'creator-" + String(label).toLowerCase() + "'";
    for (var t = 0; t < tabs.length; t++) if (tabs[t].textContent.trim() === label || (tabs[t].getAttribute('onclick') || '').indexOf(id) >= 0) { tabs[t].click(); return; }
  }
  root.icEditLinkedEncounter = function () {
    var e = M().selected(), named = e ? str(e.data || e.target) : '', L = encList(), idx = -1;
    for (var i = 0; i < L.length; i++) if (str(L[i].named).toLowerCase() === named.toLowerCase()) { idx = i; break; }
    creatorTab('Encounters');
    if (idx >= 0 && typeof encSelect === 'function') setTimeout(function () { encSelect(idx); }, 200);
  };
  root.icImportEncounter = function () {
    var e = M().selected(), named = e ? str(e.data || e.target) : '';
    creatorTab('Encounters');
    setTimeout(function () {
      if (typeof encSwitchView === 'function') encSwitchView('browse', document.querySelector('.enc-view-tab[data-view=browse]'));
      var s = $('enc-search'); if (s) { s.value = named; if (typeof encFilterList === 'function') encFilterList(); }
    }, 60);
  };
  root.icCreateLinkedEncounter = function () {
    var e = M().selected(), named = e ? str(e.data || e.target) : '', zone = M().zoneName();
    creatorTab('Encounters');
    if (typeof encNew !== 'function') { U.toast('The Encounters tab is still opening. Press the button again.', 'warn'); return; }
    setTimeout(function () {
      encNew();
      var n = $('enc-boss'); if (n && named) n.value = named;
      var z = $('enc-zone'); if (z && zone) z.value = zone;
      if (typeof _encCurrent !== 'undefined' && _encCurrent && named) {
        _encCurrent.named = named; _encCurrent.zone = zone;
        _encCurrent.setup = _encCurrent.setup || {};
        _encCurrent.setup.auto_targets = [{ actor: named, priority: 1, who: 'all' }];
      }
      if (typeof encSyncFromFields === 'function') encSyncFromFields();
    }, 500);
  };
  root.icSearchEncounters = function (q) {
    var el = $('icf-enc-results'); if (!el) return;
    if (!q || q.length < 2) { el.style.display = 'none'; return; }
    var L = encList(), ql = q.toLowerCase(), h = '', n = 0;
    for (var i = 0; i < L.length && n < 10; i++) {
      var nm = str(L[i].named || L[i].name), z = str(L[i].zone);
      if (nm.toLowerCase().indexOf(ql) < 0 && z.toLowerCase().indexOf(ql) < 0) continue;
      n++;
      h += '<div class="listbox-item" style="font-size:var(--fs-9);cursor:pointer;padding:2px 6px;" onclick="icPickEncounter(' + i + ')"><b style="color:var(--accent-cyan);">' + esc(nm) + '</b> <span style="color:var(--text-secondary);">' + esc(z) + '</span></div>';
    }
    el.innerHTML = h || '<div class="icf-help" style="padding:4px;">None found.</div>';
    el.style.display = 'block';
  };
  root.icPickEncounter = function (i) {
    var enc = encList()[i], e = M().selected();
    if (!enc || !e) return;
    e.data = str(enc.named || enc.name);
    U.changed(true);
  };
  root.icImportFromLinked = function () {};
  root.icUnlinkEncounter = function () { U.renderForm(); };
  root.icImportEncounterFile = function () { U.toast('Import File has no handler in the game (saved but not run yet).', 'warn'); };
  root.icImportEncryptedFile = root.icImportEncounterFile;

  var runRows = [];
  root.icLoadRunList = function () {
    var el = $('ic-run-list'); if (!el) return;
    sendCommand('ic_list_jb');
    el.innerHTML = '<div class="listbox-item" style="font-size:var(--fs-10);justify-content:center;">Loading...</div>';
    setTimeout(function () {
      requestFileWith('Data/jqb_ic_jb_list.json', function (p, contents) {
        try { runRows = JSON.parse(contents) || []; } catch (_e) { runRows = []; }
        runRows.sort(function (a, b) { var x = str(a.folder) + '/' + str(a.name), y = str(b.folder) + '/' + str(b.name); return x < y ? -1 : (x > y ? 1 : 0); });
        root.icRenderRunList();
      });
    }, 500);
  };
  root.icRenderRunList = function () {
    var el = $('ic-run-list'); if (!el) return;
    var q = str(($('ic-run-filter') || {}).value).toLowerCase(), h = '', shown = 0;
    for (var i = 0; i < runRows.length; i++) {
      var r = runRows[i] || {}, name = str(r.name), folder = str(r.folder), rel = str(r.rel);
      if (q && name.toLowerCase().indexOf(q) < 0 && folder.toLowerCase().indexOf(q) < 0) continue;
      shown++;
      h += '<div class="listbox-item" style="font-size:var(--fs-10);display:flex;align-items:center;gap:6px;"><span class="item-main" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(name) + '</span>' +
        '<span style="font-size:var(--fs-9);color:var(--text-secondary);flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(folder) + '</span>' +
        '<button class="btn btn-sm" style="flex:none;" title="Add it to the queue: travels there and runs it" onclick="icQueueSaved(\'' + escJs(rel) + '\')">+ Queue</button>' +
        '<button class="btn btn-sm" style="flex:none;" title="Start it now; you must already be inside the zone" onclick="icRunSaved(\'' + escJs(rel) + '\')">&#9654; Run</button>' +
        '<button class="btn btn-sm" style="flex:none;padding:0 7px;" title="More: run from a step, open it here" onclick="icRunMore(this,\'' + escJs(rel) + '\')">&#8943;</button></div>';
    }
    el.innerHTML = shown ? h : '<div class="listbox-item" style="font-size:var(--fs-10);justify-content:center;">' + (runRows.length ? 'No matches' : 'No saved instances found') + '</div>';
  };
  root.icRunFilter = function () { root.icRenderRunList(); };
  root.icRunMore = function (btn, rel) {
    jbMoreMenu(btn, [
      { icon: '&#9654;', label: 'Run from a step...', tip: 'Asks for the step number, then runs the file from there', act: function () { root.icRunSavedFromStep(rel); } },
      { icon: '&#x270E;', label: 'Open it here', tip: 'Open this file in the editor', act: function () { IC.io.loadRel(unescJs(rel)); } }
    ]);
  };
  root.icRunSaved = function (rel) { sendCommand('exec', 'jb ic rundirect "' + unescJs(rel) + '"'); };
  root.icQueueSaved = function (rel) { sendCommand('exec', 'jb ic queue "' + unescJs(rel) + '"'); };
  root.icRunSavedFromStep = function (rel) {
    var p = unescJs(rel);
    U.prompt('Run from step', 'Start ' + p + ' at which step number (1 = the beginning)?', '1', function (v) {
      var n = parseInt(v, 10);
      if (n > 0) sendCommand('exec', 'jb ic rundirect "' + p + '" ' + n);
    });
  };

  root.icLoadScriptRefs = function () {
    var src = str(($('ic-script-source') || {}).value || 'new');
    var folder = src.charAt(0).toUpperCase() + src.slice(1);
    EN._scriptFolder = folder;
    sendCommand('ic_list_scripts', folder);
    var el = $('ic-script-refs'); if (el) el.innerHTML = '<div class="listbox-item" style="font-size:var(--fs-10);justify-content:center;">Loading...</div>';
    setTimeout(function () {
      requestFileWith('Data/jqb_ic_scripts.json', function (p, contents) {
        var box = $('ic-script-refs'); if (!box) return;
        var list = []; try { list = JSON.parse(contents) || []; } catch (_e) {}
        var h = '';
        for (var i = 0; i < list.length; i++) {
          var nm = typeof list[i] === 'string' ? list[i] : str(list[i].name || list[i].file);
          h += '<div class="listbox-item" style="font-size:var(--fs-10);" onclick="icViewScript(\'' + escJs(nm) + '\')"><span class="item-main">' + esc(nm.replace(/\.(iss|json)$/i, '')) + '</span></div>';
        }
        box.innerHTML = h || '<div class="listbox-item" style="font-size:var(--fs-10);justify-content:center;">No scripts</div>';
      });
    }, 800);
  };
  root.icViewScript = function (enc) {
    var name = unescJs(enc), rel = (EN._scriptFolder || 'Heroics') + '/' + name;
    sendCommand('ic_view_script', rel);
    setTimeout(function () {
      requestFileWith('Data/jqb_ic_script_content.json', function (p, contents) {
        var v = $('ic-script-viewer'); if (!v) return;
        var d = {}; try { d = JSON.parse(contents) || {}; } catch (_e) {}
        v.innerHTML = '<div style="display:flex;gap:4px;align-items:center;margin-bottom:4px;"><button class="btn btn-sm" onclick="document.getElementById(\'ic-script-viewer\').style.display=\'none\'">&larr; Back</button>' +
          '<b style="color:var(--accent-cyan);font-size:var(--fs-11);">' + esc(name) + '</b></div><pre class="ic-json-preview">' + esc(d.content || '(could not read it)') + '</pre>';
        v.style.display = 'block';
      });
    }, 800);
  };

  root.icRefreshRoles = function () {
    var el = $('ic-roles-list'); if (!el) return;
    if (el.style.display !== 'none') { el.style.display = 'none'; return; }
    sendCommand('alias_refresh'); sendCommand('flag_refresh');
    el.innerHTML = '<div style="font-size:var(--fs-10);">Who-words OgreBot understands: igw:Name, +fighter, +notfighter, +mage, +priest, +bard, @Tank, @Healer1, @DPS1.</div>';
    el.style.display = 'block';
  };
  root.icOpenFlags = function () {
    var tabs = document.querySelectorAll('#panel-creator .sub-tab');
    for (var i = 0; i < tabs.length; i++) if (tabs[i].textContent.replace(/\s+/g, ' ').trim() === 'Flags') { tabs[i].click(); return; }
  };

  root.icUpdateJsonPreview = function () {
    var el = $('ic-json-preview'); if (!el) return;
    el.textContent = M().st.doc ? M().serialize() : '(no file open)';
  };
  root.icCheckFile = function () {
    var el = $('ic-val-list'); if (!el) return;
    var list = IC.val.doc(), c = IC.val.counts(list), h = '';
    if (!M().editable()) { el.innerHTML = '<div class="icf-help">Open an instance file to check it.</div>'; return; }
    h += '<div class="icf-help">' + c.error + ' problem' + (c.error === 1 ? '' : 's') + ', ' + c.warn + ' warning' + (c.warn === 1 ? '' : 's') + ', ' + c.info + ' tip' + (c.info === 1 ? '' : 's') + '. Click one to go to the step.</div>';
    for (var i = 0; i < list.length && i < 200; i++) {
      var it = list[i], col = it.level === 'error' ? 'var(--accent-red,#e06060)' : (it.level === 'warn' ? 'var(--accent-orange,#e0a040)' : 'var(--accent-cyan)');
      h += '<div style="color:' + col + ';font-size:var(--fs-10);" onclick="icSelectPath(\'' + M().pathStr(it.path) + '\')">' + (it.path.length === 1 ? '#' + (it.path[0] + 1) + ' ' : '') + esc(it.label) + ' -- ' + esc(it.msg) + '</div>';
    }
    var q = M().scan().items.filter(function (x) { return x.quiet; });
    if (q.length) {
      h += '<div class="icf-help" style="margin-top:4px;cursor:default;">This file keeps ' + q.length + ' harmless field' + (q.length === 1 ? '' : 's') + ' the game does not read: ' +
        q.map(function (x) { return esc(x.label) + (x.count > 1 ? ' x' + x.count : ''); }).join(', ') + '.</div>';
    }
    el.className = 'ic-val-list';
    el.innerHTML = h;
  };

  root.icRenderIpcVars = function () {
    var el = $('ic-ipc-list'); if (!el) return;
    var vars = (M().st.doc && M().st.doc.ipc_variables) || [], h = '';
    for (var i = 0; i < vars.length; i++) {
      h += '<div style="display:flex;gap:4px;align-items:center;font-size:var(--fs-10);"><span style="color:var(--accent-cyan);flex:1;">' + esc(vars[i].key) + '</span><span style="flex:1;">' + esc(vars[i].value) + '</span>' +
        '<button class="btn btn-danger btn-sm" onclick="icRemoveIpcVar(' + i + ')">x</button></div>';
    }
    el.innerHTML = h || '<div style="font-size:var(--fs-10);color:var(--text-secondary);">None</div>';
    if (vars.length) IC.panels.openFold('ic-ipc-fold');
  };
  root.icAddIpcVar = function () {
    var k = $('ic-ipc-key'), v = $('ic-ipc-val'), d = M().st.doc;
    if (!k || !v || !d) return;
    if (!k.value) { colToast('Type a variable name first.', 'warn'); return; }
    if (!Array.isArray(d.ipc_variables)) d.ipc_variables = [];
    d.ipc_variables.push({ key: k.value, value: v.value });
    k.value = ''; v.value = '';
    U.changed(false); root.icRenderIpcVars();
  };
  root.icRemoveIpcVar = function (i) {
    var d = M().st.doc; if (!d || !Array.isArray(d.ipc_variables)) return;
    d.ipc_variables.splice(i, 1);
    U.changed(false); root.icRenderIpcVars();
  };
  root.icSaveEncounter = function () {
    var e = M().selected(); if (!e) { U.toast('Select a step first.'); return; }
    var zone = M().zoneName().replace(/[^a-zA-Z0-9_ ]/g, '').replace(/ /g, '_') || 'Unknown';
    var name = str(e.data || e.boss || e.type).replace(/[^a-zA-Z0-9_ ]/g, '').replace(/ /g, '_') || 'step';
    sendCommand('enc_save', zone + '/' + name + '.json|' + IC.pack.toJson(e));
    U.toast('Saved the step to Data/Encounters/' + zone + '/' + name + '.json (the game does not read it there).');
  };
  root.icLoadEncounter = function () {
    U.prompt('Load a saved step', 'Path under Data/Encounters (zone/name.json):', '', function (path) {
      if (!path) return;
      sendCommand('enc_load', path);
      setTimeout(function () {
        requestFileWith('Data/jqb_enc_detail.json', function (p, contents) {
          var o = null; try { o = JSON.parse(contents); } catch (_e) {}
          if (!o || typeof o !== 'object') { U.alert('Not loaded', 'Could not read ' + path + '.'); return; }
          U.addEntry(o);
        });
      }, 800);
    });
  };

  root.printf = function (s) { U.echo(String(s).replace(/\\a[a-z]/g, '')); };
})(typeof window !== 'undefined' ? window : this);
