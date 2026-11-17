/* Open IC Creator - ic-pack.js
   Field access and packed-data codecs for instance-file steps, positions, the "Wait until" expression builder,
   IF / WHILE conditions, and plain words and checks for native zone-file conditions (IC.pack). Pure logic, no DOM.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var P = IC.pack = IC.pack || {};

  function str(v) { return v == null ? '' : String(v); }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }

  P.posParse = function (s) {
    if (s && typeof s === 'object' && s.length >= 3) {
      return { x: +s[0], y: +s[1], z: +s[2] };
    }
    var t = str(s).replace(/^\s*jb\s+nav\s+goto\s+/i, '').trim();
    if (!t) return null;
    var p = t.split(/\s*,\s*|\s+/);
    if (p.length !== 3) return null;
    var out = { x: parseFloat(p[0]), y: parseFloat(p[1]), z: parseFloat(p[2]) };
    for (var i = 0; i < 3; i++) {
      if (!/^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.test(p[i])) return null;
    }
    if (isNaN(out.x) || isNaN(out.y) || isNaN(out.z)) return null;
    return out;
  };
  P.posFmt = function (o, dp) {
    if (!o) return '';
    var d = dp == null ? 2 : dp;
    return (+o.x).toFixed(d) + ',' + (+o.y).toFixed(d) + ',' + (+o.z).toFixed(d);
  };
  P.posIsZero = function (o) { return o && +o.x === 0 && +o.y === 0 && +o.z === 0; };

  function pipeCodec(src, parts) {
    return {
      src: [src],
      read: function (e) {
        var s = str(e[src]), a = s === '' ? [] : s.split('|'), o = {};
        for (var i = 0; i < parts.length; i++) {
          if (i === parts.length - 1) o[parts[i]] = a.slice(i).join('|');
          else o[parts[i]] = a[i] == null ? '' : a[i];
        }
        return o;
      },
      write: function (e, o) {
        var a = [];
        for (var i = 0; i < parts.length; i++) a.push(str(o[parts[i]]));
        while (a.length > 1 && a[a.length - 1] === '') a.pop();
        e[src] = a.join('|');
      }
    };
  }
  P.codecs = {
    nameTimeout: pipeCodec('data', ['name', 'timeout']),
    noActor: pipeCodec('data', ['name', 'typef', 'timeout']),
    actorVerb: pipeCodec('data', ['actor', 'verb']),
    talk: pipeCodec('data', ['npc', 'replies', 'close']),
    keyHold: pipeCodec('data', ['key', 'ms']),
    script: pipeCodec('data', ['name', 'args']),
    effectIcon: pipeCodec('data', ['icon', 'mode']),
    textTimeout: {
      src: ['data'],
      read: function (e) {
        var s = str(e.data), i = s.lastIndexOf('|');
        if (i >= 0 && i + 1 < s.length && /^\d+$/.test(s.slice(i + 1))) return { name: s.slice(0, i), timeout: s.slice(i + 1) };
        return { name: s, timeout: '' };
      },
      write: function (e, o) { var t = str(o.timeout).trim(); e.data = str(o.name) + (t !== '' ? '|' + t : ''); }
    },
    waitfor: {
      src: ['data'],
      read: function (e) {
        var s = str(e.data), i = s.lastIndexOf('|');
        if (i >= 0 && i + 1 < s.length && /^\d+$/.test(s.slice(i + 1))) return { expr: s.slice(0, i), timeout: s.slice(i + 1) };
        return { expr: s, timeout: '' };
      },
      write: function (e, o) { e.data = str(o.expr) + (str(o.timeout) !== '' ? '|' + str(o.timeout) : ''); }
    },
    detriment: {
      src: ['data'],
      read: function (e) {
        var a = str(e.data).split('|'), o = { name: a[0] || '', mode: '', timeout: '' };
        if (a.length === 2) { if (/^\d/.test(a[1])) o.timeout = a[1]; else o.mode = a[1]; }
        else if (a.length >= 3) { o.mode = a[1]; o.timeout = a[2]; }
        return o;
      },
      write: function (e, o) {
        var s = str(o.name);
        if (str(o.mode) !== '') s += '|' + o.mode + (str(o.timeout) !== '' ? '|' + o.timeout : '');
        else if (str(o.timeout) !== '') s += '|' + o.timeout;
        e.data = s;
      }
    },
    nav: {
      src: ['data', 'x', 'y', 'z'],
      read: function (e) {
        if (typeof e.x === 'number' && typeof e.z === 'number') return { pos: e.x + ',' + (e.y || 0) + ',' + e.z };
        return { pos: str(e.data).replace(/^\s*jb\s+nav\s+goto\s+/i, '') };
      },
      write: function (e, o) {
        var p = P.posParse(o.pos);
        if (has(e, 'x') && p) { e.x = p.x; e.y = p.y; e.z = p.z; }
        e.data = str(o.pos) === '' ? '' : 'jb nav goto ' + str(o.pos).replace(/\s+/g, '');
      }
    },
    prebuff: {
      src: ['data', 'ability', 'who', 'raw'],
      read: function (e) {
        var ab = str(e.ability), o = { mode: 'timed', secs: '', count: '', cancel: '', ability: '', who: '' };
        if (ab === 'blockers') {
          o.mode = 'blockers'; o.count = str(e.data);
          var m = /cancel:(\d+)/.exec(str(e.raw)); o.cancel = m ? m[1] : '';
        } else if (ab !== '') { o.mode = 'cast'; o.ability = ab; o.who = str(e.who); }
        else if (str(e.data) === 'precasttag') o.mode = 'precasttag';
        else o.secs = str(e.data);
        return o;
      },
      write: function (e, o) {
        var m = o.mode || 'timed';
        if (m !== 'cast' && m !== 'blockers' && has(e, 'ability')) delete e.ability;
        if (m !== 'cast' && has(e, 'who')) delete e.who;
        if (m === 'timed') e.data = str(o.secs);
        else if (m === 'precasttag') e.data = 'precasttag';
        else if (m === 'blockers') {
          e.ability = 'blockers'; e.data = str(o.count);
          var raw = str(e.raw).replace(/\s*cancel:\d+/, '');
          if (str(o.cancel) !== '' && +o.cancel > 0) raw = (raw ? raw + ' ' : '') + 'cancel:' + o.cancel;
          if (raw !== '' || has(e, 'raw')) e.raw = raw;
        } else if (m === 'cast') {
          e.ability = str(o.ability); e.who = str(o.who);
          if (!has(e, 'data')) e.data = '';
        }
      }
    },
    cond: {
      src: ['condition_value'],
      read: function (e) {
        var c = str(e.condition), v = has(e, 'condition_value') ? str(e.condition_value) : '';
        if (v === '' && str(e.target) !== '') v = str(e.target);
        var o = { cname: '', cdist: '', cnum: '', czone: '', cclasses: '', cexpr: '', cdiff: '', cvar: '', cval: '', cnative: '' };
        if (c === 'native') o.cnative = v;
        else if (c === 'actor_in_range') { var i = v.indexOf('|'); o.cname = i >= 0 ? v.slice(0, i) : v; o.cdist = i >= 0 ? v.slice(i + 1) : ''; }
        else if (/^actor_/.test(c)) o.cname = v;
        else if (c === 'hp_below') o.cnum = v;
        else if (c === 'zone_name') o.czone = v;
        else if (/group_has_class$/.test(c)) o.cclasses = v;
        else if (/^(ls|expr|not_ls)$/.test(c)) o.cexpr = v;
        else if (/difficulty$/.test(c)) o.cdiff = v;
        else if (/variable$/.test(c)) { var q = v.indexOf('='); o.cvar = q >= 0 ? v.slice(0, q) : v; o.cval = q >= 0 ? v.slice(q + 1) : ''; }
        else o.cexpr = v;
        return o;
      },
      write: function (e, o) {
        var c = str(e.condition), v;
        if (c === 'native') v = str(o.cnative);
        else if (c === 'actor_in_range') v = str(o.cname) + (str(o.cdist) !== '' ? '|' + o.cdist : '');
        else if (/^actor_/.test(c)) v = str(o.cname);
        else if (c === 'hp_below') v = str(o.cnum);
        else if (c === 'zone_name') v = str(o.czone);
        else if (/group_has_class$/.test(c)) v = str(o.cclasses);
        else if (/difficulty$/.test(c)) v = str(o.cdiff);
        else if (/variable$/.test(c)) v = str(o.cvar).trim() + (str(o.cval) !== '' ? '=' + str(o.cval) : '');
        else if (/^(always|true|never|false|in_combat|not_in_combat)$/.test(c)) v = has(e, 'condition_value') ? str(e.condition_value) : '';
        else v = str(o.cexpr);
        e.condition_value = v;
      }
    },
    setvar: {
      src: ['data'],
      read: function (e) {
        var d = str(e.data), q = d.indexOf('=');
        return { vname: q >= 0 ? d.slice(0, q) : d, vvalue: q >= 0 ? d.slice(q + 1) : '' };
      },
      write: function (e, o) { e.data = str(o.vname).trim() + '=' + str(o.vvalue); }
    }
  };
  P.codecFor = function (s) {
    if (!s || !s.codec) return null;
    return typeof s.codec === 'string' ? P.codecs[s.codec] : s.codec;
  };

  function walkGet(o, key) {
    var ks = String(key).split('.');
    for (var i = 0; i < ks.length; i++) { if (o == null) return undefined; o = o[ks[i]]; }
    return o;
  }
  function holder(e, key, create) {
    var ks = String(key).split('.'), o = e;
    for (var i = 0; i < ks.length - 1; i++) {
      if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') { if (!create) return null; o[ks[i]] = {}; }
      o = o[ks[i]];
    }
    return { obj: o, k: ks[ks.length - 1] };
  }
  function layer(e, f, ctx, create) {
    var d = ctx && ctx.diff;
    if (!f.pd || !d || d === 'solo') return e;
    if (e[d] && typeof e[d] === 'object' && !Array.isArray(e[d])) return e[d];
    if (!create) return null;
    e[d] = {};
    return e[d];
  }

  function blank(v) { return v === undefined || v === null || v === ''; }
  P.altKey = function (e, f) {
    if (!f.alt || !e || f.pd) return f.key;
    if (!blank(e[f.key])) return f.key;
    if (!blank(e[f.alt])) return f.alt;
    if (has(e, f.key) || !has(e, f.alt)) return f.key;
    return f.alt;
  };
  P.blank = blank;

  P.rawGet = function (e, f, s, ctx) {
    if (!e) return undefined;
    if (f.part) {
      var c = P.codecFor(s);
      return c ? c.read(e)[f.part] : undefined;
    }
    if (!f.key) return undefined;
    if (f.pd) {
      var L = layer(e, f, ctx, false);
      if (L && L !== e && has(L, f.key)) return L[f.key];
    }
    if (f.alt) return walkGet(e, P.altKey(e, f));
    return walkGet(e, f.key);
  };

  P.get = function (e, f, s, ctx) {
    var v = P.rawGet(e, f, s, ctx);
    switch (f.kind) {
      case 'check':
        if (f.on === undefined) return v === true || v === 'true' || v === '1';
        return v === f.on || (f.on === true && (v === 'true' || v === '1'));
      case 'pos':
        if (v && typeof v === 'object' && v.length >= 3) return v[0] + ',' + v[1] + ',' + v[2];
        return str(v);
      case 'names':
        if (v && typeof v === 'object' && v.length !== undefined) return v.slice();
        return str(v) === '' ? [] : str(v).split(f.sep || '|').map(function (x) { return x.trim(); });
      case 'list': case 'steps': case 'json':
        return v;
      default:
        return v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
  };

  P.set = function (e, f, s, ctx, val) {
    if (f.part) {
      var c = P.codecFor(s);
      if (!c) return;
      var o = c.read(e);
      o[f.part] = val;
      c.write(e, o);
      return;
    }
    if (!f.key) return;
    var target = f.pd ? layer(e, f, ctx, true) : e;
    var h = holder(target, f.alt ? P.altKey(target, f) : f.key, true), obj = h.obj, k = h.k, had = has(obj, k), old = obj[k];
    if (f.kind === 'check') {
      if (val) obj[k] = (f.on === undefined ? true : f.on);
      else if (f.off !== undefined) obj[k] = f.off;
      else if (had) delete obj[k];
      return;
    }
    if (f.kind === 'pos') {
      if (f.store === 'array' || (old && typeof old === 'object' && old.length !== undefined)) {
        var p = P.posParse(val);
        if (p) obj[k] = [p.x, p.y, p.z];
        else if (str(val) === '' && had) delete obj[k];
        return;
      }
      if (str(val) === '' && !had) return;
      obj[k] = str(val);
      return;
    }
    if (f.kind === 'names') {
      var arr = (val || []).map(function (x) { return str(x).trim(); }).filter(function (x) { return x !== ''; });
      if (f.store === 'array' || (old && typeof old === 'object')) { if (!arr.length && !had) return; obj[k] = arr; return; }
      if (!arr.length) { if (had) { if (f.dropEmpty !== false) delete obj[k]; else obj[k] = ''; } return; }
      obj[k] = arr.join(f.sep || '|');
      return;
    }
    if (f.kind === 'list' || f.kind === 'steps' || f.kind === 'json') { obj[k] = val; return; }
    var sv = str(val);
    if (sv === '' && !had) return;
    if (sv === '' && f.dropEmpty) { delete obj[k]; return; }
    if (f.store === 'number' || (typeof old === 'number' && f.store !== 'string')) {
      if (sv === '') { if (had) delete obj[k]; return; }
      var n = Number(sv);
      obj[k] = isNaN(n) ? sv : n;
      return;
    }
    if (f.store === 'bool' || typeof old === 'boolean') { obj[k] = (sv === 'true' || sv === '1'); return; }
    obj[k] = sv;
  };

  P.isSet = function (e, f, s) {
    var v = P.rawGet(e, f, s, null);
    if (v === undefined || v === null || v === '') return false;
    if (typeof v === 'object' && v.length === 0) return false;
    return true;
  };

  P.toJson = function (obj) {
    var s = JSON.stringify(obj, null, 2);
    return s.replace(/[^\x00-\x7f]/g, function (c) {
      return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
    });
  };

  function q(s) { return str(s).replace(/"/g, ''); }
  var NAME = '([^"]*)', NUM = '(-?\\d*(?:\\.\\d+)?)';
  var POS = NUM + ',' + NUM + ',' + NUM;
  function rx(src) { return new RegExp('^' + src + '$'); }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function lit(s) { return esc(s); }
  P.EXPR = [
    { id: 'dead', label: 'Someone is dead or gone', text: function (v) { return U(v.name) + ' is dead or gone'; },
      fields: [['name', 'Who', 'name']],
      build: function (v) { return '!${Actor[Query,Name=="' + q(v.name) + '" && Type!="Corpse"].ID(exists)}'; },
      re: rx(lit('!${Actor[Query,Name=="') + NAME + '"\\s*&&\\s*Type\\s*!=\\s*"Corpse"' + lit('].ID(exists)}')), map: ['name'] },
    { id: 'alive', label: 'Someone is here (spawned)', text: function (v) { return U(v.name) + ' is here'; },
      fields: [['name', 'Who', 'name']],
      build: function (v) { return '${Actor[Query,Name=="' + q(v.name) + '" && Type!="Corpse"].ID(exists)}'; },
      re: rx(lit('${Actor[Query,Name=="') + NAME + '"\\s*&&\\s*Type\\s*!=\\s*"Corpse"' + lit('].ID(exists)}')), map: ['name'] },
    { id: 'exists', label: 'Something exists (any state)', text: function (v) { return U(v.name) + ' exists'; },
      fields: [['name', 'What', 'name']],
      build: function (v) { return '${Actor[Query,Name=="' + q(v.name) + '"].ID(exists)}'; },
      re: rx(lit('${Actor[Query,Name=="') + NAME + lit('"].ID(exists)}')), map: ['name'] },
    { id: 'gone', label: 'Something is gone', text: function (v) { return U(v.name) + ' is gone'; },
      fields: [['name', 'What', 'name']],
      build: function (v) { return '!${Actor[Query,Name=="' + q(v.name) + '"].ID(exists)}'; },
      re: rx(lit('!${Actor[Query,Name=="') + NAME + lit('"].ID(exists)}')), map: ['name'] },
    { id: 'hp', label: "Someone's health is below N%", text: function (v) { return U(v.name) + ' is below ' + v.n + '% health'; },
      fields: [['name', 'Who', 'name'], ['n', 'Health below', 'num', '%', '50']],
      build: function (v) { return '${If[${Actor["' + q(v.name) + '"].Health} < ' + v.n + ',TRUE,FALSE]}'; },
      re: rx(lit('${If[${Actor["') + NAME + '"' + lit('].Health} < ') + NUM + lit(',TRUE,FALSE]}')), map: ['name', 'n'] },
    { id: 'myhp', label: 'My health is below N%', text: function (v) { return 'my health is below ' + v.n + '%'; },
      fields: [['n', 'Health below', 'num', '%', '50']],
      build: function (v) { return '${If[${Me.Health} < ' + v.n + ',TRUE,FALSE]}'; },
      re: rx(lit('${If[${Me.Health} < ') + NUM + lit(',TRUE,FALSE]}')), map: ['n'] },
    { id: 'near', label: "I'm within N m of a spot", text: function (v) { return "I'm within " + v.n + ' m of ' + IC.reg.U.pos(v.pos); },
      fields: [['pos', 'Spot', 'pos'], ['n', 'Within', 'num', 'm', '5']],
      build: function (v) { return '${If[${Math.Distance[${Me.X},${Me.Y},${Me.Z},' + posCsv(v.pos) + ']}<' + v.n + ',TRUE,FALSE]}'; },
      re: rx(lit('${If[${Math.Distance[${Me.X},${Me.Y},${Me.Z},') + POS + lit(']}<') + NUM + lit(',TRUE,FALSE]}')),
      map: ['x', 'y', 'z', 'n'] },
    { id: 'far', label: "I'm farther than N m from a spot", text: function (v) { return "I'm more than " + v.n + ' m from ' + IC.reg.U.pos(v.pos); },
      fields: [['pos', 'Spot', 'pos'], ['n', 'Farther than', 'num', 'm', '20']],
      build: function (v) { return '${If[${Math.Distance[${Me.X},${Me.Y},${Me.Z},' + posCsv(v.pos) + ']}>' + v.n + ',TRUE,FALSE]}'; },
      re: rx(lit('${If[${Math.Distance[${Me.X},${Me.Y},${Me.Z},') + POS + lit(']}>') + NUM + lit(',TRUE,FALSE]}')),
      map: ['x', 'y', 'z', 'n'] },
    { id: 'effect', label: 'I have an effect', text: function (v) { return 'I have "' + v.name + '"'; },
      fields: [['name', 'Effect name (exact)', 'text']],
      build: function (v) { return '${Me.Effect[ExactName,"' + q(v.name) + '"](exists)}'; },
      re: rx(lit('${Me.Effect[ExactName,"') + NAME + lit('"](exists)}')), map: ['name'] },
    { id: 'noeffect', label: 'An effect is gone from me', text: function (v) { return '"' + v.name + '" is gone from me'; },
      fields: [['name', 'Effect name (exact)', 'text']],
      build: function (v) { return '!${Me.Effect[ExactName,"' + q(v.name) + '"](exists)}'; },
      re: rx(lit('!${Me.Effect[ExactName,"') + NAME + lit('"](exists)}')), map: ['name'] },
    { id: 'zone', label: 'The zone is ...', text: function (v) { return 'the zone is ' + v.zone; },
      fields: [['zone', 'Zone short name', 'zone']],
      build: function (v) { return '${Zone.ShortName.Equal["' + q(v.zone) + '"]}'; },
      re: rx(lit('${Zone.ShortName.Equal["') + NAME + lit('"]}')), map: ['zone'] },
    { id: 'nocombat', label: "I'm out of combat", text: function () { return "I'm out of combat"; }, fields: [],
      build: function () { return '!${Me.InCombat}'; }, re: rx(lit('!${Me.InCombat}')), map: [] },
    { id: 'combat', label: "I'm in combat", text: function () { return "I'm in combat"; }, fields: [],
      build: function () { return '${Me.InCombat}'; }, re: rx(lit('${Me.InCombat}')), map: [] },
    { id: 'nocast', label: "I'm not casting", text: function () { return "I'm not casting"; }, fields: [],
      build: function () { return '!${Me.CastingSpell}'; }, re: rx(lit('!${Me.CastingSpell}')), map: [] },
    { id: 'still', label: "I've stopped moving", text: function () { return "I've stopped moving"; }, fields: [],
      build: function () { return '!${Me.IsMoving}'; }, re: rx(lit('!${Me.IsMoving}')), map: [] },
    { id: 'aggro', label: 'Someone is fighting us', text: function (v) { return U(v.name) + ' is fighting us'; },
      fields: [['name', 'Who', 'name']],
      build: function (v) { return '${Actor[Query,Name=="' + q(v.name) + '"].IsAggro}'; },
      re: rx(lit('${Actor[Query,Name=="') + NAME + lit('"].IsAggro}')), map: ['name'] },
    { id: 'noaggro', label: 'Someone stopped fighting us', text: function (v) { return U(v.name) + ' is not fighting us'; },
      fields: [['name', 'Who', 'name']],
      build: function (v) { return '!${Actor[Query,Name=="' + q(v.name) + '"].IsAggro}'; },
      re: rx(lit('!${Actor[Query,Name=="') + NAME + lit('"].IsAggro}')), map: ['name'] },
    { id: 'close', label: 'Someone is within N m of me', text: function (v) { return U(v.name) + ' is within ' + v.n + ' m'; },
      fields: [['name', 'Who', 'name'], ['n', 'Within', 'num', 'm', '10']],
      build: function (v) { return '${Actor[Query,Name=="' + q(v.name) + '" && Distance <= ' + v.n + '].ID(exists)}'; },
      re: rx(lit('${Actor[Query,Name=="') + NAME + '" && Distance <= ' + NUM + lit('].ID(exists)}')), map: ['name', 'n'] },
    { id: 'notclose', label: 'Nobody named ... within N m', text: function (v) { return 'no ' + U(v.name) + ' within ' + v.n + ' m'; },
      fields: [['name', 'Who', 'name'], ['n', 'Within', 'num', 'm', '10']],
      build: function (v) { return '!${Actor[Query,Name=="' + q(v.name) + '" && Distance <= ' + v.n + '].ID(exists)}'; },
      re: rx(lit('!${Actor[Query,Name=="') + NAME + '" && Distance <= ' + NUM + lit('].ID(exists)}')), map: ['name', 'n'] },
    { id: 'above', label: "I'm at or above a height", text: function (v) { return 'my height is at least ' + v.n; },
      fields: [['n', 'Height (Y)', 'num', '', '0']],
      build: function (v) { return '${If[${Me.Y} >= ' + v.n + ',TRUE,FALSE]}'; },
      re: rx(lit('${If[${Me.Y} >= ') + NUM + lit(',TRUE,FALSE]}')), map: ['n'] },
    { id: 'below', label: "I'm at or below a height", text: function (v) { return 'my height is at most ' + v.n; },
      fields: [['n', 'Height (Y)', 'num', '', '0']],
      build: function (v) { return '${If[${Me.Y} <= ' + v.n + ',TRUE,FALSE]}'; },
      re: rx(lit('${If[${Me.Y} <= ') + NUM + lit(',TRUE,FALSE]}')), map: ['n'] },
    { id: 'script', label: 'A routine has finished', text: function (v) { return 'routine ' + v.name + ' has finished'; },
      fields: [['name', 'Routine name', 'text']],
      build: function (v) { return '!${Script[Buffer:' + str(v.name).replace(/\.iss$/i, '') + '.iss](exists)}'; },
      re: rx(lit('!${Script[Buffer:') + '([^\\]]+?)' + lit('.iss](exists)}')), map: ['name'] }
  ];
  function U(s) { return str(s) === '' ? '(someone)' : str(s); }
  function posCsv(p) {
    var t = str(p).replace(/\s+/g, '');
    if (t === '') return '0,0,0';
    if (/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(t)) return t;
    var o = P.posParse(p);
    return o ? (o.x + ',' + o.y + ',' + o.z) : t;
  }
  P.exprById = function (id) {
    for (var i = 0; i < P.EXPR.length; i++) if (P.EXPR[i].id === id) return P.EXPR[i];
    return null;
  };
  P.exprParse = function (expr) {
    var s = str(expr).trim();
    for (var i = 0; i < P.EXPR.length; i++) {
      var d = P.EXPR[i], m = d.re.exec(s);
      if (!m) continue;
      var v = {};
      for (var j = 0; j < d.map.length; j++) v[d.map[j]] = m[j + 1];
      if (v.x !== undefined) { v.pos = v.x + ',' + v.y + ',' + v.z; delete v.x; delete v.y; delete v.z; }
      return { id: d.id, v: v };
    }
    return { id: s === '' ? '' : 'custom', v: { raw: s } };
  };
  P.exprBuild = function (id, v) {
    var d = P.exprById(id);
    if (!d) return str(v && v.raw);
    return d.build(v || {});
  };
  P.exprText = function (expr) {
    var p = P.exprParse(expr);
    if (!p.id) return '(nothing set)';
    if (p.id === 'custom') return 'a custom check';
    try { return P.exprById(p.id).text(p.v); } catch (_e) { return 'a check'; }
  };
  P.exprProblem = function (expr) {
    var s = str(expr).trim();
    if (s === '') return 'Empty check';
    var b = 0, k = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (c === '{') b++; else if (c === '}') b--;
      else if (c === '[') k++; else if (c === ']') k--;
      if (b < 0 || k < 0) return 'A closing bracket comes before its opening one';
    }
    if (b !== 0) return 'The { } brackets do not match';
    if (k !== 0) return 'The [ ] brackets do not match';
    if (s.replace(/^!+/, '').indexOf('${') !== 0) return 'A check must start with ${ (or !${ to flip it)';
    return '';
  };

  P.COND = [
    ['actor_alive', 'Someone is alive'],
    ['actor_dead', 'Someone is dead or gone'],
    ['actor_exists', 'Something exists'],
    ['actor_in_range', 'Something is within N m of me'],
    ['in_combat', "I'm in combat"],
    ['not_in_combat', "I'm out of combat"],
    ['hp_below', 'My health is below N%'],
    ['zone_name', 'The zone name contains ...'],
    ['group_has_class', 'My group has one of these classes'],
    ['not_group_has_class', 'My group has none of these classes'],
    ['ls', 'This check is true (Wait-until builder)'],
    ['not_ls', 'This check is NOT true'],
    ['variable', 'An instance variable is set (to ...)'],
    ['not_variable', 'An instance variable is NOT set (to ...)'],
    ['native', 'Checks from an Ogre zone file (advanced)'],
    ['always', 'Always'],
    ['never', 'Never']
  ];
  P.COND_INACTIVE = [
    ['difficulty', 'Difficulty is ... (never true: the game sets no difficulty for these steps)'],
    ['not_difficulty', 'Difficulty is not ... (always true: see above)']
  ];
  P.COND_ALIAS = { actor_not_exists: 'actor_dead', expr: 'ls', 'true': 'always', 'false': 'never' };
  P.condKnown = function (c) {
    c = P.COND_ALIAS[c] || c;
    for (var i = 0; i < P.COND.length; i++) if (P.COND[i][0] === c) return true;
    return false;
  };
  function classWords(list, bare) {
    var a = str(list).split(/\s*,\s*/), out = [];
    for (var i = 0; i < a.length; i++) if (a[i]) out.push(bare ? a[i] : (/^[aeiou]/i.test(a[i]) ? 'an ' : 'a ') + a[i]);
    return out.join(' or ');
  }
  P.condText = function (e) {
    var c = str(e.condition), cc = P.COND_ALIAS[c] || c, v = P.codecs.cond.read(e);
    switch (cc) {
      case 'actor_alive': return U(v.cname) + ' is alive';
      case 'actor_dead': return U(v.cname) + ' is dead or gone';
      case 'actor_exists': return U(v.cname) + ' exists';
      case 'actor_in_range': return U(v.cname) + ' is within ' + (v.cdist || '?') + ' m';
      case 'in_combat': return "I'm in combat";
      case 'not_in_combat': return "I'm out of combat";
      case 'hp_below': return 'my health is below ' + (v.cnum || '?') + '%';
      case 'zone_name': return 'the zone name contains "' + v.czone + '"';
      case 'group_has_class': return 'the group has ' + (v.cclasses ? classWords(v.cclasses, false) : '(no class picked)');
      case 'not_group_has_class': return 'the group has no ' + (v.cclasses ? classWords(v.cclasses, true) : '(no class picked)');
      case 'ls': return P.exprText(v.cexpr);
      case 'not_ls': return 'NOT ' + P.exprText(v.cexpr);
      case 'variable': return 'variable ' + (v.cvar || '?') + (v.cval !== '' ? ' is ' + v.cval : ' is set');
      case 'not_variable': return 'variable ' + (v.cvar || '?') + (v.cval !== '' ? ' is not ' + v.cval : ' is not set');
      case 'native': return P.nativeCondText(v.cnative);
      case 'always': return 'always';
      case 'never': return 'never';
      case 'difficulty': return 'difficulty is ' + v.cdiff + ' (never true)';
      case 'not_difficulty': return 'difficulty is not ' + v.cdiff + ' (always true)';
      default: return 'unknown check "' + c + '" (the game treats it as false)';
    }
  };

  var NOPS = { '==': 'exactly', '!=': 'not', '>': 'above', '>=': 'at least', '<': 'below', '<=': 'at most' };
  function nParse(v) {
    if (v && typeof v === 'object') return v;
    var s = str(v).trim();
    if (s === '') return null;
    try { return JSON.parse(s); } catch (_e) { return undefined; }
  }
  function nFind(f) {
    if (!f || typeof f !== 'object') return '';
    if (str(f.query).trim()) return str(f.query).trim();
    return str(f.name).trim() ? 'Name == "' + str(f.name).trim() + '"' : '';
  }
  function nNum(v) { var n = +v; return isFinite(n) ? String(Math.round(n * 10) / 10) : str(v); }
  function nQuery(q) {
    var o = { name: '', alive: false, corpse: false, near: '', other: [] }, parts = str(q).split(/\s*&&\s*/), m;
    for (var i = 0; i < parts.length; i++) {
      var t = parts[i].replace(/^[\s(]+|[\s)]+$/g, '');
      if (!t) continue;
      if ((m = /^Name\s*==\s*"([^"]*)"$/i.exec(t))) o.name = m[1];
      else if ((m = /^Name\s*=-\s*"([^"]*)"$/i.exec(t))) o.name = 'a name with "' + m[1] + '"';
      else if (/^Type\s*!=\s*"Corpse"$/i.test(t) || /^Health\s*>\s*0$/i.test(t)) o.alive = true;
      else if (/^Type\s*==\s*"Corpse"$/i.test(t)) o.corpse = true;
      else if ((m = /^Distance\s*<=?\s*(-?[\d.]+)$/i.exec(t))) o.near = 'within ' + nNum(m[1]) + ' m';
      else if ((m = /^Distance\s*>=?\s*(-?[\d.]+)$/i.exec(t))) o.near = 'farther than ' + nNum(m[1]) + ' m';
      else o.other.push(t.replace(/"/g, ''));
    }
    o.who = (o.name || 'something') + (o.corpse ? "'s corpse" : '');
    o.tail = o.other.length ? ' (' + o.other.join(', ') + ')' : '';
    return o;
  }
  P.nativeQueryText = function (q) {
    var o = nQuery(q);
    return o.who + (o.alive ? ' (alive)' : '') + (o.near ? ' ' + o.near : '') + o.tail;
  };
  function nLoc(a) { return Array.isArray(a) && a.length >= 3 ? nNum(a[0]) + ', ' + nNum(a[1]) + ', ' + nNum(a[2]) : '(no spot)'; }
  function nOne(c, nested) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) return 'a check that is not one object';
    var k = Object.keys(c)[0], b = c[k], q;
    if (k === 'not') return 'not (' + nList(b, ' and ', false) + ')';
    if (k === 'or') { var o = nList(b, ' or ', true); return nested ? '(' + o + ')' : o; }
    if (k === 'and') { var a = nList(b, ' and ', true); return nested ? '(' + a + ')' : a; }
    if (k === 'jbEngaged') return str(b) + ' is fighting us';
    if (k === 'count' && b && typeof b === 'object') {
      q = nQuery(nFind(b.find));
      var op = str(b.compare), v = +b.value;
      var some = (op === '>=' && v === 1) || (op === '>' && v === 0) || (op === '!=' && v === 0);
      var none = (op === '==' && v === 0) || (op === '<' && v === 1) || (op === '<=' && v === 0);
      if (some) return q.who + (q.alive ? ' is up' : ' is') + (q.near ? ' ' + q.near : (q.alive ? '' : ' here')) + q.tail;
      if (none) return 'no ' + q.who + (q.alive ? ' up' : '') + (q.near ? ' ' + q.near : (q.alive ? '' : ' here')) + q.tail;
      return (NOPS[op] || op) + ' ' + nNum(b.value) + ' of ' + q.who + (q.near ? ' ' + q.near : '') + q.tail;
    }
    if (k === 'actorNear' && b && typeof b === 'object') {
      q = nQuery(nFind(b.find));
      var of = Array.isArray(b.ofLoc) ? nLoc(b.ofLoc) : (str(b.of) === 'me' ? 'me' : str(b.of || b.ofActor || '?'));
      return q.who + ' is within ' + nNum(b.within) + ' m of ' + of + q.tail;
    }
    if (k === 'actorCoord' && b && typeof b === 'object') {
      var ax = str(b.axis).toLowerCase();
      return (str(b.of) === 'me' ? 'my ' : str(b.of) + "'s ") + (ax === 'y' ? 'height' : ax.toUpperCase() + ' position') + ' is ' +
        (NOPS[str(b.compare)] || str(b.compare)) + ' ' + nNum(b.value);
    }
    return 'a "' + k + '" check (the game reads it as false)';
  }
  function nList(v, join, nested) {
    if (Array.isArray(v)) return v.length ? v.map(function (x) { return nOne(x, nested || v.length > 1); }).join(join) : (join === ' or ' ? 'never (no checks)' : 'always (no checks)');
    return nOne(v, nested);
  }
  P.nativeCondText = function (v) {
    var d = nParse(v);
    if (d === null) return '(no checks yet)';
    if (d === undefined) return 'a check that is not valid (the game reads it as false)';
    return nList(d, ' and ', false);
  };
  function nCheck(c) {
    if (!c || typeof c !== 'object' || Array.isArray(c) || Object.keys(c).length !== 1) return { lv: 0, why: 'each check is one {"name": ...} object' };
    var k = Object.keys(c)[0], b = c[k];
    if (k === 'not' || k === 'or' || k === 'and') return nCheckList(b);
    if (k === 'jbEngaged') return typeof b === 'string' ? { lv: 2 } : { lv: 0, why: 'jbEngaged takes a name' };
    if (k === 'count') {
      if (!b || typeof b !== 'object') return { lv: 0, why: 'count needs its fields' };
      if (str(b.of || 'actors') !== 'actors') return { lv: 0, why: 'count of "' + str(b.of) + '" (only actors)' };
      if (!nFind(b.find)) return { lv: 0, why: 'count without find {query} or {name}' };
      if (!NOPS[str(b.compare)] || typeof b.value !== 'number') return { lv: 0, why: 'count needs compare and a number value' };
      var v = b.value, op = str(b.compare), exact = (op === '>=' || op === '<') ? v <= 1 : v < 1;
      return exact ? { lv: 2 } : { lv: 1, why: 'a count past 1 is read as "none / at least one"' };
    }
    if (k === 'actorNear') {
      if (!b || typeof b !== 'object' || !nFind(b.find)) return { lv: 0, why: 'actorNear without find {query} or {name}' };
      if (typeof b.within !== 'number') return { lv: 0, why: 'actorNear without a number within' };
      if (b.compare !== undefined || b.value !== undefined) return { lv: 0, why: 'actorNear as a count' };
      if (b.ofLoc !== undefined) {
        var L = b.ofLoc;
        if (!Array.isArray(L) || L.length < 3 || typeof L[0] !== 'number' || typeof L[1] !== 'number' || typeof L[2] !== 'number')
          return { lv: 0, why: 'actorNear ofLoc must be [x, y, z] numbers' };
        return { lv: 1, why: 'actorNear ofLoc measures the first one found (the nearest to the runner)' };
      }
      return str(b.of) === 'me' ? { lv: 2 } : { lv: 0, why: 'actorNear of "' + str(b.of || b.ofActor) + '" (only me or ofLoc)' };
    }
    if (k === 'actorCoord') {
      if (!b || typeof b !== 'object' || str(b.of) !== 'me') return { lv: 0, why: 'actorCoord of "' + str(b && b.of) + '" (only me)' };
      if (!/^[xyz]$/i.test(str(b.axis))) return { lv: 0, why: 'actorCoord axis must be x, y or z' };
      if (!NOPS[str(b.compare)] || typeof b.value !== 'number') return { lv: 0, why: 'actorCoord needs compare and a number value' };
      return { lv: 2 };
    }
    return { lv: 0, why: 'ISXJQB cannot read the "' + k + '" check' };
  }
  function nCheckList(v) {
    if (v && typeof v === 'object' && !Array.isArray(v)) return nCheck(v);
    if (!Array.isArray(v)) return { lv: 0, why: 'a list of checks must be [ ... ]' };
    var worst = { lv: 2 };
    for (var i = 0; i < v.length; i++) {
      var r = nCheck(v[i]);
      if (r.lv < worst.lv) worst = r;
      if (worst.lv === 0) break;
    }
    return worst;
  }
  P.nativeCondProblem = function (v) {
    var d = nParse(v);
    if (d === null) return { level: 'error', msg: 'No checks yet: the game reads an empty check as false.' };
    if (d === undefined) return { level: 'error', msg: 'Not valid JSON, so the game reads the whole check as false. Undo the last edit, or fix the brackets and quotes.' };
    if (typeof d !== 'object') return { level: 'error', msg: 'The checks must be a list [ ... ] (or one { ... }): the game reads this as false.' };
    var r = nCheckList(d);
    if (r.lv === 0) return { level: 'warn', msg: 'The game cannot read part of this (' + r.why + '): that part counts as false.' };
    if (r.lv === 1) return { level: 'info', msg: 'Read approximately: ' + r.why + '.' };
    return null;
  };
  P.nativeMsgText = function (s) {
    return str(s).replace(/\{\{\s*named:([^|}]*)[^}]*\}\}/g, function (x, n) { return 'how ' + n + ' went'; })
      .replace(/\{\{\s*loot:([^}]*)\}\}/g, function (x, l) { return 'the ' + (l || 'loot') + ' result'; })
      .replace(/\{\{\s*(?:step:|ic\.run\.verdicts\.)([^}]*)\}\}/g, function (x, id) { return 'how ' + id + ' went'; })
      .replace(/\{\{\s*me\s*\}\}|\$\{Me\.Name\}/g, 'my name')
      .replace(/\{\{([^}]*)\}\}/g, '$1').replace(/\$\{[^}]*\}/g, 'a game value');
  };
})(typeof window !== 'undefined' ? window : this);
