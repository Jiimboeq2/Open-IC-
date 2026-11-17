/* Open IC Creator - ic-import-ui.js
   Overlay UI (IC.impui): the Import steps dialog (snippets, OgreBot zone files, other instance files).
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var D = IC.impui = IC.impui || {};
  function $(id) { return typeof document !== 'undefined' ? document.getElementById(id) : null; }
  function str(v) { return v == null ? '' : String(v); }
  function esc(s) { return str(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function cut(s, n) { s = str(s); return s.length > n ? s.slice(0, n - 1) + '...' : s; }
  function U() { return IC.ui; }
  function M() { return IC.model; }
  function FU() { return IC.flowui || {}; }
  function icon(gi, px) { return gi && FU().gameIcon ? FU().gameIcon(gi, px || 15) : ''; }
  D.ROOTS = [
    { label: 'OgreBot\'s own zone files', sub: 'shipped (read only)', path: '../../Ogre/EQ2/IC/default' },
    { label: 'OgreBot\'s test zone files', sub: 'shipped (read only)', path: '../../Ogre/EQ2/IC/test' },
    { label: 'My zone files', sub: 'OgreSave custom', path: '../../OgreSave/EQ2/IC/custom' }
  ];
  D.st = { tab: 'snip', slot: null, q: '', one: false };

  function style() {
    if ($('ici-style')) return;
    var css = [
      '#ici{position:fixed;z-index:180;left:50%;top:50%;width:860px;max-width:96vw;height:580px;max-height:92vh;transform:translate(-50%,-50%);display:flex;flex-direction:column;background:var(--bg-deep,#0b1120);border:1px solid var(--line-accent,rgba(153,204,255,0.5));border-radius:7px;box-shadow:0 10px 30px rgba(0,0,0,0.7);font-family:"Segoe UI",Tahoma,sans-serif;font-size:11px;color:var(--text-primary,#dfe7f3);}',
      '#ici.ici-one{width:520px;height:auto;max-height:90vh;}',
      '#ici .ici-h{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid var(--border-dark,rgba(255,255,255,0.08));}',
      '#ici .ici-h b{flex:1;font-size:13px;color:var(--header-gold,#e6c34d);}',
      '#ici .ici-x{cursor:pointer;color:var(--text-secondary,#8a96a8);padding:0 4px;font-size:13px;}',
      '#ici .ici-x:hover{color:var(--text-bright,#fff);}',
      '#ici .ici-tabs{display:flex;align-items:center;gap:4px;padding:6px 10px 4px 10px;}',
      '#ici .ici-tab{padding:2px 11px;border:1px solid var(--border-med,rgba(140,160,190,0.35));border-radius:var(--radius,4px);cursor:pointer;color:var(--text-primary,#b8c4d6);}',
      '#ici .ici-tab.on{background:var(--tint-on,rgba(153,204,255,0.18));border-color:var(--accent-cyan,rgba(153,204,255,0.7));color:var(--accent-cyan,#d6ecff);font-weight:bold;}',
      '#ici .ici-q{margin-left:auto;width:200px;font-size:11px;padding:2px 7px;background:var(--bg-input,#0b1120);color:var(--text-bright,#dfe7f3);border:1px solid var(--border-med,rgba(140,160,190,0.45));border-radius:var(--radius,3px);}',
      '#ici .ici-b{display:flex;flex:1;min-height:0;gap:8px;padding:4px 10px;}',
      '#ici .ici-l{flex:0 0 46%;overflow-y:auto;border:1px solid var(--border-dark,rgba(140,160,190,0.18));border-radius:4px;padding:3px 0;}',
      '#ici .ici-r{flex:1;overflow-y:auto;border:1px solid var(--border-dark,rgba(140,160,190,0.18));border-radius:4px;padding:6px 8px;}',
      '#ici.ici-one .ici-l{display:none;}',
      '#ici .ici-crumb{padding:3px 8px 5px 8px;color:var(--text-secondary,#8fa0b8);font-size:10.5px;}',
      '#ici .ici-crumb span{cursor:pointer;color:var(--accent-cyan,#9fd0ff);}',
      '#ici .ici-row{display:flex;align-items:center;gap:6px;padding:3px 8px;cursor:pointer;white-space:nowrap;}',
      '#ici .ici-row:hover{background:var(--tint-hover,rgba(153,204,255,0.08));}',
      '#ici .ici-row.on{background:var(--tint-on,rgba(153,204,255,0.16));}',
      '#ici .ici-row.dim{opacity:.55;cursor:default;}',
      '#ici .ici-row .t{flex:1;overflow:hidden;text-overflow:ellipsis;}',
      '#ici .ici-row .n{color:var(--text-secondary,#8fa0b8);font-size:10px;}',
      '#ici .ici-row .s{display:block;color:var(--text-secondary,#8fa0b8);font-size:10px;white-space:normal;}',
      '#ici .ici-strip{display:inline-flex;gap:2px;line-height:0;}',
      '#ici .ici-g{font-size:9.5px;color:var(--text-secondary,#8fa0b8);padding:5px 8px 1px 8px;text-transform:uppercase;letter-spacing:.04em;}',
      '#ici .ici-pv div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:19px;}',
      '#ici .ici-pv i{font-style:normal;color:var(--text-secondary,#8fa0b8);margin-right:4px;}',
      '#ici .ici-e{color:var(--text-secondary,#8fa0b8);padding:10px 4px;line-height:1.5;white-space:normal;}',
      '#ici .ici-f{border-top:1px solid var(--border-dark,rgba(255,255,255,0.08));padding:6px 10px;}',
      '#ici .ici-cnt{color:var(--text-primary,#b8c4d6);}',
      '#ici .ici-cnt span{color:var(--accent-cyan,#9fd0ff);cursor:pointer;text-decoration:underline;margin-left:4px;}',
      '#ici .ici-why{max-height:110px;overflow-y:auto;margin-top:3px;color:var(--text-primary,#9fb0c6);font-size:10.5px;}',
      '#ici .ici-why div{line-height:16px;}',
      '#ici .ici-why b{font-weight:normal;color:var(--text-warn,#f2c94c);}',
      '#ici .ici-why b.left{color:var(--text-bad,#ff9a9a);}',
      '#ici .ici-warn{color:var(--text-warn,#f2c94c);margin-top:3px;}',
      '#ici .ici-act{display:flex;align-items:center;gap:8px;margin-top:5px;}',
      '#ici .ici-act .w{flex:1;color:var(--text-secondary,#8fa0b8);}',
      '#ici .ici-btn{padding:3px 13px;border-radius:4px;border:1px solid var(--line-accent,rgba(0,204,255,0.45));background:var(--tint-accent,rgba(0,204,255,0.14));color:var(--accent-blue,#00ccff);cursor:pointer;font-size:11.5px;}',
      '#ici .ici-btn.off{border-color:var(--border-med,rgba(140,160,190,0.35));background:var(--tint-hover,rgba(255,255,255,0.03));color:var(--text-secondary,#6f7f96);cursor:default;}',
      '#ici .ici-sec{padding:2px 7px;border-radius:4px;border:1px solid var(--border-med,rgba(140,160,190,0.45));cursor:pointer;color:var(--text-bright,#dfe7f3);}',
      '#ici .ici-save{margin-top:6px;padding-top:5px;border-top:1px dashed var(--border-dark,rgba(140,160,190,0.25));display:flex;flex-wrap:wrap;gap:6px;align-items:center;color:var(--text-primary,#b8c4d6);}',
      '#ici .ici-save input[type=text]{width:170px;font-size:11px;padding:2px 6px;background:var(--bg-input,#0b1120);color:var(--text-bright,#dfe7f3);border:1px solid var(--border-med,rgba(140,160,190,0.45));border-radius:var(--radius,3px);}',
      '#ici .ici-sec.off{opacity:.45;cursor:default;}',
      '#ici .ici-svwhy{flex-basis:100%;color:var(--text-secondary,#8fa0b8);}',
      '#ici .ici-svwhy .bad{color:var(--text-bad,#ff9a9a);}',
      '#ici .ici-svwhy .lnk{color:var(--accent-cyan,#9fd0ff);cursor:pointer;text-decoration:underline;}'
    ].join('\n');
    var st = document.createElement('style');
    st.id = 'ici-style';
    st.textContent = css;
    document.head.appendChild(st);
  }
  D.isOpen = function () { return !!$('ici'); };
  D.close = function () {
    var d = $('ici');
    if (d && d.parentNode) d.parentNode.removeChild(d);
    if (D.form) { D.form.close(); D.form = null; }
  };
  D.open = function (slot, tab) {
    if (typeof document === 'undefined') return;
    if (!M().editable()) { U().alert('Cannot add steps', 'Open an instance file (or start a new one) first.'); return; }
    style();
    D.close();
    D.st = { tab: tab || D.st.tab || 'snip', slot: slot || null, q: '', one: false, zone: { at: null, doc: null, ticks: {} }, jqb: { at: '', doc: null, ticks: {} }, snipId: null, why: false };
    var d = document.createElement('div');
    d.id = 'ici';
    d.innerHTML = '<div class="ici-h"><b>Import steps</b><span class="ici-x" data-ici="x" title="Close">&#10005;</span></div>' +
      '<div class="ici-tabs"><span class="ici-tab" data-ici="tab:snip">Snippets</span><span class="ici-tab" data-ici="tab:zone">OgreBot zone files</span>' +
      '<span class="ici-tab" data-ici="tab:jqb">My instance files</span><input type="text" class="ici-q" placeholder="search..."></div>' +
      '<div class="ici-b"><div class="ici-l"></div><div class="ici-r"></div></div><div class="ici-f"></div>';
    document.body.appendChild(d);
    d.addEventListener('click', onClick);
    d.addEventListener('change', onChange);
    var q = d.querySelector('.ici-q');
    q.addEventListener('input', function () { D.st.q = q.value.toLowerCase(); left(); });
    D.loadUser(function () { if (D.st.tab === 'snip') left(); });
    tabTo(D.st.tab);
  };
  D.snip = function (id, slot) {
    D.open(slot, 'snip');
    var d = $('ici');
    if (!d) return;
    D.st.one = true;
    d.className = 'ici-one';
    d.querySelector('.ici-tabs').style.display = 'none';
    pickSnip(id);
  };
  function tabTo(t) {
    D.st.tab = t;
    var tabs = document.querySelectorAll('#ici .ici-tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].className = 'ici-tab' + (tabs[i].getAttribute('data-ici') === 'tab:' + t ? ' on' : '');
    if (D.form) { D.form.close(); D.form = null; }
    left();
    right();
    foot();
  }
  function box(cls) { var d = $('ici'); return d ? d.querySelector(cls) : null; }

  function slotWords() {
    var s = D.st.slot, L = M().list();
    if (s && s.how === 'sel' && s.after) return 'adds after the selected box: "' + cut(str(s.after).replace(/ ?\[det:\d+(?:\/\d+)?\]/g, ''), 40) + '"';
    if (s && s.seq) {
      var host = s.seq.p === '' && s.seq.k === '' ? L : ((M().get(M().pathParse(s.seq.p)) || {})[s.seq.k] || []), e = host[s.idx - 1];
      if (s.how === 'end' || (s.seq.p === '' && s.seq.k === '' && s.idx >= L.length)) return 'adds at the end' + (e ? ', after "' + cut(stepWords(e), 40) + '"' : '');
      return 'adds at the + you picked' + (e ? ', after "' + cut(stepWords(e), 40) + '"' : ' (first in its list)');
    }
    if (s && s.target) return 'adds where the step picker was opened';
    var sel = M().selected();
    return sel ? 'adds after the selected step: "' + cut(stepWords(sel), 40) + '"' : 'adds at the end';
  }
  function stepWords(e) { return IC.imp ? IC.imp.words(e) : str(IC.reg.labelFor(e)); }
  function insert(entries) {
    var s = D.st.slot;
    if (!entries || !entries.length) return;
    D.close();
    if (FU().insertAt && s && (s.seq || s.target)) FU().insertAt(entries, s);
    else U().addEntry(entries, s && s.target ? s.target : undefined);
    U().toast('Added ' + entries.length + ' step' + (entries.length === 1 ? '' : 's') + '.', 'ok');
  }
  D.nextWipe = function () { var n = 1; M().each(function (e) { if (e && e.type === 'WIPE_RECOVERY') n++; }); return n; };
  D.points = function () {
    var K = { wp: 'group move', camp: 'camp spot', split: 'split spot', nav: 'walk', yoyo: 'joust spot' }, out = [];
    var P = IC.plan && IC.plan.extract ? IC.plan.extract().points : [];
    for (var i = 0; i < P.length; i++) {
      var p = P[i];
      out.push({ t: '#' + p.n + ' ' + (K[p.k] || 'spot') + ' (' + Math.round(p.x) + ', ' + Math.round(p.y) + ', ' + Math.round(p.z) + ')', spot: [p.x, p.y, p.z] });
    }
    return out;
  };
  D.previewHtml = function (entries) {
    if (!IC.imp || !entries || !entries.length) return '<div class="ici-e">Nothing to add yet.</div>';
    var L = IC.imp.preview(entries, 300), h = '<div class="ici-pv">';
    for (var i = 0; i < L.length; i++) {
      var l = L[i];
      h += '<div style="padding-left:' + (l.depth * 14) + 'px">' + (l.branch ? '<i>' + esc(l.branch) + ':</i>' : '') + '<span style="display:inline-block;width:18px;line-height:0;vertical-align:middle">' + icon(l.gi, 15) + '</span>' + esc(cut(l.t, 96)) + '</div>';
    }
    if (L.length >= 300) h += '<div class="ici-e">... and more</div>';
    return h + '</div>';
  };

  D.userLoaded = false;
  D.userErr = '';
  D.saving = false;
  D.USER_MAX = 1048576;
  D.readUser = function (cb) {
    if (typeof requestFileWith !== 'function' || !IC.snip) { cb('', 'could not be read here'); return; }
    requestFileWith(IC.snip.FILE, function (p, c) {
      var t = str(c);
      if (t || typeof requestDirWith !== 'function') { cb(t, ''); return; }
      var dir = IC.snip.FILE.replace(/\/[^\/]*$/, ''), name = IC.snip.FILE.slice(dir.length + 1).toLowerCase();
      requestDirWith(dir, function (p2, entries) {
        var there = false;
        (Array.isArray(entries) ? entries : []).forEach(function (e) { if (e && !e.dir && str(e.name).toLowerCase() === name) there = true; });
        cb('', there ? 'is there but did not read (in use, or empty)' : '');
      });
    });
  };
  D.userIn = function (text, err) {
    var t = str(text), j = t.trim() ? json(t) : {}, f = 'the snippets file (JB\\Data\\jqb_ic_snippets.json) ';
    D.userErr = err ? f + err : t.length > D.USER_MAX ? f + 'is over 1 MB' :
      (!j || typeof j !== 'object' || Array.isArray(j) || (t.trim() && !Array.isArray(j.snippets))) ? f + 'is not a snippets list: fix it or move it away, then try again' : '';
    if (D.userErr) { D.userLoaded = false; return false; }
    var r = IC.snip.parseUser(t);
    IC.snip.user = r.list;
    D.userBad = r.bad;
    D.userLoaded = true;
    return true;
  };
  D.loadUser = function (cb, fresh) {
    if (D.userLoaded && !fresh) { if (cb) cb(true); return; }
    D.readUser(function (t, err) {
      var ok = D.userIn(t, err);
      saveState();
      if (cb) cb(ok);
    });
  };
  function slug(s) { return str(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'snippet'; }
  D.userKey = function (s) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) return '';
    var id = typeof s.id === 'string' ? s.id : '', t = typeof s.title === 'string' ? s.title.trim() : '';
    if (id.slice(0, 3) === 'my:') return id;
    return id ? 'my:' + slug(id) : (t ? 'my:' + slug(t) : '');
  };
  D.mergeUser = function (diskText, saveText) {
    var t = str(diskText), d = t.trim() ? json(t) : { snippets: [] }, a = json(saveText), keys = [], out = [];
    if (!d || typeof d !== 'object' || Array.isArray(d) || !Array.isArray(d.snippets))
      return { err: 'the snippets file there (JB\\Data\\jqb_ic_snippets.json) is not a snippets list, so nothing was written over it: fix it or move it away' };
    if (!a || typeof a !== 'object' || !Array.isArray(a.snippets)) return { err: 'no snippets list' };
    d.snippets.forEach(function (s) { keys.push(D.userKey(s)); out.push(s); });
    a.snippets.forEach(function (s) {
      var k = D.userKey(s);
      for (var i = 0; k && i < keys.length; i++) if (keys[i] === k) { out[i] = s; return; }
      keys.push(k);
      out.push(s);
    });
    var text = JSON.stringify({ v: 1, snippets: out }).replace(/[^\x00-\x7f]/g, function (c) { return '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4); });
    return text.length > D.USER_MAX ? { err: 'the snippets file would be over 1 MB' } : { text: text };
  };
  function saveState() {
    var b = box('[data-ici="save"]'), w = box('.ici-svwhy');
    if (b) {
      b.className = 'ici-sec' + (D.userLoaded && !D.saving ? '' : ' off');
      b.title = D.userLoaded ? 'Keeps it in your snippets (JB\\Data\\jqb_ic_snippets.json), for both Creators' : 'Save stays off until your snippets file has loaded';
    }
    if (w) w.innerHTML = D.userLoaded ? '' : D.userErr ? '<span class="bad">Save stays off: ' + esc(D.userErr) + '.</span> <span class="lnk" data-ici="reload">Try again</span>' : 'Loading your snippets...';
  }
  function snipIcon(sn) {
    var I = IC.icons;
    if (!I || !sn) return null;
    if (/^ability:/.test(str(sn.icon))) return (I.forAbil && I.forAbil(sn.icon.slice(8))) || I.mk('cast', sn.role);
    return I.mk(sn.icon || 'note', sn.role || 'action');
  }
  function snipList() {
    var S = IC.snip, q = D.st.q, h = '', mine = '', any = false;
    if (!S) return '<div class="ici-e">The snippets did not load.</div>';
    S.list('jqb').forEach(function (sn) {
      if (q && (sn.label + ' ' + str(sn.help)).toLowerCase().indexOf(q) < 0) return;
      var row = '<div class="ici-row' + (D.st.snipId === sn.id ? ' on' : '') + '" data-ici="snip:' + esc(sn.id) + '" title="' + esc(sn.source ? 'From ' + sn.source : '') + '">' +
        '<span class="ici-strip">' + icon(snipIcon(sn), 16) + '</span><span class="t">' + esc(sn.label) + '<span class="s">' + esc(cut(sn.help, 110)) + '</span></span></div>';
      if (sn.user) mine += row; else h += row;
      any = true;
    });
    return '<div class="ici-g">Built in</div>' + (h || '<div class="ici-e">None fits the search.</div>') +
      '<div class="ici-g">My snippets</div>' + (mine || (!D.userLoaded ? '<div class="ici-e">' + (D.userErr ? esc(D.userErr.charAt(0).toUpperCase() + D.userErr.slice(1)) + '.' : 'Loading your snippets...') + '</div>' :
      '<div class="ici-e">None yet. Select steps in the chart or the list, then "Save as my snippet" below.' +
      (D.userBad && D.userBad.length ? ' (' + esc(D.userBad[0]) + ')' : '') + '</div>')) + (any ? '' : '');
  }
  function hostOpts() {
    var C = IC.catch, Fm = IC.form;
    return {
      grab: function (kind, cb) { if (Fm && Fm.grabValue) Fm.grabValue(kind, cb); },
      points: D.points,
      fights: C && C.menu ? function (anchor, cb) { C.menu(anchor, 'actor', function (v) { cb(v); }); } : null,
      abilPick: Fm && Fm.abilPick ? function (anchor, cb) { Fm.abilPick(anchor, cb); } : null,
      gameIcon: FU().gameIcon,
      preview: function (steps) { return D.previewHtml(steps); },
      ctx: function () { return { wipeNum: D.nextWipe() }; },
      autoGrab: C && C.autoOn && C.autoOn() && C.autoGrabValue ? function (label, cb) { C.autoGrabValue(label, cb); } : null,
      where: esc(slotWords().replace(/^a/, 'A'))
    };
  }
  function pickSnip(id) {
    var S = IC.snip, sn = S && S.get(id), r = box('.ici-r');
    if (!sn || !r) return;
    D.st.snipId = id;
    if (!D.st.one) left();
    if (D.form) D.form.close();
    var o = hostOpts();
    o.onCancel = function () { if (D.st.one) D.close(); else { D.st.snipId = null; left(); right(); } };
    o.onAdd = function (vals) { insert(S.build(sn, vals, 'jqb', { wipeNum: D.nextWipe() }).steps); };
    o.title = true;
    D.form = IC.fv.snipForm(r, sn, 'jqb', o);
    foot();
  }

  function selected() {
    var host = $('ic-flow'), V = host && host._fv, sel = M().st.sel, i;
    if (V && V.O && FU().on) for (i = 0; i < V.O.nodes.length; i++) {
      var n = V.O.nodes[i].n;
      if (!n.sel || n.ref == null || n.fixed) continue;
      var p = M().pathParse(n.ref), pr = M().parent(p);
      if (pr) return pr.arr.slice(pr.idx, pr.idx + Math.max(1, n.span || 1));
    }
    var e = sel ? M().get(sel) : null;
    return e ? [e] : [];
  }
  function saveMine() {
    var S = IC.snip, steps = selected(), nm = box('#ici-sv-name'), sp = box('#ici-sv-spots'), na = box('#ici-sv-names');
    if (D.saving) return;
    if (!S || !steps.length) { U().toast('Select a step (or a section) first.', 'warn'); return; }
    if (!D.userLoaded) { U().toast('Save stays off: ' + (D.userErr || 'your snippets are still loading') + '.', 'warn'); return; }
    var title = str(nm && nm.value).trim();
    if (!title) { U().toast('Give it a name first.', 'warn'); if (nm) try { nm.focus(); } catch (_e) {} return; }
    if (typeof sendCommand !== 'function') { U().toast('Not saved: the overlay cannot write files here.', 'warn'); return; }
    var o = { title: title, askSpots: !!(sp && sp.checked), askNames: !!(na && na.checked) }, snap = json(JSON.stringify(steps)) || [];
    D.saving = true;
    saveState();
    D.readUser(function (t, err) {
      D.saving = false;
      if (!D.userIn(t, err)) { saveState(); left(); U().toast('Not saved: ' + D.userErr + '.', 'warn'); return; }
      var sn = S.fromSteps(snap, 'jqb', o), m = D.mergeUser(t, S.userText([sn]));
      if (m.err) { saveState(); U().toast('Not saved: ' + m.err + '.', 'warn'); return; }
      sendCommand('write_file', S.FILE + '|' + m.text);
      D.userIn(m.text, '');
      saveState();
      U().toast('Saved "' + title + '" with ' + snap.length + ' step' + (snap.length === 1 ? '' : 's') + ' in your snippets.', 'ok');
      left();
    });
  }
  D.saveMine = saveMine;

  function json(c) { try { return JSON.parse(str(c).replace(/^\uFEFF/, '')); } catch (_e) { return null; } }
  function dirOnly(rel) { return str(rel).replace(/(^|\/)[^\/]*\.json$/i, ''); }
  function zoneList() {
    var z = D.st.zone, h = '';
    if (!z.at) {
      h = '<div class="ici-e">OgreBot\'s zone files: pick where, then a zone, then tick its parts. They come in as ISXJQB steps (the ones ISXJQB runs for a zone file).</div>';
      for (var i = 0; i < D.ROOTS.length; i++) h += '<div class="ici-row" data-ici="zroot:' + i + '"><span class="t">' + esc(D.ROOTS[i].label) + '<span class="s">' + esc(D.ROOTS[i].sub) + '</span></span></div>';
      return h;
    }
    h = '<div class="ici-crumb"><span data-ici="zup:root">Zone files</span>' + crumbs(z.at) + '</div>';
    if (z.doc) return h + partsHtml(z.parts, z.ticks, 'zt');
    if (!z.entries) return h + '<div class="ici-e">Reading...</div>';
    var q = D.st.q, rows = '';
    z.entries.forEach(function (e, k) {
      if (q && e.name.toLowerCase().indexOf(q) < 0) return;
      rows += '<div class="ici-row" data-ici="' + (e.dir ? 'zdir:' : 'zfile:') + k + '"><span class="t">' + (e.dir ? '&#128193; ' : '') + esc(e.name.replace(/\.json$/i, '')) + '</span></div>';
    });
    return h + (rows || '<div class="ici-e">Nothing here.</div>');
  }
  function crumbs(at) {
    var parts = at.rel ? at.rel.split('/') : [], h = ' &rsaquo; <span data-ici="zup:0">' + esc(D.ROOTS[at.root].label) + '</span>';
    for (var i = 0; i < parts.length; i++) h += ' &rsaquo; <span data-ici="zup:' + (i + 1) + '">' + esc(parts[i].replace(/\.json$/i, '')) + '</span>';
    return h;
  }
  function zoneGo(rootIdx, rel) {
    var z = D.st.zone;
    z.at = { root: rootIdx, rel: rel || '' };
    z.doc = null; z.entries = null; z.ticks = {};
    left(); right(); foot();
    if (typeof requestDirWith !== 'function') return;
    requestDirWith(D.ROOTS[rootIdx].path + (rel ? '/' + rel : ''), function (p, entries) {
      if (D.st.zone !== z || !z.at || z.at.rel !== (rel || '')) return;
      z.entries = (entries || []).filter(function (e) { return e && (e.dir || /\.json$/i.test(e.name)) && !/^_converted|^panel\.json$/i.test(e.name); })
        .sort(function (a, b) { return a.dir !== b.dir ? (a.dir ? -1 : 1) : String(a.name).localeCompare(String(b.name)); });
      left();
    });
  }
  function zoneOpen(rel) {
    var z = D.st.zone, at = z.at;
    z.at = { root: at.root, rel: rel };
    z.entries = null;
    left();
    requestFileWith(D.ROOTS[at.root].path + '/' + rel, function (p, c) {
      var doc = json(c);
      if (!doc || typeof doc !== 'object') { z.doc = null; z.entries = []; left(); U().toast('That file could not be read as a zone file.', 'warn'); return; }
      z.doc = doc;
      z.parts = IC.imp.partsOf(doc, 'oic');
      z.names = IC.imp.namesOf(doc);
      z.parts.forEach(function (pt) { pt.icons = iconsOf(IC.imp.zoneToJqb(pt.steps, { wipeNum: 1, named: z.names.named, loot: z.names.loot }).entries); });
      left(); right(); foot();
    });
  }
  function iconsOf(entries) {
    var L = IC.imp.preview(entries, 200), seen = {}, out = [];
    for (var i = 0; i < L.length && out.length < 7; i++) {
      var g = L[i].gi;
      if (!g || !(g.id > 0) || L[i].role === 'note' || L[i].role === 'alt') continue;
      var k = (g.item ? 'i' : 's') + g.id + '/' + g.back;
      if (seen[k]) continue;
      seen[k] = 1;
      out.push(g);
    }
    return out;
  }
  function partsHtml(parts, ticks, pre) {
    var h = '<div class="ici-e" style="padding:2px 8px 4px 8px;">Tick the parts to bring in:</div>';
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], strip = '';
      for (var k = 0; p.icons && k < p.icons.length; k++) strip += icon(p.icons[k], 14);
      h += '<label class="ici-row' + (ticks[i] ? ' on' : '') + '"><input type="checkbox" data-ici="' + pre + ':' + i + '"' + (ticks[i] ? ' checked' : '') + '>' +
        '<span class="t">' + esc(p.title) + '</span><span class="ici-strip">' + strip + '</span><span class="n">' + p.count + ' step' + (p.count === 1 ? '' : 's') + '</span></label>';
    }
    return h + '<div class="ici-row" data-ici="' + pre + 'all"><span class="t" style="color:var(--accent-cyan,#9fd0ff)">Tick them all / none</span></div>';
  }
  function zoneResult() {
    var z = D.st.zone, steps = [];
    if (!z.doc) return null;
    for (var i = 0; i < z.parts.length; i++) if (z.ticks[i]) steps = steps.concat(z.parts[i].steps);
    if (!steps.length) return null;
    var r = IC.imp.zoneToJqb(steps, { wipeNum: D.nextWipe(), named: z.names.named, loot: z.names.loot });
    r.zone = str(z.doc.zone);
    return r;
  }

  function jqbList() {
    var j = D.st.jqb, h = '<div class="ici-crumb"><span data-ici="jup:-1">Instances</span>', parts = j.at ? j.at.split('/') : [];
    for (var i = 0; i < parts.length; i++) h += ' &rsaquo; <span data-ici="jup:' + i + '">' + esc(parts[i].replace(/\.json$/i, '')) + '</span>';
    h += '</div>';
    if (j.doc) return h + (j.why ? '<div class="ici-e">' + esc(j.why) + '</div>' : partsHtml(j.parts, j.ticks, 'jt'));
    if (!j.entries) { if (!j.asked) jqbGo(j.at); return h + '<div class="ici-e">Reading...</div>'; }
    var q = D.st.q, rows = '';
    j.entries.forEach(function (e, k) {
      if (q && e.name.toLowerCase().indexOf(q) < 0) return;
      rows += '<div class="ici-row" data-ici="' + (e.dir ? 'jdir:' : 'jfile:') + k + '"><span class="t">' + (e.dir ? '&#128193; ' : '') + esc(e.name.replace(/\.json$/i, '')) + '</span></div>';
    });
    return h + (rows || '<div class="ici-e">Nothing here.</div>');
  }
  function jqbGo(rel) {
    var j = D.st.jqb;
    j.at = rel || ''; j.doc = null; j.entries = null; j.ticks = {}; j.why = ''; j.asked = true;
    if (typeof requestDirWith !== 'function') return;
    requestDirWith('Instances' + (j.at ? '/' + j.at : ''), function (p, entries) {
      if (D.st.jqb !== j || j.at !== (rel || '')) return;
      j.entries = (entries || []).filter(function (e) { return e && (e.dir || /\.json$/i.test(e.name)); })
        .sort(function (a, b) { return a.dir !== b.dir ? (a.dir ? -1 : 1) : String(a.name).localeCompare(String(b.name)); });
      left();
    });
  }
  function jqbOpen(rel) {
    var j = D.st.jqb;
    j.at = rel; j.entries = null;
    left();
    requestFileWith('Instances/' + rel, function (p, c) {
      var doc = json(c), fmt = M().detect(doc);
      j.doc = doc || {};
      j.why = fmt === 'wrapper' ? 'A difficulty wrapper: its steps live in ' + str(doc.base_file) + '. Open that file instead.' :
        (fmt === 'v3' ? 'A template (sequence) file: its blocks only run in template files.' : (fmt !== 'v2' ? 'Not an instance file.' : ''));
      j.parts = j.why ? [] : IC.imp.partsOf(doc, 'jqb');
      j.parts.forEach(function (pt) { pt.icons = iconsOf(pt.steps); });
      left(); right(); foot();
    });
  }
  function jqbResult() {
    var j = D.st.jqb, steps = [];
    if (!j.doc || j.why) return null;
    for (var i = 0; i < j.parts.length; i++) if (j.ticks[i]) steps = steps.concat(j.parts[i].steps);
    if (!steps.length) return null;
    var r = IC.imp.jqbClone(steps, { wipeNum: D.nextWipe() });
    return { entries: r.entries, notes: [], counts: { ok: steps.length, changed: 0, left: 0 }, zone: str(j.doc.base_zone || j.doc.zone || j.doc.name) };
  }

  function left() {
    var l = box('.ici-l');
    if (!l) return;
    var t = D.st.tab;
    l.innerHTML = t === 'snip' ? snipList() : (t === 'zone' ? zoneList() : jqbList());
  }
  function result() { return D.st.tab === 'zone' ? zoneResult() : (D.st.tab === 'jqb' ? jqbResult() : null); }
  function right() {
    var r = box('.ici-r');
    if (!r || D.st.tab === 'snip') { if (r && !D.st.snipId) r.innerHTML = '<div class="ici-e">Pick a snippet on the left: its form asks for each value (Here, Target, Hover, one of this file\'s spots), shows what it adds, and adds it at the +.</div>'; return; }
    var res = result();
    r.innerHTML = '<div class="ici-g" style="padding-left:0">What it adds, in words</div>' + (res ? D.previewHtml(res.entries) :
      '<div class="ici-e">' + (D.st.tab === 'zone' ? (D.st.zone.doc ? 'Tick a part on the left.' : 'Pick a zone file on the left.') : (D.st.jqb.doc ? 'Tick a section on the left.' : 'Pick one of your instance files on the left.')) + '</div>');
  }
  function foot() {
    var f = box('.ici-f');
    if (!f) return;
    if (D.st.tab === 'snip') {
      f.innerHTML = D.st.one ? '' : '<div class="ici-save">Save the selected step(s) as my snippet: <input type="text" id="ici-sv-name" placeholder="its name">' +
        '<label><input type="checkbox" id="ici-sv-spots" checked> ask me for the spots each time</label><label><input type="checkbox" id="ici-sv-names"> ask me for the names each time</label>' +
        '<span class="ici-sec off" data-ici="save">Save</span><span class="ici-svwhy"></span></div>';
      if (D.st.one) f.style.display = 'none';
      saveState();
      return;
    }
    var res = result(), h = '';
    if (res) {
      h += '<div class="ici-cnt">' + esc(IC.imp.countWords(res.counts)) + (res.counts.changed || res.counts.left ? '<span data-ici="why">' + (D.st.why ? 'hide why' : 'why') + '</span>' : '') + '</div>';
      if (D.st.why) {
        h += '<div class="ici-why">';
        res.notes.forEach(function (n) { if (n.status !== 'ok') h += '<div><b class="' + (n.status === 'left' ? 'left' : '') + '">' + (n.status === 'left' ? 'left out' : 'changed') + ':</b> ' + esc(n.what) + ' -- ' + esc(n.why) + '</div>'; });
        h += '</div>';
      }
      IC.imp.checks({ srcZone: res.zone, dstZone: M().zoneName ? M().zoneName() : '', entries: res.entries, dst: M().list() }).forEach(function (c) { h += '<div class="ici-warn">' + esc(c.msg) + '</div>'; });
    }
    h += '<div class="ici-act"><span class="w">' + esc(slotWords().replace(/^a/, 'A')) + '</span><span class="ici-btn' + (res ? '' : ' off') + '" data-ici="insert">Insert at the +' +
      (res ? ' (' + res.entries.length + ' step' + (res.entries.length === 1 ? '' : 's') + ')' : '') + '</span></div>';
    f.innerHTML = h;
  }

  function onClick(e) {
    for (var t = e.target; t && t.getAttribute && t.id !== 'ici'; t = t.parentNode) {
      var a = t.getAttribute('data-ici');
      if (!a) continue;
      if (t.tagName === 'INPUT') return;
      var c = a.indexOf(':'), k = c > 0 ? a.slice(0, c) : a, v = c > 0 ? a.slice(c + 1) : '';
      if (k === 'x') D.close();
      else if (k === 'tab') tabTo(v);
      else if (k === 'snip') pickSnip(v);
      else if (k === 'save') saveMine();
      else if (k === 'reload') { D.userErr = ''; saveState(); D.loadUser(function (ok) { if (ok) U().toast('Your snippets loaded: Save is on again.', 'ok'); if (D.st.tab === 'snip') left(); }, true); }
      else if (k === 'zroot') zoneGo(+v, '');
      else if (k === 'zup') { if (v === 'root') { D.st.zone = { at: null, ticks: {} }; left(); right(); foot(); } else { var z = D.st.zone; zoneGo(z.at.root, dirOnly(z.at.rel.split('/').slice(0, +v).join('/'))); } }
      else if (k === 'zdir' || k === 'zfile') {
        var ze = D.st.zone.entries[+v], rel = (D.st.zone.at.rel ? D.st.zone.at.rel + '/' : '') + ze.name;
        if (k === 'zdir') zoneGo(D.st.zone.at.root, rel); else zoneOpen(rel);
      } else if (k === 'jup') { jqbGo(+v < 0 ? '' : dirOnly(D.st.jqb.at.split('/').slice(0, +v + 1).join('/'))); left(); right(); foot(); }
      else if (k === 'jdir' || k === 'jfile') {
        var je = D.st.jqb.entries[+v], jr = (D.st.jqb.at ? D.st.jqb.at + '/' : '') + je.name;
        if (k === 'jdir') { jqbGo(jr); left(); } else jqbOpen(jr);
      } else if (k === 'ztall' || k === 'jtall') {
        var S = k === 'ztall' ? D.st.zone : D.st.jqb, all = true, i;
        for (i = 0; i < S.parts.length; i++) if (!S.ticks[i]) all = false;
        for (i = 0; i < S.parts.length; i++) S.ticks[i] = !all;
        left(); right(); foot();
      } else if (k === 'why') { D.st.why = !D.st.why; foot(); }
      else if (k === 'insert') { var r = result(); if (r && r.entries.length) insert(r.entries); }
      return;
    }
  }
  function onChange(e) {
    var t = e.target, a = t && t.getAttribute ? t.getAttribute('data-ici') : null;
    if (!a) return;
    var p = a.split(':');
    if (p[0] === 'zt') D.st.zone.ticks[+p[1]] = t.checked;
    else if (p[0] === 'jt') D.st.jqb.ticks[+p[1]] = t.checked;
    else return;
    left(); right(); foot();
  }
})(typeof window !== 'undefined' ? window : this);
