/* Open IC Creator - openic-cond.js
   When and who, at the top of This step: who does it (with a backup for a group without that class), Only if (the
   step's when: picked from the common conditions or all of Ogre's, each in words with its settings, all of them or
   any of them, each one turned round with "not"), and Repeat (a number of times, until something is true, or while
   it is: the step goes inside a repeat block, as Ogre's files write it; "while" is a repeat until it no longer holds,
   with the same check on the block so it is skipped when false from the start).
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var A = IC.app = IC.app || {};

  function str(v) { return v == null ? '' : String(v); }
  function isArr(v) { return Object.prototype.toString.call(v) === '[object Array]'; }
  function isObj(v) { return v != null && typeof v === 'object' && !isArr(v); }
  function has(o, k) { return isObj(o) && Object.prototype.hasOwnProperty.call(o, k); }
  function esc(s) { return str(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function kindOf(c) { if (!isObj(c)) return ''; for (var k in c) if (has(c, k) && k.charAt(0) !== '_') return k; return ''; }
  function V() { return IC.vocab || { conditions: {} }; }

  /* the common ones first, each ready to fill in (the shapes Ogre's own files use) */
  A.COND_PRESETS = [
    { key: 'group', label: 'The group has a class or archetype', make: function () { return A.hasCond('priest'); } },
    { key: 'near', label: 'Something is near (by name)', make: function () { return { count: { of: 'actors', find: { query: 'Name == "" && Distance < 30' }, compare: '>=', value: 1 } }; } },
    { key: 'combat', label: 'I am in combat', make: function () { return { inCombat: {} }; } },
    { key: 'engaged', label: 'The named is in combat', make: function () { return { engaged: { named: '' } }; } },
    { key: 'hp', label: 'The named\'s health is at or below a %', make: function () { return { mobHealthPct: { named: '', compare: '<=', value: 50 } }; } },
    { key: 'det', label: 'I have a detriment', make: function () { return { hasDet: { det: '' } }; } },
    { key: 'camp', label: 'I stand on my camp spot', make: function () { return { atCampSpot: {} }; } },
    { key: 'var', label: 'A saved value is', make: function () { return { varEquals: { scope: 'encounter', name: '', value: '' } }; } },
    { key: 'option', label: 'An OgreBot option is on', make: function () { return { option: { id: '', value: true } }; } },
    { key: 'zone', label: 'The zone is', make: function () { return { zone: { is: '' } }; } },
    { key: 'timer', label: 'A timer has run out', make: function () { return { timerExpired: { name: '' } }; } }
  ];
  var COMPARE = ['<', '<=', '==', '!=', '>=', '>'];

  /* a list of conditions as the editor holds it: all or any, each { cond, not } */
  function readList(list) {
    var L = isArr(list) ? list : (list == null ? [] : [list]), mode = 'all';
    /* one "or" is "any of these", unless it is a class family ("a bard": a troubador or a dirge), which is one condition */
    if (L.length === 1 && isObj(L[0]) && isArr(L[0].or) && rosterWho(L[0]) === null) { mode = 'any'; L = L[0].or; }
    return { mode: mode, items: L.map(function (c) { return isObj(c) && isArr(c.not) && c.not.length === 1 ? { cond: c.not[0], not: true } : { cond: c, not: false }; }) };
  }
  function writeList(R) {
    var L = R.items.map(function (it) { return it.not ? { not: [it.cond] } : it.cond; });
    if (!L.length) return undefined;
    return R.mode === 'any' && L.length > 1 ? [{ or: L }] : L;
  }
  /* the repeat block the picked step sits in alone, if any */
  function wrapPath(path) {
    if (path.length < 2 || path[path.length - 2] !== 'steps') return null;
    var pp = path.slice(0, -2), R = IC.ogf.at(A.st.doc, pp);
    return isObj(R) && isObj(R.repeat) && isArr(R.steps) && R.steps.length === 1 ? pp : null;
  }
  function repeatMode(R) {
    var r = R && R.repeat;
    if (!r) return 'once';
    if (r.times != null) return 'times';
    var u = isArr(r.until) ? r.until : [];
    return u.length === 1 && isObj(u[0]) && isArr(u[0].not) ? 'while' : 'until';
  }
  /* where each condition list of the picked step lives: "when" (Only if) or "until" (Repeat) */
  function target(doc, path, which) {
    if (which === 'when') return { node: IC.ogf.at(doc, path), get: function (n) { return n.when; }, set: function (n, v) { if (v === undefined) delete n.when; else n.when = v; } };
    var pp = wrapPath(path), R = pp ? IC.ogf.at(doc, pp) : null;
    if (!R) return null;
    return { node: R, get: function (n) { var u = n.repeat.until; return repeatMode(n) === 'while' ? u[0].not : u; },
      set: function (n, v) {
        var L = v || [];
        if (repeatMode(n) === 'while') { n.repeat.until = [{ not: L }]; if (L.length) n.when = clone(L); else delete n.when; } else n.repeat.until = L;
      } };
  }

  /* ------------------------------------------------------------ the section */
  A.whenHtml = function (st, path, whoKeys) {
    var s = A.st, h = '<div class="oic-h2">When and who</div><div class="oic-when">', sp = A.stepSpec ? A.stepSpec(st) : null, K = sp && sp.keys ? sp.keys : {};
    for (var w = 0; w < whoKeys.length; w++) {
      var wk = whoKeys[w], ab = isObj(K[wk]) ? str(K[wk].about) : '';
      h += '<div class="oic-field oic-key' + (has(st, wk) ? ' oic-key-set' : '') + '"><label>' + (wk === 'sendTo' ? 'Send it to' : 'Who does it') +
        '</label>' + A.whoHtml(wk, str(st[wk] == null ? '' : st[wk])) + (ab ? '<small>' + esc(ab) + '</small>' : '') + '</div>';
    }
    h += '<div class="oic-field"><label>Only if</label>' + listHtml('when', st.when, 'No condition: it always runs.') + '</div>';
    if ((s.kind === 'zone' || s.kind === 'fight') && typeof path[path.length - 1] === 'number' && !has(st, 'on')) {
      var pp = wrapPath(path), R = pp ? IC.ogf.at(s.doc, pp) : null, mode = repeatMode(R);
      h += '<div class="oic-field"><label>Repeat</label><select data-oic-cf="rep|@mode">';
      [['once', 'Once'], ['times', 'A number of times'], ['until', 'Until something is true'], ['while', 'While something is true']].forEach(function (o) {
        h += '<option value="' + o[0] + '"' + (o[0] === mode ? ' selected' : '') + '>' + o[1] + '</option>';
      });
      h += '</select>';
      if (mode === 'times') h += '<div class="oic-row"><input type="number" min="1" data-oic-cf="rep|times" value="' + esc(R.repeat.times) + '"><span class="oic-note">times</span></div>';
      if (mode === 'until' || mode === 'while') {
        h += listHtml('until', target(s.doc, path, 'until').get(R), mode === 'while' ? 'Add what must hold.' : 'Add what ends it.') +
          '<div class="oic-row"><span class="oic-note">at most</span><input type="number" min="1" data-oic-cf="rep|max" value="' + esc(R.repeat.max == null ? '' : R.repeat.max) + '"><span class="oic-note">times</span></div>';
        if (mode === 'while') h += '<small>Checked before it starts and after each pass.</small>';
        else h += '<small>It runs, then checks: it stops once this holds.</small>';
      }
      h += '</div>';
    }
    return h + '</div>';
  };
  function listHtml(which, list, empty) {
    var R = readList(list), h = '';
    if (!R.items.length) h += '<div class="oic-note">' + esc(empty) + '</div>';
    if (R.items.length > 1) h += '<div class="oic-row"><span class="oic-note" style="white-space:nowrap;">It needs</span><select data-oic-cf="' + which + ':-1|@mode"><option value="all"' + (R.mode === 'all' ? ' selected' : '') +
      '>all of these</option><option value="any"' + (R.mode === 'any' ? ' selected' : '') + '>any one of these</option></select></div>';
    for (var i = 0; i < R.items.length; i++) h += condHtml(which, i, R.items[i]);
    h += '<select class="oic-cond-add" data-oic-cf="' + which + ':-1|@add"><option value="">+ Add a condition...</option><optgroup label="Common">';
    A.COND_PRESETS.forEach(function (p) { h += '<option value="p:' + p.key + '">' + esc(p.label) + '</option>'; });
    h += '</optgroup><optgroup label="Every condition Ogre has">';
    var C = V().conditions || {}, names = Object.keys(C).filter(function (k) { return !C[k].logic && k !== 'forwho'; }).sort();
    names.forEach(function (k) { h += '<option value="c:' + k + '" title="' + esc(C[k].about || '') + '">' + esc(k) + (C[k].about ? ': ' + esc(cut(C[k].about, 60)) : '') + '</option>'; });
    return h + '</optgroup></select>';
  }
  function cut(s, n) { s = str(s); return s.length > n ? s.slice(0, n - 3) + '...' : s; }
  /* a condition in words, turned round when "not" is ticked ("we are not in combat"); the group ones in short */
  function words(c, neg) {
    var who = rosterWho(c);
    if (who !== null) return 'the group has ' + (neg ? 'no ' : 'a ') + (who === '@tank' ? 'tank' : (who === '@healer1' ? 'healer' : who));
    try { return IC.ogf.condsText([c], 0, !!neg); } catch (e) { return (neg ? 'not ' : '') + kindOf(c); }
  }
  function condHtml(which, i, it) {
    var c = it.cond, k = kindOf(c), o = isObj(c) ? c[k] : null, id = which + ':' + i, h = '<div class="oic-cond"><div class="oic-cond-w"><b>' + (i + 1) + '.</b> ' +
      esc(words(c, it.not)) + ' <label class="oic-tick" title="Turn it round: true when this is not"><input type="checkbox" data-oic-cf="' + id + '|@not"' + (it.not ? ' checked' : '') + '> not</label>' +
      '<span class="oic-x" data-oic="cond:del:' + id + '" title="Take this condition away">&#10005;</span></div>';
    var who = rosterWho(c);
    if (who !== null) {
      h += '<div class="oic-row"><span class="oic-note">The group has a</span><select data-oic-cf="' + id + '|@who">';
      (A.WHO || []).forEach(function (g) {
        if (g[0] !== 'Archetypes' && g[0] !== 'Classes' && g[0] !== 'One class') return;
        h += '<optgroup label="' + g[0] + '">';
        g[1].forEach(function (x) { if (!/^not/.test(x)) h += '<option value="' + x + '"' + (x === who ? ' selected' : '') + '>' + esc(x) + '</option>'; });
        h += '</optgroup>';
      });
      return h + '<option value="@tank"' + (who === '@tank' ? ' selected' : '') + '>a tank</option><option value="@healer1"' + (who === '@healer1' ? ' selected' : '') + '>a healer</option></select></div></div>';
    }
    if (!isObj(o)) return h + '<small>Ogre writes this one as a list (not, or, and): change it as text below.</small></div>';
    var spec = (V().conditions[k] || {}).keys || [], keys = Object.keys(o);
    spec.forEach(function (x) { if (keys.indexOf(x) < 0) keys.push(x); });
    if (k === 'count' && isObj(o.find) && has(o.find, 'query')) h += field(id, 'find.query', 'Which ones (query)', o.find.query, 'string');
    for (var j = 0; j < keys.length && j < 9; j++) {
      var key = keys[j], v = o[key];
      if (key === 'find' && isObj(v) && has(v, 'query')) continue;
      if (!has(o, key) && keys.length > 4) continue;
      h += field(id, key, key, v, key === 'compare' ? 'compare' : (typeof v === 'number' || /^(value|within|count|nth|maxEffects|abilityId|main|back|plus)$/.test(key) && typeof v !== 'string' ? 'num' :
        (typeof v === 'boolean' ? 'bool' : (isObj(v) || isArr(v) ? 'json' : 'string'))));
    }
    return h + '</div>';
  }
  function field(id, key, label, v, type) {
    var b = 'data-oic-cf="' + id + '|' + key + '|' + type + '"', inp;
    if (type === 'compare') { inp = '<select ' + b + '><option value=""></option>'; COMPARE.forEach(function (c) { inp += '<option' + (c === v ? ' selected' : '') + '>' + esc(c) + '</option>'; }); inp += '</select>'; }
    else if (type === 'bool') inp = '<input type="checkbox" ' + b + (v === true ? ' checked' : '') + '>';
    else if (type === 'num') inp = '<input type="number" ' + b + ' value="' + esc(v == null ? '' : v) + '">';
    else if (type === 'json') inp = '<input type="text" ' + b + ' value="' + esc(v === undefined ? '' : JSON.stringify(v)) + '" spellcheck="false">';
    else inp = '<input type="text" ' + b + ' value="' + esc(v == null ? '' : v) + '" spellcheck="false">';
    return '<div class="oic-cond-f"><span>' + esc(label) + '</span>' + inp + '</div>';
  }
  /* a "the group has" condition: the who it names (archetype, class family, one class, tank or healer), else null */
  function rosterWho(c) {
    var F = A.FAMILY || {};
    if (isObj(c) && isObj(c.count) && c.count.of === 'roster') {
      var by = str(c.count.by), is = str(c.count.is).toLowerCase();
      if (by === 'Role') return is === 'tank' ? '@tank' : '@healer1';
      return is;
    }
    if (isObj(c) && isArr(c.or) && c.or.length > 1 && c.or.every(function (x) { return isObj(x) && isObj(x.count) && x.count.of === 'roster' && x.count.by === 'Class'; })) {
      var names = c.or.map(function (x) { return str(x.count.is); }).join(',');
      for (var f in F) if (has(F, f) && F[f].join(',') === names) return f;
    }
    return null;
  }

  /* ------------------------------------------------------------ changes */
  A.setCondField = function (spec, val) {
    var s = A.st, p = str(spec).split('|'), where = p[0], key = p[1], type = p[2] || 'string', path = JSON.parse(s.sel);
    if (where === 'rep') { setRepeat(path, key, val); return; }
    var m = /^(when|until):(-?\d+)$/.exec(where);
    if (!m) return;
    var which = m[1], i = +m[2], err = '';
    if (key === '@add' && !val) return;
    A.edit(function (doc) {
      var T = target(doc, path, which);
      if (!T || !isObj(T.node)) return;
      var R = readList(T.get(T.node)), it = R.items[i];
      if (key === '@mode') R.mode = val === 'any' ? 'any' : 'all';
      else if (key === '@add') {
        var pr = /^p:(.+)$/.exec(val), ck = /^c:(.+)$/.exec(val), made = null;
        if (pr) A.COND_PRESETS.forEach(function (x) { if (x.key === pr[1]) made = x.make(); });
        else if (ck) { made = {}; made[ck[1]] = {}; }
        if (made) R.items.push({ cond: made, not: false });
      } else if (!it) return;
      else if (key === '@not') it.not = !!val;
      else if (key === '@who') it.cond = A.hasCond(val) || it.cond;
      else {
        var k = kindOf(it.cond), o = it.cond[k], out;
        if (type === 'num') out = str(val).trim() === '' ? undefined : +val;
        else if (type === 'bool') out = !!val;
        else if (type === 'json') { if (str(val).trim() === '') out = undefined; else { try { out = JSON.parse(val); } catch (e) { err = 'Not valid JSON: ' + e.message; return; } } }
        else out = str(val) === '' ? undefined : str(val);
        if (typeof out === 'number' && !isFinite(out)) { err = 'That is not a number.'; return; }
        var parts = key.split('.'), at = o;
        for (var q = 0; q < parts.length - 1; q++) { if (!isObj(at[parts[q]])) at[parts[q]] = {}; at = at[parts[q]]; }
        if (out === undefined) delete at[parts[parts.length - 1]]; else at[parts[parts.length - 1]] = out;
      }
      T.set(T.node, writeList(R));
    });
    if (err) IC.host.toast(err, 'warn');
  };
  A.dropCond = function (id) {
    var m = /^(when|until):(\d+)$/.exec(str(id)), path = JSON.parse(A.st.sel);
    if (!m) return;
    A.edit(function (doc) {
      var T = target(doc, path, m[1]);
      if (!T) return;
      var R = readList(T.get(T.node));
      R.items.splice(+m[2], 1);
      T.set(T.node, writeList(R));
    });
  };
  /* Repeat: wrap the step in a repeat block, change it, or take it out again (the selection follows the step) */
  function setRepeat(path, key, val) {
    var s = A.st, pp = wrapPath(path);
    if (key === '@mode') {
      var mode = str(val), now = pp ? repeatMode(IC.ogf.at(s.doc, pp)) : 'once';
      if (mode === now) return;
      var fresh = mode === 'times' ? { times: 2 } : { until: mode === 'while' ? [{ not: [{ inCombat: {} }] }] : [{ inCombat: {} }], max: 10 };
      A.edit(function (doc) {
        if (pp) {
          var R = IC.ogf.at(doc, pp);
          if (mode === 'once') { var inner = R.steps[0]; setAt(doc, pp, inner); return; }
          R.repeat = fresh;
          if (mode === 'while') R.when = [{ inCombat: {} }]; else delete R.when;
          return;
        }
        var st = IC.ogf.at(doc, path), box = { repeat: fresh, steps: [st] };
        /* the block keeps the step's place among the named's steps (Jump to and results go by stepId) */
        if (isObj(st) && st.stepId) box = { stepId: str(st.stepId) + '.repeat', repeat: fresh, steps: [st] };
        if (mode === 'while') box.when = [{ inCombat: {} }];
        setAt(doc, path, box);
      });
      if (mode === 'once') s.sel = JSON.stringify(pp);
      else if (!pp) s.sel = JSON.stringify(path.concat(['steps', 0]));
      A.refresh();
      return;
    }
    if (!pp) return;
    A.edit(function (doc) { var R = IC.ogf.at(doc, pp), n = str(val).trim() === '' ? undefined : Math.max(1, Math.round(+val)); if (n === undefined || !isFinite(n)) delete R.repeat[key]; else R.repeat[key] = n; });
  }
  function setAt(doc, path, v) { var parent = IC.ogf.at(doc, path.slice(0, -1)); parent[path[path.length - 1]] = v; }

  /* clicks this module owns: take a condition away */
  var ec0 = A.editClick;
  A.editClick = function (v, el) {
    var m = /^cond:del:(.+)$/.exec(str(v));
    if (m) { A.dropCond(m[1]); return true; }
    return ec0 ? ec0(v, el) : false;
  };
})(typeof window !== 'undefined' ? window : this);
