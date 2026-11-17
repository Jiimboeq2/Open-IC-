/* Open IC Creator - ic-registry.js
   Step-type registry for ISXJQB instance files (IC.reg). One schema entry per step type drives the step label,
   the add-step menu, the generated step form and validation. The entries are defined in ic-steps-*.js.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var R = IC.reg = IC.reg || {};

  R.types = R.types || {};
  R.alias = R.alias || {};
  R.templates = R.templates || {};
  R.order = R.order || [];

  R.CATS = [
    { id: 'move',     name: 'Moving',               color: '#4fc3f7' },
    { id: 'fight',    name: 'Fighting',             color: '#00cc66' },
    { id: 'wait',     name: 'Waiting',              color: '#ffe633' },
    { id: 'use',      name: 'Doors, NPCs & objects', color: '#00ccff' },
    { id: 'group',    name: 'Group & setup',        color: '#ff9933' },
    { id: 'logic',    name: 'Checks & loops',       color: '#cc66ff' },
    { id: 'advanced', name: 'Advanced',             color: '#9aa4b0' },
    { id: 'v3',       name: 'Template blocks (template files only)', color: '#80d0ff' },
    { id: 'inactive', name: 'Saved but not run yet', color: '#c97b7b' }
  ];

  R.V3_RAW_KEYS = {
    type: 1, data: 1, raw: 1, target: 1, boss: 1, interact: 1, action: 1, mode: 1,
    distance: 1, angle: 1, ability: 1, hold: 1, radius: 1, kill_order: 1,
    position: 1, extra_targets: 1, no_autotarget: 1, who: 1, comment: 1,
    group: 1, optional: 1, expect_zoning: 1, label: 1, fight_rules: 1
  };

  R.V2_KEYS = {
    type: 1, data: 1, raw: 1, interact: 1, comment: 1, optional: 1, expect_zoning: 1,
    target: 1, action: 1, mode: 1, distance: 1, angle: 1, ability: 1, who: 1, radius: 1,
    trigger_type: 1, pattern: 1, coords: 1, hp_min: 1, hp_max: 1, kill_order: 1,
    position: 1, extra_targets: 1, no_autotarget: 1, verb: 1, phase: 1, hold: 1, group: 1,
    wp: 1, path_waypoints: 1, condition: 1, condition_value: 1, timeout: 1,
    max_iterations: 1, sub_steps: 1, else_steps: 1, x: 1, y: 1, z: 1,
    value: 1, once: 1, cooldown: 1, repeat_while: 1, or_trigger_type: 1, or_pattern: 1,
    or_target: 1, or_value: 1, action_type: 1, action_params: 1, trigger_pattern: 1,
    phase_name: 1, trigger_value: 1, target_role: 1, campspot: 1, actions: 1, fight_rules: 1
  };

  R.NEST = ['sub_steps', 'else_steps', 'fight_rules'];
  R.DO_TYPES = ['OC', 'CMD', 'WAIT', 'TARGET', 'CAST', 'CLEARTARGET', 'WAYPOINT', 'CAMPSPOT',
    'CAMPSPOT_WHO', 'MSGBOX', 'SAY', 'COMMENT'];
  R.RULE_TYPES = ['ON_EVENT'];

  R.WHO_JB = [
    ['all', 'Everyone'], ['self', 'Just me (the box running the zone)'],
    ['tank', 'Tanks'], ['healer', 'Healers'], ['dps', 'Everyone but tanks'],
    ['mage', 'Mages'], ['scout', 'Scouts'], ['enchanter', 'Enchanters'],
    ['not_me', 'Everyone but me'], ['notscout', 'Everyone but scouts'],
    ['notpriest', 'Everyone but healers'], ['notmage', 'Everyone but mages'],
    ['druid', 'Druids'], ['bard', 'Bards'], ['shaman', 'Shamans'], ['cleric', 'Clerics'],
    ['templar', 'Templar'], ['inquisitor', 'Inquisitor'], ['warden', 'Warden'], ['fury', 'Fury'],
    ['mystic', 'Mystic'], ['defiler', 'Defiler'], ['dirge', 'Dirge'], ['troubador', 'Troubador'],
    ['wizard', 'Wizard'], ['warlock', 'Warlock'], ['conjuror', 'Conjuror'], ['necromancer', 'Necromancer'],
    ['illusionist', 'Illusionist'], ['coercer', 'Coercer'], ['assassin', 'Assassin'], ['ranger', 'Ranger'],
    ['swashbuckler', 'Swashbuckler'], ['brigand', 'Brigand'], ['berserker', 'Berserker'],
    ['guardian', 'Guardian'], ['shadowknight', 'Shadowknight'], ['paladin', 'Paladin'],
    ['monk', 'Monk'], ['bruiser', 'Bruiser']
  ];
  R.WHO_OGRE = [
    ['igw:${Me.Name}', 'Everyone in my group'],
    ['igw:${Me.Name}+fighter', 'Tanks'],
    ['igw:${Me.Name}+priest', 'Healers'],
    ['igw:${Me.Name}+mage', 'Mages'],
    ['igw:${Me.Name}+scout', 'Scouts'],
    ['igw:${Me.Name}+notfighter', 'Everyone but tanks'],
    ['all', 'Everyone (same as my group)']
  ];
  R.CLASSES = ['guardian', 'berserker', 'monk', 'bruiser', 'shadowknight', 'paladin',
    'templar', 'inquisitor', 'warden', 'fury', 'mystic', 'defiler', 'channeler',
    'wizard', 'warlock', 'illusionist', 'coercer', 'conjuror', 'necromancer',
    'swashbuckler', 'brigand', 'troubador', 'dirge', 'ranger', 'assassin', 'beastlord'];

  R.COMMON = [
    { key: 'raw', kind: 'text', label: 'Description',
      help: 'Shown in game while this step runs and in the log. Example: "Pull the first named".' },
    { key: 'phase', kind: 'check', label: 'Only when entering from outside', on: 'outside',
      help: 'Skipped when the run starts inside the zone (zone-in steps).' },
    { key: 'group', kind: 'text', label: 'Skip-group tag',
      help: 'A run option (Settings > Run options) can skip every step with this tag.' },
    { key: 'optional', kind: 'check', label: 'Optional', store: 'bool', on: true,
      help: 'Marks the step optional (kept for files that use it).' },
    { key: 'comment', kind: 'text', label: 'Author note',
      help: 'A note for whoever edits the file. A Note step prints it to the log.' }
  ];

  function normField(f, schema) {
    if (!f.kind) f.kind = 'text';
    if (f.rt === undefined) f.rt = true;
    if (f.inactive) f.rt = false;
    f.id = (f.part ? 'part:' + f.part : (f.key || f.kind));
    return f;
  }

  R.define = function (s) {
    if (!s || (!s.type && !s.tpl)) return;
    if (s.rt === undefined) s.rt = true;
    if (!s.jargon) s.jargon = s.type || s.tpl;
    if (!s.icon) s.icon = '&#9679;';
    s.fields = (s.fields || []).map(function (f) { return normField(f, s); });
    s.deps = {};
    for (var i = 0; i < s.fields.length; i++) {
      var w = s.fields[i].when;
      if (w && typeof w === 'object') s.deps[w.k || ('part:' + w.part)] = 1;
    }
    for (var j = 0; j < s.fields.length; j++) {
      if (s.deps[s.fields[j].id]) s.fields[j].rerender = true;
    }
    if (s.tpl) {
      R.templates[s.tpl] = s;
      s.key = 'TPL:' + s.tpl;
    } else {
      R.types[s.type] = s;
      s.key = 'T:' + s.type;
      (s.aliases || []).forEach(function (a) { R.alias[a] = s.type; });
    }
    R.order.push(s);
  };

  if (IC._pendingDefs) {
    var pend = IC._pendingDefs; IC._pendingDefs = null;
    for (var pi = 0; pi < pend.length; pi++) R.define(pend[pi]);
  }

  R.UNKNOWN = {
    type: '?', key: 'T:?', name: 'Step the game skips', jargon: '', icon: '&#10067;',
    cat: 'inactive', rt: false, fields: [], deps: {},
    help: 'The game does not know this step type and skips it. It is kept in the file exactly as it is.'
  };

  R.forEntry = function (e) {
    if (!e || typeof e !== 'object') return R.UNKNOWN;
    if (e.template !== undefined && e.template !== '') {
      return R.templates[e.template] || R.UNKNOWN;
    }
    var t = String(e.type || '');
    if (R.types[t]) return R.types[t];
    if (R.alias[t]) return R.types[R.alias[t]];
    return R.UNKNOWN;
  };
  R.byKey = function (key) {
    if (!key) return null;
    if (key.indexOf('TPL:') === 0) return R.templates[key.slice(4)] || null;
    if (key.indexOf('P:') === 0) return (R.presets && R.presets[key.slice(2)]) || null;
    if (key.indexOf('T:') === 0) return R.types[key.slice(2)] || null;
    return R.types[key] || R.templates[key] || null;
  };

  R.typeActive = function (s, fmt) {
    if (!s) return false;
    if (s.rt === true) return true;
    if (s.rt === false) return false;
    return s.rt === fmt;
  };
  R.fieldActive = function (s, f, fmt) {
    if (!f) return false;
    if (f.rt === false) return false;
    if (f.rt !== true && f.rt !== fmt) return false;
    if (fmt === 'v3' && s && !s.tpl && !s.pseudo && !s.v3full && f.key) {
      var top = String(f.key).split('.')[0];
      if (!R.V3_RAW_KEYS[top]) return false;
    }

    return true;
  };

  R.menu = function (ctx) {
    ctx = ctx || {};
    var fmt = ctx.fmt || 'v2', showInactive = !!ctx.showInactive, only = ctx.only || null;
    var out = [];
    for (var c = 0; c < R.CATS.length; c++) {
      var cat = R.CATS[c], items = [];
      if (cat.id === 'inactive' && !showInactive) continue;
      if (cat.id === 'v3' && fmt !== 'v3') continue;
      for (var i = 0; i < R.order.length; i++) {
        var s = R.order[i];
        if (only) { if (s.tpl || only.indexOf(s.type) < 0) continue; }
        else if (s.hidden || s.fightOnly) continue;
        var active = R.typeActive(s, fmt);
        var inCat = active ? (s.cat === cat.id) : (cat.id === 'inactive');
        if (!inCat) continue;
        if (s.tpl && fmt !== 'v3') continue;
        if (!active && !showInactive) continue;
        items.push(s);
      }
      items.sort(function (a, b) { return (a.ord || 0) - (b.ord || 0); });
      if (items.length) out.push({ cat: cat, items: items });
    }
    return out;
  };

  R.onlyFor = function (host, key) {
    var s = R.forEntry(host);
    for (var i = 0; i < s.fields.length; i++) if (s.fields[i].key === key && s.fields[i].only) return R.onlyList(s.fields[i].only);
    return null;
  };
  R.onlyList = function (o) { return o === 'DO' ? R.DO_TYPES : (o === 'RULES' ? R.RULE_TYPES : (o || null)); };
  R.inDoList = function (p) {
    if (!p || p.length < 3 || !IC.model) return false;
    return R.onlyFor(IC.model.get(p.slice(0, p.length - 2)), p[p.length - 2]) === R.DO_TYPES;
  };
  R.misplaced = function (s, only) {
    if (!s || s === R.UNKNOWN) return false;
    return only ? only.indexOf(s.type) < 0 : !!s.fightOnly;
  };

  R.quickList = function (ctx) {
    var fmt = (ctx && ctx.fmt) || 'v2', out = [];
    for (var i = 0; i < R.order.length; i++) {
      var s = R.order[i];
      if (s.quick && !s.tpl && R.typeActive(s, fmt)) out.push(s);
    }
    out.sort(function (a, b) { return a.quick - b.quick; });
    return out;
  };

  var U = R.U = {
    num: function (v, dp) {
      var n = parseFloat(v);
      if (isNaN(n)) return String(v == null ? '' : v);
      var m = Math.pow(10, dp == null ? 1 : dp);
      return String(Math.round(n * m) / m);
    },
    pos: function (s) {
      if (s && typeof s === 'object' && s.length >= 3) s = s[0] + ',' + s[1] + ',' + s[2];
      var p = String(s || '').replace(/^\s*jb\s+nav\s+goto\s+/i, '').split(/[\s,]+/).filter(function (x) { return x !== ''; });
      if (p.length < 3) return '(no spot yet)';
      return U.num(p[0]) + ', ' + U.num(p[1]) + ', ' + U.num(p[2]);
    },
    q: function (s, n) {
      s = String(s == null ? '' : s);
      n = n || 32;
      return s.length > n ? s.substring(0, n - 1) + '...' : s;
    },
    name: function (s, def) {
      s = String(s == null ? '' : s).trim();
      return s ? U.q(s, 34) : (def || '(no name yet)');
    },
    secs: function (s, def) {
      var v = String(s == null ? '' : s).trim();
      return (v === '' ? def : v) + ' s';
    },
    who: function (v, list) {
      v = String(v == null ? '' : v);
      var L = list || R.WHO_JB;
      for (var i = 0; i < L.length; i++) if (L[i][0] === v) return L[i][1];
      for (var j = 0; j < R.WHO_OGRE.length; j++) if (R.WHO_OGRE[j][0] === v) return R.WHO_OGRE[j][1];
      if (!v) return 'Everyone';
      return (typeof IC.dispName === 'function') ? IC.dispName(v) : v;
    }
  };

  R.labelFor = function (e) {
    var s = R.forEntry(e);
    if (s === R.UNKNOWN) {
      var t = e && (e.template ? 'template ' + e.template : e.type);
      return (t ? String(t) : 'Unknown entry') + (e && e.data ? ': ' + U.q(e.data, 30) : '');
    }
    try {
      if (s.label) return s.label(e, U);
    } catch (_e) {}
    var d = e && e.data != null && e.data !== '' ? ': ' + U.q(e.data, 30) : '';
    return s.name + d;
  };

  R.newEntry = function (s, ctx) {
    if (s.newEntry) return s.newEntry(ctx || {});
    var e = {};
    if (s.tpl) e.template = s.tpl; else e.type = s.type;
    for (var i = 0; i < s.fields.length; i++) {
      var f = s.fields[i];
      if (f.def === undefined || f.part || !f.key) continue;
      if (f.key.indexOf('.') >= 0) continue;
      e[f.key] = f.def;
    }
    if (!s.tpl && e.data === undefined && s.dataKey !== false) e.data = '';
    return e;
  };

  R.catOf = function (id) {
    for (var i = 0; i < R.CATS.length; i++) if (R.CATS[i].id === id) return R.CATS[i];
    return R.CATS[R.CATS.length - 1];
  };

  function nstr(v) { return v == null ? '' : String(v); }
  function ndef(s, ord) { s.ord = ord; R.define(s); }
  function spotsOf(e) { return Array.isArray(e && e.path_waypoints) ? e.path_waypoints : []; }
  ndef({
    type: 'NATIVE_PATH', cat: 'move', rt: 'v2', icon: '&#129517;', name: 'Walk the group along spots (Ogre map)',
    help: 'The group walks spot to spot on Ogre\'s map, fights anything on the way, and gathers at each spot.',
    more: 'With native Ogre every box finds its own way on Ogre\'s map; without it this box walks the JQB map and the group follows its camp spot. ' +
      'The walk joins at the spot nearest the group unless "Always start at the first spot" is ticked.',
    label: function (e, U) {
      var w = spotsOf(e), n = w.length, last = n ? w[n - 1] : null;
      return 'Walk the group along ' + n + ' spot' + (n === 1 ? '' : 's') + (last ? ' to ' + U.pos([last.x, last.y, last.z]) : '') +
        (e.target ? ' (ends if ' + U.name(e.target) + ' comes for us)' : '') + (nstr(e.action) === 'nocombat' ? ' (no stops for fights)' : '');
    },
    newEntry: function () { return { type: 'NATIVE_PATH', data: '', mode: 'nav', distance: '5', path_waypoints: [] }; },
    check: function (e) {
      var w = spotsOf(e), out = [], zero = 0, bad = 0;
      if (!w.length) out.push({ level: 'error', msg: 'Add at least one spot: with none the game skips the walk.' });
      for (var i = 0; i < w.length; i++) {
        var p = w[i] || {};
        if (!isFinite(parseFloat(p.x)) || !isFinite(parseFloat(p.y)) || !isFinite(parseFloat(p.z))) bad++;
        else if (+p.x === 0 && +p.y === 0 && +p.z === 0) zero++;
      }
      if (bad) out.push({ level: 'error', msg: bad + ' spot' + (bad === 1 ? ' has' : 's have') + ' no x, y, z: click Pos on each.' });
      if (zero) out.push({ level: 'warn', msg: zero + ' spot' + (zero === 1 ? ' is' : 's are') + ' 0,0,0 (a placeholder): stand there and click Pos.' });
      var last = w.length ? w[w.length - 1] : null, end = IC.pack.posParse(e.data);
      if (last && end && Math.abs(end.x - last.x) + Math.abs(end.y - last.y) + Math.abs(end.z - last.z) > 1)
        out.push({ level: 'warn', msg: '"Where the walk ends" is not the last spot: after a wipe the run would pick up from the wrong place.' });
      return out;
    },
    fields: [
      { key: 'path_waypoints', kind: 'list', label: 'Spots, in order', essential: true, addPos: true, itemName: 'Spot',
        item: [{ key: 'x', kind: 'xyz', label: 'Spot', grab: ['pos'] }],
        help: 'Click "+ Add where I stand" at each spot along the way.' },
      { key: 'target', kind: 'text', label: 'Stop when this named comes for us', grab: ['target'],
        help: 'Optional, the exact name. When he attacks, the walk ends where the group stands and he is fought there.' },
      { key: 'action', kind: 'check', label: 'Walk on through fights', on: 'nocombat', help: 'Ticked: no stopping to fight on the way.' },
      { key: 'once', kind: 'check', label: 'Always start at the first spot', on: 'true', help: 'Otherwise the walk joins at the spot nearest the group.' },
      { key: 'distance', kind: 'int', label: 'Counts as there within', unit: 'm', def: '5', min: 1, max: 100, adv: true, help: 'Default 5.' },
      { key: 'data', kind: 'pos', label: 'Where the walk ends', adv: true, grab: ['pos'],
        help: 'The last spot. After a wipe the run picks up from the walk nearest the group.' },
      { key: 'mode', kind: 'text', label: 'Walk kind (from the import)', rt: false, quiet: true, help: 'Not read by the game.' }
    ]
  }, 1901);
  ndef({
    type: 'NATIVE_TELEPORTER', cat: 'use', rt: 'v2', icon: '&#10024;', name: 'Everyone takes a teleporter',
    help: 'Every box clicks its own nearest teleporter with this name; the run goes on once I stand at the landing spot.',
    more: 'Waits for any fight to end, turns the camp spots off so nobody is pulled back, clicks again after 8 s if needed, then camps everyone where they landed.',
    label: function (e, U) { return 'Everyone through ' + U.name(e.data) + (nstr(e.coords) ? ' to ' + U.pos(e.coords) : ''); },
    fields: [
      { key: 'data', kind: 'text', label: 'Teleporter', req: true, essential: true, grab: ['hover', 'target'],
        help: 'Its exact name. Hover it in game and click Hover.' },
      { key: 'coords', kind: 'pos', label: 'Landing spot', req: true, essential: true, grab: ['pos'],
        help: 'Where you stand after going through. Click Pos there.' },
      { key: 'timeout', kind: 'int', label: 'Give up after', unit: 's', min: 5, max: 600, help: 'Default 20.' }
    ]
  }, 1902);
  ndef({
    type: 'NATIVE_ZONEOUT', cat: 'use', icon: '&#128682;', name: 'Leave by an exit you name',
    help: 'The group walks to the exit with this name, everyone clicks it, the row is picked if a zone list pops up, then the zone change.',
    more: 'The exit must be within "Look for it within". A native zone file\'s run ends once this takes the group out.',
    label: function (e, U) { return 'Leave through ' + U.name(e.data) + (nstr(e.action) && nstr(e.action) !== '1' ? ' (row ' + U.q(e.action, 20) + ')' : ''); },
    fields: [
      { key: 'data', kind: 'text', label: 'Exit', req: true, essential: true, grab: ['hover', 'target'], help: 'Its exact name, like Exit or zone_exit.' },
      { key: 'distance', kind: 'number', label: 'Look for it within', unit: 'm', def: '30', min: 1, max: 10000,
        help: 'Default 30. The group walks to it when it is farther than 8 m.' },
      { key: 'action', kind: 'text', label: 'Zone list row', help: 'When a list of zones pops up: the row\'s text, or its number (1 = the first). Empty = 1.' }
    ]
  }, 1903);
  ndef({
    type: 'NATIVE_SHINIES', cat: 'fight', icon: '&#128160;', name: 'Collect the shinies around here',
    help: 'Walks to every shiny (a "?" on the ground) within the distance, nearest first, picks it up, then comes back.',
    more: 'Waits for any fight to end first. OgreBot\'s loot takes each one; a double-click picks it up when it has not after 4 s. Only this box walks.',
    label: function (e) { return 'Collect the shinies within ' + (nstr(e.data).trim() || '75') + ' m'; },
    fields: [{ key: 'data', kind: 'int', label: 'Within', unit: 'm', def: '75', min: 5, max: 1000, essential: true, help: 'Default 75.' }]
  }, 2901);
  ndef({
    type: 'NATIVE_WAIT', cat: 'wait', hidden: true, icon: '&#8987;', name: 'Wait until Ogre zone-file checks are true',
    help: 'Holds the run until every check is true, or the time runs out.',
    more: 'Brought over from an Ogre zone file. The checks are written the way Ogre writes them; the step title says them in words.',
    label: function (e) { return 'Wait until ' + IC.pack.nativeCondText(e.data) + ' (up to ' + (nstr(e.timeout).trim() || '60') + ' s)'; },
    fields: [
      { key: 'data', kind: 'textarea', label: 'Checks (as Ogre writes them)', req: true, essential: true, ncond: true,
        help: 'All of them must be true. A typo makes the check false.' },
      { key: 'timeout', kind: 'int', label: 'Give up after', unit: 's', min: 1, max: 86400, help: 'Default 60.' },
      { key: 'action', kind: 'select', label: 'If it never comes true',
        opts: [['', 'Go on'], ['proceed', 'Go on'], ['fail', 'Go on (native Ogre stops the zone here)']] }
    ]
  }, 3901);
  ndef({
    type: 'NATIVE_BIND', cat: 'logic', hidden: true, icon: '&#128204;', name: 'Remember the first one found (for the steps after)',
    help: 'Finds the first actor that matches and remembers its spot and id for the steps after this one.',
    more: 'The steps after it read the spot as ${JBV_<name>_x}, _y and _z, and the id as ${JBV_<name>_id}. An import writes these for you.',
    label: function (e, U) { return 'Remember the first ' + IC.pack.nativeQueryText(e.target) + ' as "' + U.q(e.data, 16) + '"'; },
    fields: [
      { key: 'data', kind: 'text', label: 'Remember it as', req: true, essential: true, pattern: '^[A-Za-z0-9_]+$',
        help: 'Letters, digits and _ only. Example: light' },
      { key: 'target', kind: 'text', label: 'Which one (a game search)', req: true, essential: true, pattern: '^[^\\]]*$',
        help: 'An actor search with no ] in it, like: Name == "a light" && Distance < 100' }
    ]
  }, 3902);
  ndef({
    type: 'NATIVE_ANNOUNCE', cat: 'logic', hidden: true, icon: '&#128227;', name: 'Say how it went (a log line)',
    help: 'Prints a line in the log, like an Ogre zone file\'s "announce": how a named or its chest went.',
    more: '{{named:Name}} becomes killed, alive or gone; {{loot:chest}} becomes done; {{me}} is my name.',
    label: function (e, U) { return 'Say: "' + U.q(IC.pack.nativeMsgText(e.data), 80) + '"'; },
    fields: [{ key: 'data', kind: 'text', label: 'Line', req: true, essential: true }]
  }, 3903);
  ndef({
    type: 'NATIVE_NOTE', cat: 'logic', hidden: true, noTest: true, icon: '&#9888;', name: 'A step the import could not bring over',
    help: 'Says on the console which Ogre zone-file step was left out and why. Does nothing else.',
    label: function (e, U) { return 'Left out: ' + U.q(IC.pack.nativeMsgText(e.data), 70); },
    fields: [{ key: 'data', kind: 'text', label: 'What was left out', essential: true }]
  }, 3904);

  R.OC_FILL = {
    TARGETNAME: 'the mob or object', PLAYERNAME: 'the player', MERCHANTNAME: 'the merchant', ABILITYNAME: 'the ability',
    EFFECTNAME: 'the effect', ZONENAME: 'the zone', ITEMNAME: 'the item', MESSAGE: 'the text', SCRIPTNAME: 'the script',
    EVENTNAME: 'the event', LISTNAME: 'the kill list', PROFILENAME: 'the profile', QUESTNAME: 'the quest', VERBNAME: 'the verb',
    CURETYPE: 'the cure type', ICONID: 'the icon id', ABILITYID: 'the ability id', MAINID: 'the icon id', BACKDROPID: 'the backdrop id',
    OPTIONID: 'the option', TAGNAME: 'the tag', VARNAME: 'the name', VALUE: 'the value', COMMAND: 'the command', POSHERE: 'the spot',
    STARTSPOT: 'the spot to line up at', JUMPSPOT: 'the spot to jump at', LANDSPOT: 'the landing spot', DONESPOT: 'the spot to camp at after',
    'X Y Z': 'the spot'
  };
  R.OC_PH = new RegExp('\\b(' + Object.keys(R.OC_FILL).filter(function (k) { return k.indexOf(' ') < 0; }).join('|') + ')\\b|\\bX Y Z\\b');
  R.ocFill = function (line) {
    var re = new RegExp(R.OC_PH.source, 'g'), s = nstr(line), out = [], seen = {}, m;
    while ((m = re.exec(s))) if (!seen[m[0]]) { seen[m[0]] = 1; out.push(R.OC_FILL[m[0]] || m[0]); }
    return out;
  };

  R.presets = R.presets || {};
  R.preset = function (p) {
    if (R.presets[p.id]) return R.presets[p.id];
    var s = { key: 'P:' + p.id, preset: true, type: 'OC', cat: p.cat, ord: p.ord, icon: p.icon, name: p.name, help: p.help,
      jargon: 'OgreBot command', rt: true, fields: [], deps: {}, line: p.line,
      newEntry: function () { return { type: 'OC', data: p.line }; } };
    R.presets[p.id] = s;
    R.order.push(s);
    return s;
  };
  function pdef(id, cat, ord, icon, name, help, line) { R.preset({ id: id, cat: cat, ord: ord, icon: icon, name: name, help: help, line: line }); }
  pdef('jumpgap', 'move', 1950, '&#11014;', 'Jump across a gap', 'The group lines up, runs at the landing spot and jumps at the spot you set, then camps where you say.',
    'oc !ci -Set_CampSpotJump_Handle igw:${Me.Name} "STARTSPOT" "JUMPSPOT" "LANDSPOT" "DONESPOT"');
  pdef('follow', 'move', 1951, '&#128099;', 'Follow me (OgreBot follow)', 'My group follows me with OgreBot\'s own follow, 8 m behind.',
    'oc !ci -ogrefollow igw:${Me.Name} ${Me.Name} 8 200');
  pdef('flyup', 'move', 1952, '&#9650;', 'Fly or swim up', 'My group starts flying (or swimming) up. Add "Stop flying" where they should stop.',
    'oc !ci -FlyUp igw:${Me.Name}');
  pdef('flydown', 'move', 1953, '&#9660;', 'Fly or swim down', 'My group starts flying (or swimming) down. Add "Stop flying" where they should stop.',
    'oc !ci -FlyDown igw:${Me.Name}');
  pdef('flystop', 'move', 1954, '&#9632;', 'Stop flying up or down', 'My group stops flying (or swimming) up or down.',
    'oc !ci -FlyStop igw:${Me.Name}');
  pdef('target', 'fight', 2950, '&#127919;', 'Target a mob or player', 'My group targets a mob or player by name (part of a name works).',
    'oc !ci -Target igw:${Me.Name} TARGETNAME');
  pdef('notarget', 'fight', 2951, '&#10060;', 'Drop every target', 'My group clears its targets (it also stops a "come to me").',
    'oc !ci -NoTarget igw:${Me.Name}');
  pdef('useitem', 'use', 1950, '&#128230;', 'Use an item from the bags', 'My group uses an item from their bags (its exact name).',
    'oc !ci -UseItem igw:${Me.Name} "ITEMNAME"');
  pdef('special', 'use', 1951, '&#11088;', 'Click the nearest special object', 'My group clicks the nearest object the game marks as special.',
    'oc !ci -Special igw:${Me.Name}');
})(typeof window !== 'undefined' ? window : this);
