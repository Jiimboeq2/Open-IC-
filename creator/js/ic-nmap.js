/* Open IC Creator - ic-nmap.js
   Native OgreBot zone files (IC.nmap): the step blocks an editor writes (move, kill, fight to, clear, use, carry, exit,
   hold, wait), drag edits, conversion from an ISXJQB file, and the file checks (N.problems). Pure logic, no DOM.
   MIT License, see LICENSE. */
(function (W) {
  'use strict';
  var IC = W.IC = W.IC || {};
  var N = IC.nmap = {};
  var DEFAULT_RADIUS = 20, WHO = 'igw:{{me}}';

  function str(v) { return v == null ? '' : String(v); }
  function isArr(v) { return Object.prototype.toString.call(v) === '[object Array]'; }
  function isObj(v) { return !!v && typeof v === 'object' && !isArr(v); }
  function r6(v) { return Math.round(v * 1000000) / 1000000; }
  function rad(v) { var n = Math.round(+v); return n > 0 ? n : 1; }
  N.spot = function (x, y, z) { return [r6(+x), r6(+y), r6(+z)]; };
  function pt3(p) { return isArr(p) ? N.spot(p[0], p[1], p[2]) : N.spot(p.x, p.y, p.z); }

  N.ids = function (doc) {
    var out = {};
    (function walk(L) {
      for (var i = 0; isArr(L) && i < L.length; i++) {
        var s = L[i];
        if (!isObj(s)) continue;
        if (s.stepId != null) out[str(s.stepId)] = 1;
        if (isArr(s.steps)) walk(s.steps);
      }
    })(doc.steps);
    if (isArr(doc.enter)) (function (L) { for (var i = 0; i < L.length; i++) if (isObj(L[i]) && L[i].stepId != null) out[str(L[i].stepId)] = 1; })(doc.enter);
    if (isArr(doc.exit)) (function (L) { for (var i = 0; i < L.length; i++) if (isObj(L[i]) && L[i].stepId != null) out[str(L[i].stepId)] = 1; })(doc.exit);
    return out;
  };
  function uniq(ids, base) {
    if (!ids[base]) { ids[base] = 1; return base; }
    for (var n = 2; ; n++) if (!ids[base + n]) { ids[base + n] = 1; return base + n; }
  }
  function uniqBase(ids, base) {
    var taken = function (b) { if (ids[b]) return true; for (var k in ids) if (k.indexOf(b + '.') === 0) return true; return false; };
    if (!taken(base)) return base;
    for (var n = 2; ; n++) if (!taken(base + n)) return base + n;
  }
  function namedNo(id) { var m = /^named(\d+)$/.exec(str(id)); return m ? +m[1] : 0; }
  function maxNamed(doc) {
    var mx = 0, L = isArr(doc.steps) ? doc.steps : [];
    for (var i = 0; i < L.length; i++) if (isObj(L[i])) mx = Math.max(mx, namedNo(L[i].stepId));
    return mx;
  }
  N.section = function (doc, at) {
    var L = isArr(doc.steps) ? doc.steps : [], i;
    for (i = at; i < L.length; i++) if (isObj(L[i]) && namedNo(L[i].stepId)) return 'named' + namedNo(L[i].stepId);
    return 'named' + (maxNamed(doc) + 1);
  };
  function closing(s) { return isObj(s) && /^(done\.said|exit(\..*)?)$/.test(str(s.stepId)); }
  function tailEnd(L, i) {
    var id = isObj(L[i]) ? str(L[i].stepId) : '', m = /^(named\d+)(\.(else\d*|chest\d*|shinies\d*))?$/.exec(id), b = /^(.*\.(fight|adds|carry\d*))(\.|$)/.exec(id), k = i + 1;
    if (m) { while (k < L.length && isObj(L[k]) && new RegExp('^' + m[1] + '\\.(else|chest|shinies|said)\\d*$').test(str(L[k].stepId))) k++; return k; }
    if (b) { while (k < L.length && isObj(L[k]) && (str(L[k].stepId) === b[1] || str(L[k].stepId).indexOf(b[1] + '.') === 0)) k++; return k; }
    return k;
  }
  N.where = function (doc, sel) {
    var L = isArr(doc.steps) ? doc.steps : [], i = L.length;
    if (sel != null && sel >= 0 && sel < L.length) return tailEnd(L, sel);
    while (i > 0 && closing(L[i - 1])) i--;
    return i;
  };
  function put(doc, at, steps, sel, msg) {
    if (!isArr(doc.steps)) doc.steps = [];
    Array.prototype.splice.apply(doc.steps, [at, 0].concat(steps));
    N.tidySaid(doc);
    return { at: at, n: steps.length, sel: at + (sel || 0), msg: msg };
  }

  N.move = function (doc, at, pts, o) {
    o = o || {};
    var ids = N.ids(doc), base = N.section(doc, at), s = { stepId: uniq(ids, base + '.walk'), 'do': 'path', using: o.using === 'campspot' ? 'campspot' : 'nav' };
    if (o.noFights) s.waitForCombat = false;
    if (o.stopOn) s.exitOnActorAggro = str(o.stopOn);
    s.spots = [];
    for (var i = 0; i < pts.length; i++) s.spots.push(pt3(pts[i]));
    return put(doc, at, [s], 0, 'Move the group: ' + s.spots.length + ' spot' + (s.spots.length === 1 ? '' : 's'));
  };
  N.addSpot = function (step, p) { if (!isArr(step.spots)) step.spots = []; step.spots.push(pt3(p)); return step.spots.length - 1; };

  function shortZone(doc) {
    var z = str(isArr(doc.zone) ? doc.zone[0] : doc.zone), c = z.lastIndexOf(': ');
    return c >= 0 ? z.slice(c + 2) : z;
  }
  function saidOf(doc, id, name) {
    return shortZone(doc) + ' 1/1: ' + name + ' - {{ic.run.verdicts.' + id + '}}, chest {{ic.run.verdicts.' + id + '.chest}}, shinies {{ic.run.verdicts.' + id + '.shinies}}';
  }
  N.kill = function (doc, at, name, p, o) {
    o = o || {};
    name = str(name);
    var ids = N.ids(doc), id = uniq(ids, 'named' + (maxNamed(doc) + 1)), s = { stepId: id, 'do': 'named', name: name };
    if (p) s.spot = pt3(p); else if (!o.stay) s.navTo = true;
    if (o.scanRadius) s.scanRadius = rad(o.scanRadius);
    if (o.pullLimitMs) s.pullLimitMs = o.pullLimitMs;
    if (o.spawnWaitMs) s.spawnWaitMs = o.spawnWaitMs;
    if (o.aliases && o.aliases.length) s.aliases = o.aliases.slice();
    if (o.boss) s.boss = true;
    var chest = { stepId: uniq(ids, id + '.chest'), 'do': 'loot', op: 'chest' };
    if (o.boss) chest.boss = true;
    var steps = [s, chest, { stepId: uniq(ids, id + '.shinies'), 'do': 'loot', op: 'shinies' }, { stepId: uniq(ids, id + '.said'), 'do': 'announce', message: saidOf(doc, id, name) }];
    return put(doc, at, steps, 0, 'Kill ' + name + ', then its chest, its shinies and the result line');
  };

  N.KILL_MAX = 100;
  N.fightTo = function (doc, at, p, radius, o) {
    o = o || {};
    if (o.form === 'sweep') return N.fightSweep(doc, at, p, radius, o);
    var R = Math.min(rad(radius || DEFAULT_RADIUS), N.KILL_MAX), ids = N.ids(doc), s = { stepId: uniq(ids, N.section(doc, at) + '.walk'), 'do': 'path', using: 'nav' };
    s.spots = [pt3(p)];
    s.killWithin = R;
    if (o.types && o.types.length) s.killTypes = o.types.slice();
    if (o.limitMs) s.killLimitMs = o.limitMs;
    if (o.stopOn) s.exitOnActorAggro = str(o.stopOn);
    return put(doc, at, [s], 0, 'Fight to here: the walk stops for what comes within ' + R + ' m, kills it and walks on');
  };
  N.fightSweep = function (doc, at, p, radius, o) {
    o = o || {};
    var R = rad(radius || DEFAULT_RADIUS), ids = N.ids(doc), base = uniqBase(ids, N.section(doc, at) + '.fight');
    var walk = { stepId: uniq(ids, base + '.walk'), 'do': 'path', using: 'nav' };
    if (o.stopOn) walk.exitOnActorAggro = str(o.stopOn);
    walk.spots = [pt3(p)];
    var clear = { stepId: uniq(ids, base + '.clear'), 'do': 'trash', radius: R };
    if (o.stopOn) clear.until = str(o.stopOn);
    clear.whenEmpty = 'done';
    var steps = [{ stepId: uniq(ids, base + '.scan'), 'do': 'autotarget', op: 'set', radius: R },
      { stepId: uniq(ids, base + '.ocs'), 'do': 'autotarget', op: 'setOutOfCombatScanning', value: true }, walk, clear,
      { stepId: uniq(ids, base + '.ocs.off'), 'do': 'autotarget', op: 'setOutOfCombatScanning', value: false }];
    return put(doc, at, steps, 2, 'Fight to here: fights what it meets on the way, then clears ' + R + ' m around the end');
  };
  N.fightParts = function (doc, step) {
    if (isObj(step) && step['do'] === 'path' && step.killWithin !== undefined) return { walk: step, native: true };
    var m = /^(.*\.fight\d*)\.(scan|ocs|ocs\.off|walk|clear)\d*$/.exec(str(step && step.stepId));
    if (!m) return null;
    var out = {}, L = isArr(doc.steps) ? doc.steps : [], i, pre = m[1] + '.';
    for (i = 0; i < L.length; i++) {
      var id = isObj(L[i]) ? str(L[i].stepId) : '';
      if (id.indexOf(pre) !== 0) continue;
      var t = id.slice(pre.length).replace(/\d+$/, '');
      if (t === 'scan' || t === 'ocs' || t === 'walk' || t === 'clear') out[t] = L[i];
    }
    return out.walk ? out : null;
  };
  function notesOf(steps) {
    var out = [], i, k;
    for (i = 0; i < steps.length; i++) if (isObj(steps[i])) for (k in steps[i]) if (Object.prototype.hasOwnProperty.call(steps[i], k) && k.charAt(0) === '_') out.push({ id: str(steps[i].stepId), k: k, v: steps[i][k] });
    return out;
  }
  function notesBack(doc, r, notes) {
    var L = doc.steps, a = r.at, b = r.at + r.n, i, j;
    for (i = 0; i < notes.length; i++) {
      var to = null;
      for (j = a; j < b && !to; j++) if (isObj(L[j]) && str(L[j].stepId) === notes[i].id) to = L[j];
      for (j = a; j < b && !to; j++) if (isObj(L[j]) && L[j]['do'] === 'path') to = L[j];
      if (!to) to = L[a];
      if (isObj(to)) to[notes[i].k] = notes[i].v;
    }
    return r;
  }
  N.todoTick = function (doc, i) {
    var L = isObj(doc) && isArr(doc._todo) ? doc._todo : null;
    if (!L || !(i >= 0) || i >= L.length) return null;
    return { row: L.splice(i, 1)[0], at: i };
  };
  N.todoHas = function (doc, row) {
    var L = isObj(doc) && isArr(doc._todo) ? doc._todo : [], i;
    for (i = 0; i < L.length; i++) if (L[i] === row || (isObj(row) && isObj(L[i]) && row.id !== undefined && L[i].id === row.id)) return true;
    return false;
  };
  N.todoBack = function (doc, t) {
    var L = isObj(doc) && isArr(doc._todo) ? doc._todo : null;
    if (!L || !t || N.todoHas(doc, t.row)) return false;
    L.splice(Math.min(t.at, L.length), 0, t.row);
    return true;
  };
  N.fightSwitch = function (doc, step, form) {
    var f = N.fightParts(doc, step), L = isArr(doc.steps) ? doc.steps : [], i;
    if (!f) return null;
    var at = L.indexOf(f.walk), spots = isArr(f.walk.spots) ? f.walk.spots : [], stop = str(f.walk.exitOnActorAggro), p = spots[spots.length - 1];
    if (!isArr(p)) return null;
    if (f.native) {
      if (form === 'kill' || spots.length !== 1) return null;
      var R = f.walk.killWithin, kept = notesOf([f.walk]);
      L.splice(at, 1);
      return notesBack(doc, N.fightSweep(doc, at, p, R, { stopOn: stop }), kept);
    }
    if (form !== 'kill') return null;
    var R2 = f.clear ? f.clear.radius : DEFAULT_RADIUS, first = L.length;
    ['scan', 'ocs', 'walk', 'clear'].forEach(function (k) { if (f[k]) first = Math.min(first, L.indexOf(f[k])); });
    var pre = /^(.*\.fight\d*)\./.exec(str(f.walk.stepId)), kept2 = [];
    for (i = L.length - 1; i >= 0; i--) if (isObj(L[i]) && pre && str(L[i].stepId).indexOf(pre[1] + '.') === 0) { kept2 = notesOf([L[i]]).concat(kept2); L.splice(i, 1); }
    return notesBack(doc, N.fightTo(doc, first, p, R2, { stopOn: stop }), kept2);
  };
  N.setFightStop = function (doc, step, mob) {
    var f = N.fightParts(doc, step);
    if (!f) return false;
    mob = str(mob);
    if (mob) { N.beforeKey(f.walk, 'exitOnActorAggro', mob, 'spots'); if (f.clear) N.beforeKey(f.clear, 'until', mob, 'whenEmpty'); }
    else { delete f.walk.exitOnActorAggro; if (f.clear) delete f.clear.until; }
    return true;
  };

  N.clear = function (doc, at, p, radius, o) {
    o = o || {};
    var R = rad(radius || DEFAULT_RADIUS), ids = N.ids(doc), base = uniq(ids, uniqBase(ids, N.section(doc, at) + '.clear'));
    var s = { stepId: base, 'do': 'trash', radius: R };
    if (o.until) s.until = str(o.until);
    s.whenEmpty = o.wait ? 'wait' : 'done';
    var hop = { stepId: uniq(ids, base + '.walk'), 'do': 'path', using: 'nav', spots: [pt3(p)] };
    return put(doc, at, [hop, s], 1, 'Clear ' + R + ' m around here');
  };

  N.adds = function (doc, at, radius, mobs) {
    var R = rad(radius || 40), ids = N.ids(doc), base = uniq(ids, uniqBase(ids, N.section(doc, at) + '.adds')), steps = [];
    steps.push({ stepId: uniq(ids, base + '.off'), 'do': 'autotarget', op: 'setEnabled', value: false });
    steps.push({ stepId: uniq(ids, base + '.clear'), 'do': 'autotarget', op: 'clear' });
    steps.push({ stepId: base, 'do': 'autotarget', op: 'set', radius: R });
    for (var i = 0; i < mobs.length; i++) {
      var nm = str(mobs[i]), w = nm.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').pop() || 'add';
      steps.push({ stepId: uniq(ids, base + '.' + w), 'do': 'autotarget', op: 'addActor', name: nm, hp: 0, checkCollision: false, aggroOnGroupOnly: false });
    }
    steps.push({ stepId: uniq(ids, base + '.on'), 'do': 'autotarget', op: 'setEnabled', value: true });
    return put(doc, at, steps, 2, 'Kill order: ' + mobs.length + ' mob' + (mobs.length === 1 ? '' : 's') + ', top first');
  };

  N.use = function (doc, at, op, name, o) {
    o = o || {};
    var ids = N.ids(doc), s = { stepId: uniq(ids, N.section(doc, at) + '.' + (op === 'hail' ? 'hail' : op === 'target' ? 'target' : 'use')), 'do': 'actorInteract', op: op, name: str(name) };
    if (op === 'verb') s.verb = str(o.verb || 'use');
    if (op === 'dialog') s.choiceText = str(o.choice);
    s.onFail = 'proceed';
    return put(doc, at, [s], 0, (op === 'doubleClick' ? 'Double-click ' : op === 'verb' ? str(o.verb || 'Use') + ': ' : op === 'hail' ? 'Hail ' : op === 'target' ? 'Target ' : 'Answer ') + str(name));
  };

  var CARRY_HELD = 'LavishScript["${EQ2.ObjectBeingMoved(exists)}"]';
  var PLACE_RE = /^(\s*jb\s+(?:placeitem|itemplace)\s+)(-?[\d.]+),(-?[\d.]+),(-?[\d.]+)(.*)$/i;
  N.carryKey = function (object) { var w = str(object).replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/); return (w[w.length - 1] || 'item').toLowerCase() + 'Pitch'; };
  function placeBefore(doc, at) {
    var L = isArr(doc.steps) ? doc.steps : [], i, s;
    for (i = Math.min(at, L.length) - 1; i >= 0; i--) {
      s = L[i];
      if (!isObj(s)) continue;
      if (isArr(s.spots) && s.spots.length && isArr(s.spots[s.spots.length - 1])) return s.spots[s.spots.length - 1];
      if (isArr(s.spot)) return s.spot;
    }
    return isObj(doc.entrance) && isArr(doc.entrance.loc) ? doc.entrance.loc : null;
  }
  N.standShort = function (from, drop) {
    if (!from) return drop.slice();
    var dx = +from[0] - drop[0], dz = +from[2] - drop[2], d = Math.sqrt(dx * dx + dz * dz);
    return d <= 3 ? [+from[0], +from[1], +from[2]] : [r6(drop[0] + dx / d * 3), drop[1], r6(drop[2] + dz / d * 3)];
  };
  N.carry = function (doc, at, object, o) {
    o = o || {};
    var ids = N.ids(doc), base = uniqBase(ids, N.section(doc, at) + '.carry'), name = str(object), native1 = o.form === 'native', drop = pt3(o.drop), legs = [], steps = [], i;
    for (i = 0; o.legs && i < o.legs.length; i++) legs.push(pt3(o.legs[i]));
    var id = function (x) { return uniq(ids, base + '.' + x); };
    var raw = function (x, command, fail) { var s = { stepId: id(x), 'do': 'raw', command: command }; if (fail) s.onFail = 'fail'; return s; };
    var pause = function (x, ms) { return { stepId: id(x), wait: 'ms', limitMs: ms, onTimeout: 'proceed' }; };
    var walk = function (spots) { return { stepId: id('walk'), 'do': 'path', using: 'nav', spots: spots, groupWithin: 3, spotLimitMs: 120000, onSpotTimeout: 'fail' }; };
    var sel = 0;
    if (native1) {
      var key = str(o.pitchKey) || N.carryKey(name), pitch = '{{ic.zone.options.' + key + '}}';
      if (!isObj(doc.options)) N.beforeKey(doc, 'options', {}, 'steps');
      if (o.pitch != null || doc.options[key] === undefined) doc.options[key] = o.pitch != null ? o.pitch : 45;
      steps.push(raw('pitch', 'OgreBotAPI.Client:SetCameraPitch[all,' + pitch + ',TRUE]'), pause('pitch.wait', 1000));
      steps.push(raw('pick', 'OgreBotAPI.Actors:ApplyVerb[all,"' + name + '","Move"]', true), pause('pick.wait', 6000));
      sel = steps.length;
      steps.push(walk(legs.concat([drop])));
      steps.push(raw('pitch2', 'OgreBotAPI.Client:SetCameraPitch[all,' + pitch + ',TRUE]'));
      steps.push(raw('mid', 'OgreBotAPI.Client:SetMousePositionMiddle[all]'), pause('mid.wait', 1000));
      steps.push(raw('click', 'Mouse:LeftClick'), pause('click.wait', 3000));
      steps.push(raw('cam', 'OgreBotAPI.Client:ResetCamera[all]'));
    } else {
      if (!legs.length) legs.push(N.standShort(placeBefore(doc, at), drop));
      steps.push(raw('aim', 'OgreBotAPI.Client:SetMousePositionMiddle[{{me}}]'));
      steps.push(raw('pick', 'OgreBotAPI.Actors:ApplyVerb[{{me}},"' + name + '","Move"]', true));
      steps.push({ stepId: id('held'), wait: { textEquals: { text: CARRY_HELD, value: 'TRUE' } }, limitMs: 6000, onTimeout: 'fail' });
      sel = steps.length;
      steps.push(walk(legs));
      steps.push(raw('place', 'jb placeitem ' + drop[0] + ',' + drop[1] + ',' + drop[2] + ' "' + name + '"', true));
      steps.push({ stepId: id('down'), wait: { textEquals: { text: CARRY_HELD, value: 'FALSE' } }, limitMs: 180000, onTimeout: 'fail' });
      steps.push(raw('cam', 'OgreBotAPI.Client:ResetCamera[{{me}}]'));
    }
    return put(doc, at, steps, sel, 'Carry ' + name + ', put it down at height ' + drop[1]);
  };
  N.carryParts = function (doc, step) {
    var L = isArr(doc.steps) ? doc.steps : [], m = /^(.*\.carry\d*)(\.|$)/.exec(str(isObj(step) ? step.stepId : '')), i, at = -1, n = 0, last = -1;
    if (!m) return null;
    for (i = 0; i < L.length; i++) if (isObj(L[i]) && str(L[i].stepId).indexOf(m[1] + '.') === 0) { if (at < 0) at = i; last = i; n++; }
    if (at < 0) return null;
    var out = { base: m[1], at: at, n: n, whole: last - at + 1 === n, form: 'native', object: '', legs: [], drop: null, walk: null, place: null, pitchKey: '', pitch: null };
    for (i = at; i <= last; i++) {
      if (!isObj(L[i]) || str(L[i].stepId).indexOf(m[1] + '.') !== 0) continue;
      var s = L[i], c = str(s.command), v = /ApplyVerb\[[^,\]]*,\s*"([^"]+)"/.exec(c), p = PLACE_RE.exec(c), o1 = /\{\{ic\.zone\.options\.([A-Za-z0-9_]+)\}\}/.exec(c);
      if (v) out.object = v[1];
      if (s['do'] === 'path' && isArr(s.spots)) { out.walk = s; out.legs = s.spots.slice(); }
      if (p) { out.form = 'jb'; out.place = s; out.drop = [+p[2], +p[3], +p[4]]; }
      if (o1) out.pitchKey = o1[1];
    }
    if (out.form === 'native' && out.legs.length) out.drop = out.legs.pop();
    if (out.pitchKey && isObj(doc.options) && doc.options[out.pitchKey] !== undefined) out.pitch = doc.options[out.pitchKey];
    return out.drop && out.object ? out : null;
  };
  N.carrySwitch = function (doc, c, form) {
    if (!c.whole) return null;
    var kept = notesOf(doc.steps.slice(c.at, c.at + c.n));
    doc.steps.splice(c.at, c.n);
    return notesBack(doc, N.carry(doc, c.at, c.object, { form: form, legs: c.legs, drop: c.drop, pitch: c.pitch, pitchKey: c.pitchKey }), kept);
  };
  N.carryHeight = function (c, y) {
    if (c.place) { var m = PLACE_RE.exec(str(c.place.command)); if (!m) return false; c.place.command = m[1] + m[2] + ',' + r6(y) + ',' + m[4] + m[5]; return true; }
    if (c.walk && isArr(c.walk.spots) && c.walk.spots.length) { c.walk.spots[c.walk.spots.length - 1][1] = r6(y); return true; }
    return false;
  };

  N.teleporter = function (doc, at, name, pad, landing) {
    var ids = N.ids(doc), base = N.section(doc, at), steps = [], tele = { stepId: uniq(ids, base + '.teleporter'), 'do': 'teleporter', name: str(name) }, sel = 0;
    if (pad) { steps.push({ stepId: uniq(ids, base + '.toTeleporter'), 'do': 'path', using: 'nav', spots: [pt3(pad)] }); sel = 1; }
    if (landing) tele.landing = pt3(landing);
    steps.push(tele);
    N.setRerun(doc, true);
    return put(doc, at, steps, sel, 'Take the teleporter ' + str(name));
  };

  function doneLine(doc) {
    var L = isArr(doc.steps) ? doc.steps : [], parts = [], i;
    for (i = 0; i < L.length; i++) if (isObj(L[i]) && namedNo(L[i].stepId)) parts.push('{{ic.run.verdicts.' + str(L[i].stepId) + '}}');
    return shortZone(doc) + ': done - ' + parts.join(' / ');
  }
  N.exit = function (doc, door) {
    if (!isArr(doc.steps)) doc.steps = [];
    var ids = N.ids(doc), steps = [], at = doc.steps.length, have = false, i;
    for (i = 0; i < doc.steps.length; i++) if (isObj(doc.steps[i]) && doc.steps[i].stepId === 'done.said') have = true;
    if (!have && maxNamed(doc)) steps.push({ stepId: uniq(ids, 'done.said'), 'do': 'announce', message: doneLine(doc) });
    if (door && door.name) {
      if (door.x != null) steps.push({ stepId: uniq(ids, 'exit.walk'), 'do': 'path', using: 'nav', spots: [N.spot(door.x, door.y, door.z)] });
      steps.push({ stepId: uniq(ids, 'exit.door'), 'do': 'zoneOut', op: 'door', name: str(door.name) });
    } else steps.push({ stepId: uniq(ids, 'exit'), 'do': 'zoneOut', op: 'auto' });
    return put(doc, at, steps, steps.length - 1, door && door.name ? 'Leaves by ' + door.name : 'Leaves by the nearest exit');
  };
  N.beforeKey = function (o, key, val, before) {
    if (Object.prototype.hasOwnProperty.call(o, key) || !Object.prototype.hasOwnProperty.call(o, before)) { o[key] = val; return o; }
    var ks = Object.keys(o), keep = {}, i;
    for (i = 0; i < ks.length; i++) { keep[ks[i]] = o[ks[i]]; delete o[ks[i]]; }
    for (i = 0; i < ks.length; i++) { if (ks[i] === before) o[key] = val; o[ks[i]] = keep[ks[i]]; }
    return o;
  };
  N.setEntrance = function (doc, x, y, z, tolerance) {
    if (isObj(doc.entrance)) {
      var L = doc.entrance.loc;
      if (isArr(L) && L.length >= 3) { L[0] = r6(+x); L[1] = r6(+y); L[2] = r6(+z); } else doc.entrance.loc = N.spot(x, y, z);
      if (tolerance != null) doc.entrance.tolerance = rad(tolerance);
    } else N.beforeKey(doc, 'entrance', { loc: N.spot(x, y, z), tolerance: tolerance != null ? rad(tolerance) : 10 }, 'steps');
    return { msg: 'The entrance' };
  };
  N.setRerun = function (doc, on) { if (on) N.beforeKey(doc, 'rerunWholeZoneAfterWipe', true, 'steps'); else delete doc.rerunWholeZoneAfterWipe; };

  N.hold = function (doc, at, p) {
    var ids = N.ids(doc), q = pt3(p), s = { stepId: uniq(ids, N.section(doc, at) + '.hold'), 'do': 'campSpot', op: 'setLoc', x: q[0], y: q[1], z: q[2], sendTo: WHO };
    return put(doc, at, [s], 0, 'The group holds this spot, until a Let go');
  };
  N.release = function (doc, at) {
    var ids = N.ids(doc), s = { stepId: uniq(ids, N.section(doc, at) + '.hold.off'), 'do': 'campSpot', op: 'release', sendTo: WHO };
    return put(doc, at, [s], 0, 'Let go of the camp spot');
  };

  function q1(name) { return str(name).replace(/"/g, ''); }
  N.countQuery = function (name, within) { return 'Name == "' + q1(name) + '"' + (within ? ' && Distance < ' + rad(within) : ''); };
  N.waitUntil = function (doc, at, name, within, how, limitMs) {
    var ids = N.ids(doc), gone = how === 'gone';
    var s = { stepId: uniq(ids, N.section(doc, at) + (gone ? '.gone' : '.up')), wait: { count: { of: 'actors', find: { query: N.countQuery(name, within) }, compare: gone ? '==' : '>=', value: gone ? 0 : 1 } }, limitMs: limitMs || 60000, onTimeout: 'proceed' };
    return put(doc, at, [s], 0, 'Wait until ' + str(name) + (gone ? ' is gone' : ' is here'));
  };
  N.waitFight = function (doc, at) {
    var ids = N.ids(doc);
    return put(doc, at, [{ stepId: uniq(ids, N.section(doc, at) + '.fights'), 'do': 'waitForCombat' }], 0, 'Wait for the fight to end');
  };
  N.pause = function (doc, at, ms) {
    var ids = N.ids(doc);
    return put(doc, at, [{ stepId: uniq(ids, N.section(doc, at) + '.settle'), wait: 'ms', limitMs: ms || 5000, onTimeout: 'proceed' }], 0, 'A pause');
  };

  N.hunt = function (doc, at, name, until, line, pts) {
    var ids = N.ids(doc), s = { stepId: uniq(ids, N.section(doc, at) + '.hunt'), 'do': 'hunt', name: str(name), until: str(until) }, i;
    if (line) s.untilLine = str(line);
    s.spots = [];
    for (i = 0; i < pts.length; i++) s.spots.push(pt3(pts[i]));
    return put(doc, at, [s], 0, 'Hunt ' + str(name) + ' until ' + str(until) + ' shows');
  };

  N.nearCond = function (name, within, p) { return { actorNear: { find: { query: 'Name == "' + q1(name) + '"' }, within: rad(within || 50), ofLoc: pt3(p) } }; };
  N.onlyIfNear = function (step, name, within, p) {
    var c = [N.nearCond(name, within, p)];
    if (Object.prototype.hasOwnProperty.call(step, 'when')) { step.when = c; return step; }
    var after = Object.keys(step)[0] === 'stepId' ? Object.keys(step)[1] : Object.keys(step)[0];
    return N.beforeKey(step, 'when', c, after);
  };
  N.twin = function (doc, i) {
    var L = doc.steps, s = L && L[i];
    if (!isObj(s) || !s.when) return null;
    var ids = N.ids(doc), c = JSON.parse(JSON.stringify(s));
    c.stepId = uniq(ids, str(s.stepId) + '.else');
    c.when = [{ not: JSON.parse(JSON.stringify(s.when)) }];
    return put(doc, i + 1, [c], 0, 'Its other side: runs when the first does not');
  };

  function follow(doc, pa) { var o = doc; for (var i = 0; i < pa.length; i++) { o = o == null ? o : o[pa[i]]; } return o; }
  N.setPoint = function (doc, pt, x, z, y) {
    var s = follow(doc, pt.pa), a = null;
    if (!isObj(s)) return false;
    if (pt.f === 'xyz') { s.x = r6(x); s.z = r6(z); if (y != null) s.y = r6(y); return true; }
    if (pt.f === 'cmd') { var cm = PLACE_RE.exec(str(s.command)); if (!cm) return false; s.command = cm[1] + r6(x) + ',' + (y != null ? r6(y) : cm[3]) + ',' + r6(z) + cm[5]; return true; }
    a = pt.j >= 0 ? (isArr(s[pt.f]) ? s[pt.f][pt.j] : null) : s[pt.f];
    if (!isArr(a) || a.length < 3) return false;
    a[0] = r6(x); a[2] = r6(z);
    if (y != null) a[1] = r6(y);
    return true;
  };
  N.setRing = function (doc, ring, value) {
    var v = rad(value), s = follow(doc, ring.pa);
    if (!isObj(s)) return false;
    if (ring.rk === 'tolerance') { s.tolerance = v; return true; }
    if (ring.rk === 'killWithin') { s.killWithin = Math.min(v, N.KILL_MAX); return true; }
    if (ring.rk === 'query') {
      var c = s.wait && s.wait.count, fd = c && c.find;
      if (!fd || !/Distance\s*<=?\s*\d/.test(str(fd.query))) return false;
      fd.query = str(fd.query).replace(/(Distance\s*<=?\s*)\d+(\.\d+)?/, '$1' + v);
      return true;
    }
    if (ring.rk === 'within' && ring.k === 'near') {
      var L = isArr(doc.steps) ? doc.steps : [], i;
      var fix = function (w) {
        var list = isArr(w) ? w : (w ? [w] : []);
        for (var k = 0; k < list.length; k++) {
          if (!isObj(list[k])) continue;
          var an = list[k].actorNear;
          if (isObj(an) && isArr(an.ofLoc) && +an.ofLoc[0] === ring.x && +an.ofLoc[2] === ring.z) an.within = v;
          if (list[k].not !== undefined) fix(list[k].not);
        }
      };
      for (i = 0; i < L.length; i++) if (isObj(L[i]) && L[i].when) fix(L[i].when);
      return true;
    }
    s[ring.rk] = v;
    var f = N.fightParts(doc, s);
    if (f && f.scan && ring.rk === 'radius') f.scan.radius = v;
    return true;
  };

  N.tidySaid = function (doc) {
    var L = isArr(doc.steps) ? doc.steps : [], list = [], all = [], i;
    for (i = 0; i < L.length; i++) if (isObj(L[i]) && L[i]['do'] === 'named' && namedNo(L[i].stepId)) { all.push(str(L[i].stepId)); if (L[i].when === undefined) list.push(str(L[i].stepId)); }
    for (i = 0; i < L.length; i++) {
      var s = L[i];
      if (!isObj(s) || s['do'] !== 'announce' || typeof s.message !== 'string') continue;
      var id = str(s.stepId).replace(/\.said$/, ''), at = list.indexOf(id);
      if (at >= 0 && /\.said$/.test(str(s.stepId))) {
        var m = s.message.replace(/^(.*?) \d+\/\d+: /, '$1 ' + (at + 1) + '/' + list.length + ': ');
        if (m !== s.message) s.message = m;
      } else if (s.stepId === 'done.said' && /: done - (\{\{ic\.run\.verdicts\.[^}]+\}\}( \/ )?)*$/.test(s.message)) {
        var was = (s.message.match(/\{\{ic\.run\.verdicts\.[^}]+\}\}/g) || []).map(function (x) { return x.slice(18, -2); });
        var now = list.slice();
        was.forEach(function (x) { if (now.indexOf(x) < 0 && all.indexOf(x) >= 0) now.push(x); });
        var d = s.message.slice(0, s.message.indexOf(': done - ')) + ': done - ' + now.map(function (x) { return '{{ic.run.verdicts.' + x + '}}'; }).join(' / ');
        if (d !== s.message) s.message = d;
      }
    }
  };

  var JB_SKIP = { COMMENT: 1, WIPE_RECOVERY: 1, IC_SETUP: 1, SETUP: 1, SETUP_CLASS: 1, STARTUP: 1, SHUTDOWN: 1, ZONERESETALL: 1, WAITZONE: 1, ZONEDOOR: 1, SAMEZONECHECK: 1, WAITRESET: 1, WAITGROUP: 1, NONE: 1, SCOUTS_IN: 1, SCOUTS_OUT: 1, WAITPOWER: 1, LOOTMETHOD: 1 };
  N.fromJb = function (j) {
    var z = str(j.base_zone || j.zone), diff = str(j.difficulty).toLowerCase(), tag = /\[[^\]]*\]\s*$/.exec(z), doc, L = isArr(j.steps) ? j.steps : isArr(j.sequence) ? j.sequence : [];
    z = z.replace(/\s*\[[^\]]*\]\s*$/, '');
    var v = tag ? [tag[0].replace(/\s+$/, '')] : diff === 'heroic' ? ['[Heroic]'] : diff === 'solo' ? ['[Solo]'] : diff === 'raid' ? ['[Raid]'] : [];
    doc = { zone: z, variants: v, expansion: str(j.expansion), author: str(j.author), progression: 'open', steps: [] };
    var cant = {}, skip = 0, walks = 0, kills = 0, others = 0, lastWalk = -1, out = false, i, at;
    var num3 = function (s) { var m = /^\s*(-?[\d.]+)[\s,]+(-?[\d.]+)[\s,]+(-?[\d.]+)/.exec(str(s)); return m ? [+m[1], +m[2], +m[3]] : null; };
    for (i = 0; i < L.length; i++) {
      var e = L[i], t = isObj(e) ? str(e.type).toUpperCase() : '', d = isObj(e) ? str(e.data) : '', p;
      if (!t) continue;
      at = doc.steps.length;
      if (t === 'WAYPOINT' && (p = num3(d))) {
        if (lastWalk === at - 1 && lastWalk >= 0) doc.steps[lastWalk].spots.push(pt3(p));
        else { N.move(doc, at, [p]); lastWalk = at; }
        walks++;
        continue;
      }
      if (t === 'COMBAT' && (d || e.target)) { N.kill(doc, at, d || str(e.target), null, {}); kills++; continue; }
      if (t === 'CHEST') { if (!/\.said$/.test(str(doc.steps[at - 1] && doc.steps[at - 1].stepId))) { put(doc, at, [{ stepId: uniq(N.ids(doc), N.section(doc, at) + '.chest'), 'do': 'loot', op: 'chest' }], 0, ''); others++; } continue; }
      if (t === 'CAMPSPOT' && (p = num3(d))) { N.hold(doc, at, p); others++; continue; }
      if (t === 'CLEARAREA') { var rr = parseFloat(e.radius); put(doc, at, [{ stepId: uniq(N.ids(doc), N.section(doc, at) + '.clear'), 'do': 'trash', radius: isFinite(rr) ? rad(rr) : 30, whenEmpty: 'done' }], 0, ''); others++; if (d && d !== '__hostiles__') cant['a clear that was for one kind of mob now clears everything'] = 1; continue; }
      if (t === 'CLICK') { N.use(doc, at, e.verb ? 'verb' : 'doubleClick', d, { verb: e.verb }); others++; continue; }
      if (t === 'DOUBLECLICK') { N.use(doc, at, 'doubleClick', d); others++; continue; }
      if (t === 'APPLYVERB') { var vb = d.split('|'); N.use(doc, at, 'verb', vb[0], { verb: vb[1] || 'use' }); others++; continue; }
      if (t === 'HAIL' || t === 'TALK') { N.use(doc, at, 'hail', d || str(e.target)); others++; continue; }
      if (t === 'WAIT' && parseFloat(d) > 0) { N.pause(doc, at, Math.round(parseFloat(d) * 1000)); others++; continue; }
      if (t === 'WAITCOMBAT' || t === 'WAITFORCOMBAT') { N.waitFight(doc, at); others++; continue; }
      if (t === 'WAITSCRIPT' && /^JB_ItemPlace\b/.test(d)) continue;
      if (t === 'SCRIPT' && /^JB_ItemPlace\|/.test(d)) {
        var jp = d.split('|'), sec = N.section(doc, at), rw = function (x, cmd, fail) { var s1 = { stepId: uniq(N.ids(doc), sec + '.carry.' + x), 'do': 'raw', command: cmd }; if (fail) s1.onFail = 'fail'; put(doc, doc.steps.length, [s1], 0, ''); };
        var hold1 = function (x, v, ms) { put(doc, doc.steps.length, [{ stepId: uniq(N.ids(doc), sec + '.carry.' + x), wait: { textEquals: { text: CARRY_HELD, value: v } }, limitMs: ms, onTimeout: 'fail' }], 0, ''); };
        if (jp[1] === 'pickup' && jp[2]) { rw('aim', 'OgreBotAPI.Client:SetMousePositionMiddle[{{me}}]'); rw('pick', 'OgreBotAPI.Actors:ApplyVerb[{{me}},"' + jp[2] + '","Move"]', true); hold1('held', 'TRUE', 6000); others++; continue; }
        if (jp[1] === 'spot' && jp[3] && num3(jp[3])) { rw('place', 'jb placeitem ' + jp[3] + ' "' + jp[2] + '"', true); hold1('down', 'FALSE', 180000); others++; continue; }
        if (jp[1] === 'fixview') { rw('cam', 'OgreBotAPI.Client:ResetCamera[{{me}}]'); others++; continue; }
      }
      if (t === 'EVAC' || t === 'ZONEOUT') { out = true; continue; }
      if (JB_SKIP[t]) { skip++; continue; }
      cant[t] = (cant[t] || 0) + 1;
    }
    N.exit(doc, null);
    var bad = [], k;
    for (k in cant) if (Object.prototype.hasOwnProperty.call(cant, k)) bad.push(/[a-z]/.test(k) ? k : cant[k] + ' ' + k);
    var words = ['This file stays as it is: the copy is new and not saved.', 'Carried: ' + walks + ' spot' + (walks === 1 ? '' : 's') + ' (now walks on the mesh), ' + kills + ' fight' + (kills === 1 ? '' : 's') + ', ' + others + ' other step' + (others === 1 ? '' : 's') + '.'];
    if (skip) words.push('Left to OgreBot: ' + skip + ' set-up and zone-in step' + (skip === 1 ? '' : 's') + ' (its IC does those itself).');
    if (bad.length) words.push('Could not carry, so not in the copy: ' + bad.join(', ') + '.');
    words.push(out ? 'It leaves by the nearest exit, in place of the evac.' : 'It leaves by the nearest exit: pick its door under Exit and entrance.');
    words.push('No entrance yet: set it under Exit and entrance.');
    return { doc: doc, words: words, carried: walks + kills + others, cant: cant };
  };

  var VERBS = 'abilities|abilityTracker|actorInteract|announce|assist|autotarget|beltAdorn|botPause|broadcast|camera|campSpot|cancelMaintained|castAbility|castInterrupt|castStack|choiceWindow|cures|curses|dispel|examine|fireEvent|flagToon|gameCommand|groupQuery|heroicOpportunity|hunt|inventory|joust|loot|merchant|method|move|movement|named|noDefensive|noOffensive|ogreBotUIOption|onScreenTimer|path|pet|progress|raw|recover|replyDialog|report|repositionOnCondition|resolve|reward|rosterOrder|rotate|runscript|script|setVar|stop|stopEvaluating|teleporter|template|threatIgnoreList|timer|trash|tts|useItem|waitForCombat|waitForLoot|waypoint|zoneDoorWindow|zoneOut';
  var CONDS = 'abilityReady|actorCoord|actorIs|actorNear|actorPresent|actorTarget|afflicted|and|assistInControl|atCampSpot|botPaused|campSpotRelative|campSpotValid|chatMatch|collision|count|csp|cureCalled|curePotionReady|detTimeLeft|dispelItemReady|dispelReady|distance|engaged|flag|forwho|groupDistance|hasAbility|hasDet|hasItem|heroicOpportunity|inCombat|inMyGroup|itemReady|jumpRoute|lootWindow|maintained|mobHealthPct|moveFinished|myStat|namedCasting|nearSpot|not|option|or|questStep|raidSlot|replyDialog|rewardWindow|roster|ruleState|selfCasting|textContains|textEquals|threatToMe|timerExpired|timerLeft|toonFlagged|untoldTier|varCompare|varEquals|zone|zoneDoorWindow';
  function inBar(bar, w) { return ('|' + bar + '|').indexOf('|' + w + '|') >= 0; }
  function nearIn(bar, w) {
    var L = bar.split('|'), lw = str(w).toLowerCase(), i;
    for (i = 0; i < L.length; i++) {
      var c = L[i].toLowerCase(), k = 0;
      if (c === lw) return L[i];
      while (k < c.length && k < lw.length && c.charAt(k) === lw.charAt(k)) k++;
      var a = c.slice(k), b = lw.slice(k);
      if (c.length >= 3 && ((a.length === b.length && a.length >= 1 && a.slice(1) === b.slice(1)) || (a.length + 1 === b.length && a === b.slice(1)) || (b.length + 1 === a.length && b === a.slice(1)) ||
        (a.length === b.length && a.length >= 2 && a.charAt(0) === b.charAt(1) && a.charAt(1) === b.charAt(0) && a.slice(2) === b.slice(2)))) return L[i];
    }
    return '';
  }
  function condNames(c, out) {
    if (isArr(c)) { for (var i = 0; i < c.length; i++) condNames(c[i], out); return out; }
    if (!isObj(c)) return out;
    for (var k in c) if (Object.prototype.hasOwnProperty.call(c, k) && k.charAt(0) !== '_') {
      out.push(k);
      if (k === 'not' || k === 'or' || k === 'and') condNames(c[k], out);
    }
    return out;
  }
  N.problems = function (doc) {
    var out = [], ids = {}, hasOut = false, nameds = [], teleporters = 0, spawnWaits = 0;
    var say = function (level, r, t, fix) { var o = { level: level, r: r, t: t }; if (fix) o.fix = fix; out.push(o); };
    function conds(c, r) {
      var L = condNames(c, []), i;
      for (i = 0; i < L.length; i++) if (!inBar(CONDS, L[i])) {
        var n = nearIn(CONDS, L[i]);
        say('warn', r, '"' + L[i] + '" is not a condition OgreBot has, and its reload does not catch that: the step would never see it true.' + (n ? ' Did you mean ' + n + '?' : ''));
      }
    }
    function walk(L, top) {
      for (var i = 0; isArr(L) && i < L.length; i++) {
        var s = L[i], r = top == null ? i : top;
        if (!isObj(s)) continue;
        var id = str(s.stepId), d = str(s['do']);
        if (id) { if (ids[id]) say('warn', r, 'Two steps are called ' + id + ', and OgreBot\'s reload does not catch that: results and resume go by that name, so give each its own.'); ids[id] = 1; }
        if (d === 'zoneOut') hasOut = true;
        if (d === 'named') { nameds.push(s); if (!id) say('warn', r, 'This named has no stepId: it cannot be remembered as done.'); if (s.spawnWaitMs > 0) spawnWaits++; }
        if (d === 'teleporter') teleporters++;
        if (d && !inBar(VERBS, d)) { var nv = nearIn(VERBS, d); say('warn', r, 'OgreBot has no action "' + d + '": it would refuse the file.' + (nv ? ' Did you mean ' + nv + '?' : '')); }
        if (s.when !== undefined) conds(s.when, r);
        if (s.wait !== undefined && typeof s.wait !== 'string') conds(s.wait, r);
        if (isObj(s.repeat) && s.repeat.until !== undefined) conds(s.repeat.until, r);
        if (s.wait !== undefined && (s.limitMs === undefined || s.onTimeout === undefined)) say('bad', r, 'A wait needs its longest time and what happens then.');
        if (d === 'raw' && PLACE_RE.test(str(s.command))) say('warn', r, 'This step needs ISXJQB loaded (jb placeitem). For a file that must run without it, untick "ISXJQB puts it down" in its Carry and place box.');
        if (d === 'raw') { var oq = /\{\{ic\.zone\.options\.([A-Za-z0-9_]+)\}\}/.exec(str(s.command)); if (oq && !(isObj(doc.options) && doc.options[oq[1]] !== undefined)) say('warn', r, 'It reads the zone option ' + oq[1] + ', and the file has none: it would read empty.'); }
        if (d === 'path' && s.using !== 'nav' && s.using !== 'campspot') say('bad', r, 'A move must say nav or camp spot.');
        if (d === 'path' && (!isArr(s.spots) || !s.spots.length)) say('bad', r, 'A move needs at least one spot.');
        if (d === 'path' && (s.killTypes !== undefined || s.killLimitMs !== undefined) && s.killWithin === undefined) say('warn', r, 'killTypes and killLimitMs do nothing without killWithin: the walk stops for nothing.');
        if (d === 'path' && s.killWithin !== undefined) {
          if (+s.killWithin > N.KILL_MAX) say('warn', r, 'killWithin goes up to ' + N.KILL_MAX + ' m: OgreBot clamps it.');
          if (s.using === 'campspot') say('warn', r, 'killWithin on a camp-spot walk has not been tested: nav is what its docs show.');
          if (isArr(s.killTypes)) for (var kt = 0; kt < s.killTypes.length; kt++) if (s.killTypes[kt] !== 'NPC' && s.killTypes[kt] !== 'NamedNPC' && s.killTypes[kt] !== 'Special') say('warn', r, 'killTypes takes NPC, NamedNPC or Special exactly: OgreBot drops "' + str(s.killTypes[kt]) + '".');
        }
        if (d === 'trash' && s.quietMs !== undefined && s.whenEmpty !== 'wait') say('bad', r, 'quietMs goes only with "when the circle is empty: wait for more": OgreBot refuses it otherwise.');
        if (d === 'teleporter' && s.walkOnto !== undefined && (s.name !== undefined || s.landing === undefined)) say('bad', r, 'A walk-on teleporter takes walkOnto and landing, and no name.');
        if (isArr(s.steps)) walk(s.steps, r);
      }
    }
    if (isObj(doc.run)) return out;
    if (isArr(doc.variants)) {
      var seenV = {};
      for (var v = 0; v < doc.variants.length; v++) {
        var vv = str(doc.variants[v]);
        if (vv.toLowerCase() === 'all') say('bad', -1, '"all" is not a variant: name every variant this file covers, or [] for a zone with no difficulty in its name.');
        else if (!vv) say('bad', -1, 'A variant is empty: use [] for a zone with no difficulty in its name.');
        else if (seenV[vv]) say('bad', -1, 'The variants list ' + vv + ' twice.');
        seenV[vv] = 1;
      }
    }
    walk(doc.enter, -1); walk(doc.steps, null); walk(doc.exit, -1);
    if (!hasOut) say('bad', -1, 'No way out yet: OgreBot lists a file with no exit step in red and will not queue it. Add Exit and entrance.');
    if (nameds.length && !(isObj(doc.entrance) && isArr(doc.entrance.loc))) say('warn', -1, 'No entrance: OgreBot warns too, its automatic wipe recovery degrades to revive-and-walk. Set it under Exit and entrance.');
    if (spawnWaits && doc.progression !== 'open') say('warn', -1, 'A named here waits to spawn, and this file says progression sequential: a part-way start or a wipe could skip a named. "Getting open wrong costs a walk. Getting sequential wrong skips a named."', 'open');
    if (teleporters && doc.rerunWholeZoneAfterWipe !== true) say('warn', -1, 'This zone has a teleporter: after a wipe recovery only rerunWholeZoneAfterWipe runs the file again from the top, teleporters too. Every shipped file with one says it.', 'rerun');
    if (nameds.length) {
      var anyBoss = false;
      for (var q = 0; q < nameds.length; q++) if (nameds[q].boss === true) anyBoss = true;
      if (!anyBoss) say('warn', -1, 'No named is marked boss: "Skip the boss" and the boss chest options read it. Tick The zone\'s boss on the last one.');
    }
    return out;
  };
  N.fixProblem = function (doc, fix) {
    if (fix === 'open') { doc.progression = 'open'; return true; }
    if (fix === 'rerun') { N.setRerun(doc, true); return true; }
    return false;
  };
})(typeof window !== 'undefined' ? window : this);
