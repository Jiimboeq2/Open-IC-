/* Open IC Creator - ic-nmap-enc.js
   Native OgreBot fight files for the nameds of a zone file (IC.nenc): file names and folders, a new fight file, and
   spot and trigger helpers. Pure logic, no DOM.
   MIT License, see LICENSE. */
(function (W) {
  'use strict';
  var IC = W.IC = W.IC || {};
  var E = IC.nenc = {};

  function str(v) { return v == null ? '' : String(v); }
  function isArr(v) { return Object.prototype.toString.call(v) === '[object Array]'; }
  function isObj(v) { return !!v && typeof v === 'object' && !isArr(v); }
  function r6(v) { return Math.round(v * 1000000) / 1000000; }
  function xyz(v) {
    if (!isArr(v) || v.length < 3) return null;
    var x = +v[0], y = +v[1], z = +v[2];
    return isFinite(x) && isFinite(y) && isFinite(z) && typeof v[0] !== 'string' ? [x, y, z] : null;
  }
  E.fileSafe = function (s) {
    var t = str(s).replace(/:/g, ' -').replace(/[\x00-\x1f<>"\/\\|?*]/g, '_').replace(/ {2,}/g, ' ').replace(/^[ .]+|[ .]+$/g, '');
    return t.length > 120 ? t.slice(0, 120).replace(/[ .]+$/, '') : t;
  };
  function base(z) { return str(z).replace(/\s*\[[^\]]*\]\s*$/, ''); }
  function tagOf(z) { var m = /\[[^\]]*\]\s*$/.exec(str(z)); return m ? m[0].replace(/\s+$/, '') : ''; }
  E.zoneStrings = function (zone, variants) {
    var z = base(isArr(zone) ? zone[0] : zone), v = isArr(variants) ? variants : [], out = [], i;
    for (i = 0; i < v.length; i++) if (str(v[i])) out.push(z + ' ' + str(v[i]));
    return out.length ? out : (tagOf(isArr(zone) ? zone[0] : zone) ? [str(isArr(zone) ? zone[0] : zone)] : [z]);
  };
  E.folderFor = function (zones) {
    var z = isArr(zones) ? zones : [zones], tag = '', i;
    for (i = 0; i < z.length && !tag; i++) { var t = tagOf(z[i]); if (t && t !== '[Solo]' && t !== '[Heroic]') tag = t; }
    return E.fileSafe(base(z[0])) + (tag ? ' ' + tag : '');
  };
  E.keyFor = function (expansion, zones, named, have) {
    var want = E.folderFor(zones), z = isArr(zones) ? zones : [zones], tag = tagOf(z[0]), i, exp = str(expansion) || 'Custom', folder = want;
    for (i = 0; have && i < have.length; i++) {
      var ft = tagOf(have[i].zone);
      if (!ft || ft === tag || ft === want.replace(/^.*(\[[^\]]*\])$/, '$1')) { folder = str(have[i].zone); if (have[i].exp) exp = str(have[i].exp); break; }
    }
    return E.fileSafe(exp) + '/' + folder + '/' + E.fileSafe(named) + '.json';
  };
  E.newFight = function (icDoc, named, have) {
    var zones = E.zoneStrings(icDoc.zone, icDoc.variants), d = { named: [{ name: str(named), distance: 100 }], expansion: str(icDoc.expansion) };
    d.zone = zones.length === 1 ? zones[0] : zones;
    d.setup = [];
    d.triggers = [];
    return { doc: d, key: E.keyFor(icDoc.expansion, zones, named, have) };
  };
  E.filesForZone = function (items, zone, variants) {
    var b = E.fileSafe(base(isArr(zone) ? zone[0] : zone)).toLowerCase(), out = [], i;
    for (i = 0; items && i < items.length; i++) {
      var e = items[i], f = str(e.zone), fb = f.replace(/\s*\[[^\]]*\]\s*$/, '').toLowerCase();
      if (fb === b) out.push(e);
    }
    var vs = (isArr(variants) ? variants : []).map(function (v) { return str(v).toLowerCase(); });
    var rank = function (e) { var m = /\[[^\]]*\]\s*$/.exec(str(e.zone)); return !m ? 1 : vs.indexOf(m[0].trim().toLowerCase()) >= 0 ? 0 : 2; };
    return out.sort(function (a, c) { return rank(a) - rank(c); });
  };
  function stemName(e) { return str(e.file).replace(/\s*\[[^\]]*\]\s*$/, '').toLowerCase(); }
  E.fileFor = function (files, named, aliases) {
    var names = [str(named).toLowerCase()].concat((aliases || []).map(function (a) { return str(a).toLowerCase(); })), i;
    for (i = 0; files && i < files.length; i++) if (names.indexOf(stemName(files[i])) >= 0) return files[i];
    return null;
  };
  E.namesOf = function (d) {
    var out = [], L = d && isArr(d.named) ? d.named : [], i, j;
    for (i = 0; i < L.length; i++) {
      if (!isObj(L[i])) continue;
      if (L[i].name) out.push(str(L[i].name));
      if (isArr(L[i].aliases)) for (j = 0; j < L[i].aliases.length; j++) out.push(str(L[i].aliases[j]));
    }
    return out;
  };

  var ROLES = [['all', 'Everyone'], ['fighter', 'The fighters'], ['notfighter', 'Everyone but the fighters'], ['mage', 'The mages'], ['priest', 'The priests'], ['scout', 'The scouts']];
  E.ROLES = ROLES;
  E.roleWords = function (w) { for (var i = 0; i < ROLES.length; i++) if (ROLES[i][0] === w) return ROLES[i][1]; return str(w); };
  function list(d, k) { if (!isArr(d[k])) d[k] = []; return d[k]; }
  E.stand = function (d, role, p) {
    var s = { 'do': 'campSpot', op: 'setLoc', forwho: str(role) || 'all', loc: [r6(p[0]), r6(p[1]), r6(p[2])] }, L = list(d, 'setup');
    L.push(s);
    return { path: ['setup', L.length - 1], msg: E.roleWords(role) + ' stand here for the fight' };
  };
  E.standBehind = function (d, role, named, dist) {
    var s = { 'do': 'campSpot', op: 'atAngleFromActor', forwho: str(role) || 'notfighter', name: str(named), angle: 0, dist: dist > 0 ? dist : 3, includeNpcSize: false }, L = list(d, 'setup');
    L.push(s);
    return { path: ['setup', L.length - 1], msg: E.roleWords(role) + ' stand behind ' + str(named) };
  };
  function eventName(d, stem) {
    var ev = isObj(d.initialize) && isArr(d.initialize.events) ? d.initialize.events : [], n = 1, base1 = str(stem).replace(/[^A-Za-z0-9]/g, '') || 'Move';
    while (ev.indexOf(base1 + n) >= 0) n++;
    return base1 + n;
  }
  function declare(d, ev) {
    if (!isObj(d.initialize)) d.initialize = {};
    if (!isArr(d.initialize.events)) d.initialize.events = [];
    d.initialize.events.push(ev);
  }
  E.saysMove = function (d, needle, role, p, secs) {
    var ev = eventName(d, 'Back'), T = list(d, 'triggers');
    declare(d, ev);
    T.push({ on: 'text', match: { mode: 'substring', needle: str(needle) }, 'do': [
      { 'do': 'campSpot', op: 'setRelativeLoc', forwho: str(role) || 'all', loc: [r6(p[0]), r6(p[1]), r6(p[2])] },
      { 'do': 'timer', event: ev, after: (secs > 0 ? secs : 10) + 's' }] });
    T.push({ on: ev, 'do': [{ 'do': 'campSpot', op: 'clearRelative', forwho: str(role) || 'all' }] });
    return { path: ['triggers', T.length - 2], msg: 'When that line shows, ' + E.roleWords(role).toLowerCase() + ' go there for ' + (secs > 0 ? secs : 10) + ' s, then back' };
  };
  E.meshTrip = function (p, who, id) {
    var w = str(who), out = [{ 'do': 'campSpot', op: 'clear' }, { 'do': 'movement', op: 'navTo', loc: [r6(p[0]), r6(p[1]), r6(p[2])] },
      { stepId: str(id) || 'trip.there', wait: 'moveFinished', limitMs: 45000, onTimeout: 'proceed' }, { 'do': 'campSpot', op: 'enable' }];
    if (w && w !== 'all') for (var i = 0; i < out.length; i++) out[i].forwho = w;
    return out;
  };
  E.meshHome = function (who, id) {
    var w = str(who), out = [{ 'do': 'campSpot', op: 'clearRelative', nav: true }, { stepId: str(id) || 'trip.home', wait: 'moveFinished', limitMs: 45000, onTimeout: 'proceed' }];
    if (w && w !== 'all') for (var i = 0; i < out.length; i++) out[i].forwho = w;
    return out;
  };
  E.saysTrip = function (d, needle, role, p, secs) {
    var ev = eventName(d, 'Back'), T = list(d, 'triggers'), w = str(role) || 'all', tag = ev.toLowerCase();
    declare(d, ev);
    T.push({ on: 'text', match: { mode: 'substring', needle: str(needle) }, allowConcurrentRuns: false, 'do': E.meshTrip(p, w, tag + '.there').concat([{ 'do': 'timer', event: ev, after: (secs > 0 ? secs : 10) + 's' }]) });
    T.push({ on: ev, allowConcurrentRuns: false, 'do': E.meshHome(w, tag + '.home') });
    return { path: ['triggers', T.length - 2], msg: 'When that line shows, ' + E.roleWords(w).toLowerCase() + ' walk there on the mesh, and back after ' + (secs > 0 ? secs : 10) + ' s' };
  };
  E.spawnHold = function (d, add, who) {
    var T = list(d, 'triggers'), w = str(who) || 'all', reason = 'add up: ' + str(add);
    T.push({ on: 'spawn', match: { name: str(add), mode: 'exact' }, 'do': [
      { 'do': 'noOffensive', forwho: w, value: true, reason: reason },
      { 'do': 'autotarget', op: 'clear', forwho: 'fighter' },
      { 'do': 'autotarget', op: 'addActor', forwho: 'fighter', name: str(add), hp: 0, checkCollision: false, aggroOnGroupOnly: true }] });
    T.push({ on: 'despawn', match: { name: str(add), mode: 'exact' }, 'do': [{ 'do': 'noOffensive', forwho: w, value: false, reason: reason }] });
    return { path: ['triggers', T.length - 2], msg: 'When ' + str(add) + ' spawns the group holds fire, the fighters kill it first' };
  };

  E.places = function (d) {
    var o = { points: [], rings: [], acts: [], no: [] };
    var addStep = function (s, r, tip, on) {
      if (!isObj(s)) return;
      var d1 = str(s['do']), loc;
      if (d1 === 'campSpot') {
        loc = xyz(s.loc) || (typeof s.x === 'number' && typeof s.y === 'number' && typeof s.z === 'number' ? [s.x, s.y, s.z] : null);
        var who = E.roleWords(str(s.forwho || 'all'));
        if (loc && (s.op === 'setLoc' || s.op === 'setRelativeLoc')) o.points.push({ r: r, s: s, k: s.op === 'setLoc' ? 'stand' : 'tmp', x: loc[0], y: loc[1], z: loc[2], how: '', big: true, f: xyz(s.loc) ? 'loc' : 'xyz', tip: who + (s.op === 'setLoc' ? ' stand here' : ' go here for a while') + (on ? ': ' + on : '') });
        else if (s.op === 'atAngleFromActor') o.acts.push({ r: r, k: 'angle', a: str(s.name), tip: who + ' stand ' + (+s.angle === 0 ? 'behind' : +s.angle === 180 ? 'in front of' : 'at an angle to') + ' ' + str(s.name) + ', ' + str(s.dist) + ' m' });
        else if (isArr(s.spots)) for (var j = 0; j < s.spots.length; j++) { loc = xyz(s.spots[j]); if (loc) o.points.push({ r: r, s: s, j: j, k: 'tmp', x: loc[0], y: loc[1], z: loc[2], how: '', big: false, f: 'spots', tip: who + ': one of these spots' + (on ? ': ' + on : '') }); }
      } else if (d1 === 'movement' && xyz(s.loc)) { loc = xyz(s.loc); o.points.push({ r: r, s: s, k: 'tmp', x: loc[0], y: loc[1], z: loc[2], how: '', big: true, f: 'loc', tip: 'Walks here' + (on ? ': ' + on : '') }); }
      if (isArr(s.steps)) s.steps.forEach(function (x, i) { addStep(x, r + '.steps.' + i, tip, on); });
    };
    var i, j2, L = isArr(d.setup) ? d.setup : [];
    for (i = 0; i < L.length; i++) addStep(L[i], 'setup.' + i, '', 'before the pull');
    var T = isArr(d.triggers) ? d.triggers : [];
    for (i = 0; i < T.length; i++) {
      var t = T[i], when = isObj(t) ? str(t.on) : '';
      if (!isObj(t) || !isArr(t['do'])) continue;
      var words = when === 'text' && t.match ? 'when "' + str(t.match.needle) + '" shows' : when === 'spawn' && t.match ? 'when ' + str(t.match.name) + ' spawns' : when === 'despawn' && t.match ? 'when ' + str(t.match.name) + ' goes' : when ? 'on ' + when : '';
      for (j2 = 0; j2 < t['do'].length; j2++) addStep(t['do'][j2], 'triggers.' + i + '.do.' + j2, '', words);
    }
    var R = isObj(d.spotTables) ? d.spotTables : {};
    Object.keys(R).forEach(function (k) {
      if (!isArr(R[k])) return;
      for (var q = 0; q < R[k].length; q++) { var lo = xyz(R[k][q]); if (lo) o.points.push({ r: 'spotTables.' + k, tbl: k, j: q, k: 'tmp', x: lo[0], y: lo[1], z: lo[2], how: '', big: false, f: 'table', tip: 'Spot table ' + k + ', spot ' + (q + 1) }); }
    });
    return o;
  };
  E.setPoint = function (d, pt, x, z) {
    var a = null;
    if (pt.f === 'table') a = isObj(d.spotTables) && isArr(d.spotTables[pt.tbl]) ? d.spotTables[pt.tbl][pt.j] : null;
    else if (pt.f === 'spots') a = isArr(pt.s.spots) ? pt.s.spots[pt.j] : null;
    else if (pt.f === 'xyz') { pt.s.x = r6(x); pt.s.z = r6(z); return true; }
    else a = pt.s.loc;
    if (!isArr(a) || a.length < 3) return false;
    a[0] = r6(x); a[2] = r6(z);
    return true;
  };
})(typeof window !== 'undefined' ? window : this);
