/* Open IC Creator - ic-ui-form.js
   Step form generated from the schema registry (IC.form). Overlay UI: needs the host page functions.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var F = IC.form = IC.form || {};
  F.tbls = { m: [], d: [] };

  function R() { return IC.reg; }
  function P() { return IC.pack; }
  function V() { return IC.val; }
  function str(v) { return v == null ? '' : String(v); }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  var esc = F.esc = function (s) {
    if (typeof escHtml === 'function') return escHtml(s);
    return str(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  var tip = F.tip = function (text) { return (text && typeof jbTipAttr === 'function') ? jbTipAttr(esc(text)) : ''; };
  function $(id) { return (typeof document !== 'undefined') ? document.getElementById(id) : null; }
  function dd(id, opts, val, onchange) {
    var o = [], seen = false;
    for (var i = 0; i < opts.length; i++) {
      var v = str(opts[i][0]);
      if (v === str(val)) seen = true;
      o.push({ value: v, label: esc(opts[i][1]) });
    }
    if (!seen && str(val) !== '') o.unshift({ value: str(val), label: esc('Other: ' + val) });
    if (typeof jbDropdown === 'function') return jbDropdown(id, o, str(val), { fontSize: '10px', style: 'width:100%;', onchange: onchange });
    return '<select id="' + id + '"></select>';
  }
  function fid(sc, n, sub) { return 'icf-' + sc + '-' + n + (sub ? '-' + sub : ''); }
  function on(fn, sc, n, extra) { return fn + "('" + sc + "'," + n + (extra != null ? ',' + extra : '') + ')'; }
  F.dispName = function (s) { return (typeof IC.dispName === 'function') ? IC.dispName(s) : s; };

  F.me = function () {
    try {
      if (typeof _allCharacters === 'undefined' || !_allCharacters || !_allCharacters.length) return null;
      var want = root._myCharName || root._lockedCharName || '';
      if (want) for (var i = 0; i < _allCharacters.length; i++) {
        var c = _allCharacters[i];
        if (c && (c.player_name === want || c.name === want)) return c;
      }
      return _allCharacters[(typeof _selectedCharIdx !== 'undefined' ? _selectedCharIdx : 0) || 0] || _allCharacters[0];
    } catch (_e) { return null; }
  };
  F.myPos = function () {
    var d = F.me();
    if (d && d.x != null) return (+d.x).toFixed(2) + ',' + (+d.y).toFixed(2) + ',' + (+d.z).toFixed(2);
    if (typeof _getPos === 'function') { var p = _getPos(); if (p && (p.x !== '0' || p.z !== '0')) return p.x + ',' + p.y + ',' + p.z; }
    return '';
  };
  F.myTarget = function () {
    var d = F.me();
    if (d && d.target && d.target.name) return String(d.target.name);
    return (typeof _getTarget === 'function') ? (_getTarget() || '') : '';
  };

  F.render = function (sc, e, opts) {
    var s = opts.schema || R().forEntry(e), ctx = opts.ctx || {}, h = '';
    var inDo = !opts.schema && R().inDoList(opts.path);
    F.tbls[sc] = [];
    var main = [], adv = [], dead = [];
    for (var i = 0; i < s.fields.length; i++) {
      var f = s.fields[i];
      if (!V().visible(f, e, s, ctx)) continue;
      if (inDo && f.doHide) continue;
      var active = R().fieldActive(s, f, ctx.fmt);
      if (opts.essentialOnly && !(f.essential || f.req)) continue;
      if (!active) { if (ctx.showInactive && !opts.essentialOnly) dead.push(f); continue; }
      (f.adv ? adv : main).push(f);
    }
    if (s.tpl && hasPd(s) && !opts.essentialOnly) h += pdBar(e, ctx);
    for (var a = 0; a < main.length; a++) h += F.fieldHtml(sc, e, s, main[a], opts);
    if (opts.essentialOnly) return h || '<div class="icf-help" style="padding:6px 0;">Nothing to fill in. Click <b>Add to timeline</b>.</div>';
    var more = '';
    if (!s.tpl && s !== R().UNKNOWN && !opts.noCommon && !inDo) {
      for (var c = 0; c < R().COMMON.length; c++) {
        var cf = R().COMMON[c];
        if (!R().fieldActive(s, cf, ctx.fmt)) { if (ctx.showInactive && P().isSet(e, cf, s)) dead.push(cf); continue; }
        more += F.fieldHtml(sc, e, s, cf, opts);
      }
    }
    for (var b = 0; b < adv.length; b++) more += F.fieldHtml(sc, e, s, adv[b], opts);
    var ex = opts.noCommon ? [] : F.extraKeys(e, s);
    if (ex.length) more += F.fieldHtml(sc, e, s, { key: '__extra', kind: 'json', label: 'Other saved fields',
      help: (ctx.fmt === 'v3' ? 'Kept exactly as they are.' : 'Kept exactly as they are. The game does not read them for this step.'), keys: ex }, opts);
    if (more) h += F.section(sc + 'more', 'More options', more, false);
    if (dead.length) {
      var dh = '';
      for (var d = 0; d < dead.length; d++) dh += F.fieldHtml(sc, e, s, dead[d], opts, true);
      h += '<div data-ic-inactive="1">' + F.section(sc + 'dead', 'Saved but not run yet', dh, true) + '</div>';
    }
    return h;
  };
  function hasPd(s) { for (var i = 0; i < s.fields.length; i++) if (s.fields[i].pd) return true; return false; }
  function pdBar(e, ctx) {
    var d = ctx.diff || 'solo', lab = d === 'heroic2' ? 'Untold Heroic' : d.charAt(0).toUpperCase() + d.slice(1);
    var h = '<div class="icf-pd">Editing <b>' + esc(lab) + '</b> values';
    if (d !== 'solo') {
      h += (e[d] && typeof e[d] === 'object') ? ' (overrides on top of Solo)' : ' (same as Solo until you change one)';
      h += ' <button class="btn btn-sm" onclick="icCopyFromSolo()">Copy from Solo</button>';
      if (e[d]) h += ' <button class="btn btn-sm btn-danger" onclick="icClearDiffOverride()">Clear ' + esc(lab) + ' overrides</button>';
    } else h += ' (the base). Use the difficulty buttons at the top to edit other difficulties.';
    return h + '</div>';
  }
  F.section = function (id, title, body, open) {
    return '<div class="icf-sec"><div class="icf-sec-h" onclick="icToggleSec(\'' + id + '\')"><span id="icsec-a-' + id + '">' +
      (open ? '&#9662;' : '&#9656;') + '</span> ' + esc(title) + '</div><div class="icf-sec-b" id="icsec-' + id + '" style="display:' + (open ? 'block' : 'none') + ';">' + body + '</div></div>';
  };
  root.icToggleSec = function (id) {
    var b = $('icsec-' + id), a = $('icsec-a-' + id);
    if (!b) return;
    var show = b.style.display === 'none';
    b.style.display = show ? 'block' : 'none';
    if (a) a.innerHTML = show ? '&#9662;' : '&#9656;';
  };

  F.extraKeys = function (e, s) {
    var known = { type: 1, template: 1 }, i;
    for (i = 0; i < s.fields.length; i++) {
      var sf = s.fields[i];
      if (sf.key) known[String(sf.key).split('.')[0]] = 1;
      if (sf.alt && (P().blank(e[sf.key]) || P().blank(e[sf.alt]))) known[sf.alt] = 1;
    }
    for (i = 0; i < R().COMMON.length; i++) known[R().COMMON[i].key] = 1;
    var c = P().codecFor(s);
    if (c) for (i = 0; i < c.src.length; i++) known[c.src[i]] = 1;
    if (s.tpl) { known.heroic = known.heroic1 = known.heroic2 = known.heroic3 = known.raid = known.advanced_solo = known.event_heroic = known.signature = known.solo = 1; }
    var out = [];
    for (var k in e) if (has(e, k) && !known[k]) out.push(k);
    return out;
  };

  F.fieldHtml = function (sc, e, s, f, opts, inactive) {
    var ctx = opts.ctx || {};
    var n = F.tbls[sc].length;
    F.tbls[sc].push({ f: f, s: s, get: opts.get, ctx: ctx, onChange: opts.onChange, path: opts.path });
    var val = f.key === '__extra' ? null : P().get(e, f, s, ctx), ctl = '', id = fid(sc, n);
    var lab = esc(f.label) + (f.unit ? ' <span class="icf-unit">(' + esc(f.unit) + ')</span>' : '') + (f.req ? '<span class="icf-req">*</span>' : '');
    if (f.pd && ctx.diff && ctx.diff !== 'solo') {
      var L = e[ctx.diff];
      lab += (L && typeof L === 'object' && has(L, f.key)) ? ' <span class="icf-pdt">(override)</span>' : ' <span class="icf-pdt">(from Solo)</span>';
    }
    switch (f.kind) {
      case 'textarea':
        ctl = '<textarea class="input-text icf-ta" id="' + id + '" onchange="' + on('icFieldCommit', sc, n) + '">' + esc(val) + '</textarea>';
        break;
      case 'check':
        ctl = '<label class="icf-chk"><input type="checkbox" id="' + id + '"' + (val ? ' checked' : '') + ' onchange="' + on('icFieldCommit', sc, n) + '"> ' + lab + '</label>';
        lab = '';
        break;
      case 'select': ctl = selectCtl(sc, n, f, val); break;
      case 'who': ctl = selectCtl(sc, n, f, val, f.list === 'ogre' ? R().WHO_OGRE : R().WHO_JB, true); break;
      case 'cond': ctl = condCtl(sc, n, f, val, ctx); break;
      case 'names': ctl = namesCtl(sc, n, f, val); break;
      case 'classes': ctl = classesCtl(sc, n, f, val); break;
      case 'expr': ctl = F.exprCtl(sc, n, f, val); break;
      case 'steps': ctl = stepsCtl(sc, n, f, e, opts); break;
      case 'list': ctl = F.listCtl(sc, n, f, val || [], e); break;
      case 'poslist': ctl = '<textarea class="input-text icf-ta" id="' + id + '" onchange="' + on('icFieldCommit', sc, n) + '" placeholder="one spot per line: x,y,z">' + esc(poslistText(val)) + '</textarea>'; break;
      case 'json': ctl = jsonCtl(sc, n, f, e, val); break;
      case 'oc': ctl = (IC.oc && IC.oc.widget) ? IC.oc.widget(sc, n, str(val)) : '<input type="text" class="input-text icf-in" id="' + id + '" value="' + esc(val) + '" onchange="' + on('icFieldCommit', sc, n) + '">'; break;
      case 'info': ctl = '<div class="icf-help">' + esc(f.text || '') + '</div>'; break;
      default:
        ctl = abilIc(sc, n, f, s, val) + '<input type="text" class="input-text icf-in" id="' + id + '" value="' + esc(val) + '"' +
          (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') + ' onchange="' + on('icFieldCommit', sc, n) + '">' + grabs(sc, n, f) + picks(sc, n, f) + abilBtn(sc, n, f, s);
    }
    var r = (f.kind === 'list' || f.kind === 'steps' || f.kind === 'json' || f.kind === 'oc' || f.key === '__extra') ? null : V().field(f, val, e, s, ctx);
    var wide = (f.kind === 'list' || f.kind === 'steps' || f.kind === 'expr' || f.kind === 'oc' || f.kind === 'json' || f.kind === 'classes');
    return '<div class="icf-row' + (wide ? ' icf-wide' : '') + '"' + (inactive ? ' data-ic-inactive="1"' : '') + '>' +
      (lab ? '<div class="icf-lab"' + tip(f.more || f.help) + '>' + lab + (inactive ? ' <span class="icf-dead">saved but not run yet</span>' : '') + '</div>' : '<div class="icf-lab"></div>') +
      '<div class="icf-ctl">' + ctl + '</div>' +
      (f.help ? '<div class="icf-help">' + esc(f.help) + '</div>' : '') +
      '<div class="icf-msg' + (r ? ' icf-' + r.level : '') + '" id="' + id + '-msg">' + (r ? esc(r.msg) : '') + '</div></div>';
  };

  function grabs(sc, n, f) {
    var g = f.grab || [], h = '';
    var L = { pos: 'Pos', target: 'Target', hover: 'Hover', zone: 'Here', zoneshort: 'Here' };
    var T = { pos: 'Use the spot your character stands on', target: 'Use the name of your current target',
      hover: 'Hover the object in game during a 3 second countdown', zone: 'Use the zone you are in', zoneshort: 'Use the short name of the zone you are in' };
    for (var i = 0; i < g.length; i++) {
      h += '<button class="btn btn-sm icf-grab"' + tip(T[g[i]]) + ' onclick="icGrab(\'' + sc + '\',' + n + ',\'' + g[i] + '\')">' + L[g[i]] + '</button>';
    }
    if (f.kind === 'pos' && IC.plan && IC.plan.extract) h += '<button class="btn btn-sm icf-grab"' + tip('One of this file\'s own spots (numbered as JB Map shows them)') +
      ' onclick="icPickSpot(\'' + sc + '\',' + n + ',this)">Spots</button>';
    return h;
  }
  function isAbil(f, s) { return f.icon === 'ability' || (f.key === 'ability' && s && s.type === 'CAST'); }
  function abilIc(sc, n, f, s, val) {
    if (!isAbil(f, s)) return '';
    if (!F._abil && str(val).trim()) setTimeout(function () { F.abilList(function () { var ic = $(fid(sc, n) + '-ic'); if (ic) ic.innerHTML = F.abilIconHtml(val); }); }, 0);
    return '<span class="icf-abic" id="' + fid(sc, n) + '-ic" style="display:inline-block;width:18px;height:18px;line-height:0;flex:0 0 auto;">' + F.abilIconHtml(val) + '</span>';
  }
  function abilBtn(sc, n, f, s) {
    return isAbil(f, s) ? '<button class="btn btn-sm icf-grab"' + tip('Pick from every ability, each with its icon') + ' onclick="icAbilPick(\'' + sc + '\',' + n + ',this)">Pick</button>' : '';
  }
  var PICK_TIP = { line: 'Pick a line the game showed in a fight (JB Analysis)', actor: 'Pick a mob or object that appeared in a fight (JB Analysis)',
    ability: 'Pick a cast the named made in a fight (JB Analysis)', det: 'Pick a detriment you got in a fight (its icon pair fills in)',
    detname: 'Pick a detriment you got in a fight', icon: 'Pick a detriment you got in a fight (its icon id fills in)' };
  function picks(sc, n, f) {
    if (f.pick === 'verb')
      return typeof jbVerbPick === 'function' && typeof JBVP !== 'undefined' && JBVP.on ? '<button class="btn btn-sm icf-grab"' +
        tip('Pick from the verbs the actors near you really have, and test one first') + ' onclick="icVerbPick(\'' + sc + '\',' + n + ')">Pick</button>' : '';
    if (!f.pick || !PICK_TIP[f.pick] || !IC.catch) return '';
    return '<button class="btn btn-sm icf-grab"' + tip(PICK_TIP[f.pick]) + ' onclick="icPick(\'' + sc + '\',' + n + ',\'' + f.pick + '\',this)">From fights</button>';
  }
  root.icPick = function (sc, n, kind, btn) {
    var t = F.tbls[sc][n];
    if (!t || !IC.catch) return;
    IC.catch.menu(btn, kind, function (v) {
      var el = $(fid(sc, n));
      if (v && el) { el.value = v; root.icFieldCommit(sc, n); }
    });
  };

  F.popList = function (anchor, items, onPick, search) {
    if (typeof document === 'undefined') return;
    var old = $('icf-pop');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var m = document.createElement('div'), r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: 40, bottom: 40 }, shown = [];
    m.id = 'icf-pop';
    m.style.cssText = 'position:fixed;z-index:270;width:300px;max-height:300px;display:flex;flex-direction:column;background:var(--bg-deep,#0b1120);border:1px solid rgba(153,204,255,0.5);' +
      'border-radius:5px;box-shadow:0 6px 18px rgba(0,0,0,0.6);font-size:var(--fs-11,11px);color:var(--text-primary,#dde);';
    function draw(q) {
      shown = items(String(q || '').toLowerCase());
      var h = '';
      for (var i = 0; i < shown.length; i++) h += '<div data-icfp="' + i + '" style="display:flex;gap:6px;align-items:center;padding:2px 8px;cursor:pointer;white-space:nowrap;">' +
        '<span style="display:inline-block;width:18px;line-height:0;">' + (shown[i].ic || '') + '</span><span>' + esc(shown[i].t) + '</span></div>';
      m.lastChild.innerHTML = h || '<div style="padding:6px 8px;color:var(--text-secondary,#8a96a8);">Nothing here' + (search ? ' -- type part of its name.' : '.') + '</div>';
    }
    m.innerHTML = (search ? '<input type="text" class="input-text" placeholder="type part of its name..." style="margin:5px 6px;font-size:var(--fs-10,10px);">' : '') + '<div style="overflow-y:auto;flex:1;"></div>';
    document.body.appendChild(m);
    m.style.left = Math.max(4, Math.min(Math.round(r.left), (root.innerWidth || 1200) - 310)) + 'px';
    m.style.top = Math.max(4, Math.min(Math.round(r.bottom + 3), (root.innerHeight || 800) - 310)) + 'px';
    var inp = m.getElementsByTagName('input')[0];
    if (inp) { inp.addEventListener('input', function () { draw(inp.value); }); setTimeout(function () { try { inp.focus(); } catch (_e) {} }, 20); }
    draw('');
    m.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    m.addEventListener('click', function (e) {
      for (var t = e.target; t && t !== m && t.getAttribute; t = t.parentNode) {
        var i = t.getAttribute('data-icfp');
        if (i != null) { if (m.parentNode) m.parentNode.removeChild(m); onPick(shown[+i]); return; }
      }
    });
    setTimeout(function () {
      document.addEventListener('mousedown', function off(e) {
        for (var t = e.target; t; t = t.parentNode) if (t === m) return;
        if (m.parentNode) m.parentNode.removeChild(m);
        document.removeEventListener('mousedown', off);
      });
    }, 0);
  };
  F._abil = null;
  var abilWait = null;
  F.abilList = function (cb) {
    if (F._abil) { cb(F._abil); return; }
    if (abilWait) { abilWait.push(cb); return; }
    var have = IC.flowui && IC.flowui.icons;
    abilWait = [cb];
    function done(map) {
      var names = [], w = abilWait;
      for (var k in map) if (has(map, k)) names.push(k);
      names.sort();
      F._abil = { map: map, names: names };
      abilWait = null;
      for (var i = 0; i < w.length; i++) w[i](F._abil);
    }
    if (have) { done(have); return; }
    if (typeof requestFileWith !== 'function' || !IC.words) { abilWait = null; cb({ map: {}, names: [] }); return; }
    requestFileWith('Data/census/spell_icons.txt', function (p, c) { done(c ? IC.words.parseSpellIconPairs(c) : {}); });
  };
  var SMALL = { of: 1, the: 1, a: 1, an: 1, and: 1, to: 1, 'in': 1, on: 1, 'for': 1, at: 1, by: 1, with: 1, from: 1 };
  F.abilName = function (n) {
    return str(n).split(' ').map(function (w, i) {
      if (/^(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv|xvi|xvii|xviii|xix|xx)$/.test(w)) return w.toUpperCase();
      if (i && SMALL[w]) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  };
  function abilGi(name) {
    var A = F._abil, p = A && IC.words ? IC.words.spellIconPair(A.map, name) : null;
    return p || (IC.icons && IC.icons.forAbil ? IC.icons.forAbil(name) : null);
  }
  F.abilIconHtml = function (name) {
    var g = str(name).trim() ? abilGi(name) : null, FU = IC.flowui;
    return g && FU && FU.gameIcon ? FU.gameIcon(g, 18) : '';
  };
  F.abilPick = function (anchor, cb) {
    F.abilList(function (A) {
      var FU = IC.flowui;
      F.popList(anchor, function (q) {
        var out = [];
        for (var i = 0; i < A.names.length && out.length < 80; i++) {
          if (q && A.names[i].indexOf(q) < 0) continue;
          var g = IC.words.spellIconPair(A.map, A.names[i]);
          out.push({ t: F.abilName(A.names[i]), v: F.abilName(A.names[i]), ic: g && FU && FU.gameIcon ? FU.gameIcon(g, 16) : '' });
        }
        return out;
      }, function (it) { if (it) cb(it.v); }, true);
    });
  };
  root.icAbilPick = function (sc, n, btn) {
    F.abilPick(btn, function (v) {
      var el = $(fid(sc, n)), ic = $(fid(sc, n) + '-ic');
      if (!el) return;
      el.value = v;
      root.icFieldCommit(sc, n);
      if (ic) ic.innerHTML = F.abilIconHtml(v);
    });
  };
  root.icPickSpot = function (sc, n, btn) {
    var P = IC.impui && IC.impui.points ? IC.impui.points() : [];
    F.popList(btn, function (q) {
      return P.filter(function (x) { return !q || x.t.toLowerCase().indexOf(q) >= 0; }).map(function (x) { return { t: x.t, v: x.spot.join(',') }; });
    }, function (it) {
      var el = $(fid(sc, n));
      if (it && el) { el.value = it.v; root.icFieldCommit(sc, n); }
    }, P.length > 12);
  };
  function selectCtl(sc, n, f, val, list, other) {
    var opts = (list || f.opts || []).slice(), id = fid(sc, n), canOther = other || f.allowOther;
    var known = false;
    for (var i = 0; i < opts.length; i++) if (str(opts[i][0]) === str(val)) known = true;
    if (!canOther && !known && str(val) !== '') opts.push([str(val), str(val) + ' (as saved)']);
    if (canOther) opts.push(['__other__', 'Other (type it)...']);
    var showOther = canOther && !known && str(val) !== '';
    var h = dd(id, opts, showOther ? '__other__' : str(val), on('icFieldCommit', sc, n));
    if (canOther) {
      var shown = showOther ? F.dispName(str(val)) : '', ro = showOther && shown !== str(val);
      h += '<input type="text" class="input-text icf-in icf-other" id="' + id + '-o" value="' + esc(shown) + '"' + (ro ? ' readonly' : '') +
        ' style="display:' + (showOther ? 'block' : 'none') + ';" placeholder="type it here" onchange="' + on('icFieldCommit', sc, n, "'o'") + '">';
    }
    return h + grabs(sc, n, f);
  }
  function condCtl(sc, n, f, val, ctx) {
    var opts = P().COND.slice();
    if (ctx.showInactive) opts = opts.concat(P().COND_INACTIVE);
    var cur = str(val);
    var alias = { actor_not_exists: 'Someone is dead or gone', expr: 'This check is true', 'true': 'Always', 'false': 'Never' };
    if (alias[val]) opts.push([val, alias[val]]);
    else if (/difficulty$/.test(val) && !ctx.showInactive) opts.push([val, 'Difficulty check (never matches)']);
    else if (val && !P().condKnown(val) && !/difficulty$/.test(val)) opts.push([val, 'Unknown: ' + val + ' (treated as false)']);
    return dd(fid(sc, n), opts, cur, on('icFieldCommit', sc, n));
  }
  function nameRow(sc, n, i, v) {
    return '<div class="icf-name-row"><span class="icf-ord">' + (i + 1) + '.</span><input type="text" class="input-text icf-in" id="' + fid(sc, n, 'i' + i) + '" value="' + esc(v) + '" onchange="' + on('icFieldCommit', sc, n) + '">' +
      '<button class="btn btn-sm" onclick="' + on('icNamesOp', sc, n, i + ",'up'") + '">&#9650;</button>' +
      '<button class="btn btn-sm" onclick="' + on('icNamesOp', sc, n, i + ",'del'") + '">&#10005;</button></div>';
  }
  function namesCtl(sc, n, f, arr) {
    var h = '<div class="icf-names"><div id="' + fid(sc, n, 'names') + '">';
    for (var i = 0; i < arr.length; i++) h += nameRow(sc, n, i, arr[i]);
    h += '</div><div class="icf-name-add"><button class="btn btn-sm" onclick="' + on('icNamesOp', sc, n, "-1,'add'") + '">+ Add a name</button>';
    if ((f.grab || []).indexOf('target') >= 0) h += '<button class="btn btn-sm"' + tip('Add the name of your current target') + ' onclick="' + on('icNamesOp', sc, n, "-1,'target'") + '">+ My target</button>';
    return h + '</div></div>';
  }
  function classesCtl(sc, n, f, val) {
    var have = {}, list = str(val).split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(function (x) { return x; });
    for (var i = 0; i < list.length; i++) have[list[i]] = 1;
    var h = '<div class="icf-classes">', C = R().CLASSES;
    for (var c = 0; c < C.length; c++) {
      h += '<label class="icf-cls"><input type="checkbox" id="' + fid(sc, n, 'c' + c) + '"' + (have[C[c]] ? ' checked' : '') + ' onchange="' + on('icFieldCommit', sc, n) + '"> ' + C[c] + '</label>';
    }
    var extra = list.filter(function (x) { return C.indexOf(x) < 0; });
    h += '<input type="hidden" id="' + fid(sc, n, 'x') + '" value="' + esc(extra.join(',')) + '">';
    if (extra.length) h += '<div class="icf-help">Also kept: ' + esc(extra.join(', ')) + '</div>';
    return h + '</div>';
  }
  function stepsCtl(sc, n, f, e, opts) {
    var arr = Array.isArray(e[f.key]) ? e[f.key] : [], unit = f.unitName || 'step';
    if (sc !== 'm') return '<div class="icf-help">Add this step first, then fill this in.</div>';
    var h = '<div style="display:flex;flex-direction:column;gap:2px;width:100%;"><div class="icf-steps"><b>' + arr.length + '</b> ' + esc(unit) + (arr.length === 1 ? '' : 's') + ' &mdash; shown indented under this step in the timeline. ' +
      '<button class="btn btn-sm btn-success" onclick="' + on('icAddInto', sc, n) + '">' + esc(f.addLabel || '+ Add a step here') + '</button></div>';
    if (arr.length && opts.path) {
      h += '<div class="icf-steps-list">';
      for (var i = 0; i < arr.length; i++) {
        h += '<div class="icf-steps-item" onclick="icSelectPath(\'' + IC.model.pathStr(opts.path.concat([f.key, i])) + '\')">' +
          (i + 1) + '. ' + esc(R().labelFor(arr[i])) + '</div>';
      }
      h += '</div>';
    }
    return h + '</div>';
  }
  function jsonCtl(sc, n, f, e, val) {
    var obj = val;
    if (f.key === '__extra') { obj = {}; for (var i = 0; i < f.keys.length; i++) obj[f.keys[i]] = e[f.keys[i]]; }
    var txt = obj === undefined ? '' : JSON.stringify(obj, null, 2);
    return '<textarea class="input-text icf-ta icf-mono" id="' + fid(sc, n) + '" onchange="' + on('icFieldCommit', sc, n) + '">' + esc(txt) + '</textarea>';
  }
  function poslistText(v) {
    if (!Array.isArray(v)) return '';
    return v.map(function (p) { return Array.isArray(p) ? p.join(',') : str(p); }).join('\n');
  }

  F.exprCtl = function (sc, n, f, val) {
    var p = P().exprParse(val), opts = [['', 'Pick a condition...']];
    for (var i = 0; i < P().EXPR.length; i++) opts.push([P().EXPR[i].id, P().EXPR[i].label]);
    opts.push(['custom', 'Custom check (advanced)']);
    var h = '<div class="icf-expr">' + dd(fid(sc, n, 'b'), opts, p.id, on('icExprCommit', sc, n, "'pick'"));
    var d = P().exprById(p.id);
    if (d) {
      for (var j = 0; j < d.fields.length; j++) {
        var fd = d.fields[j], k = fd[0], id = fid(sc, n, 'v-' + k), v = p.v[k] == null ? '' : p.v[k];
        var g = fd[2] === 'pos' ? ['pos'] : (fd[2] === 'name' ? ['target', 'hover'] : (fd[2] === 'zone' ? ['zoneshort'] : []));
        h += '<div class="icf-xrow"><span class="icf-xlab">' + esc(fd[1]) + (fd[3] ? ' (' + esc(fd[3]) + ')' : '') + '</span>' +
          '<input type="text" class="input-text icf-in" id="' + id + '" value="' + esc(v) + '" onchange="' + on('icExprCommit', sc, n) + '">';
        for (var gi = 0; gi < g.length; gi++) {
          h += '<button class="btn btn-sm icf-grab" onclick="icGrabExpr(\'' + sc + '\',' + n + ',\'' + k + '\',\'' + g[gi] + '\')">' +
            ({ pos: 'Pos', target: 'Target', hover: 'Hover', zoneshort: 'Here' })[g[gi]] + '</button>';
        }
        h += '</div>';
      }
      h += '<div class="icf-say">' + esc(f.say || 'True when') + ' <b>' + esc(d.text(p.v)) + '</b>.</div>';
    } else if (p.id === 'custom') {
      h += '<div class="icf-say">A custom check (edit it below).</div>';
    }
    var openRaw = p.id === 'custom';
    h += F.section(sc + 'x' + n, 'Advanced: the check the game reads', '<textarea class="input-text icf-ta icf-mono" id="' + fid(sc, n, 'raw') + '" onchange="' + on('icExprCommit', sc, n, "'raw'") + '">' + esc(val) + '</textarea>' +
      '<div class="icf-help">LavishScript. A leading ! flips it; comparisons go inside ${If[a &lt; b,TRUE,FALSE]}.</div>', openRaw);
    return h + '</div>';
  };
  root.icExprCommit = function (sc, n, how) {
    var t = F.tbls[sc][n]; if (!t) return;
    var e = t.get(); if (!e) return;
    var val;
    if (how === 'raw') { var r = $(fid(sc, n, 'raw')); val = r ? r.value : ''; }
    else {
      var id = (typeof jbVal === 'function') ? jbVal(fid(sc, n, 'b')) : '';
      var d = P().exprById(id);
      if (id === 'custom') {
        var sid = sc + 'x' + n, sb = $('icsec-' + sid);
        if (sb && sb.style.display === 'none') root.icToggleSec(sid);
        var r2 = $(fid(sc, n, 'raw')); if (r2) try { r2.focus(); } catch (_e) {}
        return;
      }
      if (!d) val = '';
      else {
        var od = how === 'pick' ? P().exprById(P().exprParse(P().get(e, t.f, t.s, t.ctx)).id) : d, v = {};
        for (var j = 0; j < d.fields.length; j++) {
          var fd = d.fields[j], el = $(fid(sc, n, 'v-' + fd[0])), same = false;
          if (od) for (var q = 0; q < od.fields.length; q++) if (od.fields[q][0] === fd[0] && od.fields[q][1] === fd[1] && od.fields[q][2] === fd[2]) same = true;
          var cur = (el && same) ? el.value : '';
          if (cur === '' && fd[2] === 'pos') cur = (how === 'pick') ? F.myPos() : cur;
          if (cur === '' && fd[4] !== undefined) cur = fd[4];
          v[fd[0]] = cur;
        }
        val = P().exprBuild(id, v);
      }
    }
    P().set(e, t.f, t.s, t.ctx, val);
    if (t.onChange) t.onChange(t, true);
  };

  F.read = function (sc, n, t, how) {
    var f = t.f, id = fid(sc, n), el = $(id);
    switch (f.kind) {
      case 'check': return el ? el.checked : false;
      case 'names': {
        var out = [];
        for (var i = 0; ; i++) { var x = $(fid(sc, n, 'i' + i)); if (!x) break; out.push(x.value); }
        return out;
      }
      case 'classes': {
        var C = R().CLASSES, got = [];
        for (var c = 0; c < C.length; c++) { var cb = $(fid(sc, n, 'c' + c)); if (cb && cb.checked) got.push(C[c]); }
        var xe = $(fid(sc, n, 'x'));
        if (xe && xe.value) got = got.concat(xe.value.split(','));
        return got.join(',');
      }
      case 'poslist': {
        var lines = (el ? el.value : '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(function (l) { return l; });
        var e = t.get(), old = e ? P().rawGet(e, f, t.s, t.ctx) : null;
        var asArr = !(Array.isArray(old) && old.length && typeof old[0] === 'string');
        return lines.map(function (l) { var p = P().posParse(l); return (asArr && p) ? [p.x, p.y, p.z] : l; });
      }
      case 'json': {
        var txt = el ? el.value : '';
        try { return txt.trim() === '' ? (f.key === '__extra' ? {} : undefined) : JSON.parse(txt); }
        catch (err) { F.showMsg(sc, n, { level: 'error', msg: 'Not valid JSON: ' + err.message }); return F.SKIP; }
      }
      case 'select': case 'who': {
        var v = el ? el.value : '';
        if (v === '__other__') {
          var o = $(id + '-o');
          if (how !== 'o') { if (o) { o.style.display = 'block'; try { o.focus(); } catch (_e) {} } return F.SKIP; }
          return o ? o.value : '';
        }
        if (how === 'o') { var o2 = $(id + '-o'); return o2 ? o2.value : v; }
        return v;
      }
      default: return el ? el.value : '';
    }
  };
  F.SKIP = { skip: 1 };
  F.showMsg = function (sc, n, r) {
    var m = $(fid(sc, n) + '-msg');
    if (!m) return;
    m.className = 'icf-msg' + (r ? ' icf-' + r.level : '');
    m.textContent = r ? r.msg : '';
  };
  function condFamily(c) {
    c = IC.pack.COND_ALIAS[c] || c;
    if (/^actor_/.test(c)) return c === 'actor_in_range' ? 'range' : 'actor';
    if (/group_has_class$/.test(c)) return 'class';
    if (c === 'ls' || c === 'not_ls') return 'expr';
    if (/difficulty$/.test(c)) return 'diff';
    return c;
  }
  root.icFieldCommit = function (sc, n, how) {
    var t = F.tbls[sc] && F.tbls[sc][n]; if (!t) return;
    var e = t.get(); if (!e) return;
    var val = F.read(sc, n, t, how);
    if (val === F.SKIP) return;
    var f = t.f;
    if (f.key === '__extra') {
      for (var i = 0; i < f.keys.length; i++) if (!has(val, f.keys[i])) delete e[f.keys[i]];
      for (var k in val) if (has(val, k) && k !== 'type' && k !== 'template') e[k] = val[k];
    } else {
      var before = f.key === 'condition' ? str(e.condition) : null;
      P().set(e, f, t.s, t.ctx, val);
      if (before !== null && condFamily(before) !== condFamily(str(e.condition)) && has(e, 'condition_value')) e.condition_value = '';
      for (var m = 0; m < t.s.fields.length; m++) {
        var g = t.s.fields[m];
        if (g.mirror && g.mirror === f.key && has(e, g.key)) e[g.key] = e[f.key];
      }
    }
    var r = (f.kind === 'json' || f.key === '__extra') ? null : V().field(f, P().get(e, f, t.s, t.ctx), e, t.s, t.ctx);
    F.showMsg(sc, n, r);
    if (t.onChange) t.onChange(t, !!f.rerender || f.kind === 'names' || f.kind === 'json' || f.kind === 'poslist');
  };
  root.icNamesOp = function (sc, n, i, op) {
    var t = F.tbls[sc][n]; if (!t) return;
    var e = t.get(), arr = F.read(sc, n, t);
    if (op === 'add') {
      var box = $(fid(sc, n, 'names'));
      if (box) {
        box.insertAdjacentHTML('beforeend', nameRow(sc, n, arr.length, ''));
        var nb = $(fid(sc, n, 'i' + arr.length)); if (nb) try { nb.focus(); } catch (_e) {}
      }
      return;
    }
    if (op === 'target') { var nm = F.myTarget(); if (!nm) { toast('No target -- target the mob in game first.', 'warn'); return; } arr.push(nm); }
    else if (op === 'del') arr.splice(i, 1);
    else if (op === 'up' && i > 0) { var x = arr[i]; arr[i] = arr[i - 1]; arr[i - 1] = x; }
    P().set(e, t.f, t.s, t.ctx, arr);
    if (t.onChange) t.onChange(t, true);
  };
  root.icAddInto = function (sc, n) {
    var t = F.tbls[sc][n]; if (!t || !t.path) return;
    if (IC.picker && IC.picker.open) IC.picker.open({ into: t.path, key: t.f.key });
  };

  function toast(msg, kind) { if (typeof colToast === 'function') colToast(msg, kind); }
  F.grabValue = function (kind, cb) {
    if (kind === 'pos') { var p = F.myPos(); if (!p) toast('No position yet -- is the status feed running?', 'warn'); cb(p); return; }
    if (kind === 'target') { var t = F.myTarget(); if (!t) toast('No target -- target it in game first.', 'warn'); cb(t); return; }
    if (kind === 'zone' || kind === 'zoneshort') {
      var d = F.me(); var z = d ? (kind === 'zone' ? (d.zone || '') : (d.zone_short || '')) : '';
      if (!z) toast('Zone not known yet.', 'warn'); cb(z); return;
    }
    if (kind === 'hover') {
      if (typeof sendCommand !== 'function' || typeof requestFileWith !== 'function') { cb(''); return; }
      sendCommand('delete_file', 'Data/jqb_grab_cursor.json');
      sendCommand('exec', 'jb grabcursor wait');
      toast('Hover the object in game now... 3');
      setTimeout(function () { toast('Hover the object in game now... 2'); }, 1000);
      setTimeout(function () { toast('Hover the object in game now... 1'); }, 2000);
      setTimeout(function () {
        requestFileWith('Data/jqb_grab_cursor.json', function (path, contents) {
          var j = null; try { if (contents) j = JSON.parse(contents); } catch (_e) { j = null; }
          var fresh = j && j.name && j.name !== 'NULL' && ((Date.now() / 1000) - (j.ts || 0) < 60);
          var name = fresh ? String(j.name).trim() : '';
          if (fresh) sendCommand('delete_file', 'Data/jqb_grab_cursor.json');
          if (!name) name = F.myTarget();
          if (!name) toast('Nothing hovered and no target.', 'err');
          else toast('Grabbed: ' + F.dispName(name));
          cb(name);
        });
      }, 3400);
    }
  };
  root.icGrab = function (sc, n, kind) {
    var t = F.tbls[sc][n]; if (!t) return;
    F.grabValue(kind, function (v) {
      if (!v) return;
      var el = $(fid(sc, n));
      if (t.f.kind === 'select' || t.f.kind === 'who') {
        var o = $(fid(sc, n) + '-o');
        if (o) { o.value = v; o.style.display = 'block'; root.icFieldCommit(sc, n, 'o'); }
        return;
      }
      if (el) { el.value = v; root.icFieldCommit(sc, n); }
    });
  };
  function verbObjIdx(sc) {
    var L = F.tbls[sc] || {}, k;
    for (k in L) if (Object.prototype.hasOwnProperty.call(L, k) && L[k] && L[k].f && (L[k].f.key === 'data' || L[k].f.part === 'actor')) return +k;
    return -1;
  }
  root.icVerbPick = function (sc, n) {
    if (!F.tbls[sc] || !F.tbls[sc][n] || typeof jbVerbPick !== 'function') return;
    var oi = verbObjIdx(sc), oel = oi >= 0 ? $(fid(sc, oi)) : null;
    jbVerbPick({ actor: oel ? oel.value : '', title: 'Pick a verb for this step', onPick: function (actor, verb) {
      var o = oi >= 0 ? $(fid(sc, oi)) : null;
      if (o && actor) { o.value = actor; root.icFieldCommit(sc, oi); }
      var v = $(fid(sc, n));
      if (v) { v.value = verb; root.icFieldCommit(sc, n); }
      toast('Filled: ' + verb + (actor ? ' on ' + actor : ''));
    } });
  };
  root.icGrabExpr = function (sc, n, k, kind) {
    F.grabValue(kind, function (v) {
      if (!v) return;
      var el = $(fid(sc, n, 'v-' + k));
      if (el) { el.value = v; root.icExprCommit(sc, n); }
    });
  };
  root.icGrabPos = function (fieldId) { var el = $(fieldId), p = F.myPos(); if (el && p) { el.value = p; if (el.onchange) try { el.onchange(); } catch (_e) {} } else if (el) toast('No position yet -- is the status feed running?', 'warn'); };
  root.icGrabTarget = function (fieldId) { var el = $(fieldId), t = F.myTarget(); if (el && t) { el.value = t; if (el.onchange) try { el.onchange(); } catch (_e) {} } else if (el) toast('Target something in the game first.', 'warn'); };
  root.icAppendCmd = function (fieldId, cmd) { var el = $(fieldId); if (!el) return; el.value = (el.value && el.value.trim()) ? el.value + '\n' + cmd : cmd; };
})(typeof window !== 'undefined' ? window : this);
