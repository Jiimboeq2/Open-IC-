/* Open IC Creator - ic-icons.js
   Icon choice for every flowchart box and chip (IC.icons): a spell icon id over a backdrop tile, by step kind and role.
   Without the game's icon sheets the flowchart shows its own glyphs instead.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var I = IC.icons = IC.icons || {};
  function str(v) { return v == null ? '' : String(v); }
  function isArr(v) { return Object.prototype.toString.call(v) === '[object Array]'; }
  I.BACK = { action: 313, move: 312, cond: 317, loop: 312, alt: 315, state: 314, start: 313, end: 313, sec: 316, note: -1 };
  var K = I.K = {
    move: [303, 317], mappoint: 1192, camp: 455, split: 439, fight: 1032, named: 764, trash: 743, click: 652, verb: 541, wait: 759, loot: 959,
    precast: 863, aeblock: [657, 313], evac: 1188, onlyif: 404, loop: 1098, repeat: 119, fights: 397, stop: 1139, tell: 400, line: 566,
    horn: 701, message: 1181, setvar: 398, timer: 759, option: 405, killlist: 675, target: 1130, cure: 751, curse: 1036, dispel: 1105,
    ho: 867, jump: 873, watch: 60, pet: 454, item: 402, bag: 778, note: 403, door: 1102, hail: 1009, mount: 827, pause: 786,
    interrupt: 1138, instance: 1101, flag: 1035, dies: 545, health: 703, rez: 277, tank: 154, cast: 1062, 'import': 399
  };
  function mk(key, role) {
    var v = K[key];
    if (v == null) return null;
    if (isArr(v)) return { id: v[0], back: v[1] };
    return { id: v, back: role ? (I.BACK[role] != null ? I.BACK[role] : -1) : -1 };
  }
  I.mk = mk;
  I.SPELL_CELLS = 1224;
  I.backTile = function (back) {
    var b = Math.floor(+back);
    if (!(b > 0) || b === 65535) return -1;
    if (b >= 0x8000) { b = b & 0x7FFF; return b >= 312 && b <= 318 ? b : -1; }
    return b < I.SPELL_CELLS ? b : -1;
  };
  I.off = !!I.off;
  function pairOf(p) { return p && +p.id > 0 ? { id: +p.id, back: I.backTile(p.back) } : null; }
  I.abilPair = I.abilPair || null;
  I.exportPair = I.exportPair || null;
  I.myClass = I.myClass || '';
  I.abilClasses = I.abilClasses || null;
  I.groupClasses = I.groupClasses || [];
  I.canClass = !!I.canClass;
  var ARCH = {
    fighter: ['guardian', 'berserker', 'monk', 'bruiser', 'shadowknight', 'paladin'],
    priest: ['templar', 'inquisitor', 'fury', 'warden', 'mystic', 'defiler', 'channeler'],
    mage: ['wizard', 'warlock', 'conjuror', 'necromancer', 'illusionist', 'coercer'],
    scout: ['troubador', 'dirge', 'swashbuckler', 'brigand', 'ranger', 'assassin', 'beastlord']
  };
  var MID = { warrior: ['guardian', 'berserker'], brawler: ['monk', 'bruiser'], crusader: ['shadowknight', 'paladin'], cleric: ['templar', 'inquisitor'],
    druid: ['fury', 'warden'], shaman: ['mystic', 'defiler'], sorcerer: ['wizard', 'warlock'], summoner: ['conjuror', 'necromancer'],
    enchanter: ['illusionist', 'coercer'], bard: ['troubador', 'dirge'], rogue: ['swashbuckler', 'brigand'], predator: ['ranger', 'assassin'], animalist: ['beastlord'] };
  I.ARCH = ARCH; I.MID = MID;
  I.isClass = function (c) { c = str(c).toLowerCase(); for (var a in ARCH) if (ARCH.hasOwnProperty(a) && ARCH[a].indexOf(c) >= 0) return true; return false; };
  I.mine = function (name) {
    var n = str(name).trim();
    if (typeof I.exportPair === 'function' && pairOf(I.exportPair(n))) return true;
    if (!I.myClass || typeof I.abilClasses !== 'function') return true;
    var c = I.abilClasses(n);
    return !!(c && c.indexOf(str(I.myClass).toLowerCase()) >= 0);
  };
  I.whoClasses = function (who) {
    var out = [], parts = str(who).toLowerCase().split(/[|+,\s]+/);
    for (var i = 0; i < parts.length; i++) {
      var w = parts[i].replace(/^@/, '').replace(/\d+$/, '');
      if (!w || /^(not|-)/.test(w)) continue;
      var L = ARCH[w] || MID[w] || (I.isClass(w) ? [w] : null);
      for (var j = 0; L && j < L.length; j++) if (out.indexOf(L[j]) < 0) out.push(L[j]);
    }
    return out;
  };
  I.JOB = { tank: 'fighter', cure: 'priest', curse: 'priest', rez: 'priest', dispel: 'mage' };
  I.forWho = function (who, job, classes) {
    if (!I.canClass) return null;
    var c = I.whoClasses(who);
    if (!c.length && job && ARCH[job]) c = ARCH[job];
    if (!c.length && classes) c = classes;
    if (!c.length) return null;
    var g = I.groupClasses || [], pick = '';
    for (var i = 0; i < g.length && !pick; i++) if (c.indexOf(str(g[i]).toLowerCase()) >= 0) pick = str(g[i]).toLowerCase();
    if (!pick && c.length === 1) pick = c[0];
    return pick ? { cls: pick, k: 'who', name: pick } : null;
  };
  I.forAbil = function (name) {
    var n = str(name).trim();
    if (I.off || !n || /\{\{|\$\{/.test(n) || /^Item:/i.test(n)) return null;
    var p = typeof I.exportPair === 'function' ? pairOf(I.exportPair(n)) : null;
    if (p) return p;
    if (!I.mine(n)) return I.forWho('', '', typeof I.abilClasses === 'function' ? I.abilClasses(n) : null);
    return typeof I.abilPair === 'function' ? pairOf(I.abilPair(n)) : null;
  };
  I.itemPair = I.itemPair || null;
  I.itemName = function (name) {
    var n = str(name).trim().replace(/^Item:\s*/i, '');
    if (/^_EQUIPPED_/i.test(n) || /\{\{|\$\{/.test(n)) return '';
    return n.replace(/^_ADORN_(?:\d+_)?/i, '').trim();
  };
  I.forItem = function (name) {
    var n = I.itemName(name);
    if (I.off || !n || typeof I.itemPair !== 'function') return null;
    var id = Math.floor(+I.itemPair(n));
    return id > 0 ? { id: id, back: -1, item: true } : null;
  };
  I.itemOfLine = function (text) {
    var s = str(text), m;
    if ((m = /Inventory:(?:UseOnPlayer|Use|DestroyItemChecked|DestroyItem)\[\s*(?:"[^"]*"|[^,\]]*)\s*,\s*(?:"([^"]+)"|([^,\]"]+))/i.exec(s))) return str(m[1] || m[2]).trim();
    if ((m = /-(?:UseItemOnPlayer|UseItem|Use_Item_On_Player|Use_Item|DestroyItem_NoChecks|DestroyItem)\s+(?:"[^"]*"|\S+)\s+"([^"]+)"/i.exec(s))) return m[1];
    return '';
  };
  I.dets = !!I.dets;
  I.forNpcSpell = function (name) {
    var n = str(name).trim().toLowerCase(), D = IC.words && IC.words.detNames;
    if (I.off || !I.dets || !n || !D) return null;
    for (var k in D) if (D.hasOwnProperty(k) && k.indexOf('/') > 0 && str(D[k]).toLowerCase() === n) {
      var p = k.split('/');
      if (+p[0] > 0) return { id: +p[0], back: I.backTile(p[1]) };
    }
    return null;
  };
  I.detPair = function (text) {
    if (!I.dets) return null;
    var m = /^\s*(\d+)\s*[:,\/ ]\s*(-?\d+)\s*$/.exec(str(text));
    return m && +m[1] > 0 ? { id: +m[1], back: I.backTile(m[2]) } : null;
  };

  var IC_TYPE = {
    WAYPOINT: 'move', NAV: 'mappoint', MOVETOACTOR: 'move', POSITION: 'camp', CAMPSPOT: 'camp', CAMPSPOT_WHO: 'split', JUMP: 'jump',
    YOYO_PATH: 'move', YOYO_RETURN: 'move', YOYO_SAVE: 'camp', PULL: 'fight', COMBAT: 'fight', KILL: 'fight', MONITOR: 'watch', COMBATMONITOR: 'watch',
    TARGET: 'killlist', CLEARTARGET: 'target', CLEARAREA: 'trash', CLICK: 'click', DOUBLECLICK: 'click', MOUSE_CLICK: 'click', INTERACT: 'click',
    ACTOR: 'click', APPLYVERB: 'verb', VERB: 'verb', HAIL: 'hail', HAILACTOR: 'hail', TALK: 'hail', CHOICE: 'hail', SELECTCHOICE: 'hail',
    CHEST: 'loot', LOOT: 'loot', WAITLOOT: 'loot', CAST: 'cast', CASTWHO: 'cast', PREBUFF: 'precast', BUFF: 'precast', RUNE: 'item',
    WAIT: 'wait', WAITFOR: 'wait', WAITUNTIL: 'wait', WAITGROUP: 'split', WAITCOMBAT: 'fight', WAITFORCOMBAT: 'fight', WAITPOWER: 'wait',
    WAITACTOR: 'watch', WAITNOACTOR: 'watch', WAITGONE: 'watch', WAITACTORDEAD: 'dies', WAITDEAD: 'dies', WAITDETRIMENT: 'timer', WAITBUFF: 'timer',
    WAITEFFECT: 'timer', WAITTEXT: 'line', WAITCHOICE: 'hail', WAITZONE: 'door', WAITRESET: 'door', WAITRESETTABLE: 'door', WAITSCRIPT: 'note',
    IF: 'onlyif', WHILE: 'loop', LOOP: 'loop', ON_EVENT: 'line', PHASE: 'line', SETVAR: 'setvar', REG: 'setvar', REGISTRY: 'setvar',
    OC: 'option', CMD: 'message', COMMAND: 'message', SCRIPT: 'note', ISS: 'note', RUNHELPER: 'note', HELPER: 'note', KEY_HOLD: 'message',
    COMMENT: 'note', MSGBOX: 'tell', ALERT: 'tell', SAY: 'tell', EVAC: 'evac', ZONEDOOR: 'door', ZONEOUT: 'door', RESETZONE: 'door', RESET: 'door',
    ZONERESETALL: 'door', RESETIFABLE: 'door', CHECKRESET: 'door', SAMEZONECHECK: 'door', MOUNT: 'mount', WIPE_RECOVERY: 'rez', SHUTDOWN: 'flag',
    STARTUP: 'instance', SETUP: 'option', SETUP_CLASS: 'option', IC_SETUP: 'option', SCOUTS_IN: 'move', SCOUTS_OUT: 'move',
    LOOTMETHOD: 'loot',
    NATIVE_PATH: 'move', NATIVE_TELEPORTER: 'door', NATIVE_ZONEOUT: 'door', NATIVE_SHINIES: 'loot', NATIVE_WAIT: 'wait', NATIVE_BIND: 'setvar',
    NATIVE_ANNOUNCE: 'tell', NATIVE_NOTE: 'note'
  };
  var IC_TPL = { named_encounter: 'named', trash_clear: 'trash', teleporter: 'door', zone_in: 'door', zone_out: 'door' };
  I.IC_TYPE = IC_TYPE; I.IC_TPL = IC_TPL;
  var TRIG = { says: 'line', announce: 'horn', spawn: 'watch', despawn: 'dies', hp: 'health', cast: 'cast', aura: 'watch', aura_gone: 'watch',
    debuff: 'cure', timer: 'timer' };
  var TRIG_OLD = { boss_says: 'says', chat: 'says', text: 'says', emote: 'says', red_text: 'announce', mob_spawns: 'spawn', mob_dies: 'despawn',
    hp_threshold: 'hp', boss_hp: 'hp', hp_below: 'hp', ability_cast: 'cast', detriment: 'debuff', every: 'timer' };
  I.trig = function (v) { v = str(v).toLowerCase(); return TRIG_OLD[v] || v || 'says'; };
  I.forStep = function (e, type, role) {
    var t = str(type || (e && e.type)).toUpperCase(), key = IC_TYPE[t];
    if (e && e.template && IC_TPL[e.template]) key = IC_TPL[e.template];
    if (t === 'ON_EVENT' && e) key = TRIG[I.trig(e.trigger_type)] || key;
    if ((t === 'PREBUFF' || t === 'BUFF') && e && str(e.ability) === 'blockers') key = 'aeblock';
    if ((t === 'OC' || t === 'CMD') && e) {
      var d = str(e.data);
      if (/ChangeCampSpotWho|-ccsfw/i.test(d)) key = 'split';
      else if (/-CampSpot\b|-SetCS_|-LetsGo/i.test(d)) key = 'camp';
      else if (/CastAbility/i.test(d)) key = 'cast';
      else if (/-Evac\b/i.test(d)) key = 'evac';
      else if (/AbilityTag.*PreCast/i.test(d)) key = 'precast';
      else if (/AutoTarget/i.test(d)) key = 'killlist';
      else if (/ApplyVerb/i.test(d)) key = 'verb';
      else if (/DoubleClick|-Special\b|Actor_Click/i.test(d)) key = 'click';
      else if (/ogre\s+nav|jb\s+mm\b|jb\s+nav\b/i.test(d)) key = 'mappoint';
      else if (/-Pause\b|-Resume\b|-HoldUp\b/i.test(d)) key = 'pause';
      else if (/-Jump\b|-Fly/i.test(d)) key = 'jump';
      else if (/^\s*oc\s+(?!!c)/i.test(d) || /^\s*echo\b/i.test(d)) key = 'tell';
      else if (/^\s*call\s/i.test(d)) key = 'note';
    }
    return mk(key || 'message', role);
  };
  I.forIcBox = function (what, role) {
    return mk({ start: 'instance', end: 'flag', boss: 'named', setup: 'option', exit: 'door', run: 'move' }[what] || 'note', role);
  };
  var IC_PAL = { 'T:WAYPOINT': 'move', 'T:CAMPSPOT': 'camp', 'T:CAMPSPOT_WHO': 'split', 'tpl:boss': 'named', 'tpl:trash': 'trash', 'T:CLICK': 'click',
    'T:APPLYVERB': 'verb', 'T:WAITGROUP': 'split', 'T:CHEST': 'loot', precast: 'precast', aeblock: 'aeblock', 'T:EVAC': 'evac', 'T:IF': 'onlyif',
    'T:WHILE': 'loop', loopcombat: 'loop', 'catch': 'fights', 'T:WAIT': 'wait', 'snip:gate': 'click', 'tpl:door': 'door', 'tpl:teleporter': 'door',
    'T:HAIL': 'hail', 'T:CAST': 'cast', 'import': 'import' };
  I.IC_PAL = IC_PAL;
  I.forPalette = function (key, role) { return mk(IC_PAL[key] || 'note', role); };

  var DO = { setVar: 'setvar', timer: 'timer', campSpot: 'camp', castAbility: 'cast', announce: 'tell', broadcast: 'message', fireEvent: 'message',
    tts: 'horn', report: 'note', rosterOrder: 'note', onScreenTimer: 'timer', template: 'tank', useItem: 'item', resolve: 'watch',
    ogreBotUIOption: 'option', autotarget: 'killlist', joust: 'move', movement: 'move', move: 'move', waypoint: 'move', repositionOnCondition: 'move',
    noOffensive: 'stop', noDefensive: 'stop', cancelMaintained: 'interrupt', gameCommand: 'message', raw: 'message', loot: 'loot', curses: 'curse',
    cures: 'cure', dispel: 'dispel', castInterrupt: 'interrupt', heroicOpportunity: 'ho', abilities: 'option', castStack: 'option', flagToon: 'flag',
    threatIgnoreList: 'tank', assist: 'target', pet: 'pet', choiceWindow: 'hail', botPause: 'pause', beltAdorn: 'item', inventory: 'bag',
    examine: 'watch', abilityTracker: 'timer', groupQuery: 'onlyif', stop: 'stop', stopEvaluating: 'stop' };
  I.DO = DO;
  var OPS = { 'actorInteract:target': 'target', 'actorInteract:clearTarget': 'target', 'actorInteract:verb': 'verb', 'actorInteract:dialog': 'hail',
    'movement:jump': 'jump', 'movement:jumpRoute': 'jump', 'movement:faceLock': 'watch', 'movement:faceHeading': 'watch', 'movement:navTo': 'mappoint',
    'movement:navInRange': 'mappoint', 'movement:block': 'pause', 'campSpot:release': 'move', 'campSpot:clear': 'move', 'campSpot:clearAll': 'move',
    'campSpot:spotAt': 'camp', 'campSpot:formation': 'split', 'abilities:cancelCasting': 'interrupt', 'abilities:castBulwark': 'tank',
    'template:walkToActorAndInteract': 'click', 'template:dispel': 'dispel', 'useItem:cure': 'cure', 'cures:cancelDetrimental': 'stop' };
  function stepDet(a) {
    if (!I.dets) return null;
    var Wd = IC.words, p = +a.main > 0 ? a : (a.det != null && Wd && Wd.detPairOf ? Wd.detPairOf(a.det) : null);
    return p && +p.main > 0 ? { id: +p.main, back: I.backTile(p.back) } : null;
  }
  function fightKey(a) {
    if (!a || typeof a !== 'object') return 'note';
    if (a.repeat || a.forEach) return 'repeat';
    if (a.use && !a['do']) return 'note';
    if (a.wait && !a['do']) return a.wait === 'atCampSpot' ? 'camp' : (a.wait === 'moveFinished' ? 'move' : 'wait');
    var d = str(a['do']), k = OPS[d + ':' + str(a.op)] || OPS[d + ':' + str(a.use)] || DO[d];
    if (d === 'actorInteract' && !k) k = 'click';
    return k || 'message';
  }
  I.forFightStep = function (a, role) {
    if (a && typeof a === 'object' && str(a['do']) === 'cures' && str(a.op) === 'cancelDetrimental') { var dp = stepDet(a); if (dp) return dp; }
    return mk(fightKey(a), role);
  };
  I.forWhen = function (t, role) {
    var on = str(t && t.on), m = (t && t.match) || {}, Wd = IC.words;
    if (I.dets && (on === 'detAdded' || on === 'detRemoved' || on === 'detUpdated')) {
      var p = +m.main > 0 ? m : (m.det != null && Wd && Wd.detPairOf ? Wd.detPairOf(m.det) : null);
      if (p && +p.main > 0) return { id: +p.main, back: I.backTile(p.back) };
    }
    if (on === 'castEnded' && m.abilityId != null && Wd && Wd.abilNames) {
      var ns = I.forNpcSpell(Wd.abilNames[str(m.abilityId)]);
      if (ns) return ns;
    }
    return mk({ text: 'line', announcement: 'horn', chat: 'tell', spawn: 'watch', spawnDelayed: 'watch', despawn: 'dies', castEnded: 'cast' }[on] || 'message', role);
  };
  I.forFightBox = function (what, role) {
    return mk({ start: 'named', end: 'flag', dies: 'dies', steps: 'note', listens: 'message', spots: 'camp', every: 'loop', once: 'watch' }[what] || 'note', role);
  };
  var OG_PAL = { campSpot: 'camp', castAbility: 'cast', announce: 'tell', actorInteract: 'click', wait: 'wait', forEach: 'repeat', setVar: 'setvar',
    ogreBotUIOption: 'option', repeat: 'repeat', groupQuery: 'onlyif', aeblock: 'aeblock', stop: 'stop', detJoust: 'move', detWatch: 'cure',
    caught: 'fights', loopCombat: 'loop', healthAt: 'health', whenDies: 'dies', whenLine: 'line', whenSpawn: 'watch', flagToon: 'flag' };
  I.forFightPalette = function (key, role) { return mk(OG_PAL[key] || 'note', role); };

  function isItemName(n) { return /^Item:/i.test(str(n).trim()); }
  I.namesIn = function (a) {
    var out = [], seen = {}, Wd = IC.words;
    function add(k, name) {
      var n = str(name).trim();
      if (!n || /\{\{|\$\{/.test(n)) return;
      if (isItemName(n)) { k = 'item'; n = I.itemName(n); if (!n) return; }
      var key = k + ':' + n.toLowerCase();
      if (seen[key]) return;
      seen[key] = 1;
      out.push({ k: k, name: n });
    }
    function byId(o) { var id = o.abilityId != null ? str(o.abilityId) : ''; return id && Wd && Wd.abilNames ? Wd.abilNames[id] || '' : ''; }
    function conds(c, depth) {
      if (!c || typeof c !== 'object' || depth > 8) return;
      if (isArr(c)) { for (var i = 0; i < c.length; i++) conds(c[i], depth + 1); return; }
      for (var k in c) if (c.hasOwnProperty(k)) {
        var v = c[k], o = v && typeof v === 'object' ? v : {};
        if (k === 'not' || k === 'or' || k === 'and') conds(v, depth + 1);
        else if (k === 'abilityReady' || k === 'hasAbility') add('abil', o.name || o.ability || byId(o));
        else if (k === 'maintained') add('abil', o.ability || o.name);
        else if (k === 'hasItem' || k === 'itemReady' || k === 'lootWindow') add('item', o.item || o.name);
      }
    }
    if (!a || typeof a !== 'object') return out;
    var lists = [a.firstReady, a.allReady];
    for (var l = 0; l < lists.length; l++) if (isArr(lists[l])) for (var j = 0; j < lists[l].length; j++) add('abil', lists[l][j]);
    conds(a.when, 0);
    if (a.wait && typeof a.wait === 'object') conds(a.wait, 0);
    if (a.repeat && typeof a.repeat === 'object' && a.repeat.until) conds(a.repeat.until, 0);
    return out;
  };
  I.icNames = function (e, type) {
    var out = [], seen = {}, t = str(type || (e && e.type)).toUpperCase(), m;
    if (!e || typeof e !== 'object') return out;
    var src = (t === 'IF' || t === 'WHILE' || t === 'LOOP') ? str(e.condition_value) : (t === 'OC' || t === 'CMD' || t === 'SCRIPT' ? str(e.data) : '');
    var re = /Me\.(Inventory|Equipment|Ability|Maintained)\[\s*(?:ExactName\s*,\s*|Query\s*,\s*Name\s*==?\s*)?\\?"([^"\\]+)\\?"/gi;
    while ((m = re.exec(src))) {
      var k = /^(Inventory|Equipment)$/i.test(m[1]) ? 'item' : 'abil', key = k + ':' + m[2].toLowerCase();
      if (seen[key]) continue;
      seen[key] = 1;
      out.push({ k: k, name: m[2] });
    }
    return out;
  };
  I.needs = function (names, max) {
    var out = [], seen = {};
    max = max || 4;
    for (var i = 0; names && i < names.length && out.length < max; i++) {
      var nm = names[i], it = nm.k === 'item', g = it ? I.forItem(nm.name) : I.forAbil(nm.name), unk = !g;
      if (unk && !it && !I.mine(nm.name)) { g = mk('cast', null); unk = false; }
      if (unk) g = mk(it ? 'item' : 'cast', null);
      if (g.cls) {
        if (seen['c' + g.cls]) continue;
        seen['c' + g.cls] = 1;
        out.push({ cls: g.cls, id: 0, back: -1, item: false, name: nm.name, k: nm.k, who: g.cls, unknown: false });
        continue;
      }
      var key = (g.item ? 'i' : 's') + g.id + '/' + g.back + (unk ? ':' + str(nm.name).toLowerCase() : '');
      if (seen[key]) continue;
      seen[key] = 1;
      out.push({ id: g.id, back: g.back, item: !!g.item, name: nm.name, k: nm.k, unknown: unk });
    }
    return out;
  };
  I.withWho = function (need, who, job, max) {
    var w = I.forWho(who, job);
    if (!w) return need || [];
    var out = [w];
    for (var i = 0; need && i < need.length && out.length < (max || 4); i++) if (!(need[i].cls && need[i].cls === w.cls)) out.push(need[i]);
    return out;
  };
  I.fightIcons = function (n, a, w) {
    if (!n || !a || typeof a !== 'object') return n;
    var d = str(a['do']), op = str(a.op), Wd = IC.words, abil = str(n.abil || (w && w.abil)), item = str(w && w.item);
    n.giKind = I.forFightStep(a, (w && w.role) || n.role);
    if (!abil && d === 'castAbility' && a.abilityId != null && !a.ability && !a.name && !isArr(a.firstReady) && !isArr(a.allReady) && Wd && Wd.abilNames)
      abil = Wd.abilNames[str(a.abilityId)] || '';
    if (d === 'raw' && Wd && Wd.abilityOf) { abil = abil || Wd.abilityOf(a.command); item = item || I.itemOfLine(a.command); }
    if (!item) {
      if (d === 'useItem' && op !== 'cure') item = str(a.item || a.name);
      else if (d === 'inventory' || (d === 'loot' && op === 'assign') || (d === 'groupQuery' && str(a.question) === 'itemCount')) item = str(a.item);
    }
    if (isItemName(abil)) { item = item || abil; abil = ''; }
    n.abil = abil;
    n.item = I.itemName(item);
    var ag = abil ? I.forAbil(abil) : null;
    n.gi = (ag && !ag.cls ? ag : null) || (n.item && I.forItem(n.item)) || n.giKind;
    n.need = I.off ? [] : I.needs(I.namesIn(a), 4);
    if (!I.off) {
      var who = a.forwho != null ? a.forwho : (a.forWho != null ? a.forWho : a.who);
      n.need = I.withWho(n.need, who, I.JOB[fightKey(a)], 4);
      if (ag && ag.cls && !(n.need[0] && n.need[0].cls)) n.need = [ag].concat(n.need).slice(0, 4);
    }
    return n;
  };
  I.all = function () {
    var out = [], seen = {}, roles = ['action', 'move', 'cond', 'loop', 'alt', 'state', 'sec'];
    for (var k in K) if (K.hasOwnProperty(k)) {
      if (isArr(K[k])) { var fk = K[k][0] + '/' + K[k][1]; if (!seen[fk]) { seen[fk] = 1; out.push([K[k][0], K[k][1]]); } continue; }
      for (var r = 0; r < roles.length; r++) {
        var b = I.BACK[roles[r]], key = K[k] + '/' + b;
        if (!seen[key]) { seen[key] = 1; out.push([K[k], b]); }
      }
    }
    return out;
  };
})(typeof window !== 'undefined' ? window : this);
