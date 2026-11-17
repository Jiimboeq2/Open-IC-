/* Open IC Creator - ic-catch.js
   Fight events recorded by ISXJQB (chat, spawns, casts, detriments) as picks for steps and rules (IC.catch).
   Reads ISXJQB's own files; the standalone page does not load it.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var C = IC.catch = IC.catch || {};
  function str(v) { return v == null ? '' : String(v); }
  function esc(s) { return str(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function me() { return str(root._myCharName); }
  function cut(s, n) { s = str(s); return s.length > n ? s.slice(0, n - 1) + '...' : s; }
  function store(k, v) { try { if (v === undefined) return root.localStorage ? localStorage.getItem(k) : null; localStorage.setItem(k, v); } catch (_e) {} return null; }
  C.items = [];
  C.loadedAt = 0;

  var WORLD = /^(auction|crafting|general|help|high_level|lfg|newbie|traders|ooc|.*\d+)$/i;
  var KIND = { line: 'Line', red: 'Red text', chat: 'Chat', spawn: 'Appears', despawn: 'Goes away', cast: 'Cast', det: 'Detriment', eff: 'Effect' };
  C.KIND = KIND;
  C.parse = function (events, dets) {
    var out = [], seen = {}, kinds = (events && events.kinds) || ['chat', 'text', 'announce', 'spawn', 'despawn', 'reward', 'choice', 'dialog', 'loot',
      'quest', 'offer', 'zoning', 'zoned', 'mark', 'cast', 'effect'];
    function add(it, at) {
      var key = it.k + '|' + (it.text || it.name || '') + '|' + (it.mid || '') + '|' + (it.id || '');
      var was = seen[key];
      if (was) { was.n++; if (at > was.at) was.at = at; return; }
      it.n = 1; it.at = at || 0;
      seen[key] = it;
      out.push(it);
    }
    var ev = (events && events.ev) || [];
    for (var i = 0; i < ev.length; i++) {
      var e = ev[i], k = kinds[e[2]], a = e[3] || [], at = +e[1] || 0;
      if (k === 'chat') {
        var ch = str(a[5]);
        if (ch && WORLD.test(ch)) continue;
        if (str(a[1]).trim()) add({ k: 'chat', text: str(a[1]).trim(), who: str(a[2]), npc: str(a[4]) === 'TRUE' || a[4] === true || str(a[4]) === '1' }, at);
      } else if (k === 'text') { if (str(a[0]).trim()) add({ k: 'line', text: str(a[0]).trim() }, at); }
      else if (k === 'announce') { if (str(a[0]).trim()) add({ k: 'red', text: str(a[0]).trim() }, at); }
      else if (k === 'spawn' || k === 'despawn') {
        var nm = str(a[1]).trim(), ty = str(a[3]);
        if (nm && !/^(PC|Me|Player)$/i.test(ty)) add({ k: k, name: nm, type: ty }, at);
      } else if (k === 'cast') { if (str(a[2]).trim()) add({ k: 'cast', name: str(a[2]).trim(), id: str(a[3]), who: str(a[0]) }, at); }
      else if (k === 'effect') {
        if (str(a[0]) === '+' && /detri/i.test(str(a[2])) && str(a[1]).trim()) add({ k: 'eff', name: str(a[1]).trim(), id: str(a[3]) }, at);
      }
    }
    var D = (dets && dets.detriments) || [];
    for (var j = 0; j < D.length; j++) {
      var d = D[j];
      if (d && d.mid != null) add({ k: 'det', name: str(d.name), mid: +d.mid, bid: +d.bid, where: str(d.boss || d.zone || '') }, +(d.last_seen || d.ts || 0) * (+(d.last_seen || d.ts || 0) < 1e11 ? 1000 : 1));
    }
    var byName = {};
    for (var m = 0; m < out.length; m++) if (out[m].k === 'det' && out[m].name) byName[out[m].name.toLowerCase()] = out[m];
    for (var n = 0; n < out.length; n++) if (out[n].k === 'eff' && byName[out[n].name.toLowerCase()]) { out[n].mid = byName[out[n].name.toLowerCase()].mid; out[n].bid = byName[out[n].name.toLowerCase()].bid; }
    out.sort(function (x, y) { return (y.at || 0) - (x.at || 0); });
    return out;
  };
  C.valueFor = function (it, kind) {
    switch (kind) {
      case 'line': return it.text || '';
      case 'actor': return (it.k === 'spawn' || it.k === 'despawn') ? it.name : (it.k === 'cast' ? it.who : '');
      case 'ability': return it.k === 'cast' ? (it.id && /^\d+$/.test(it.id) ? it.id : it.name) : '';
      case 'det': return it.mid > 0 ? it.mid + ':' + it.bid : '';
      case 'detname': return (it.k === 'det' || it.k === 'eff') ? it.name : '';
      case 'icon': return it.mid > 0 ? String(it.mid) : '';
      case 'aura': return '';
      case 'rule': return C.ruleFor(it) ? 'ok' : '';
    }
    return '';
  };
  function withIcons(it) {
    if (!it || !(it.k === 'eff' || it.k === 'det') || it.mid > 0 || !it.name) return it;
    for (var i = 0; i < C.items.length; i++) {
      var d = C.items[i];
      if (d.k === 'det' && d.mid > 0 && str(d.name).toLowerCase() === str(it.name).toLowerCase()) {
        var o = {};
        for (var k in it) if (it.hasOwnProperty(k)) o[k] = it[k];
        o.mid = d.mid; o.bid = d.bid;
        return o;
      }
    }
    return it;
  }
  C.ruleFor = function (it) {
    it = withIcons(it);
    var r = { type: 'ON_EVENT', data: '', trigger_type: 'says', pattern: '', sub_steps: [] };
    switch (it.k) {
      case 'line': case 'chat': r.trigger_type = 'says'; r.pattern = cut(it.text, 120); r.data = 'Line: ' + cut(it.text, 24); break;
      case 'red': r.trigger_type = 'announce'; r.pattern = cut(it.text, 120); r.data = 'Red text: ' + cut(it.text, 20); break;
      case 'spawn': r.trigger_type = 'spawn'; r.pattern = it.name; r.data = it.name + ' appears'; break;
      case 'despawn': r.trigger_type = 'despawn'; r.pattern = it.name; r.data = it.name + ' is gone'; break;
      case 'cast': r.trigger_type = 'cast'; r.pattern = it.id && /^\d+$/.test(it.id) ? it.id : it.name; r.data = 'Cast: ' + it.name; break;
      case 'det': case 'eff':
        if (!(it.mid > 0)) return null;
        r.trigger_type = 'debuff'; r.pattern = it.mid + ':' + it.bid; r.data = (it.name || 'Detriment') + ' on me'; break;
      default: return null;
    }
    return r;
  };
  C.triggerFor = function (it) {
    it = withIcons(it);
    var t = { on: 'text', match: {}, allowConcurrentRuns: false, 'do': [] };
    switch (it.k) {
      case 'line': t.on = 'text'; t.match = { mode: 'substring', needle: it.text }; break;
      case 'red': t.on = 'announcement'; t.match = { mode: 'substring', needle: it.text }; break;
      case 'chat': t.on = 'chat'; t.match = { mode: 'substring', needle: it.text }; break;
      case 'spawn': case 'despawn': t.on = it.k; t.match = { name: it.name, mode: 'exact' }; break;
      case 'cast': if (!/^\d+$/.test(str(it.id))) return null; t.on = 'castEnded'; t.match = { abilityId: +it.id }; break;
      case 'det': case 'eff': if (!(it.mid > 0)) return null; t.on = 'detAdded'; t.match = { main: +it.mid, back: +it.bid }; break;
      default: return null;
    }
    return t;
  };
  C.label = function (it) {
    if (it.k === 'cast') return it.name + (it.who ? ' (' + it.who + ')' : '');
    if (it.k === 'det' || it.k === 'eff') return (it.name || 'a detriment') + (it.where ? ' - ' + it.where : '');
    if (it.k === 'chat') return (it.who ? it.who + ': ' : '') + it.text;
    return it.text || it.name || '';
  };
  C.teachWords = function (items) {
    var W = IC.words;
    if (!W) return;
    var dl = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.k === 'det' && it.mid > 0 && it.name) dl.push({ mid: it.mid, bid: it.bid, name: it.name });
      if (it.k === 'cast' && /^\d+$/.test(str(it.id)) && it.name) W.abilNames[it.id] = it.name;
    }
    W.setDetNames(dl);
  };

  C.load = function (cb, force) {
    if (typeof requestFileWith !== 'function' || !me()) { if (cb) cb(C.items); return; }
    if (!force && Date.now() - C.loadedAt < 4000) { if (cb) cb(C.items); return; }
    if (typeof sendCommand === 'function') sendCommand('det_get_captured');
    var events = null, dets = null, left = 2;
    function done() {
      if (--left) return;
      C.items = C.parse(events, dets);
      C.loadedAt = Date.now();
      C.teachWords(C.items);
      if (cb) cb(C.items);
    }
    requestFileWith('Logs/analysis/' + me() + '/events.json', function (p, c) { try { events = c ? JSON.parse(c) : null; } catch (_e) { events = null; } done(); });
    setTimeout(function () {
      requestFileWith('Data/jqb_detriments.json', function (p, c) { try { dets = c ? JSON.parse(c) : null; } catch (_e) { dets = null; } done(); });
    }, 500);
  };

  var COL = { line: '#f2c94c', red: '#e05a5a', chat: '#f2c94c', spawn: '#2fd6c3', despawn: '#9fb2c8', cast: '#4a90e2', det: '#b388ff', eff: '#b388ff' };
  function injectStyle() {
    if (typeof document === 'undefined' || document.getElementById('icc-style')) return;
    var st = document.createElement('style');
    st.id = 'icc-style';
    st.textContent = [
      '#icc-menu{position:fixed;z-index:200;width:430px;max-height:360px;display:flex;flex-direction:column;background:var(--bg-deep,#0b1120);border:1px solid var(--line-accent,rgba(153,204,255,0.45));border-radius:6px;box-shadow:0 8px 22px rgba(0,0,0,0.65);font-size:var(--fs-11,11px);color:var(--text-primary,#dde);}',
      '#icc-menu .icc-h{display:flex;align-items:center;gap:6px;padding:5px 8px;border-bottom:1px solid var(--border-dark,rgba(255,255,255,0.08));}',
      '#icc-menu .icc-h b{flex:1;color:var(--header-gold,#e6c34d);}',
      '#icc-menu .icc-h span{cursor:pointer;color:var(--text-secondary,#8a96a8);padding:0 4px;}',
      '#icc-menu .icc-h span:hover{color:var(--text-bright,#fff);}',
      '#icc-menu input{margin:5px 8px;font-size:var(--fs-10,10px);padding:3px 6px;}',
      '#icc-menu .icc-l{overflow-y:auto;flex:1;padding-bottom:4px;}',
      '#icc-menu .icc-r{display:flex;align-items:center;gap:6px;padding:3px 8px;cursor:pointer;white-space:nowrap;}',
      '#icc-menu .icc-r:hover{background:var(--tint-on,rgba(153,204,255,0.10));}',
      '#icc-menu .icc-k{flex:none;width:62px;font-size:9.5px;border:1px solid;border-radius:7px;text-align:center;line-height:13px;}',
      '#icc-menu .icc-t{flex:1;overflow:hidden;text-overflow:ellipsis;}',
      '#icc-menu .icc-n{flex:none;color:var(--text-secondary,#8a96a8);font-size:9.5px;}',
      '#icc-menu .icc-e{padding:10px 12px;color:var(--text-secondary,#8a96a8);line-height:1.45;white-space:normal;}'
    ].join('\n');
    document.head.appendChild(st);
  }
  function ago(ms) { if (!ms) return ''; var s = Math.max(0, Math.round((Date.now() - ms) / 1000)); return s < 60 ? s + 's' : (s < 3600 ? Math.floor(s / 60) + 'm' : Math.floor(s / 3600) + 'h'); }
  C.close = function () { var m = document.getElementById('icc-menu'); if (m && m.parentNode) m.parentNode.removeChild(m); };
  C.menu = function (anchor, kind, onPick) {
    if (typeof document === 'undefined') return;
    injectStyle();
    C.close();
    var m = document.createElement('div');
    m.id = 'icc-menu';
    var title = kind === 'rule' ? 'Make a rule from what happened in a fight' : 'Pick from what happened in fights';
    m.innerHTML = '<div class="icc-h"><b>' + title + '</b><span data-icc="refresh" data-tip="Read JB Analysis again">refresh</span>' +
      '<span data-icc="anal" data-tip="Open JB Analysis: it records what the game says and does">JB Analysis</span><span data-icc="x">&#10005;</span></div>' +
      '<input type="text" class="input-text" placeholder="search..."><div class="icc-l"><div class="icc-e">Reading...</div></div>';
    document.body.appendChild(m);
    var r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: (anchor && anchor.x) || 40, bottom: (anchor && anchor.y) || 40 };
    var vw = root.innerWidth || 1200, vh = root.innerHeight || 800;
    m.style.left = Math.max(4, Math.min(Math.round(r.left), vw - 440)) + 'px';
    m.style.top = Math.max(4, Math.min(Math.round(r.bottom + 4), vh - 370)) + 'px';
    var inp = m.getElementsByTagName('input')[0], list = m.querySelector('.icc-l'), rows = [];
    function draw() {
      var qy = str(inp.value).toLowerCase(), h = '', shown = 0;
      rows = [];
      for (var i = 0; i < C.items.length && shown < 300; i++) {
        var it = C.items[i], v = C.valueFor(it, kind);
        if (!v) continue;
        var lab = C.label(it);
        if (qy && lab.toLowerCase().indexOf(qy) < 0) continue;
        var col = COL[it.k] || '#9fb2c8', icon = it.mid > 0 && typeof invItemIcon === 'function' ? invItemIcon({ icon_id: it.mid }, 14, true) : '';
        h += '<div class="icc-r" data-icc-i="' + rows.length + '"><span class="icc-k" style="color:' + col + ';border-color:' + col + '">' + KIND[it.k] + '</span>' +
          icon + '<span class="icc-t">' + esc(cut(lab, 90)) + '</span><span class="icc-n">' + (it.n > 1 ? 'x' + it.n + ' ' : '') + ago(it.at) + '</span></div>';
        rows.push(it);
        shown++;
      }
      list.innerHTML = h || '<div class="icc-e">' + (C.items.length ? 'Nothing here fits this box.' :
        'Nothing caught yet. Open <b>JB Analysis</b> and fight once (or a few seconds of it): the lines the game says, red text, what appears, ' +
        'the named\'s casts and the detriments you get show up here to click.') + '</div>';
    }
    m.addEventListener('click', function (ev) {
      var t = ev.target, a = null, i = null;
      for (; t && t !== m && t.getAttribute; t = t.parentNode) { a = t.getAttribute('data-icc'); i = t.getAttribute('data-icc-i'); if (a || i != null) break; }
      ev.stopPropagation();
      if (a === 'x') { C.close(); return; }
      if (a === 'refresh') { C.load(draw, true); return; }
      if (a === 'anal') { if (typeof sendCommand === 'function') sendCommand('exec', 'jb anal'); return; }
      if (i != null && rows[+i]) { var it = rows[+i]; C.close(); onPick(C.valueFor(it, kind), it); }
    });
    inp.addEventListener('input', draw);
    inp.addEventListener('keyup', function (ev) { if (ev.keyCode === 27) C.close(); else draw(); });
    setTimeout(function () { try { inp.focus(); } catch (_e) {} }, 30);
    C.load(draw, false);
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('mousedown', function (ev) {
      var m = document.getElementById('icc-menu');
      if (!m) return;
      for (var t = ev.target; t; t = t.parentNode) if (t === m) return;
      C.close();
    });
  }

  C.autoOn = function () { return store('ic_auto_grab') !== '0'; };
  C.setAuto = function (on) { store('ic_auto_grab', on ? '1' : '0'); };
  function grabField(e, s, ctx) {
    var P = IC.pack, R = IC.reg;
    for (var i = 0; i < (s.fields || []).length; i++) {
      var f = s.fields[i];
      if (!(f.essential || f.req) || !f.grab || f.grab.indexOf('hover') < 0) continue;
      if (R.fieldActive && !R.fieldActive(s, f, ctx.fmt)) continue;
      if (f.when && R.whenOk && !R.whenOk(f.when, e)) continue;
      if (str(P.get(e, f, s, ctx)).trim() === '') return f;
    }
    return null;
  }
  function grabLine(box, label) {
    var old = document.getElementById('icc-grabline');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    if (box) box.insertAdjacentHTML('afterbegin', '<div id="icc-grabline" style="padding:4px 8px;margin-bottom:4px;border:1px solid var(--line-accent,rgba(47,214,195,0.5));border-radius:4px;color:var(--accent-cyan,#9ff0e4);font-size:var(--fs-10,10px);">' +
      'Hover the ' + esc(str(label).toLowerCase().replace(/^the\s+/, '')) + ' in game now: its name fills in after 3 seconds. ' +
      '<span style="cursor:pointer;text-decoration:underline;" onclick="IC.catch.setAuto(false);var x=document.getElementById(\'icc-grabline\');if(x)x.parentNode.removeChild(x);">Stop doing this</span></div>');
  }
  function grabNow(cb) {
    IC.form.grabValue('hover', function (v) {
      var line = document.getElementById('icc-grabline');
      if (line && line.parentNode) line.parentNode.removeChild(line);
      cb(v);
    });
  }
  function tplSchema(T) {
    return { key: 'TPLDRAFT', pseudo: true, deps: {}, fields: (T.fields || []).map(function (x) { if (x.rt === undefined) x.rt = true; x.id = x.key; return x; }) };
  }
  C.autoGrabDraft = function () {
    var K = IC.picker, st = K && K.state;
    if (!C.autoOn() || !st || !st.draft || !(st.schema || st.tpl) || !IC.form || !IC.form.grabValue) return;
    var ctx = IC.ui.ctx(), s = st.schema || tplSchema(st.tpl), f = grabField(st.draft, s, ctx), draft = st.draft;
    if (!f) return;
    grabLine(document.getElementById('ic-wiz-fields'), f.label);
    grabNow(function (v) {
      if (!v || K.state.draft !== draft) return;
      if (str(IC.pack.get(draft, f, s, ctx)).trim() !== '') return;
      IC.pack.set(draft, f, s, ctx, v);
      K.renderDraft();
    });
  };
  C.autoGrabValue = function (label, cb, box) {
    if (!C.autoOn() || !IC.form || !IC.form.grabValue || typeof document === 'undefined') return;
    grabLine(box || document.querySelector('#ici .ici-r'), label);
    grabNow(function (v) { if (v) cb(v); });
  };
  C.init = function () {
    var K = IC.picker;
    if (!K || !K.pick || K.pick._icc) return;
    var orig = K.pick;
    K.pick = function () { var r = orig.apply(this, arguments); setTimeout(C.autoGrabDraft, 60); return r; };
    K.pick._icc = true;
    var wc = root.icWizCombo;
    if (typeof wc === 'function' && !wc._icc && !wc._icStub) {
      root.icWizCombo = function () { var r = wc.apply(this, arguments); setTimeout(C.autoGrabDraft, 60); return r; };
      root.icWizCombo._icc = true;
    }
  };
  if (IC.whenReady) IC.whenReady(function () { setTimeout(C.init, 0); });
})(typeof window !== 'undefined' ? window : this);
