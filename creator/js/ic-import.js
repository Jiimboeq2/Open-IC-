/* Open IC Creator - ic-import.js
   Import (IC.imp): parts of a native zone file or another instance file brought into the open file, native zone
   steps converted to ISXJQB steps, and plain words for zone steps.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var X = IC.imp = IC.imp || {};
  function str(v) { return v == null ? '' : String(v); }
  function isArr(v) { return Object.prototype.toString.call(v) === '[object Array]'; }
  function isObj(v) { return v != null && typeof v === 'object' && !isArr(v); }
  function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
  function R() { return IC.reg; }
  function Wd() { return IC.words; }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : d; }
  function secs(ms) { var s = Math.floor((num(ms, 0) + 999) / 1000); return s < 1 ? 1 : s; }
  function waitSecs(ms) { return String(Number((num(ms, 0) / 1000).toFixed(3))); }
  function n6(v) { return Number((+v).toFixed(6)); }
  function spotOf(p) { return isArr(p) && p.length >= 3 && isFinite(+p[0]) && isFinite(+p[1]) && isFinite(+p[2]) && typeof p[0] !== 'boolean' ? [+p[0], +p[1], +p[2]] : null; }
  function spotText(p) { return n6(p[0]) + ',' + n6(p[1]) + ',' + n6(p[2]); }
  function Q(s) { return '"' + str(s).replace(/"/g, '') + '"'; }
  function cut(s, n) { s = str(s); return s.length > n ? s.slice(0, n - 1) + '...' : s; }
  X.headOf = function (id) { return str(id).split('.')[0]; };
  X.LISTS = ['enter', 'steps', 'exit'];
  X.isZoneFile = function (doc) {
    if (!isObj(doc)) return false;
    if (isArr(doc.variants) || isObj(doc.entrance) || has(doc, 'progression') || isArr(doc.enter) || isArr(doc.exit)) return true;
    var list = isArr(doc.steps) ? doc.steps : [];
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (isObj(s)) return !has(s, 'type') && !has(s, 'template') && (has(s, 'stepId') || has(s, 'do') || has(s, 'wait') || has(s, 'repeat') || has(s, 'forEach'));
    }
    return false;
  };

  X.subst = function (t) {
    return str(t).replace(/\{\{\s*([^}]*?)\s*\}\}/g, function (x, inner) {
      if (inner === 'me') return '${Me.Name}';
      if (inner.indexOf('seq.') === 0) return '${JBV_' + inner.slice(4).replace(/[^A-Za-z0-9_]/g, '_') + '}';
      return x;
    });
  };

  X.count = function (steps) {
    var n = 0;
    (function walk(L) { for (var i = 0; isArr(L) && i < L.length; i++) { n++; if (isObj(L[i]) && isArr(L[i].steps)) walk(L[i].steps); } })(steps);
    return n;
  };

  function headWords(h) {
    var m = /^([A-Za-z]+?)(\d+)$/.exec(h), w = m ? m[1] + ' ' + m[2] : h;
    return w.charAt(0).toUpperCase() + w.slice(1).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  }
  function zonePartTitle(h, L, from, to) {
    var m = /^named(\d+)$/.exec(h);
    if (m) {
      for (var i = from; i <= to; i++) if (L[i] && L[i]['do'] === 'named' && str(L[i].stepId) === h)
        return 'Named ' + m[1] + ': ' + str(L[i].name) + (L[i].boss ? ' (the last boss)' : '');
      return 'Named ' + m[1];
    }
    if (h === 'exit') return 'The way out';
    if (h === 'done') return 'The end: say how it went';
    if (h === 'start') return 'The start';
    if (!h) return 'Steps with no name';
    return headWords(h);
  }
  function kindOf(h) { return /^named\d+$/.test(h) ? 'named' : (h === 'exit' ? 'exit' : (h === 'start' ? 'start' : 'other')); }
  X.partsOf = function (doc, kind) {
    var out = [];
    if (kind === 'jqb') {
      var L = (doc && (isArr(doc.steps) ? doc.steps : (isArr(doc) ? doc : null))) || [];
      var secs = IC.icflow && IC.icflow.sections ? IC.icflow.sections(L) : [{ kind: 'setup', label: 'All steps', start: 0, end: L.length - 1 }];
      for (var s = 0; s < secs.length; s++) {
        var S = secs[s], part = L.slice(S.start, S.end + 1);
        out.push({ key: 'S' + s, list: 'steps', from: S.start, to: S.end, kind: S.kind === 'boss' ? 'named' : (S.kind === 'exit' ? 'exit' : 'start'),
          title: S.label, count: part.length, steps: part });
      }
      return out;
    }
    for (var li = 0; li < X.LISTS.length; li++) {
      var lk = X.LISTS[li], Z = doc && doc[lk];
      if (!isArr(Z) || !Z.length) continue;
      if (lk !== 'steps') {
        out.push({ key: lk, list: lk, from: 0, to: Z.length - 1, head: lk, kind: lk === 'enter' ? 'start' : 'exit',
          title: lk === 'enter' ? 'Zone-in steps (the enter list)' : 'The way out (the exit list)', count: X.count(Z), steps: Z });
        continue;
      }
      var i = 0;
      while (i < Z.length) {
        var h = X.headOf(Z[i] && Z[i].stepId), j = i;
        while (j + 1 < Z.length && (X.headOf(Z[j + 1] && Z[j + 1].stepId) === h || !(Z[j + 1] && Z[j + 1].stepId))) j++;
        var p = Z.slice(i, j + 1);
        out.push({ key: 'steps:' + i, list: 'steps', from: i, to: j, head: h, kind: kindOf(h), title: zonePartTitle(h, Z, i, j), count: X.count(p), steps: p });
        i = j + 1;
      }
    }
    return out;
  };

  var KEYWORDS = { groupWithin: 'how close the group stays', spotLimitMs: 'the time limit at each spot', onSpotTimeout: 'what a slow spot does',
    fly: 'flying', waitForStragglers: 'waiting for stragglers', throttleMs: 'how often it may run', findLimitMs: 'how long it looks for the exit',
    zoneLimitMs: 'how long the zoning may take', groupLimitMs: 'how long it waits for the group', noProgressMs: 'the no-progress time',
    onNoProgress: 'what no progress does', aliases: 'other names', preCastTagMs: 'the pre-cast time' };
  function keyWords(k) { return KEYWORDS[k] || ('the "' + k + '" setting'); }
  function nameOfId(id, c) {
    if (c.named[id]) return c.named[id][0];
    if (c.loot[id]) return c.loot[id] === 'shinies' ? 'the shinies' : 'the chest';
    var m = /^named(\d+)$/.exec(id);
    return m ? 'named ' + m[1] : 'that step';
  }
  function msgWords(m, c) {
    var s = str(m).replace(/\{\{\s*ic\.run\.verdicts\.([^}\s]+)\s*\}\}/g, function (x, id) { return 'how ' + nameOfId(id, c) + ' went'; })
      .replace(/\{\{\s*me\s*\}\}/g, 'my name');
    s = Wd() && Wd().val ? Wd().val(s) : s.replace(/\{\{[^}]*\}\}/g, 'a value');
    return s.replace(/\{\{|\}\}|\$\{/g, '');
  }
  function condWords(c) { return IC.pack && IC.pack.nativeCondText ? IC.pack.nativeCondText(JSON.stringify(isArr(c) ? c : [c])) : 'a check'; }
  X.zoneWords = function (st, c) {
    c = c || { named: {}, loot: {} };
    if (!isObj(st)) return 'A step that is not one object';
    var w = zw(st, c);
    return /\{\{|\$\{/.test(w) ? msgWords(w, c) : w;
  };
  function zw(st, c) {
    var d = str(st['do']), op = str(st.op), n = (isArr(st.spots) ? st.spots.length : 0);
    if (has(st, 'repeat')) return 'Repeat ' + X.count(st.steps) + ' step' + (X.count(st.steps) === 1 ? '' : 's');
    if (has(st, 'forEach')) return 'For each ' + (IC.pack && IC.pack.nativeQueryText ? IC.pack.nativeQueryText(st.forEach && st.forEach.find && (st.forEach.find.query || st.forEach.find.name)) : 'one found');
    if (has(st, 'wait') && !d) {
      if (st.wait === 'ms') return 'Wait ' + (num(st.limitMs, 0) / 1000) + ' s';
      if (st.wait === 'atCampSpot') return 'Wait until I reach my camp spot';
      return 'Wait until ' + condWords(st.wait);
    }
    switch (d) {
      case 'path': return 'Walk along ' + n + ' spot' + (n === 1 ? '' : 's') + (st.using === 'campspot' ? ' (camp spot by camp spot)' : '');
      case 'named': return 'Fight ' + str(st.name);
      case 'loot': return op === 'shinies' ? 'Pick up the shinies' : 'Loot the chest';
      case 'announce': return 'Say: "' + cut(msgWords(st.message, c), 70) + '"';
      case 'teleporter': return 'Take the teleporter ' + (st.name ? str(st.name) : 'pad');
      case 'zoneOut': return op === 'none' ? 'Stay in the zone' : (op === 'auto' ? 'Leave by the nearest exit' : (op === 'endOfZone' ? 'Leave by the exit near the last boss' : 'Leave by ' + str(isArr(st.name) ? st.name[0] : st.name)));
      case 'autotarget': return op === 'addActor' ? 'Auto-target ' + str(st.name) : (op === 'removeActor' ? 'Stop auto-targeting ' + str(st.name) : (op === 'clear' ? 'Clear the auto-target list' : 'Auto-target settings'));
      case 'actorInteract': return op === 'target' ? 'Target ' + str(st.name || st.id) : (op === 'verb' ? 'Use "' + str(st.verb) + '" on ' + str(st.name) : (op === 'hail' ? 'Hail ' + str(st.name) : 'Click ' + str(st.name || st.id)));
      case 'campSpot': return op === 'setLoc' ? 'Move a camp spot' : (op === 'enable' ? 'Turn the camp spot on' : (op === 'release' ? 'Let the group follow again' : 'Clear the camp spots'));
      case 'movement': return op === 'jump' ? 'Jump' : (op === 'setRunMode' ? (str(st.mode).toLowerCase() === 'walk' ? 'Walk' : 'Run') : 'A movement');
      case 'ogreBotUIOption': return Wd() && Wd().optionLine && st.id ? Wd().optionLine(str(st.id), str(st.value).toUpperCase() === 'FALSE' || st.value === false ? 'FALSE' : 'TRUE', st.sendTo || '') : 'An OgreBot option';
      case 'hunt': return 'Hunt ' + str(st.name) + ' until ' + str(st.until) + ' shows up';
      case 'waitForCombat': return 'Wait for the fight to end';
      case 'waitForLoot': return 'Wait for the loot window';
      case 'botPause': return st.value === false ? 'The bots go on' : 'The bots pause';
      case 'useItem': return 'Use ' + str(st.item || st.name);
      case 'castAbility': return 'Cast ' + str(st.ability || st.name);
      case 'raw': { var w = Wd() && Wd().ogre ? Wd().ogre(X.subst(st.command)) : ''; return w || 'A console line'; }
      case 'trash': return 'Clear everything within ' + (st.radius != null ? st.radius : 40) + ' m';
      case 'groupQuery': return 'Ask the group a question';
      case 'progress': return op === 'skip' ? 'Mark a step skipped' : 'Mark a step done';
      case 'recover': return 'Recover after a wipe';
      case 'reward': return 'Pick a reward';
    }
    return d ? 'An OgreBot "' + d + '" step' : 'A step with nothing to do';
  }

  function mk(type, data) { var e = { type: type }; if (data !== undefined) e.data = data; return e; }
  function oc(line) { return mk('OC', 'oc !ci ' + line); }
  function fw(st) { var to = str(st.sendTo); return to ? X.subst(to) : '${Me.Name}'; }
  function tf(v, def) { var b = typeof v === 'boolean' ? v : (v == null ? def : str(v).toUpperCase() === 'TRUE'); return b ? 'TRUE' : 'FALSE'; }
  function exists(q) { return { count: { of: 'actors', find: { query: q }, compare: '>=', value: 1 } }; }
  function anyNamed(names) { return { or: names.map(function (n) { return exists('Name == "' + n + '" && Type != "Corpse"'); }) }; }
  function list1(c, neg) { return JSON.stringify([neg ? { not: [c] } : c]); }
  function query(find) { return isObj(find) ? (str(find.query) || (str(find.name) ? 'Name == "' + str(find.name) + '"' : '')) : ''; }
  var WHO_BACK = { 'igw:{{me}}': 'all', 'igw:{{me}}+fighter': 'tank', 'igw:{{me}}+priest': 'healer', 'igw:{{me}}+mage': 'mage', 'igw:{{me}}+scout': 'scout',
    'igw:{{me}}+notfighter': 'dps', 'igwbn:{{me}}': 'not_me' };
  function extra(st, known, d) {
    var always = { stepId: 1, 'do': 1, when: 1, onFail: 1, _comment: 1, wait: 1, limitMs: 1, onTimeout: 1, repeat: 1, forEach: 1, steps: 1, throttleMs: 1 }, out = [];
    for (var k in st) if (has(st, k) && !always[k] && known.indexOf(k) < 0 && k.charAt(0) !== '_') out.push(keyWords(k));
    if (has(st, 'throttleMs')) out.push(keyWords('throttleMs'));
    if (out.length) d.change(out.join(', ') + ' ' + (out.length === 1 ? 'is' : 'are') + ' not brought over');
  }

  var DO = {};
  DO.path = function (st, d, c, out) {
    extra(st, ['using', 'spots', 'waitForCombat', 'exitOnActorAggro', 'fromStart'], d);
    var spots = (isArr(st.spots) ? st.spots : []).map(spotOf).filter(Boolean), use = str(st.using);
    if (!spots.length) return d.leave('it has no spots');
    var hold = st.waitForCombat === false ? false : true, ex = str(st.exitOnActorAggro), last = spots[spots.length - 1];
    if (isObj(st.waitForCombat)) d.change('its fight-wait settings are read as "stop for fights"');
    if (use === 'nav') {
      var p = mk('NATIVE_PATH', spotText(last));
      p.mode = 'nav'; p.distance = '5';
      p.path_waypoints = spots.map(function (s) { return { x: n6(s[0]), y: n6(s[1]), z: n6(s[2]) }; });
      if (ex) p.target = ex;
      if (!hold) p.action = 'nocombat';
      if (st.fromStart) p.once = 'true';
      out.push(p);
      return;
    }
    if (use !== 'campspot') return d.leave('it walks a way ISXJQB has no step for ("' + use + '")');
    if (!st.fromStart && spots.length > 1) d.change('the group starts at the first spot (OgreBot starts at the spot nearest the group)');
    if (ex) d.change('stopping when ' + ex + ' comes for the group is not brought over');
    for (var i = 0; i < spots.length; i++) { var w = mk('WAYPOINT', spotText(spots[i])); if (!hold) w.mode = 'quick'; out.push(w); }
  };
  DO.named = function (st, d, c, out) {
    extra(st, ['name', 'spot', 'navTo', 'aliases', 'boss', 'spawnWaitMs', 'pullLimitMs', 'scanRadius', 'scanHeight', 'prebuffMs', 'preCastTagMs'], d);
    var name = str(st.name);
    if (!name) return d.leave('it names nobody');
    var aliases = (isArr(st.aliases) ? st.aliases : []).map(str).filter(Boolean), spot = spotOf(st.spot), navTo = !!st.navTo;
    if (num(st.spawnWaitMs, 0) > 0) {
      var w = mk('NATIVE_WAIT', JSON.stringify([anyNamed([name].concat(aliases))]));
      w.timeout = String(secs(st.spawnWaitMs));
      out.push(w);
    }
    var buff = has(st, 'prebuffMs') ? num(st.prebuffMs, 0) : 5000;
    if (!has(st, 'prebuffMs')) d.change('the buff-up before the pull is a 5 s wait while OgreBot buffs');
    if (buff > 0) out.push(mk('WAIT', waitSecs(buff)));
    if (num(st.preCastTagMs, 0) > 0) d.change('the pre-cast time is not brought over (only the buff-up wait)');
    out.push(oc('-AutoTarget_SetScanRadius ${Me.Name} ' + Math.round(num(st.scanRadius, 50))));
    if (has(st, 'scanHeight')) out.push(oc('-AutoTarget_SetScanHeight ${Me.Name} ' + Math.round(num(st.scanHeight, 15))));
    if (spot) { var cs = mk('CAMPSPOT', spotText(spot)); cs.distance = '5'; out.push(cs); }
    else if (navTo) d.change('the group walks to the named and fights it there');
    var pos = !spot && !navTo ? 'here' : '';
    function combat(n) { var e = mk('COMBAT', n); if (pos) e.position = pos; return e; }
    if (!aliases.length) out.push(combat(name));
    else {
      var tail = combat(name);
      for (var a = aliases.length - 1; a >= 0; a--) tail = { type: 'IF', data: '', condition: 'actor_alive', condition_value: aliases[a], sub_steps: [combat(aliases[a])], else_steps: [tail] };
      out.push({ type: 'IF', data: '', condition: 'actor_alive', condition_value: name, sub_steps: [combat(name)], else_steps: [tail] });
    }
    if (has(st, 'pullLimitMs')) d.change('the pull waits up to 60 s and the fight up to 10 min (OgreBot: ' + secs(st.pullLimitMs) + ' s for the pull)');
    if (st.boss) d.change('fought like any named (no Skip-the-boss option in an instance file)');
  };
  DO.loot = function (st, d, c, out) {
    extra(st, ['op', 'boss', 'within'], d);
    var op = str(st.op);
    if (op === 'chest') {
      out.push(mk('CHEST', ''));
      if (has(st, 'within')) d.change('the chest step takes any chest within 100 m');
      if (st.boss) d.change('looted like any chest (no boss-chest option)');
    } else if (op === 'shinies') {
      out.push(oc('-ChangeOgreBotUIOption igw:${Me.Name} checkbox_loot_donotlootshinies FALSE'));
      out.push(mk('NATIVE_SHINIES', String(Math.round(num(st.within, 75)))));
      d.change('the leader walks to the shinies (OgreBot brings the group)');
    } else d.leave('it loots something other than a chest or the shinies');
  };
  DO.announce = function (st, d, c, out) {
    extra(st, ['message'], d);
    var msg = str(st.message), guessed = false, any = false;
    msg = msg.replace(/\{\{\s*ic\.run\.verdicts\.([^}\s]+)\s*\}\}/g, function (x, id) {
      any = true;
      if (c.named[id]) return '{{named:' + c.named[id].join('|') + '}}';
      if (c.loot[id]) return '{{loot:' + c.loot[id] + '}}';
      guessed = true;
      return '{{step:' + id + '}}';
    });
    out.push(mk('NATIVE_ANNOUNCE', X.subst(msg)));
    if (any) d.change('how each named and chest went is read from the game (killed, alive or gone; done)');
    if (guessed) d.change('how a step that is no named or chest went reads "?"');
  };
  DO.teleporter = function (st, d, c, out) {
    extra(st, ['name', 'landing', 'walkOnto'], d);
    if (has(st, 'walkOnto')) return d.leave('a pad you walk onto has no step here yet');
    var name = str(st.name), land = spotOf(st.landing);
    if (!name) return d.leave('it names no teleporter');
    if (!land) return d.leave('it has no landing spot');
    var t = mk('NATIVE_TELEPORTER', name);
    t.coords = spotText(land);
    t.timeout = String(has(st, 'limitMs') ? secs(st.limitMs) : 20);
    out.push(t);
  };
  DO.zoneOut = function (st, d, c, out) {
    var op = str(st.op || 'door');
    if (op === 'none') {
      extra(st, ['op'], d);
      out.push(mk('NATIVE_ANNOUNCE', 'this zone file ends here and stays in the zone (no exit to click)'));
      return;
    }
    if (op !== 'door' && op !== 'auto' && op !== 'endOfZone') return d.leave('it leaves a way ISXJQB has no step for ("' + op + '")');
    extra(st, ['op', 'name', 'within', 'destination', 'walk', 'searchWithin'], d);
    var name = isArr(st.name) ? str(st.name[0]) : str(st.name), walk = typeof st.walk === 'boolean' ? st.walk : op !== 'door';
    if (isArr(st.name) && st.name.length > 1) d.change('of its exit names the first is used');
    var dest = str(st.destination);
    if (op !== 'door' && !name) {
      out.push(mk('ZONEOUT', ''));
      if (op === 'endOfZone') d.change('the nearest exit anywhere is used (OgreBot looks near the last boss only)');
      if (dest) d.change('OgreBot picks the zone-list row itself');
      return;
    }
    if (!name) return d.leave('it names no exit');
    var within = num(st.within, 30);
    if (walk) { within = op === 'endOfZone' ? num(st.searchWithin, 100) : Math.max(within, 5000); d.change('one walk of up to 60 s to the exit (OgreBot walks the group all the way)'); }
    var z = mk('NATIVE_ZONEOUT', name);
    z.distance = String(within);
    z.action = dest || '1';
    out.push(z);
  };
  DO.autotarget = function (st, d, c, out) {
    extra(st, ['op', 'radius', 'height', 'value', 'name', 'hp', 'checkCollision', 'aggroOnGroupOnly', 'enabled', 'outOfCombatScanning', 'whenHated'], d);
    var op = str(st.op), me = '${Me.Name}';
    function opt(id, on) { out.push(oc('-ChangeOgreBotUIOption ' + me + ' ' + id + ' ' + (on ? 'TRUE' : 'FALSE'))); }
    function onv(v) { return v !== false && str(v).toUpperCase() !== 'FALSE'; }
    if (op === 'set' || op === 'setScanRadius' || op === 'setScanHeight') {
      var n0 = out.length;
      if (has(st, 'radius') || (op === 'setScanRadius' && has(st, 'value'))) out.push(oc('-AutoTarget_SetScanRadius ' + me + ' ' + Math.round(num(has(st, 'radius') ? st.radius : st.value, 20))));
      if (has(st, 'height') || (op === 'setScanHeight' && has(st, 'value'))) out.push(oc('-AutoTarget_SetScanHeight ' + me + ' ' + Math.round(num(has(st, 'height') ? st.height : st.value, 15))));
      if (typeof st.enabled === 'boolean') opt('checkbox_autotarget_enabled', st.enabled);
      if (typeof st.outOfCombatScanning === 'boolean') opt('checkbox_autotarget_outofcombatscanning', st.outOfCombatScanning);
      if (typeof st.whenHated === 'boolean') opt('checkbox_settings_autotargetwhenhated', st.whenHated);
      if (out.length === n0) d.leave(has(st, 'seconds') ? 'it only sets how often auto-target looks again, which OgreBot has no command for now' : 'it sets nothing');
    } else if (op === 'setEnabled') opt('checkbox_autotarget_enabled', onv(st.value));
    else if (op === 'setOutOfCombatScanning') opt('checkbox_autotarget_outofcombatscanning', onv(st.value));
    else if (op === 'setWhenHated') opt('checkbox_settings_autotargetwhenhated', onv(st.value));
    else if (op === 'clear') out.push(oc('-AutoTarget_ClearActors ' + me));
    else if (op === 'addActor') {
      if (!str(st.name)) return d.leave('it names nobody');
      out.push(oc('-AutoTarget_AddActor ' + me + ' ' + Q(st.name) + ' ' + Math.round(num(st.hp, 0)) + ' ' + tf(st.checkCollision, false) + ' ' + tf(st.aggroOnGroupOnly, true)));
    } else if (op === 'removeActor') {
      if (!str(st.name)) return d.leave('it names nobody');
      out.push(oc('-AutoTarget_RemoveActor ' + me + ' ' + Q(st.name)));
    } else d.leave('it changes the auto-target list a way ISXJQB has no step for');
  };
  DO.actorInteract = function (st, d, c, out) {
    extra(st, ['op', 'name', 'id', 'target', 'sendTo', 'verb'], d);
    var op = str(st.op), who = X.subst(str(st.name || st.target || st.id)), byId = !has(st, 'name') && has(st, 'id');
    if (!who) return d.leave('it names nothing to use');
    if (op === 'target') out.push(oc('-Target ${Me.Name} ' + Q(who)));
    else if (op === 'doubleClick') {
      if (str(st.sendTo)) out.push(oc('-Actor_ClickQueued ' + fw(st) + ' ' + (byId ? who : Q(who))));
      else out.push(mk('CLICK', who));
    } else if (op === 'verb' && str(st.verb)) {
      out.push(mk('APPLYVERB', who + '|' + str(st.verb)));
      d.change('it waits for any fight to end first' + (str(st.sendTo) ? ', and the leader does it alone' : ''));
    } else if (op === 'hail') { var h = mk('HAIL'); h.target = who; out.push(h); }
    else d.leave('it uses the actor a way ISXJQB has no step for');
  };
  DO.movement = function (st, d, c, out) {
    extra(st, ['op', 'mode', 'sendTo'], d);
    var op = str(st.op), mode = str(st.mode).toLowerCase();
    if (op === 'setRunMode') {
      if (mode !== 'walk' && mode !== 'run') return d.leave('it sets a run mode other than walk or run');
      out.push(oc((mode === 'walk' ? '-Walk ' : '-Run ') + fw(st)));
      if (mode === 'walk') d.change('running is not put back when the run ends early');
    } else if (op === 'jump') out.push(oc('-Jump ' + fw(st)));
    else d.leave('it moves a way ISXJQB has no step for');
  };
  DO.ogreBotUIOption = function (st, d, c, out) {
    extra(st, ['id', 'value', 'sendTo', 'op'], d);
    if (str(st.op || 'set') !== 'set') return d.leave('putting an option back has no step here (ISXJQB keeps no record of it)');
    var v = st.value, b = typeof v === 'boolean' ? v : (/^(TRUE|FALSE)$/i.test(str(v)) ? /^TRUE$/i.test(str(v)) : null);
    if (!str(st.id) || b === null) return d.leave('it needs an option and TRUE or FALSE');
    out.push(oc('-ChangeOgreBotUIOption ' + fw(st) + ' ' + str(st.id) + ' ' + (b ? 'TRUE' : 'FALSE')));
    d.change('OgreBot puts the option back when its run ends; here it stays as this step sets it');
  };
  DO.campSpot = function (st, d, c, out) {
    extra(st, ['op', 'sendTo', 'x', 'y', 'z', 'loc'], d);
    var op = str(st.op), f = fw(st);
    if (op === 'enable') out.push(oc('-campspot ' + f + ' 2 200'));
    else if (op === 'setLoc') {
      var p = spotOf(st.loc), xyz = p ? [n6(p[0]), n6(p[1]), n6(p[2])] : ['x', 'y', 'z'].map(function (k) { return typeof st[k] === 'number' ? n6(st[k]) : X.subst(str(st[k])); });
      if (xyz.some(function (v) { return str(v) === ''; })) return d.leave('it has no x, y, z');
      var t = xyz.join(',');
      if (/\$\{/.test(t)) out.push(oc('-ChangeCampSpotWho ' + f + ' ' + t));
      else { var cw = mk('CAMPSPOT_WHO', t); cw.who = f; out.push(cw); }
      if (!str(st.sendTo)) c.camp = t;
    } else if (op === 'clearAll') out.push(oc('-CS_ClearAll ' + f));
    else if (op === 'clear') out.push(oc('-CS_ClearCampSpot ' + f));
    else if (op === 'release') out.push(oc('-letsgo ' + f));
    else d.leave('it sets a camp spot a way ISXJQB has no step for');
  };
  DO.hunt = function (st, d, c, out) {
    extra(st, ['name', 'until', 'untilLine', 'spots', 'limitMs', 'radius'], d);
    var part = str(st.name), until = str(st.until);
    if (!part || !until) return d.leave('it needs what to hunt and who to wait for');
    var notUp = list1(anyNamed([until]), true), loop = { type: 'WHILE', data: '', condition: 'native', condition_value: notUp, max_iterations: '4',
      timeout: String(has(st, 'limitMs') ? secs(st.limitMs) : 600), sub_steps: [] };
    out.push(oc('-AutoTarget_AddActor ${Me.Name} ' + Q(part) + ' 0 TRUE FALSE'));
    out.push(oc('-AutoTarget_SetScanRadius ${Me.Name} ' + Math.round(num(st.radius, 35))));
    out.push(oc('-ChangeOgreBotUIOption ${Me.Name} checkbox_autotarget_outofcombatscanning TRUE'));
    (isArr(st.spots) ? st.spots : []).map(spotOf).filter(Boolean).forEach(function (w) {
      var p = mk('NATIVE_PATH', spotText(w));
      p.mode = 'nav'; p.distance = '5'; p.once = 'true'; p.path_waypoints = [{ x: n6(w[0]), y: n6(w[1]), z: n6(w[2]) }];
      loop.sub_steps.push({ type: 'IF', data: '', condition: 'native', condition_value: notUp, sub_steps: [p] });
    });
    if (!loop.sub_steps.length) { var nw = mk('NATIVE_WAIT', list1(anyNamed([until]), false)); nw.timeout = '30'; loop.sub_steps.push(nw); }
    out.push(loop);
    out.push(oc('-AutoTarget_RemoveActor ${Me.Name} ' + Q(part)));
    if (has(st, 'untilLine')) d.change('the hunt ends when ' + until + ' stands (the line is not listened for)');
  };
  DO.waitForCombat = function (st, d, c, out) { extra(st, ['noProgressMs', 'onNoProgress'], d); out.push(mk('WAITCOMBAT', String(has(st, 'limitMs') ? secs(st.limitMs) : 300))); };
  DO.waitForLoot = function (st, d, c, out) { extra(st, [], d); out.push(mk('WAITLOOT', String(has(st, 'limitMs') ? secs(st.limitMs) : 120))); };
  DO.botPause = function (st, d, c, out) { extra(st, ['value'], d); out.push(oc((st.value === false ? '-resume ' : '-pause ') + '${Me.Name}')); };
  DO.useItem = function (st, d, c, out) {
    extra(st, ['item', 'name', 'sendTo', 'op'], d);
    var it = str(st.item || st.name);
    if (!it) return d.leave('it names no item');
    out.push(oc('-UseItem ' + fw(st) + ' ' + Q(it)));
  };
  DO.castAbility = function (st, d, c, out) {
    extra(st, ['ability', 'name', 'sendTo', 'target'], d);
    var ab = str(st.ability || st.name), to = str(st.sendTo);
    if (!ab) return d.leave('it names no ability');
    if (!to || WHO_BACK[to]) {
      var e = { type: 'CAST', who: to ? WHO_BACK[to] : 'self', ability: ab };
      if (str(st.target)) { e.action = 'onplayer'; e.target = X.subst(st.target); }
      out.push(e);
    } else out.push(oc('-CastAbility ' + fw(st) + ' ' + Q(ab)));
  };
  DO.raw = function (st, d, c, out) {
    extra(st, ['command'], d);
    var cmd = X.subst(st.command).replace(/LavishScript\["(\$\{[^"]*\})"\]/g, '$1');
    if (!cmd.trim()) return d.leave('it has no command');
    if (/^\s*oc\s/i.test(cmd)) out.push(mk('OC', cmd));
    else { out.push(mk('CMD', cmd)); d.change('a console line, run as written'); }
  };
  var LEAVE = { trash: 'clearing everything in a circle has no ISXJQB step (Clear a room needs a mob name)', groupQuery: 'asking the group has no ISXJQB step',
    progress: 'marking a step done has no ISXJQB step', recover: 'wipe recovery is ISXJQB\'s own (checkpoints)', reward: 'picking a reward has no ISXJQB step' };

  function wait(st, d, c, out) {
    var w = st.wait, lim = num(st.limitMs, 0), s = lim > 0 ? secs(lim) : 60, ws = lim > 0 ? waitSecs(lim) : '60';
    if (str(st.onTimeout) === 'fail') d.change('a timeout does not end the run here');
    if (lim <= 0) d.change('no time given: 60 s');
    if (w === 'ms') {
      out.push(mk('WAIT', ws));
    } else if (w === 'atCampSpot') {
      if (c.camp) out.push(mk('WAITFOR', '${If[${Math.Distance[${Me.X},${Me.Y},${Me.Z},' + c.camp + ']}<6,TRUE,FALSE]}|' + s));
      else { out.push(mk('WAIT', ws)); d.change('no camp spot was set before it: a plain wait'); }
    } else if (isObj(w) || isArr(w)) {
      var n = mk('NATIVE_WAIT', JSON.stringify(isArr(w) ? w : [w]));
      n.timeout = String(s);
      n.action = str(st.onTimeout || 'proceed');
      out.push(n);
    } else d.leave('it waits for something ISXJQB cannot read');
  }
  function repeat(st, d, c, out, depth) {
    var rep = isObj(st.repeat) ? st.repeat : {}, body = list(st.steps, c, depth + 1), mx = Math.round(num(rep.max, 10)), until = rep.until;
    if (has(rep, 'times')) mx = Math.round(num(rep.times, 1));
    for (var i = 0; i < body.length; i++) out.push(body[i]);
    if (mx > 1 && body.length) {
      var u = until == null ? null : (isArr(until) ? until : [until]);
      out.push({ type: 'WHILE', data: '', condition: u ? 'native' : 'always', condition_value: u ? JSON.stringify([{ not: u }]) : '', max_iterations: String(mx - 1), timeout: '900', sub_steps: clone(body) });
    }
  }
  function forEach(st, d, c, out, depth) {
    var fe = isObj(st.forEach) ? st.forEach : {}, q = query(fe.find), as = str(fe.as || 'it');
    if (!q) return d.leave('it goes over spots or values, which has no ISXJQB step');
    if (num(fe.max, 1) !== 1) d.change('one pass over the first one found');
    var body = list(st.steps, c, depth + 1), bind = mk('NATIVE_BIND', as);
    bind.target = q;
    out.push({ type: 'IF', data: '', condition: 'native', condition_value: list1(exists(q), false), sub_steps: [bind].concat(body) });
  }
  function one(st, c, depth) {
    var out = [], why = [], left = '';
    var d = { change: function (w) { why.push(w); }, leave: function (w) { left = left || w; } };
    if (!isObj(st)) left = 'it is not one step';
    else if (has(st, 'repeat') && has(st, 'forEach')) left = 'a step cannot both repeat and go over a list';
    else if (has(st, 'repeat')) repeat(st, d, c, out, depth);
    else if (has(st, 'forEach')) forEach(st, d, c, out, depth);
    else if (has(st, 'wait') && !st['do']) wait(st, d, c, out);
    else if (DO[str(st['do'])]) DO[str(st['do'])](st, d, c, out);
    else left = LEAVE[str(st['do'])] || (st['do'] ? 'ISXJQB has no step for it' : 'it does nothing');
    if (!left && has(st, 'when') && out.length) {
      out = [{ type: 'IF', data: '', condition: 'native', condition_value: JSON.stringify(isArr(st.when) ? st.when : [st.when]), sub_steps: out }];
    }
    if (!left && isObj(st) && str(st.onFail) === 'fail') why.push('a failed step does not end the run here');
    if (!left && isObj(st) && str(st.onFail) === 'proceed') for (var i = 0; i < out.length; i++) if (out[i].type !== 'COMMENT') out[i].optional = true;
    var what = X.zoneWords(st, c), status = left ? 'left' : (why.length ? 'changed' : 'ok');
    if (left) out = [mk('NATIVE_NOTE', 'from the OgreBot zone file: ' + what + ' -- ' + left)];
    c.notes.push({ id: isObj(st) ? str(st.stepId) : '', what: what, status: status, why: left || why.join('; '), n: out.length, depth: depth });
    c.counts[status]++;
    return out;
  }
  function list(L, c, depth) {
    var out = [];
    for (var i = 0; isArr(L) && i < L.length; i++) out = out.concat(one(L[i], c, depth));
    return out;
  }
  function collect(L, c) {
    for (var i = 0; isArr(L) && i < L.length; i++) {
      var s = L[i];
      if (!isObj(s)) continue;
      var id = str(s.stepId);
      if (s['do'] === 'named' && id) c.named[id] = [str(s.name)].concat((isArr(s.aliases) ? s.aliases : []).map(str).filter(Boolean));
      else if (s['do'] === 'loot' && id) c.loot[id] = str(s.op);
      if (isArr(s.steps)) collect(s.steps, c);
    }
  }
  function anchor(st, c) {
    var n = c.wipe++, name = str(st.name);
    return [{ type: 'WIPE_RECOVERY', data: name, boss: name, wipe_num: String(n) }, { type: 'COMMENT', data: '=== Named ' + n + ': ' + name + (st.boss ? ' (the last boss)' : '') + ' ===' }];
  }
  X.zoneToJqb = function (steps, ctx) {
    ctx = ctx || {};
    var c = { notes: [], counts: { ok: 0, changed: 0, left: 0 }, camp: null, named: {}, loot: {}, wipe: ctx.wipeNum || 1 };
    if (ctx.named) for (var k in ctx.named) if (has(ctx.named, k)) c.named[k] = ctx.named[k];
    if (ctx.loot) for (var l in ctx.loot) if (has(ctx.loot, l)) c.loot[l] = ctx.loot[l];
    collect(steps, c);
    var first = {}, namedOf = {}, out = [], i;
    for (i = 0; isArr(steps) && i < steps.length; i++) {
      var h = X.headOf(steps[i] && steps[i].stepId);
      if (!h) continue;
      if (!has(first, h)) first[h] = i;
      if (steps[i]['do'] === 'named' && str(steps[i].stepId) === h) namedOf[h] = steps[i];
    }
    for (i = 0; isArr(steps) && i < steps.length; i++) {
      var hd = X.headOf(steps[i] && steps[i].stepId);
      if (ctx.anchors !== false && hd && namedOf[hd] && first[hd] === i) out = out.concat(anchor(namedOf[hd], c));
      out = out.concat(one(steps[i], c, 0));
    }
    ctx.wipeNum = c.wipe;
    return { entries: out, notes: c.notes, counts: c.counts };
  };
  X.namesOf = function (doc) {
    var c = { named: {}, loot: {} };
    for (var i = 0; i < X.LISTS.length; i++) collect(doc && doc[X.LISTS[i]], c);
    return c;
  };

  function heads(steps) {
    var out = [];
    for (var i = 0; isArr(steps) && i < steps.length; i++) { var h = X.headOf(steps[i] && steps[i].stepId); if (h && out.indexOf(h) < 0) out.push(h); }
    return out;
  }
  function takenHead(used, h) { for (var k in used) if (has(used, k) && (k === h || k.indexOf(h + '.') === 0)) return true; return false; }
  X.zoneToZone = function (steps, ctx) {
    ctx = ctx || {};
    var used = ctx.used || (ctx.used = {}), map = {}, hmap = {}, given = {}, notes = [], S = IC.snip, H = heads(steps), i;
    var nextN = S ? S.nextNamed(used) : 1;
    function free(h) { return !takenHead(used, h) && !given[h]; }
    for (i = 0; i < H.length; i++) {
      var h = H[i], nh = h, m = /^named(\d+)$/.exec(h);
      if (m) {
        while (!free('named' + nextN)) nextN++;
        nh = 'named' + nextN++;
        if (nh !== h) notes.push('Named ' + m[1] + ' is named ' + nh.slice(5) + ' here (the open file has nameds before it).');
      } else if (!free(h)) {
        for (var n = 2; n < 500; n++) if (free(h + n)) { nh = h + n; break; }
        notes.push('"' + h + '" is "' + nh + '" here: the open file has steps of that name.');
      }
      hmap[h] = nh;
      given[nh] = 1;
    }
    var out = clone(steps || []);
    (function walk(v) {
      if (isArr(v)) { for (var j = 0; j < v.length; j++) walk(v[j]); return; }
      if (!isObj(v)) return;
      if (typeof v.stepId === 'string' && v.stepId) {
        var hh = X.headOf(v.stepId), base = has(hmap, hh) ? hmap[hh] + v.stepId.slice(hh.length) : v.stepId, nid = base;
        for (var k = 2; has(used, nid) && k < 500; k++) nid = base + '-' + k;
        if (nid !== v.stepId && !has(map, v.stepId)) map[v.stepId] = nid;
        v.stepId = nid;
        used[nid] = 1;
      }
      if (isArr(v.steps)) walk(v.steps);
    })(out);
    function ren(id) { if (has(map, id)) return map[id]; var hh = X.headOf(id); return has(hmap, hh) && hmap[hh] !== hh ? hmap[hh] + id.slice(hh.length) : id; }
    (function walk(v) {
      if (isArr(v)) { for (var j = 0; j < v.length; j++) { if (typeof v[j] === 'string') v[j] = txt(v[j]); else walk(v[j]); } return; }
      if (!isObj(v)) return;
      for (var k in v) if (has(v, k)) {
        if (typeof v[k] === 'string') v[k] = k === 'id' && v['do'] === 'progress' ? ren(v[k]) : txt(v[k]);
        else walk(v[k]);
      }
    })(out);
    function txt(s) { return s.replace(/\{\{\s*ic\.run\.verdicts\.([^}\s]+)\s*\}\}/g, function (x, id) { return '{{ic.run.verdicts.' + ren(id) + '}}'; }); }
    return { steps: out, renames: map, notes: notes };
  };

  X.jqbClone = function (entries, ctx) {
    ctx = ctx || {};
    var out = clone(entries || []), n = ctx.wipeNum || 1;
    (function walk(L) {
      for (var i = 0; isArr(L) && i < L.length; i++) {
        var e = L[i];
        if (!isObj(e)) continue;
        if (str(e.type).toUpperCase() === 'WIPE_RECOVERY') e.wipe_num = String(n++);
        ['sub_steps', 'else_steps', 'fight_rules'].forEach(function (k) { if (isArr(e[k])) walk(e[k]); });
      }
    })(out);
    ctx.wipeNum = n;
    return { entries: out, notes: [] };
  };

  function zoneKey(z) { return str(z).replace(/\[[^\]]*\]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  var OUT_TYPES = { ZONEOUT: 1, NATIVE_ZONEOUT: 1, WAITZONE: 1, EVAC: 1, ZONEDOOR: 1 };
  function fights(L, into) {
    (function walk(A) {
      for (var i = 0; isArr(A) && i < A.length; i++) {
        var e = A[i], t = str(e && e.type).toUpperCase();
        if (!isObj(e)) continue;
        if (t === 'COMBAT' || t === 'WIPE_RECOVERY') { var n = str(t === 'COMBAT' ? e.data : (e.boss || e.data)).trim().toLowerCase(); if (n) into[n] = str(t === 'COMBAT' ? e.data : (e.boss || e.data)).trim(); }
        if (OUT_TYPES[t]) into.__out = true;
        ['sub_steps', 'else_steps'].forEach(function (k) { walk(e[k]); });
      }
    })(L);
    return into;
  }
  X.checks = function (info) {
    var out = [], a = zoneKey(info.srcZone), b = zoneKey(info.dstZone);
    if (a && b && a !== b) out.push({ level: 'warn', msg: 'These steps come from ' + str(info.srcZone) + '; the open file is ' + str(info.dstZone) + '. Their spots and names may not fit.' });
    var src = fights(info.entries, {}), dst = fights(info.dst, {}), twice = [];
    for (var k in src) if (has(src, k) && k !== '__out' && has(dst, k)) twice.push(src[k]);
    if (twice.length) out.push({ level: 'warn', msg: 'The open file already fights ' + twice.slice(0, 3).join(', ') + (twice.length > 3 ? ' and ' + (twice.length - 3) + ' more' : '') + ': this adds ' + (twice.length === 1 ? 'that section' : 'those sections') + ' a second time.' });
    if (src.__out && dst.__out) out.push({ level: 'warn', msg: 'The open file already has a way out: this adds a second one.' });
    return out;
  };

  X.words = function (e) {
    if (IC.icflow && IC.icflow.titleOf) return IC.icflow.titleOf(e);
    var s = R().forEntry(e), t = str(s.type), W = Wd(), w;
    if (W && (t === 'OC' || t === 'CMD' || t === 'SCRIPT')) { w = W.ogre(e.data); if (w) return w; }
    if (W && t === 'COMMENT') { w = W.note(e.data); if (w) return w; }
    var lab = str(R().labelFor(e)).replace(/\s{2,}/g, ' ');
    if (!W) return lab;
    if (/^\s*===/.test(lab)) { w = W.note(lab); if (w) return w; }
    lab = lab.replace(/\boc\s+!ci?\s+.*$/i, function (x) { var o = W.ogre(x); return o ? o.charAt(0).toLowerCase() + o.slice(1) : x; });
    if ((t === 'IF' || t === 'WHILE') && /\$\{/.test(lab)) lab = lab.replace(/(NOT )?(\$\{.*\})\s*$/, function (x, not, ex) { return W.ls((not ? '!' : '') + ex); });
    return /\$\{/.test(lab) ? W.val(lab) : lab;
  };
  X.preview = function (entries, max) {
    var out = [], I = IC.icons, G = IC.icflow;
    max = max || 400;
    (function walk(L, depth, branch) {
      for (var i = 0; isArr(L) && i < L.length && out.length < max; i++) {
        var e = L[i], s = R().forEntry(e), t = str(s.type), role = G && G.roleOf ? G.roleOf(e, s, true) : 'action';
        var ab = t === 'CAST' ? str(e.ability || e.data) : '', gi = I ? ((ab && I.forAbil && I.forAbil(ab)) || I.forStep(e, t, role)) : null;
        out.push({ t: X.words(e), gi: gi, role: role, depth: depth, branch: branch || '' });
        if (isArr(e.sub_steps)) walk(e.sub_steps, depth + 1, t === 'IF' ? 'then' : (t === 'WHILE' ? 'repeat' : 'then do'));
        if (isArr(e.else_steps) && e.else_steps.length) walk(e.else_steps, depth + 1, 'otherwise');
      }
    })(entries, 0, '');
    return out;
  };
  X.countWords = function (counts) {
    var c = counts || {};
    return 'Brought over ' + (c.ok || 0) + ' - changed ' + (c.changed || 0) + ' - left out ' + (c.left || 0);
  };
})(typeof window !== 'undefined' ? window : this);
