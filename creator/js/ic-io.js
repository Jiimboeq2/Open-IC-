/* Open IC Creator - ic-io.js
   Overlay UI (IC.io): load, save, test and run instance files through the overlay bridge of ISXJQB.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var IO = IC.io = IC.io || {};
  var U = IC.ui = IC.ui || {};
  function $(id) { return (typeof document !== 'undefined') ? document.getElementById(id) : null; }
  function esc(s) { return IC.form.esc(s); }
  function str(v) { return v == null ? '' : String(v); }
  function M() { return IC.model; }
  function val(id) { var el = $(id); return el ? str(el.value).trim() : ''; }
  function setVal(id, v) { var el = $(id); if (el) el.value = v; }

  IO.SCRATCH_DIR = 'Data/NO_PATCH/IC_Test';

  IO.folder = function () { return val('ic-folder').replace(/^[\/\s]+|[\/\s]+$/g, ''); };
  IO.fileName = function () { return val('ic-filename').replace(/\.json$/i, ''); };
  IO.relPath = function () {
    var f = IO.fileName(), d = IO.folder();
    if (!f) return '';
    if (f.indexOf('/') >= 0 || !d) return f;
    return d + '/' + f;
  };
  root.icGetSavePath = function (filename) { var d = IO.folder(); return d ? d + '/' + filename : filename; };
  root.icNormEntries = function (entries) {
    var list = entries;
    if (typeof list === 'string') { try { list = JSON.parse(list); } catch (e) { list = []; } }
    return (list && list.length) ? list : [];
  };
  root.icEntryIsDir = function (e) { return !!(e && (e.dir === true || e.type === 'dir')); };

  function diag(msg, isErr) {
    var tl = $('ic-timeline'); if (!tl) return;
    var color = isErr ? 'var(--accent-red,#c44)' : 'var(--accent-cyan,#4a7)';
    tl.innerHTML = '<div style="padding:12px;font-size:var(--fs-11);line-height:1.6;color:' + color + ';white-space:pre-wrap;border-left:2px solid ' + color + ';margin:8px;background:rgba(0,0,0,0.3);">' + esc(msg) + '</div>';
  }
  IO.loadRel = function (rel, after) {
    rel = str(rel).replace(/\\/g, '/').replace(/\.json$/i, '').replace(/^\/+/, '');
    if (!rel) {
      if (root.icWizGoto) root.icWizGoto('file');
      root.icLoadFolderList();
      U.toast('Pick a file from the list, or type a file name.', 'warn');
      return;
    }
    var go = function () {
      diag('Loading Instances/' + rel + '.json ...');
      requestFileWith('Instances/' + rel + '.json', function (path, contents) {
        if (!contents) {
          diag('Could not read Instances/' + rel + '.json\nCheck that the file exists under JB\\Instances.', true);
          U.alert('File not found', 'Instances/' + rel + '.json could not be read.');
          return;
        }
        var cut = rel.lastIndexOf('/');
        var r = M().loadText(contents, { path: rel, folder: cut >= 0 ? rel.slice(0, cut) : '', fromDisk: true });
        if (!r.ok) { diag(r.error, true); U.alert('Could not open the file', r.error); return; }
        setVal('ic-folder', cut >= 0 ? rel.slice(0, cut) : '');
        setVal('ic-filename', cut >= 0 ? rel.slice(cut + 1) : rel);
        IO.afterLoad();
        if (after) after();
      });
    };
    if (M().dirty()) {
      U.confirm('Unsaved changes', 'You have unsaved changes in ' + (M().st.path || 'this file') + '.\nOpen ' + rel + ' anyway and lose them?', function (yes) { if (yes) go(); });
    } else go();
  };
  IO.afterLoad = function () {
    var st = M().st;
    if (IC.tl) IC.tl.collapsed = {};
    if (IC.panels && IC.panels.fromDoc) IC.panels.fromDoc();
    if (root.icWizGoto && st.fmt !== 'other') root.icWizGoto('timeline');
    if (IC.picker && IC.picker.renderQuickBar) IC.picker.renderQuickBar();
    U.refresh(true);
    U.renderBanner();
    if (root.icUpdateCommonUI) root.icUpdateCommonUI();
    if (st.fmt === 'v3') U.toast('Template (sequence) file: some fields are not read by the game in this format -- see the banner.', 'warn');
  };
  root.icLoad = function () { IO.loadRel(IO.relPath()); };
  root.icPickFile = function (base) {
    if (!base) return;
    var d = IO.folder();
    IO.loadRel(d ? d + '/' + base : base);
  };
  root.icNewFile = function () {
    var go = function () {
      M().reset({ zone: '', difficulty: 'heroic' });
      setVal('ic-filename', '');
      if (IC.panels && IC.panels.fromDoc) IC.panels.fromDoc();
      if (root.icWizGoto) root.icWizGoto('zoneinfo');
      U.refresh(true); U.renderBanner();
      if (root.icUpdateCommonUI) root.icUpdateCommonUI();
    };
    if (M().dirty()) U.confirm('Unsaved changes', 'Start a new file and lose the unsaved changes?', function (y) { if (y) go(); }); else go();
  };
  root.icRevert = function () {
    if (!M().st.fromDisk || !M().st.path) { U.toast('Nothing saved to go back to.'); return; }
    U.confirm('Revert', 'Throw away your changes and reload ' + M().st.path + ' from disk?', function (y) {
      if (!y) return;
      M().st.saved = M().st.cur;
      IO.loadRel(M().st.path);
    });
  };

  IO.problemsText = function (list) {
    var lines = [];
    for (var i = 0; i < list.length && i < 8; i++) lines.push('- ' + list[i].label + ': ' + list[i].msg);
    if (list.length > 8) lines.push('... and ' + (list.length - 8) + ' more (see the Check tab).');
    return lines.join('\n');
  };
  IO.write = function (rel, json, done) {
    sendCommand('ic_save_json', rel + '|' + json);
    var want = JSON.stringify(JSON.parse(json)), tries = 0;
    var check = function () {
      requestFileWith('Instances/' + rel + '.json', function (p, contents) {
        var ok = false;
        try { ok = !!contents && JSON.stringify(JSON.parse(contents)) === want; } catch (_e) { ok = false; }
        if (ok || ++tries >= 3) { if (done) done(ok); return; }
        setTimeout(check, 1000);
      });
    };
    setTimeout(check, 900);
  };
  root.icSave = function () {
    U.flush();
    var st = M().st;
    if (st.fmt === 'other') { U.alert('Not saved', 'This file is not an instance file; edit it outside the Creator.'); return; }
    var name = IO.fileName();
    if (!name) {
      var z = M().zoneName();
      name = z.replace(/[^a-zA-Z0-9 ]/g, '_').replace(/ /g, '_');
      if (!name) { if (root.icWizGoto) root.icWizGoto('file'); U.alert('Name the file', 'Type a file name (and folder) on the File step first.'); return; }
      setVal('ic-filename', name);
    }
    var rel = IO.relPath();
    var doSave = function () {
      var json = M().serialize();
      U.toast('Saving ' + rel + '.json ...');
      IO.write(rel, json, function (ok) {
        if (ok) {
          M().markSaved(); M().st.path = rel;
          var cut = rel.lastIndexOf('/'); M().st.folder = cut >= 0 ? rel.slice(0, cut) : '';
          U.toast('Saved ' + rel + '.json');
          U.refresh(false);
        } else U.alert('Save not confirmed', 'Could not read ' + rel + '.json back after saving. Check the InnerSpace console for "[JB] IC saved".');
      });
    };
    var probs = IC.val.doc().filter(function (x) { return x.level === 'error'; });
    if (probs.length) {
      U.confirm('Save with problems?', probs.length + ' step' + (probs.length === 1 ? ' has' : 's have') + ' a problem the game may misread:\n' + IO.problemsText(probs) + '\n\nSave anyway?', function (y) { if (y) doSave(); });
    } else doSave();
  };

  IO.scratchDoc = function () {
    var st = M().st, doc = JSON.parse(JSON.stringify(st.doc));
    if (st.fmt === 'wrapper' && doc.base_file) {
      var d = IO.folder(), b = str(doc.base_file).replace(/\\/g, '/');
      doc.base_file = '../../../Instances/' + (d ? d + '/' : '') + b;
    }
    return doc;
  };
  root.icTestRun = function () {
    U.flush();
    var st = M().st;
    if (st.fmt === 'other') { U.alert('Cannot test', 'This file is not an instance file.'); return; }
    if (M().editable() && !M().list().length) { U.alert('Nothing to test', 'Add some steps first.'); return; }
    var stem = (IO.fileName().split('/').pop() || 'Untitled').replace(/[^A-Za-z0-9 _\-'().]/g, '_');
    var rel = IO.SCRATCH_DIR + '/' + stem;
    var go = function () {
      var json = IC.pack.toJson(IO.scratchDoc());
      sendCommand('write_file', rel + '.json|' + json);
      setTimeout(function () { sendCommand('ic_test_run', '../' + rel); }, 400);
      U.toast('Testing your current edits (a scratch copy in JB\\' + rel.replace(/\//g, '\\') + '.json). Your saved file is not changed.');
    };
    var probs = IC.val.doc().filter(function (x) { return x.level === 'error'; });
    if (probs.length) U.confirm('Test with problems?', IO.problemsText(probs) + '\n\nTest anyway?', function (y) { if (y) go(); });
    else go();
  };
  root.icRunInstance = function () {
    U.flush();
    var rel = M().st.fromDisk && M().st.path ? M().st.path : IO.relPath();
    if (!rel) { U.alert('Nothing to run', 'Open or save a file first.'); return; }
    var go = function () { sendCommand('ic_load', rel); U.toast('Running the saved ' + rel + '.json'); };
    if (M().dirty()) U.confirm('Run the saved file?', 'Run uses the SAVED file; your unsaved changes are not included.\n(Test runs your current edits.)\n\nRun the saved file?', function (y) { if (y) go(); });
    else go();
  };
  root.icTestStep = function () {
    U.flush();
    var e = M().selected();
    if (!e) { U.toast('Select a step first.'); return; }
    var s = IC.reg.forEntry(e), flat = s.testAs ? s.testAs(e) : (s.tpl ? null : e);
    if (!flat) { U.alert('Not for this block', 'This block expands into many steps; use Test for the whole file.'); return; }
    sendCommand('exec', 'oc !ci -LetsGo igw:${Me.Name}');
    sendCommand('ic_test_step', JSON.stringify(flat));
    U.toast('Testing step: ' + IC.reg.labelFor(flat));
  };
  root.icRunFromStep = function (fileStep) {
    var rel = M().st.path, n = (fileStep | 0) + 1;
    if (!rel || !M().st.fromDisk) { U.toast('Save the file first.'); return; }
    var go = function () { sendCommand('exec', 'jb ic rundirect "' + rel + '" ' + n); U.toast('Running ' + rel + ' from step ' + n); };
    if (M().dirty()) U.confirm('Run the saved file?', 'This runs the SAVED file from step ' + n + '; unsaved changes are not included and step numbers may differ.\nRun it?', function (y) { if (y) go(); });
    else go();
  };
  IO.stepPos = function (st) {
    if (!st || typeof st !== 'object') return null;
    if (typeof st.x === 'number' && typeof st.z === 'number') return { x: st.x, y: st.y || 0, z: st.z };
    var s = IC.reg.forEntry(st);
    for (var i = 0; s && i < s.fields.length; i++) {
      if (s.fields[i].kind !== 'pos') continue;
      var pp = IC.pack.posParse(IC.pack.get(st, s.fields[i], s, null));
      if (pp) return pp;
    }
    var d = st.data || st.loc || st.coords || '';
    return typeof d === 'string' ? IC.pack.posParse(d) : null;
  };
  root.icNearestToMe = function () {
    var L = M().list();
    var say = function (t) { var m = $('ic-nearest-msg'); if (m) m.textContent = t; };
    if (!L.length) { U.toast('Load a file first.'); return; }
    say('reading your position...');
    sendCommand('route_grabloc');
    setTimeout(function () {
      requestFileWith('Data/jqb_route_loc.json', function (p, contents) {
        var o = null; try { o = JSON.parse(contents); } catch (_e) {}
        if (!o || typeof o.x !== 'number') { say('could not read your position'); return; }
        var best = -1, bestD = 1e12, positioned = 0;
        for (var i = 0; i < L.length; i++) {
          var pp = IO.stepPos(L[i]);
          if (!pp) continue;
          positioned++;
          var dx = pp.x - o.x, dy = pp.y - (o.y || 0), dz = pp.z - o.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d < bestD) { bestD = d; best = i; }
        }
        if (best < 0) { say('no positioned steps in this file'); return; }
        var zs = str(M().header('zone_short_name') || M().header('short_name')), zoneNote = '';
        if (zs && o.zone_short && str(o.zone_short).toLowerCase() !== zs.toLowerCase()) zoneNote = ' -- you are in ' + str(o.zone || o.zone_short) + ', this file is for ' + zs;
        var line = 'nearest: step ' + (best + 1) + ' ' + IC.reg.labelFor(L[best]) + ' (' + bestD.toFixed(1) + ' m, ' + positioned + ' positioned steps)' + zoneNote;
        root.icSelectPath(String(best));
        if (IC.tl && IC.tl.reveal) IC.tl.reveal();
        say(line);
        if (M().st.fromDisk && M().st.fmt === 'v2') {
          U.confirm('Run from here?', 'Start ' + M().st.path + ' at step ' + (best + 1) + ' (' + bestD.toFixed(1) + ' m from you)?' + zoneNote, function (y) { if (y) root.icRunFromStep(best); });
        }
      });
    }, 400);
  };

  root.icLoadFolderList = function () {
    try {
      requestDirWith('Instances', function (path, entries) {
        var dl = $('ic-folder-list'); if (!dl) return;
        var list = root.icNormEntries(entries), h = '';
        for (var i = 0; i < list.length; i++) if (root.icEntryIsDir(list[i])) h += '<option value="' + esc(list[i].name) + '"></option>';
        dl.innerHTML = h;
      });
    } catch (_e) {}
    root.icLoadFileList();
  };
  root.icLoadFileList = function (folder) {
    var box = $('ic-file-list'); if (!box) return;
    if (typeof folder !== 'string') folder = IO.folder();
    folder = folder.replace(/^[\/\s]+|[\/\s]+$/g, '');
    box.innerHTML = '<div style="padding:8px;font-size:var(--fs-10);color:var(--text-secondary);">Loading files...</div>';
    requestDirWith(folder ? 'Instances/' + folder : 'Instances', function (path, entries) {
      var list = root.icNormEntries(entries), files = [];
      for (var i = 0; i < list.length; i++) {
        var e = list[i];
        if (e && !root.icEntryIsDir(e) && /\.json$/i.test(e.name || '')) files.push(e.name.replace(/\.json$/i, ''));
      }
      files.sort(function (a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
      if (!files.length) { box.innerHTML = '<div style="padding:8px;font-size:var(--fs-10);color:var(--text-secondary);">No .json files in <b>' + esc(folder || 'Instances (root)') + '</b>.</div>'; return; }
      var h = '';
      for (var j = 0; j < files.length; j++) {
        h += '<div class="ic-file-row" onclick="icPickFile(unescJs(\'' + escJs(files[j]) + '\'))" style="padding:5px 9px;font-size:var(--fs-11);cursor:pointer;border-bottom:1px solid var(--border-dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" ' +
          'onmouseover="this.style.background=\'rgba(153,204,255,0.10)\'" onmouseout="this.style.background=\'\'"><span style="color:var(--accent-cyan);">&#128196;</span> ' + esc(files[j]) + '</div>';
      }
      box.innerHTML = h;
    });
  };
})(typeof window !== 'undefined' ? window : this);
