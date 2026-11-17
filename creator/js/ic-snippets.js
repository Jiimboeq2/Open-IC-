/* Open IC Creator - ic-snippets.js
   Snippets (IC.snip): quick buttons that add several steps at once, for native zone files ('oic') and ISXJQB instance
   files ('jqb'), with stepIds unique in the file.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var S = IC.snip = IC.snip || {};
  function str(v) { return v == null ? '' : String(v); }
  function isArr(v) { return Object.prototype.toString.call(v) === '[object Array]'; }
  function isObj(v) { return v != null && typeof v === 'object' && !isArr(v); }
  function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
  var OMIT = { omit: 1 };

  function P(n) { return { $param: n }; }
  function ON(n, v) { return { $param: n, on: v }; }
  function SECS(n) { return { $param: n, as: 'secs' }; }
  function ID(s) { return { $id: s }; }
  function HEAD(h, s) { return { $head: h, s: s }; }
  function NAMED(s) { return { $named: s }; }
  function JOIN(a) { return { $join: a }; }
  function EACH(n, step) { return { $each: n, step: step }; }
  var IT = { $it: 1 }, WIPE = { $wipe: 1 };
  S.markers = { P: P, ON: ON, SECS: SECS, ID: ID, HEAD: HEAD, NAMED: NAMED, JOIN: JOIN, EACH: EACH, IT: IT, WIPE: WIPE };

  var SPOT = ['pos', 'points'], NAME = ['hover', 'target', 'fights'];
  S.BUILTIN = [
    { id: 'gate', base: 'gate', label: 'Open a gate and walk through', icon: 'click', role: 'action', picker: true,
      help: 'The group walks to the gate, the leader double-clicks the lever, everyone waits a moment for it to swing, then the group walks past it.',
      source: 'Ogre docs, zone files: the door example (the same four steps)',
      params: [
        { name: 'before', type: 'point3f', label: 'In front of the gate', required: true, grab: SPOT },
        { name: 'lever', type: 'string', label: 'What to click', 'default': 'Gate Lever', required: true, grab: NAME,
          help: 'Its exact name. Hover it in game, or target it.' },
        { name: 'swingMs', type: 'int', unit: 'ms', label: 'It opens in', 'default': 1500, help: 'How long it takes to swing open.' },
        { name: 'past', type: 'point3f', label: 'Past the gate', required: true, grab: SPOT },
        { name: 'everyone', type: 'bool', label: 'Every character has to click it', formats: ['oic'] },
        { name: 'mayBeOpen', type: 'bool', label: 'It is sometimes open already, or gone', formats: ['oic'] }
      ],
      oic: [
        { stepId: ID('walk'), 'do': 'path', using: 'nav', spots: [P('before')], $need: 'spots' },
        { stepId: ID('open'), 'do': 'actorInteract', op: 'doubleClick', name: P('lever'), sendTo: ON('everyone', 'igwbn:{{me}}'), onFail: ON('mayBeOpen', 'proceed') },
        { stepId: ID('swing'), wait: 'ms', limitMs: P('swingMs'), onTimeout: 'proceed' },
        { stepId: ID('past'), 'do': 'path', using: 'nav', spots: [P('past')], $need: 'spots' }
      ],
      jqb: [
        { type: 'WAYPOINT', data: P('before'), mode: 'ogrenav', $need: 'data' },
        { type: 'CLICK', data: P('lever') },
        { type: 'WAIT', data: SECS('swingMs') },
        { type: 'WAYPOINT', data: P('past'), mode: 'ogrenav', $need: 'data' }
      ],
      notes: 'An ISXJQB instance file\'s Click is made by the leader only, so the two ticks are for OgreBot zone files. The JQB wait is written in whole seconds, rounded up (1.5 s is written 2); the Wait step takes a fraction such as 1.5 too.' },
    { id: 'clickOnce', base: 'click', label: 'Click something once (fine if it is gone)', icon: 'click', role: 'action',
      help: 'Double-clicks an object. When it is not there, the zone carries on.',
      source: 'Ogre docs, zone files: clicking an object (as in Thresinet\'s Den)',
      params: [
        { name: 'thing', type: 'string', label: 'What to click', required: true, grab: NAME },
        { name: 'everyone', type: 'bool', label: 'Every character clicks it', formats: ['oic'] }
      ],
      oic: [{ stepId: ID('object'), 'do': 'actorInteract', op: 'doubleClick', name: P('thing'), sendTo: ON('everyone', 'igwbn:{{me}}'), onFail: 'proceed' }],
      jqb: [{ type: 'CLICK', data: P('thing') }] },
    { id: 'namedSection', base: 'named', label: 'A named: walk there, kill it, loot it', icon: 'named', role: 'sec',
      help: 'The block the shipped files use for every named: walk there, kill it, loot its chest and the shinies, then say how it went.',
      source: 'Ogre docs, zone files: a named, its stepIds and the last boss',
      params: [
        { name: 'named', type: 'string', label: 'The named', required: true, grab: NAME, help: 'Its exact name.' },
        { name: 'walk', type: 'point3f', list: true, label: 'The walk there', grab: SPOT, help: 'Add a spot at a time, in order.' },
        { name: 'spot', type: 'point3f', label: 'Where the group fights it', grab: SPOT, help: 'Empty: fought where the group stands.' },
        { name: 'boss', type: 'bool', label: 'The zone\'s last boss', formats: ['oic'] },
        { name: 'buff', type: 'bool', label: 'Buff up before the pull (11 s)', 'default': true, formats: ['jqb'] },
        { name: 'shinies', type: 'bool', label: 'Pick up the shinies after the chest', formats: ['jqb'] }
      ],
      oic: [
        { stepId: NAMED('walk'), 'do': 'path', using: 'nav', spots: P('walk'), $need: 'spots' },
        { stepId: NAMED(''), 'do': 'named', name: P('named'), spot: P('spot'), boss: ON('boss', true) },
        { stepId: NAMED('chest'), 'do': 'loot', op: 'chest', boss: ON('boss', true) },
        { stepId: NAMED('shinies'), 'do': 'loot', op: 'shinies' },
        { stepId: NAMED('said'), 'do': 'announce', message: JOIN([P('named'), ' - {{ic.run.verdicts.', NAMED(''), '}}, chest {{ic.run.verdicts.', NAMED('chest'),
          '}}, shinies {{ic.run.verdicts.', NAMED('shinies'), '}}']) }
      ],
      jqb: [
        { type: 'WIPE_RECOVERY', data: P('named'), boss: P('named'), wipe_num: WIPE },
        { type: 'COMMENT', data: JOIN(['=== Named ', WIPE, ': ', P('named'), ' ===']) },
        EACH('walk', { type: 'WAYPOINT', data: IT, mode: 'ogrenav' }),
        { type: 'CAMPSPOT', data: P('spot'), distance: '5', $need: 'data', $quiet: 1 },
        { type: 'PREBUFF', data: ON('buff', '11'), $need: 'data', $quiet: 1 },
        { type: 'COMBAT', data: P('named') },
        { type: 'CHEST', data: '' },
        { type: 'NATIVE_SHINIES', data: ON('shinies', '75'), $need: 'data', $quiet: 1 }
      ] },
    { id: 'clickToSpawn', base: 'named', label: 'Click something to wake a named, then kill it', icon: 'named', role: 'sec',
      help: 'Clicks the object (or the sleeping named), waits up to 30 s for the named to show up, and kills it.',
      source: 'Ogre\'s shipped zone files: a named that a click spawns',
      params: [
        { name: 'thing', type: 'string', label: 'What to click', required: true, grab: NAME },
        { name: 'named', type: 'string', label: 'The named it wakes', required: true, grab: NAME }
      ],
      oic: [
        { stepId: NAMED('wake'), 'do': 'actorInteract', op: 'doubleClick', name: P('thing'), onFail: 'proceed' },
        { stepId: NAMED(''), 'do': 'named', name: P('named'), spawnWaitMs: 30000 }
      ],
      jqb: [
        { type: 'CLICK', data: P('thing') },
        { type: 'WAITACTOR', data: JOIN([P('named'), '|30']) },
        { type: 'COMBAT', data: P('named') }
      ] },
    { id: 'bonusIfUp', base: 'named', label: 'Fight a bonus named only if it is up', icon: 'named', role: 'cond',
      help: 'When the bonus named stands in the zone, the group kills it and loots its chest; otherwise both are skipped.',
      source: 'Ogre\'s shipped zone files: a bonus named, fought only if it is up',
      params: [
        { name: 'named', type: 'string', label: 'The bonus named', required: true, grab: NAME },
        { name: 'spot', type: 'point3f', label: 'Where the group fights it', grab: SPOT }
      ],
      oic: [
        { stepId: NAMED(''), when: [{ count: { of: 'actors', find: { query: JOIN(['Name == "', P('named'), '"']) }, compare: '>=', value: 1 } }],
          'do': 'named', name: P('named'), spot: P('spot') },
        { stepId: NAMED('chest'), when: [{ count: { of: 'actors', find: { query: JOIN(['Name == "', P('named'), '"']) }, compare: '>=', value: 1 } }],
          'do': 'loot', op: 'chest' }
      ],
      jqb: [{ type: 'IF', data: '', condition: 'actor_alive', condition_value: P('named'), sub_steps: [{ type: 'COMBAT', data: P('named') }, { type: 'CHEST', data: '' }] }] },
    { id: 'lootBoth', base: 'loot', label: 'Loot the chest and the shinies', icon: 'loot', role: 'action',
      help: 'Loots the chest, then picks up the shinies within the distance.',
      source: 'Ogre docs, zone files: the chest and the shinies',
      params: [{ name: 'within', type: 'int', unit: 'm', label: 'Shinies within', 'default': 75 }],
      oic: [{ stepId: ID('chest'), 'do': 'loot', op: 'chest' }, { stepId: ID('shinies'), 'do': 'loot', op: 'shinies', within: P('within') }],
      jqb: [{ type: 'CHEST', data: '' }, { type: 'NATIVE_SHINIES', data: P('within') }] },
    { id: 'teleporter', base: 'teleporter', label: 'Take a teleporter', icon: 'door', role: 'move',
      help: 'The group walks to the teleporter, everyone clicks it, and the run goes on once the group stands where it lands.',
      source: 'Ogre docs, zone files: teleporters',
      params: [
        { name: 'spot', type: 'point3f', label: 'Next to the teleporter', grab: SPOT },
        { name: 'name', type: 'string', label: 'The teleporter', required: true, grab: NAME, help: 'Its exact name, typos included.' },
        { name: 'landing', type: 'point3f', label: 'Where it puts you', required: true, grab: SPOT, help: 'Go through once and press Here where you land.' }
      ],
      oic: [
        { stepId: ID('walk'), 'do': 'path', using: 'nav', spots: [P('spot')], $need: 'spots' },
        { stepId: ID('go'), 'do': 'teleporter', name: P('name'), landing: P('landing') }
      ],
      jqb: [
        { type: 'WAYPOINT', data: P('spot'), mode: 'ogrenav', $need: 'data' },
        { type: 'NATIVE_TELEPORTER', data: P('name'), coords: P('landing') }
      ] },
    { id: 'wayOutDoor', label: 'The way out: walk to the exit and click it', icon: 'door', role: 'end',
      help: 'The group walks to the exit and uses it, then waits for the zone change.',
      source: 'Ogre docs, zone files: leaving by the exit door',
      params: [
        { name: 'spot', type: 'point3f', label: 'In front of the exit', required: true, grab: SPOT },
        { name: 'door', type: 'string', label: 'The exit', required: true, grab: NAME, help: 'Its exact name: Exit, zone_exit, exit_spawned ...' }
      ],
      oic: [{ stepId: HEAD('exit', 'walk'), 'do': 'path', using: 'nav', spots: [P('spot')], $need: 'spots' },
        { stepId: HEAD('exit', 'door'), 'do': 'zoneOut', op: 'door', name: P('door') }],
      jqb: [{ type: 'COMMENT', data: '=== Zone exit ===' }, { type: 'WAYPOINT', data: P('spot'), mode: 'ogrenav', $need: 'data' },
        { type: 'CLICK', data: P('door') }, { type: 'WAITZONE', data: '' }] },
    { id: 'wayOutAuto', label: 'The way out: the nearest exit', icon: 'door', role: 'end',
      help: 'Leaves through the nearest exit (the built-in zone out).', source: 'Ogre docs, zone files: the nearest exit',
      params: [],
      oic: [{ stepId: HEAD('exit', ''), 'do': 'zoneOut', op: 'auto' }],
      jqb: [{ type: 'ZONEOUT', data: '' }] },
    { id: 'stayInZone', label: 'No way out: stay in the zone', icon: 'door', role: 'end',
      help: 'Ends the zone file without leaving the zone (Call to GH after each zone still runs).', source: 'Ogre docs, zone files: staying in the zone',
      params: [], oic: [{ stepId: HEAD('exit', ''), 'do': 'zoneOut', op: 'none' }], jqb: null },
    { id: 'settle', base: 'settle', label: 'Hold until the fight is over', icon: 'fight', role: 'cond',
      help: 'Waits until the group is out of combat (moves on when the fight stops going anywhere for 20 s).',
      source: 'Ogre docs, zone files: waiting for the fight to end',
      params: [],
      oic: [{ stepId: ID(''), 'do': 'waitForCombat', noProgressMs: 20000, onNoProgress: 'moveOn' }],
      jqb: [{ type: 'WAITCOMBAT', data: '' }] },
    { id: 'waitForActor', base: 'wait', label: 'Wait until something shows up', icon: 'watch', role: 'cond',
      help: 'Holds until an NPC or object with that name is up, at most 30 s, then carries on either way.',
      source: 'Ogre\'s shipped zone files: waiting for an actor (as in Inner Sanctum, The Oculeum)',
      params: [{ name: 'name', type: 'string', label: 'Who or what', required: true, grab: NAME }],
      oic: [{ stepId: ID('actor'), wait: { count: { of: 'actors', find: { query: JOIN(['Name == "', P('name'), '" && Health > 0']) }, compare: '>=', value: 1 } },
        limitMs: 30000, onTimeout: 'proceed' }],
      jqb: [{ type: 'WAITACTOR', data: JOIN([P('name'), '|30']) }] },
    { id: 'castWhenReady', base: 'cast', label: 'Cast an ability', icon: 'cast', role: 'action',
      help: 'Casts the ability (in a zone file only when it is ready).',
      source: 'Ogre docs: castAbility (the fight-file fields; it takes sendTo)',
      params: [
        { name: 'ability', type: 'string', label: 'The ability', required: true, grab: ['abil'], ability: true },
        { name: 'who', type: 'forwho', label: 'Who casts it', 'default': 'all', formats: ['jqb'] }
      ],
      oic: [{ stepId: ID('ability'), when: [{ abilityReady: { name: P('ability') } }], 'do': 'castAbility', ability: P('ability') }],
      jqb: [{ type: 'CAST', who: P('who'), ability: P('ability') }] },
    { id: 'waitBladedance', base: 'ready', label: 'Wait until someone\'s ability is ready', icon: 'ability:Bladedance', role: 'loop',
      help: 'Asks the group every 2 seconds and goes on once anyone answers yes (at most 30 times).',
      source: 'Ogre docs, zone files: asking the group in a repeat',
      params: [
        { name: 'ability', type: 'string', label: 'The ability', 'default': 'Bladedance', grab: ['abil'], ability: true },
        { name: 'who', type: 'forwho', label: 'Only ask (empty: the whole group)' }
      ],
      oic: [{ stepId: ID(''), repeat: { until: { varEquals: { scope: 'encounter', name: 'bd.anyYes', value: 'TRUE' } }, max: 30 },
        steps: [
          { stepId: ID('ask'), 'do': 'groupQuery', 'var': 'bd', question: 'abilityReady', ability: P('ability'), sendTo: P('who') },
          { stepId: ID('gap'), wait: 'ms', limitMs: 2000, onTimeout: 'proceed' }
        ] }],
      jqb: null, notes: 'No ISXJQB form: an instance file\'s checks have no "ability ready" check.' },
    { id: 'trashWaves', base: 'trash', label: 'Clear the room, wave after wave', icon: 'trash', role: 'action',
      help: 'Kills everything in the circle and waits for the next wave, until the room stays quiet for a minute.',
      source: 'Ogre docs, zone files: clearing a room wave after wave',
      params: [
        { name: 'radius', type: 'int', unit: 'm', label: 'How far around', 'default': 40 },
        { name: 'until', type: 'string', label: 'Stop when this shows up', grab: NAME }
      ],
      oic: [{ stepId: ID(''), 'do': 'trash', radius: P('radius'), until: P('until'), whenEmpty: 'wait', quietMs: 60000 }],
      jqb: null, notes: 'No ISXJQB form: Clear a room needs one mob name.' }
  ];

  S.user = S.user || [];
  S.all = function () { return S.BUILTIN.concat(S.user); };
  S.get = function (id) {
    var L = S.all();
    for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i];
    return null;
  };
  S.has = function (sn, fmt) { return !!sn && (sn.user ? sn.fmt === fmt || (sn.fmt === 'oic' && fmt === 'jqb' && !!IC.imp) : isArr(sn[fmt])); };
  S.list = function (fmt) { return S.all().filter(function (sn) { return !fmt || S.has(sn, fmt); }); };
  S.paramsFor = function (sn, fmt) {
    return ((sn && sn.params) || []).filter(function (p) { return !p.formats || !fmt || p.formats.indexOf(fmt) >= 0; });
  };

  S.spot = function (v) {
    if (v == null || v === '') return null;
    var a = isArr(v) ? v : (isObj(v) ? [v.x, v.y, v.z] : str(v).replace(/^\s*jb\s+nav\s+goto\s+/i, '').split(/[\s,]+/).filter(function (x) { return x !== ''; }));
    if (a.length < 3) return null;
    var x = parseFloat(a[0]), y = parseFloat(a[1]), z = parseFloat(a[2]);
    return isFinite(x) && isFinite(y) && isFinite(z) ? [x, y, z] : null;
  };
  function n6(v) { return Number((+v).toFixed(6)); }
  S.spotText = function (p) { return p ? n6(p[0]) + ',' + n6(p[1]) + ',' + n6(p[2]) : ''; };
  function truthy(v) { return v === true || /^(true|1|yes|on)$/i.test(str(v).trim()); }
  S.norm = function (p, v) {
    if (p.type === 'bool') return truthy(v);
    if (p.type === 'point3f') {
      if (p.list) {
        var a = isArr(v) ? v : (v == null || v === '' ? [] : [v]), out = [];
        if (a.length >= 3 && typeof a[0] === 'number' && !isArr(a[0])) a = [a];
        for (var i = 0; i < a.length; i++) { var s = S.spot(a[i]); if (s) out.push(s); }
        return out;
      }
      return S.spot(v);
    }
    if (p.type === 'int') { var n = parseFloat(str(v).trim()); return isFinite(n) ? Math.round(n) : null; }
    return str(v).trim();
  };
  function empty(v) { return v == null || v === '' || v === false || (isArr(v) && !v.length); }
  S.values = function (sn, given) {
    var out = {}, ps = (sn && sn.params) || [];
    given = given || {};
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i], has = Object.prototype.hasOwnProperty.call(given, p.name) && given[p.name] !== undefined;
      out[p.name] = S.norm(p, has ? given[p.name] : p['default']);
    }
    return out;
  };
  S.missing = function (sn, values, fmt) {
    var v = S.values(sn, values), out = [], ps = S.paramsFor(sn, fmt);
    for (var i = 0; i < ps.length; i++) if (ps[i].required && empty(v[ps[i].name])) out.push({ name: ps[i].name, label: ps[i].label });
    return out;
  };

  function headOf(id) { return str(id).split('.')[0]; }
  S.headOf = headOf;
  S.usedIds = function (doc, into) {
    var used = into || {};
    (function walk(v) {
      if (isArr(v)) { for (var i = 0; i < v.length; i++) walk(v[i]); return; }
      if (!isObj(v)) return;
      if (typeof v.stepId === 'string' && v.stepId) used[v.stepId] = 1;
      for (var k in v) if (v.hasOwnProperty(k) && (k === 'steps' || k === 'enter' || k === 'exit' || k === 'onWipe' || k === 'afterWipe')) walk(v[k]);
    })(isArr(doc) ? doc : (doc || {}));
    return used;
  };
  function takenHead(used, h) {
    for (var k in used) if (used.hasOwnProperty(k) && (k === h || k.indexOf(h + '.') === 0)) return true;
    return false;
  }
  S.freeId = function (used, prefix, base) {
    var pre = str(prefix).replace(/\.+$/, ''), b = (pre ? pre + '.' : '') + str(base || 'step');
    for (var n = 1; n < 1000; n++) { var c = b + (n > 1 ? n : ''); if (!takenHead(used || {}, c)) return c; }
    return b + '-' + Date.now();
  };
  S.nextNamed = function (used) {
    var n = 0;
    for (var k in used) if (used.hasOwnProperty(k)) { var m = /^named(\d+)(?:\.|$)/.exec(k); if (m && +m[1] > n) n = +m[1]; }
    return n + 1;
  };
  S.prefixAt = function (list, idx) {
    list = list || [];
    var a = idx > 0 ? headOf(list[idx - 1] && list[idx - 1].stepId) : '', b = idx < list.length ? headOf(list[idx] && list[idx].stepId) : '';
    return b || a;
  };
  function pickIds(sn, tpl, ctx) {
    var used = ctx.used || {}, ids = [], heads = {}, out = {}, k;
    (function walk(v) {
      if (isArr(v)) { for (var i = 0; i < v.length; i++) walk(v[i]); return; }
      if (!isObj(v)) return;
      if (v.$id != null) ids.push(str(v.$id));
      if (v.$head != null) heads[str(v.$head)] = 1;
      for (var x in v) if (v.hasOwnProperty(x)) walk(v[x]);
    })(tpl);
    var pre = str(ctx.prefix).replace(/\.+$/, ''), base = pre ? pre + '.' + str(sn.base || sn.id) : str(sn.base || sn.id);
    if (ids.length) {
      for (var n = 1; n < 500; n++) {
        var cand = base + (n > 1 ? n : '');
        if (!takenHead(used, cand)) { for (var i = 0; i < ids.length; i++) out['id:' + ids[i]] = cand + (ids[i] ? '.' + ids[i] : ''); break; }
      }
    }
    for (k in heads) if (heads.hasOwnProperty(k)) {
      for (var m = 1; m < 500; m++) { var h = k + (m > 1 ? m : ''); if (!takenHead(used, h)) { out['head:' + k] = h; break; } }
    }
    out.named = 'named' + (ctx.namedNext || S.nextNamed(used));
    return out;
  }

  function write(p, v, fmt) {
    if (p.type === 'point3f') {
      if (p.list) return fmt === 'oic' ? v.map(function (s) { return [n6(s[0]), n6(s[1]), n6(s[2])]; }) : v.map(S.spotText);
      return fmt === 'oic' ? [n6(v[0]), n6(v[1]), n6(v[2])] : S.spotText(v);
    }
    if (p.type === 'int') return fmt === 'oic' ? v : String(v);
    return v;
  }
  function paramOf(sn, name) { var ps = (sn && sn.params) || []; for (var i = 0; i < ps.length; i++) if (ps[i].name === name) return ps[i]; return null; }
  function fill(node, env) {
    if (isArr(node)) {
      var arr = [];
      for (var i = 0; i < node.length; i++) { var x = fill(node[i], env); if (x !== OMIT) arr.push(x); }
      return arr;
    }
    if (!isObj(node)) return node;
    if (node.$param != null) {
      var p = paramOf(env.sn, node.$param), v = env.v[node.$param];
      if (!p) return OMIT;
      if (node.hasOwnProperty('on')) return v ? clone(node.on) : OMIT;
      if (node.as === 'secs') return v == null || v === '' ? OMIT : String(Math.max(1, Math.ceil(+v / 1000)));
      if (empty(v)) return OMIT;
      return write(p, v, env.fmt);
    }
    if (node.$it) return env.it == null ? OMIT : (env.fmt === 'oic' ? [n6(env.it[0]), n6(env.it[1]), n6(env.it[2])] : S.spotText(env.it));
    if (node.$wipe) return String(env.wipe);
    if (node.$id != null) return env.ids['id:' + node.$id];
    if (node.$head != null) { var h = env.ids['head:' + node.$head]; return node.s ? h + '.' + node.s : h; }
    if (node.$named != null) return node.$named ? env.ids.named + '.' + node.$named : env.ids.named;
    if (node.$join) {
      var t = '';
      for (var j = 0; j < node.$join.length; j++) { var y = fill(node.$join[j], env); if (y !== OMIT) t += str(y); }
      return t;
    }
    var o = {};
    for (var k in node) if (node.hasOwnProperty(k) && k !== '$need' && k !== '$quiet') { var z = fill(node[k], env); if (z !== OMIT) o[k] = z; }
    return o;
  }
  function needOk(st, key) { var v = st[key]; return !(v == null || v === '' || (isArr(v) && !v.length)); }
  function idsOf(steps, out) {
    (function walk(v) {
      if (isArr(v)) { for (var i = 0; i < v.length; i++) walk(v[i]); return; }
      if (!isObj(v)) return;
      if (typeof v.stepId === 'string') out.push(v.stepId);
      if (v.steps) walk(v.steps);
    })(steps);
    return out;
  }
  S.build = function (sn, values, fmt, ctx) {
    sn = typeof sn === 'string' ? S.get(sn) : sn;
    ctx = ctx || {};
    var out = { steps: [], notes: [], missing: [], ids: [] };
    if (!sn) { out.notes.push('There is no such quick button.'); return out; }
    if (sn.user) return buildUser(sn, values, fmt, ctx, out);
    var tpl = sn[fmt];
    if (!isArr(tpl)) {
      out.notes.push('"' + sn.label + '" has no form for ' + (fmt === 'jqb' ? 'ISXJQB instance files' : 'OgreBot zone files') + (sn.notes ? ': ' + sn.notes : '.'));
      return out;
    }
    var env = { sn: sn, v: S.values(sn, values), fmt: fmt, ids: fmt === 'oic' ? pickIds(sn, tpl, ctx) : {}, wipe: ctx.wipeNum || 1 };
    out.missing = S.missing(sn, env.v, fmt);
    for (var i = 0; i < tpl.length; i++) {
      var t = tpl[i], made = [];
      if (t && t.$each) {
        var list = env.v[t.$each] || [];
        for (var j = 0; j < list.length; j++) { env.it = list[j]; made.push(fill(t.step, env)); }
        env.it = null;
      } else made.push(fill(t, env));
      for (var k = 0; k < made.length; k++) {
        if (t && t.$need && !needOk(made[k], t.$need)) {
          if (!t.$quiet) out.notes.push('Left out ' + (t.$need === 'spots' || /^(WAYPOINT|CAMPSPOT)$/.test(str(made[k].type)) ? 'a walk to a spot not given yet' : 'a step with nothing filled in') + '.');
          continue;
        }
        out.steps.push(made[k]);
      }
    }
    if (fmt === 'oic') {
      out.ids = idsOf(out.steps, []);
      if (ctx.used) for (var u = 0; u < out.ids.length; u++) ctx.used[out.ids[u]] = 1;
    }
    return out;
  };

  var KIND = { point3f: 'pos', int: 'int', bool: 'check' };
  S.asTemplates = function (fmt) {
    var out = [];
    S.BUILTIN.forEach(function (sn) {
      if (!sn.picker || !isArr(sn[fmt])) return;
      var ps = S.paramsFor(sn, fmt), fields = [];
      ps.forEach(function (p) {
        var g = (p.grab || []).filter(function (x) { return x === 'pos' || x === 'target' || x === 'hover'; });
        fields.push({ key: p.name, kind: p.unit === 'ms' ? 'number' : (KIND[p.type] || 'text'), label: p.label, req: !!p.required,
          unit: p.unit === 'ms' ? 's' : p.unit, grab: g.length ? g : undefined, help: p.help, on: p.type === 'bool' ? '1' : undefined });
      });
      out.push({ id: sn.id, snip: true, icon: '&#128682;', name: sn.label, desc: sn.help, fields: fields,
        init: function () {
          var v = S.values(sn, {}), o = {};
          ps.forEach(function (p) { o[p.name] = p.unit === 'ms' ? (v[p.name] != null ? String(v[p.name] / 1000) : '') : (p.type === 'bool' ? (v[p.name] ? '1' : '') : (p.type === 'point3f' ? S.spotText(v[p.name]) : str(v[p.name]))); });
          return o;
        },
        build: function (d, n) {
          var vals = {};
          ps.forEach(function (p) { vals[p.name] = p.unit === 'ms' ? (str(d[p.name]).trim() === '' ? undefined : Math.round(parseFloat(d[p.name]) * 1000)) : d[p.name]; });
          return S.build(sn, vals, fmt, { wipeNum: n }).steps;
        } });
    });
    return out;
  };

  S.FILE = 'Data/jqb_ic_snippets.json';
  function slug(s) { return str(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'snippet'; }
  S.parseUser = function (text) {
    var out = { list: [], bad: [] }, d = null, t = str(text);
    if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
    if (!t.trim()) return out;
    try { d = JSON.parse(t); } catch (e) { out.bad.push('The file is not valid JSON: ' + e.message); return out; }
    var L = d && isArr(d.snippets) ? d.snippets : [];
    for (var i = 0; i < L.length; i++) {
      var s = L[i];
      if (!isObj(s) || !isArr(s.steps) || !s.steps.length) { out.bad.push('Snippet ' + (i + 1) + ' has no steps.'); continue; }
      if (s.fmt !== 'jqb' && s.fmt !== 'oic') { out.bad.push('Snippet ' + (i + 1) + ' does not say which kind of file it is for.'); continue; }
      var title = str(s.title).trim() || 'My snippet ' + (i + 1), params = [];
      (isArr(s.params) ? s.params : []).forEach(function (p) {
        if (isObj(p) && p.name && isArr(p.paths)) params.push({ name: str(p.name), type: p.type === 'string' ? 'string' : 'point3f', label: str(p.description || p.name),
          required: true, grab: p.type === 'string' ? NAME : SPOT, paths: p.paths });
      });
      out.list.push({ id: /^my:/.test(str(s.id)) ? str(s.id) : 'my:' + slug(s.id || title), user: true, label: title, title: title, fmt: s.fmt,
        steps: s.steps, params: params, icon: 'note', role: 'note', help: 'Your own snippet (' + s.steps.length + ' step' + (s.steps.length === 1 ? '' : 's') + ').',
        source: 'your snippets file' });
    }
    return out;
  };
  S.userText = function (list) {
    var o = { v: 1, snippets: (list || []).map(function (s) {
      return { id: s.id, title: s.title || s.label, fmt: s.fmt, steps: s.steps,
        params: (s.params || []).map(function (p) { return { name: p.name, type: p.type, description: p.label, paths: p.paths }; }) };
    }) };
    return JSON.stringify(o).replace(/[^\x00-\x7f]/g, function (c) { return '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4); });
  };
  function spotsIn(steps, fmt) {
    var out = [];
    function at(e, path) {
      if (!isObj(e)) return;
      if (fmt === 'jqb') {
        var t = str(e.type).toUpperCase();
        if ((t === 'WAYPOINT' || t === 'CAMPSPOT' || t === 'CAMPSPOT_WHO') && S.spot(e.data)) out.push({ path: path.concat(['data']), kind: 'spot', label: 'Spot ' + (out.length + 1) });
        if ((t === 'COMBAT' || t === 'CLICK') && str(e.data)) out.push({ path: path.concat(['data']), kind: 'name', label: (t === 'COMBAT' ? 'The named' : 'What to click') });
        if (t === 'HAIL' && str(e.target)) out.push({ path: path.concat(['target']), kind: 'name', label: 'Who to hail' });
        ['sub_steps', 'else_steps'].forEach(function (k) { if (isArr(e[k])) for (var i = 0; i < e[k].length; i++) at(e[k][i], path.concat([k, i])); });
      } else {
        if (isArr(e.spots)) for (var j = 0; j < e.spots.length; j++) if (S.spot(e.spots[j])) out.push({ path: path.concat(['spots', j]), kind: 'spot', label: 'Spot ' + (out.length + 1) });
        if (S.spot(e.spot)) out.push({ path: path.concat(['spot']), kind: 'spot', label: 'Spot ' + (out.length + 1) });
        if (typeof e.name === 'string' && e.name && (e['do'] === 'named' || e['do'] === 'actorInteract' || e['do'] === 'teleporter'))
          out.push({ path: path.concat(['name']), kind: 'name', label: e['do'] === 'named' ? 'The named' : 'What to click' });
        if (isArr(e.steps)) for (var s = 0; s < e.steps.length; s++) at(e.steps[s], path.concat(['steps', s]));
      }
    }
    for (var i = 0; i < steps.length; i++) at(steps[i], [i]);
    return out;
  }
  S.fromSteps = function (steps, fmt, opts) {
    opts = opts || {};
    var st = clone(steps || []), params = [], taken = {};
    S.user.forEach(function (u) { taken[u.id] = 1; });
    var title = str(opts.title).trim() || 'My snippet', id = 'my:' + slug(title);
    for (var n = 2; taken[id]; n++) id = 'my:' + slug(title) + '-' + n;
    spotsIn(st, fmt).forEach(function (w, i) {
      if (w.kind === 'spot' ? !opts.askSpots : !opts.askNames) return;
      params.push({ name: 'p' + (i + 1), type: w.kind === 'spot' ? 'point3f' : 'string', label: w.label, required: true, grab: w.kind === 'spot' ? SPOT : NAME, paths: [w.path] });
    });
    return { id: id, user: true, title: title, label: title, fmt: fmt, steps: st, params: params, icon: 'note', role: 'note', source: 'your snippets file',
      help: 'Your own snippet (' + st.length + ' step' + (st.length === 1 ? '' : 's') + ').' };
  };
  function setAt(o, path, v) {
    for (var i = 0; i < path.length - 1; i++) { if (o == null) return; o = o[path[i]]; }
    if (o != null && typeof o === 'object') o[path[path.length - 1]] = v;
  }
  function buildUser(sn, values, fmt, ctx, out) {
    var v = S.values(sn, values), st = clone(sn.steps);
    out.missing = S.missing(sn, v, fmt);
    (sn.params || []).forEach(function (p) {
      if (empty(v[p.name])) return;
      (p.paths || []).forEach(function (path) { setAt(st, path, p.type === 'point3f' ? (sn.fmt === 'oic' ? [n6(v[p.name][0]), n6(v[p.name][1]), n6(v[p.name][2])] : S.spotText(v[p.name])) : v[p.name]); });
    });
    var X = IC.imp;
    if (sn.fmt === fmt) {
      if (fmt === 'oic' && X) { var z = X.zoneToZone(st, ctx); out.steps = z.steps; out.ids = idsOf(z.steps, []); }
      else if (fmt === 'jqb' && X) out.steps = X.jqbClone(st, ctx).entries;
      else out.steps = st;
    } else if (sn.fmt === 'oic' && fmt === 'jqb' && X) {
      var j = X.zoneToJqb(st, ctx);
      out.steps = j.entries;
      j.notes.forEach(function (n) { if (n.status !== 'ok') out.notes.push(n.what + ': ' + n.why); });
    } else out.notes.push('"' + sn.label + '" was saved from ' + (sn.fmt === 'jqb' ? 'an ISXJQB instance file' : 'an OgreBot zone file') + ' and fits only that kind.');
    return out;
  }
})(typeof window !== 'undefined' ? window : this);
