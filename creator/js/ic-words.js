/* Open IC Creator - ic-words.js
   Plain words (IC.words): what OgreBot commands, option ids, for-who words, actor searches and {{ }} values mean,
   in plain English, and which ability a step casts. Shared by every flowchart. Pure logic, no DOM.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var W = IC.words = IC.words || {};
  function str(v) { return v == null ? '' : String(v); }
  function q(s, n) { s = str(s); n = Math.round((n || 40) * (W.qScale || 1)); return s.length > n ? s.slice(0, n - 1) + '...' : s; }
  function unq(s) { return str(s).replace(/^\s*["']|["']\s*$/g, ''); }
  W.q = q;
  W.split = function (s) { return str(s).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_.]+/g, ' ').toLowerCase().trim(); };
  var ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
  W.ord = function (n) { n = parseInt(n, 10); return ORD[n] || (n + 'th'); };

  var ME = { raidgroupnum: 'my raid group', subclass: 'my class', race: 'my race', x: 'my x', y: 'my height', z: 'my z', id: 'me',
    visualvariant: 'my look', appearanceid: 'my look', tintflags: 'my tint', gender: 'my gender', name: 'my name' };
  var SEQ = { id: '', name: 'name', x: 'x', y: 'height', z: 'z', loc: 'spot', value: '', distance: 'distance' };
  W.tplPhrase = function (inner) {
    var t = str(inner).trim(), m;
    if (/^me$/i.test(t)) return 'my name';
    if ((m = /^me\.(\w+)$/i.exec(t))) return ME[m[1].toLowerCase()] || 'my ' + W.split(m[1]);
    if ((m = /^encounter\.(.+)$/i.exec(t))) return W.varWords(m[1]);
    if ((m = /^global\.(.+)$/i.exec(t))) return 'the shared "' + m[1] + '"';
    if (/^chat\.message$/i.test(t)) return 'the chat line';
    if (/^chat\.speaker$/i.test(t)) return 'who said it';
    if ((m = /^chat\.token(\d+)$/i.exec(t))) return 'word ' + m[1] + ' of the line';
    if ((m = /^chat\.name(\d+)$/i.exec(t))) return 'the name at word ' + m[1];
    if ((m = /^seq\.(\w+)\.(\w+)$/i.exec(t))) {
      var it = 'the one found as "' + m[1] + '"', f = SEQ[m[2].toLowerCase()];
      if (f === 'distance') return 'how far ' + it + ' is';
      if (f === 'spot') return 'where ' + it + ' is';
      return f === undefined ? 'the ' + W.split(m[2]) + ' of ' + it : (f ? 'the ' + f + ' of ' + it : it);
    }
    if (/^actor\.id$/i.test(t) || /^actor$/i.test(t)) return 'that mob';
    if ((m = /^actor\.(\w+)$/i.exec(t))) return 'that mob\'s ' + W.split(m[1]);
    if ((m = /^event\.arg(\d+)$/i.exec(t))) return 'the message\'s ' + W.ord(m[1]) + ' value';
    if (/^target\.id$/i.test(t) || /^target$/i.test(t)) return 'my target';
    if ((m = /^target\.(\w+)$/i.exec(t))) return 'my target\'s ' + W.split(m[1]);
    if ((m = /^ic\.(.+)$/i.exec(t))) return 'the run\'s ' + W.split(m[1]);
    return '"' + t + '"';
  };
  function tplShort(inner) {
    var t = str(inner).trim(), m;
    if (/^me$/i.test(t)) return 'my name';
    if ((m = /^(?:encounter|global)\.(.+)$/i.exec(t))) return m[1];
    if ((m = /^chat\.token(\d+)$/i.exec(t))) return 'word ' + m[1];
    if ((m = /^chat\.name(\d+)$/i.exec(t))) return 'name at word ' + m[1];
    if ((m = /^event\.arg(\d+)$/i.exec(t))) return 'value ' + m[1];
    if ((m = /^seq\.(\w+)\.(id|name|value)$/i.exec(t))) return m[1];
    return W.tplPhrase(t).replace(/"/g, '');
  }
  W.val = function (v) {
    if (v != null && typeof v === 'object') return W.objVal(v);
    var s = str(v), m = /^\s*\{\{([^}]+)\}\}\s*$/.exec(s);
    if (m) return W.tplPhrase(m[1]);
    if (/^\s*\$\{Me\.Name\}\s*$/i.test(s)) return 'my name';
    return s.replace(/\{\{([^}]+)\}\}/g, function (_x, inner) { return '[' + tplShort(inner) + ']'; })
      .replace(/\$\{Me\.Name\}/gi, '[my name]').replace(/\$\{[^}]*\}/g, '[a game value]');
  };
  function piece(p) {
    if (p != null && typeof p === 'object') return '(' + W.objVal(p) + ')';
    var m = /^\s*\{\{([^}]+)\}\}\s*$/.exec(str(p));
    return m ? '[' + tplShort(m[1]) + ']' : W.val(p);
  }
  function lineOf(t) { return t == null || t === '' ? 'the line' : W.val(t); }
  function letters(n) { return (+n) + (+n === 1 ? ' letter' : ' letters'); }
  function detOf(d) { return W.det ? W.det(d.main, d.back, d.det) : 'the detriment'; }
  W.objVal = function (o) {
    if (!o) return '';
    if (o.rank && typeof o.rank === 'object') {
      var rk = o.rank, rw = 'my place in the order of ' + W.who(rk.among || 'all');
      if (rk.scope === 'raid' || rk.scope === 'group') rw += rk.scope === 'raid' ? ' in the raid' : ' in my group';
      if (rk.uncurable) rw += ' (the uncurably cursed)'; else if (rk.cursed) rw += ' (the cursed)';
      if (rk.playersOnly) rw += ' (players only)';
      return rw + (+rk.wrap > 1 ? ', counting 1 to ' + (+rk.wrap) + ' over and over' : '');
    }
    if (o.find) return W.find(o.find);
    if (o.preferredMember) return W.who(o);
    if (o.actorField && typeof o.actorField === 'object') return 'the ' + W.split(o.actorField.field || o.actorField.member || 'value') + ' of ' + W.val(o.actorField.id || o.actorField.name);
    if (o.spotIndex && typeof o.spotIndex === 'object') return 'the number of the spot in "' + W.val(o.spotIndex.spots) + '" nearest ' + W.val(o.spotIndex.nearestTo || '{{me}}');
    if (o.count && typeof o.count === 'object') return 'how many ' + W.query(o.count.find ? (o.count.find.query || o.count.find.name) : o.count.of);
    if (o.calc) return 'a worked-out number';
    var v = o[Object.keys(o)[0]], a = v && typeof v === 'object' ? v : {};
    if (o.textAfter) return 'the words after "' + W.val(a.after) + '" in ' + lineOf(a.text) + (a.trimSuffix ? ', without "' + W.val(a.trimSuffix) + '"' : '') +
      (+a.trimEnd ? ', minus ' + letters(a.trimEnd) + ' at the end' : '');
    if (o.textToken) return 'word ' + W.val(a.index) + ' of ' + lineOf(a.text) + (a.sep && a.sep !== ' ' ? ' (split at "' + a.sep + '")' : '') +
      (+a.dropStart ? ', minus ' + letters(a.dropStart) + ' at the start' : '') + (+a.dropEnd ? ', minus ' + letters(a.dropEnd) + ' at the end' : '');
    if (o.textMid) return W.val(a.length) + ' letters of ' + lineOf(a.text) + ' from letter ' + W.val(a.start);
    if (Object.prototype.toString.call(o.concat) === '[object Array]') return o.concat.map(piece).join('');
    if (o.detIncrements) return 'the stack count of ' + detOf(a) + (a.actor ? ' on ' + W.val(a.actor) : '');
    if (o.detName) return 'the name of ' + detOf(a);
    if (o.detEffectString) return 'the effect text of ' + detOf(a);
    if (o.detDescription) return 'the description of ' + detOf(a);
    if (o.detIndex) return 'where ' + detOf(a) + ' is in my list of detriments';
    if (o.detTimeLeft) return 'the seconds left on ' + detOf(a);
    if (o.mobHealthPct) return (a.named ? q(W.val(a.named), 26) + '\'s' : 'the named\'s') + ' health %';
    if (o.timerLeft) return 'the time left on the timer "' + W.val(a.name) + '"';
    if (o.itemCount) return 'how many ' + q(W.val(a.item), 30) + ' I carry';
    if (o.rosterPick) return 'the ' + (a.nth != null && a.nth !== '' ? (isFinite(+a.nth) ? W.ord(a.nth) : 'number ' + W.val(a.nth)) : 'first') + ' of ' +
      W.who(a.among || 'all') + (a.cursed ? ' who is cursed' : '') + (a.after ? ' after ' + W.val(a.after) : '') +
      (a.scope === 'raid' ? ' in the raid' : (a.scope === 'group' ? ' in my group' : ''));
    if (o.cursedMember) return 'the first cursed member' + (a.groupOnly ? ' of my group' : '') +
      (Object.prototype.toString.call(a.order) === '[object Array]' && a.order.length ? ' (' + a.order.map(function (x) { return W.who(x); }).join(', then ') + ' first)' : '');
    if (o.groupMember) return 'the member of my group' + (a.race ? ' who is a ' + W.val(a.race) : '');
    if (o.groupCooldownSpread) return 'how far apart my group\'s ' + W.val(a.ability) + ' casts are' + (a.withinMs != null ? ' (within ' + W.secs(a.withinMs) + ')' : '');
    if (o.random) return 'a random number' + (a.min != null && a.max != null ? ' from ' + W.val(a.min) + ' to ' + W.val(a.max) : '');
    var k = Object.keys(o)[0];
    return k ? 'a value worked out from ' + W.split(k) : '';
  };
  W.qa = W.qa || {};
  function qaOf(v) { return W.qa[v] || { yes: 'said yes to "' + v + '"', not: 'said no to "' + v + '"' }; }
  W.answer = function (name) {
    var m = /^(.+)\.(\w+)$/.exec(str(name));
    if (!m) return null;
    var Q = qaOf(m[1]), v = m[1];
    switch (m[2].toLowerCase()) {
      case 'anyyes': return { text: 'someone ' + Q.yes, neg: 'nobody ' + Q.yes, bool: true };
      case 'allyes': return { text: 'everyone ' + Q.yes, neg: 'not everyone ' + Q.yes, bool: true };
      case 'anyno': return { text: 'someone ' + Q.not, neg: 'everyone ' + Q.yes, bool: true };
      case 'allno': return { text: 'nobody ' + Q.yes, neg: 'someone ' + Q.yes, bool: true };
      case 'yescount': return { text: 'the number who ' + Q.yes };
      case 'nocount': return { text: 'the number who ' + Q.not };
      case 'missingcount': return { text: 'the number who did not answer "' + v + '"' };
      case 'askedcount': return { text: 'the number asked "' + v + '"' };
      case 'answeredcount': return { text: 'the number who answered "' + v + '"' };
      case 'yeswho': return { text: 'who ' + Q.yes };
      case 'nowho': return { text: 'who ' + Q.not };
      case 'missingwho': return { text: 'who did not answer "' + v + '"' };
    }
    return null;
  };
  W.varWords = function (name, scope) {
    var a = W.answer(name);
    return a ? a.text : (str(scope).toLowerCase() === 'global' ? 'the shared "' : 'the saved "') + W.val(name) + '"';
  };

  var ROLE = { fighter: 'fighters', priest: 'priests', mage: 'mages', scout: 'scouts', tank: 'tanks', healer: 'healers', dps: 'damage dealers',
    groupleader: 'the group leader', raidleader: 'the raid leader', me: 'me', self: 'me', all: 'everyone', pc: 'players',
    caster: 'casters', casters: 'casters', melee: 'melee classes' };
  var CLASSES = 'guardian berserker monk bruiser shadowknight paladin templar inquisitor warden fury mystic defiler channeler wizard warlock ' +
    'conjuror necromancer illusionist coercer swashbuckler brigand troubador dirge ranger assassin beastlord druid cleric shaman enchanter ' +
    'sorcerer summoner bard rogue predator warrior brawler crusader animalist shaper elementalist etherealist geomancer thaumaturgist';
  var CLASS = {};
  CLASSES.split(' ').forEach(function (c) { CLASS[c] = c + 's'; });
  function isMe(s) { return /^\s*(\$\{me\.name\}|\{\{me\}\}|me|self|@me)\s*$/i.test(str(s)); }
  function roleWord(low) { return ROLE[low] || CLASS[low] || ''; }
  function the(w) { return /^(the |me$)/.test(w) ? w : 'the ' + w; }
  var ALIAS = { group: 'my group', raid: 'the raid', notselfgroup: 'my group but me', pctarget: 'my target', npcstarget: 'the mob\'s target', dps: 'damage dealer' };
  function elect(s) {
    var m = /^@([a-z]+?)(\d+)$/i.exec(s), r = s.slice(1).toLowerCase();
    if (m) return 'the ' + W.ord(m[2]) + ' ' + (ALIAS[m[1].toLowerCase()] || m[1].toLowerCase());
    return ALIAS[r] && !/^the |^my /.test(ALIAS[r]) ? 'the ' + ALIAS[r] : (ALIAS[r] || 'the ' + r);
  }
  function groupNums(v) {
    var t = str(v).trim();
    if (/^\d+$/.test(t)) return t.split('');
    if (/^\d+(\s*,\s*\d+)+$/.test(t)) return t.split(/\s*,\s*/);
    return [W.val(t)];
  }
  function groupWords(list, neg) {
    if (list.length === 1) return 'raid group ' + list[0];
    var last = list[list.length - 1], first = list.slice(0, -1).join(', ');
    return neg ? 'raid group ' + first + ' or ' + last : 'raid groups ' + first + ' and ' + last;
  }
  function one(s) {
    var parts = s.split('+'), incl = [], excl = [], groups = [], notGroups = [], people = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim(), neg = p.charAt(0) === '-', m;
      if (neg) p = p.slice(1);
      var low = p.toLowerCase();
      if (!p) continue;
      if ((m = /^not:(.+)$/i.exec(p))) { excl.push(isMe(m[1]) ? 'me' : (roleWord(m[1].toLowerCase()) ? the(roleWord(m[1].toLowerCase())) : W.val(m[1]))); continue; }
      if ((m = /^not(.+)$/.exec(low)) && roleWord(m[1])) { excl.push(the(roleWord(m[1]))); continue; }
      if ((m = /^(?:groups?:(.+)|g([1-9]))$/.exec(low))) { (neg ? notGroups : groups).push.apply(neg ? notGroups : groups, groupNums(m[2] || p.slice(p.indexOf(':') + 1))); continue; }
      if (/^toonflagged:/.test(low)) { people.push('whoever has flag ' + p.split(':')[1]); continue; }
      if (/^is\d+$/.test(low)) { (neg ? excl : people).push('session ' + low); continue; }
      if ((m = /^eval_num_me:(.+)$/i.exec(p))) { people.push('the boxes where ' + m[1]); continue; }
      if ((m = /^\*team:(.+)$/i.exec(p))) { (neg ? excl : people).push('the team "' + m[1] + '"'); continue; }
      if (p.charAt(0) === '*') { (neg ? excl : people).push('the "' + p.slice(1) + '" alias'); continue; }
      if (isMe(p)) { (neg ? excl : people).push('me'); continue; }
      if (p.charAt(0) === '@') { (neg ? excl : people).push(elect(p)); continue; }
      if (/\{\{|\$\{/.test(p)) { (neg ? excl : people).push(W.val(p)); continue; }
      var r = roleWord(low);
      if (r) { if (neg) excl.push(the(r)); else incl.push(r); continue; }
      (neg ? excl : people).push(p);
    }
    var out = incl.join(' and ');
    if (groups.length) out = (out || 'everyone') + ' in ' + groupWords(groups);
    if (notGroups.length) out = (out || 'everyone') + ' not in ' + groupWords(notGroups, true);
    if (excl.length) out = (out ? out + ' but not ' : 'everyone but ') + excl.join(' and ');
    if (people.length) out = people.join(' and ') + (out ? ' (if ' + out.replace(/^everyone /, '') + ')' : '');
    return out || 'everyone';
  }
  var BASE = { igw: 'my group', igwbn: 'my group but me', igzw: 'my group in this zone', irw: 'the raid', irwbn: 'the raid but me', irzw: 'the raid in this zone',
    izw: 'everyone in the zone' };
  W.who = function (fw) {
    if (fw && typeof fw === 'object') {
      var pm = fw.preferredMember || fw;
      return pm.pool ? 'the ' + W.ord(pm.rank || 1) + ' ' + str(pm.pool).toLowerCase() : 'someone';
    }
    var s = str(fw).trim().replace(/^"|"$/g, '');
    if (!s || /^all$/i.test(s)) return 'everyone';
    if (/^auto$/i.test(s)) return 'the For Who window\'s pick';
    if (isMe(s)) return 'me';
    var m = /^(igw|igwbn|igzw|irw|irwbn|irzw|izw):([^+]*)(?:\+(.+))?$/i.exec(s);
    if (m) {
      var base = BASE[m[1].toLowerCase()], butMe = / but me$/.test(base);
      if (!isMe(m[2]) && m[2]) base = base.replace(/^my |^the /, W.val(m[2]) + '\'s ').replace(/ but me$/, ' but them');
      if (!m[3]) return base;
      var f = one(m[3]), core = base.replace(/ but (me|them)$/, '');
      if (/^everyone but /.test(f)) return core + ' but ' + f.replace(/^everyone but /, '') + (butMe ? ' and me' : '');
      if (/^everyone not in /.test(f)) return 'everyone in ' + core + ' ' + f.replace(/^everyone /, '') + (butMe ? ' (not me)' : '');
      if (/^whoever /.test(f)) return f + ' in ' + core + (butMe ? ' (not me)' : '');
      return 'the ' + f.replace(/^the /, '') + ' in ' + core + (butMe ? ' (not me)' : '');
    }
    var alts = s.split('|');
    if (alts.length > 1) return alts.map(one).join(' or ');
    return one(s);
  };
  function Who(fw) { var w = W.who(fw); return w === 'me' ? 'I' : w.charAt(0).toUpperCase() + w.slice(1); }
  W.Who = Who;
  W.oddWho = function (fw) {
    var out = [];
    if (typeof fw !== 'string') return out;
    fw.split(/[|+]/).forEach(function (p) {
      var low = p.trim().replace(/^-/, '').replace(/^not/i, '').toLowerCase();
      if (/^[a-z]+s$/.test(low) && !roleWord(low) && roleWord(low.slice(0, -1))) out.push({ word: p.trim(), meant: p.trim().slice(0, -1) });
    });
    return out;
  };

  W.AE_BLOCKERS = [
    { name: 'Tortoise Shell', cls: 'druid', classes: ['warden', 'fury'], holdS: 30, chain: true, icon: [657, 313] },
    { name: 'Bladedance', cls: 'bard', classes: ['dirge', 'troubador'], holdS: 30, chain: true, icon: [588, -1] },
    { name: 'Advance Warning', cls: 'swashbuckler', classes: ['swashbuckler'], holdS: 15, chain: true, icon: [491, 314] },
    { name: 'Shield of Blackwood', cls: 'channeler', classes: ['channeler'], holdS: 5, chain: true, icon: [157, 314] },
    { name: 'Tunare\'s Watch', cls: 'warden', classes: ['warden'], holdS: 0, chain: false, icon: [219, 314] },
    { name: 'Sentry Watch', cls: 'guardian', classes: ['guardian'], holdS: 0, chain: false, icon: [329, 314] },
    { name: 'Guardian Sphere', cls: 'guardian', classes: ['guardian'], holdS: 0, chain: false, icon: [357, 314] }
  ];
  W.aeBlocker = function (name) {
    var n = str(name).toLowerCase().trim().replace(/\s+(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii)$/, '').replace(/\s+/g, '');
    for (var i = 0; i < W.AE_BLOCKERS.length; i++) if (W.AE_BLOCKERS[i].name.toLowerCase().replace(/\s+/g, '') === n) return W.AE_BLOCKERS[i];
    return null;
  };
  W.castLine = function (fw, ability) {
    var b = W.aeBlocker(ability), w = W.who(fw);
    if (b && w === 'everyone') w = 'the ' + W.who(b.cls);
    return (w === 'me' ? 'I' : w.charAt(0).toUpperCase() + w.slice(1)) + ' cast ' + str(ability).trim();
  };

  W.secs = function (ms) {
    if (ms != null && typeof ms === 'object') return 'a worked-out time';
    var s = str(ms), m = /^\s*\{\{([^}]+)\}\}(?:000|\s*s)\s*$/i.exec(s);
    if (m) return W.tplPhrase(m[1]) + ' s';
    if (/\{\{/.test(s)) return W.val(s) + ' ms';
    if (/^\s*-?[\d.]+\s*s\s*$/i.test(s)) return s.replace(/\s*s\s*$/i, '') + ' s';
    var n = +s;
    return isFinite(n) ? (Math.round(n / 100) / 10) + ' s' : (s || '?');
  };
  W.seconds = function (v) {
    if (v != null && typeof v === 'object') return 'a worked-out time';
    var s = str(v).trim(), m = /^\{\{([^}]+)\}\}\s*s?$/i.exec(s);
    if (m) return W.tplPhrase(m[1]) + ' s';
    if (/^-?[\d.]+\s*s?$/i.test(s)) return s.replace(/\s*s$/i, '') + ' s';
    return s ? W.val(s) : '?';
  };
  W.loc = function (a, y, z) {
    var l = Object.prototype.toString.call(a) === '[object Array]' ? a : (y !== undefined ? [a, y, z] : null);
    if (!l) return W.val(a);
    var whole = l.length === 3 && /^\{\{seq\.(\w+)\.x\}\}$/.test(str(l[0])) ? /^\{\{seq\.(\w+)\.x\}\}$/.exec(str(l[0]))[1] : '';
    if (whole && str(l[2]) === '{{seq.' + whole + '.z}}') return 'where the one found as "' + whole + '" is';
    if (l.length === 3 && /^\{\{event\.arg1\}\}$/.test(str(l[0]))) return 'the spot the message gives';
    return l.map(function (x) { return isFinite(+x) && str(x) !== '' ? String(Math.round(+x)) : W.val(x); }).join(', ');
  };
  W.angle = function (deg) {
    var w = str(deg).trim().toLowerCase();
    if (w === 'behind' || w === 'back') return 'behind';
    if (w === 'front' || w === 'infront') return 'in front of';
    var d = ((+deg % 360) + 360) % 360;
    if (!isFinite(d)) return 'at an angle to';
    if (d <= 30 || d >= 330) return 'behind';
    if (d >= 150 && d <= 210) return 'in front of';
    if (d > 30 && d < 150) return 'to one side of';
    return 'to the other side of';
  };
  function anyBack(b) { var n = +b; return b == null || b === '' || !isFinite(n) || n <= 0 || n === 65535; }
  function dkey(main, back) { return (+main) + '/' + (anyBack(back) ? -1 : +back); }
  W.detNames = W.detNames || {};
  W.setDetNames = function (list) {
    for (var i = 0; list && i < list.length; i++) {
      var d = list[i];
      if (!d || d.mid == null || !d.name) continue;
      W.detNames[dkey(d.mid, d.bid)] = d.name;
      var m = String(+d.mid), was = W.detNames[m];
      if (W.detNames['?' + m]) continue;
      if (was == null) W.detNames[m] = d.name;
      else if (str(was).toLowerCase() !== str(d.name).toLowerCase()) { delete W.detNames[m]; W.detNames['?' + m] = 1; }
    }
  };
  function detName(main, back) {
    var b = +back, nm = W.detNames[dkey(main, back)];
    if (!nm && b >= 0x8000 && b !== 65535) nm = W.detNames[dkey(main, b & 0x7FFF)];
    if (!nm && anyBack(back) && !W.detNames['?' + (+main)]) nm = W.detNames[String(+main)];
    return nm || '';
  }
  W.dets = W.dets || {};
  W.setDets = function (doc) {
    var out = {}, D = doc && doc.dets, T = doc && doc.detTables, k;
    if (D && typeof D === 'object') for (k in D) if (D.hasOwnProperty(k) && D[k] && +D[k].main > 0) out[k] = { main: +D[k].main, back: D[k].back };
    if (T && typeof T === 'object') for (k in T) if (T.hasOwnProperty(k) && !out[k] && Array.isArray(T[k]) && T[k].length === 1 && T[k][0] && +T[k][0].main > 0) out[k] = { main: +T[k][0].main, back: T[k][0].back };
    W.dets = out;
    return out;
  };
  W.detPairOf = function (key) { var p = key != null && typeof key !== 'object' ? W.dets[str(key).trim()] : null; return p ? { main: p.main, back: p.back } : null; };
  W.detTok = function (main, back) {
    var m = Math.floor(+main);
    return m > 0 ? ' [det:' + m + (anyBack(back) ? '' : '/' + Math.floor(+back)) + ']' : '';
  };
  W.det = function (main, back, det) {
    if (main && typeof main === 'object') { if (det == null) det = main.det; back = main.back; main = main.main; }
    var key = det != null && typeof det !== 'object' ? str(det).trim() : '';
    if (key && !(+main > 0)) { var p = W.detPairOf(key); if (p) { main = p.main; back = p.back; } }
    var tok = W.detTok(main, back);
    if (key) return 'the "' + W.split(key) + '" detriment' + tok;
    var nm = +main > 0 ? detName(main, back) : '';
    return nm ? '"' + nm + '"' + tok : 'the detriment' + tok;
  };
  W.abilNames = W.abilNames || {};
  W.abil = function (name, id) {
    if (name && !/^\d+$/.test(str(name))) return str(name);
    var n = str(id || name);
    return W.abilNames[n] || 'the ability with id ' + n;
  };
  W.plain = function (s) { return str(s).replace(/ ?\[det:(\d+)(?:\/\d+)?\]/g, ' (icon $1)'); };

  var OPT = {
    checkbox_settings_facenpc: 'Face the mob', checkbox_settings_movebehind: 'Move behind the mob', checkbox_settings_movemelee: 'Move into melee range',
    checkbox_settings_movetoarea: 'Hold the camp spot', checkbox_settings_meleeattack: 'Melee attack', checkbox_settings_rangedattack: 'Ranged attack',
    checkbox_settings_disablecaststack: 'Pause all abilities', checkbox_settings_disablecaststack_curecurse: 'Pause curse cures',
    checkbox_settings_disablecaststack_cure: 'Pause cures', checkbox_settings_disablecaststack_namedca: 'Pause named-only combat arts',
    checkbox_settings_disablecaststack_ca: 'Pause combat arts', checkbox_settings_disablecaststack_debuff: 'Pause debuffs',
    checkbox_settings_disablecaststack_nameddebuff: 'Pause named-only debuffs', checkbox_settings_disablecaststack_heal: 'Pause heals',
    checkbox_settings_disablecaststack_combat: 'Pause combat abilities', checkbox_settings_disablecaststack_res: 'Pause rezzes',
    checkbox_settings_disablecaststack_buffs: 'Pause buffs', checkbox_autotarget_enabled: 'Auto-target',
    checkbox_autotarget_outofcombatscanning: 'Auto-target out of combat', checkbox_settings_autotargetwhenhated: 'Auto-target what attacks us',
    checkbox_settings_crowdcontrol: 'Crowd control', checkbox_settings_donotsendpettoattack: 'Keep pets out of the fight',
    checkbox_donotsave_dynamicignorepbae: 'Skip close-range AE abilities (this fight)', checkbox_donotsave_dynamicignoreencounternukes: 'Skip encounter AE nukes (this fight)',
    checkbox_donotsave_dynamiccampspot: 'Camp spot for this fight', checkbox_settings_no_forcetargets: 'No forced targeting',
    checkbox_settings_no_threatpositionincreases: 'No threat-position increases', checkbox_settings_no_threatincreases: 'No threat increases',
    checkbox_settings_no_threatpositionincreases_iffightertanking: 'No threat-position increases while a fighter tanks',
    checkbox_settings_castwhilemoving: 'Cast while moving', checkbox_settings_disableabilitycollisionchecks: 'Cast without line-of-sight checks',
    checkbox_settings_ho_starter: 'Start heroic opportunities', checkbox_settings_ho_wheel: 'Work heroic opportunity wheels',
    checkbox_settings_ho_start: 'Start heroic opportunities', checkbox_settings_ho_wheel_offensive_only: 'Heroic opportunities: offensive only',
    checkbox_settings_npc_cast_monitoring: 'Watch the mob\'s casts', checkbox_settings_nodispels: 'No dispels', checkbox_settings_nostuns: 'No stuns',
    checkbox_settings_nodazes: 'No dazes', checkbox_settings_nofears: 'No fears', checkbox_settings_nostifles: 'No stifles',
    checkbox_settings_noroots: 'No roots', checkbox_settings_nosnares: 'No snares', checkbox_settings_nointerrupts: 'No interrupts',
    checkbox_settings_noaeblockers: 'No AE blockers', checkbox_settings_forcenamedcatab: 'Named-only abilities on everything',
    checkbox_other_donotcancelgroupcures: 'Never cancel group cures', checkbox_settings_cancelabilitiestogroupcure: 'Cancel casts to group-cure',
    checkbox_settings_disable_singletarget_cures: 'No single-target cures', checkbox_settings_interrupt_mode: 'Interrupt mode',
    checkbox_settings_ignoretargettoattackhealthcheck: 'Attack at any mob health', checkbox_settings_enable_selective_st_cures: 'Choose which single-target cures',
    checkbox_settings_selective_stcure_arcane: 'Cure arcane', checkbox_settings_selective_stcure_elemental: 'Cure elemental',
    checkbox_settings_selective_stcure_noxious: 'Cure noxious', checkbox_settings_selective_stcure_trauma: 'Cure trauma',
    checkbox_settings_loot: 'Loot', checkbox_settings_enable_follow: 'Follow', checkbox_settings_dov_raid_debuff: 'Raid debuffs (Destiny of Velious)'
  };
  var WORDS = ['disable', 'enable', 'caststack', 'cast', 'stack', 'cure', 'curse', 'named', 'debuff', 'heal', 'combat', 'buffs', 'buff', 'move', 'behind',
    'front', 'melee', 'ranged', 'attack', 'area', 'face', 'npc', 'auto', 'target', 'threat', 'position', 'increases', 'force', 'targets', 'no', 'not', 'do',
    'send', 'pet', 'to', 'when', 'hated', 'out', 'of', 'scanning', 'crowd', 'control', 'ho', 'wheel', 'starter', 'start', 'offensive', 'only', 'ignore',
    'health', 'check', 'single', 'group', 'cures', 'interrupt', 'mode', 'dispels', 'stuns', 'dazes', 'fears', 'stifles', 'roots', 'snares', 'ae', 'blockers',
    'while', 'moving', 'ability', 'abilities', 'collision', 'checks', 'loot', 'follow', 'save', 'dynamic', 'pbae', 'encounter', 'nukes', 'campspot', 'cancel',
    'raid', 'dov'];
  W.option = function (id) {
    var s = str(id).trim();
    if (OPT[s]) return OPT[s];
    var core = s.replace(/^checkbox_/, '').replace(/^(settings|autotarget|other|donotsave|loot|cures?|ascension)_/, ''), out = [];
    var parts = core.split('_');
    for (var p = 0; p < parts.length; p++) {
      var w = parts[p];
      while (w) {
        var hit = '';
        for (var i = 0; i < WORDS.length; i++) if (w.indexOf(WORDS[i]) === 0 && WORDS[i].length > hit.length) hit = WORDS[i];
        if (!hit) { out.push(w); break; }
        out.push(hit);
        w = w.slice(hit.length);
      }
    }
    var t = out.join(' ').replace(/\bcaststack\b/, 'cast stack').replace(/\bnpc\b/, 'NPC').replace(/\bae\b/, 'AE').replace(/\bho\b/, 'heroic opportunity')
      .replace(/\bdov\b/, 'Destiny of Velious');
    return t.charAt(0).toUpperCase() + t.slice(1);
  };
  W.optionLine = function (id, value, who, op) {
    var lab = W.option(id), v = str(value).toUpperCase(), on = v === 'TRUE' || v === '1' || value === true;
    if (str(op) === 'restore') return 'Put back: ' + lab + (who ? ' (' + W.who(who) + ')' : '');
    return (on ? 'Turn on: ' : 'Turn off: ') + lab + (who ? ' (' + W.who(who) + ')' : '');
  };

  W.query = function (qs) {
    var s = str(qs), name = /Name\s*==?\s*\\?"([^"\\]*)/.exec(s), part = /Name\s*=-\s*\\?"([^"\\]*)/.exec(s);
    var type = /Type\s*==?\s*\\?"([^"\\]*)/i.exec(s), dist = /Distance\s*<=?\s*([\d.]+)/.exec(s), idm = /^\s*ID\s*==\s*(\S+)\s*$/.exec(s);
    var tip = /Tooltip\s*==?\s*\\?"([^"\\]*)/.exec(s), aura = /Aura\s*==?\s*\\?"([^"\\]*)/.exec(s);
    if (idm) return W.val(idm[1]);
    if (!s.trim()) return 'something';
    if (/^\s*\{\{[^}]+\}\}\s*$/.test(s)) return 'what the search ' + W.val(s).replace(/^the saved /, 'saved as ') + ' finds';
    if (!/[=<>]/.test(s)) return '"' + W.val(s) + '"';
    if (name && /^\s*\{\{[^}]+\}\}\s*$/.test(name[1])) name = null, s = s.replace(/Name\s*==?\s*\\?"(\{\{[^}]+\}\})\\?"/, function (x, t) { idm = t; return ''; });
    if (idm && !name) return W.val(idm) + (dist ? ' within ' + dist[1] + ' m' : '');
    var T = { 'special': 'object', 'npc': 'mob', 'namednpc': 'named', 'nokill npc': 'NPC', 'pc': 'player', 'corpse': 'corpse', 'door': 'door', 'chest': 'chest' };
    var tw = type ? (T[type[1].toLowerCase()] || type[1].toLowerCase()) : '';
    var out = name ? '"' + W.val(name[1]) + '"' : (part ? 'a name with "' + W.val(part[1]) + '"' : (tip ? 'something showing "' + W.val(tip[1]) + '"' :
      (aura ? 'something with the aura "' + W.val(aura[1]) + '"' : (tw ? 'any ' + tw : 'something (' + q(W.val(s.replace(/\\"/g, '"')), 40) + ')'))));
    if (tw && (name || part || tip || aura)) out += ' (' + tw + ')';
    if (dist) out += ' within ' + dist[1] + ' m';
    return out;
  };

  W.find = function (f) {
    if (!f || typeof f !== 'object') return W.query(f);
    var w;
    if (f.query) w = W.query(f.query);
    else if (f.name) w = /^\s*\{\{[^}]+\}\}\s*$/.test(str(f.name)) ? W.val(f.name) : '"' + W.val(f.name) + '"';
    else if (f.tooltip) w = 'something showing "' + W.val(f.tooltip) + '"';
    else if (f.aura) w = 'something with the aura "' + W.val(f.aura) + '"';
    else if (f.overlay) w = 'something with the overlay "' + W.val(f.overlay) + '"';
    else if (f.id) w = W.val(f.id);
    else {
      var k = Object.keys(f).filter(function (x) { return x !== 'nth' && x !== 'targetingMe'; })[0];
      w = k ? 'something by its ' + W.split(k) : 'something';
    }
    var n = f.nth;
    if (n != null && n !== '') {
      if (typeof n === 'object') {
        if (n.nearestTo != null) w += ' nearest ' + W.loc(n.nearestTo);
        if (n.rank != null) w += ', number ' + W.val(n.rank);
        if (n.most) w += ' with the most ' + W.split(n.most);
        if (n.least) w += ' with the least ' + W.split(n.least);
      } else if (/^nearest$/i.test(str(n))) w = 'the nearest ' + w;
      else if (/^farthest$/i.test(str(n))) w = 'the farthest ' + w;
      else if (/^random$/i.test(str(n))) w = 'a random one of ' + w;
      else w = (isFinite(+n) ? 'the ' + W.ord(n) + ' of ' : 'number ' + W.val(n) + ' of ') + w;
    }
    if (f.targetingMe) w += ' that is targeting me';
    return w;
  };

  W.abilityOf = function (text) {
    var s = str(text), m;
    if ((m = /Abilities:Cast(?:Relay|NoChecks|NoExport|InSeconds|OnNPC|OnPlayer(?:NoChecks|InSeconds)?)?\[\s*(?:"[^"]*"|[^,\]"]*)\s*,\s*(?:"([^"]+)"|([^,\]"]+))/i.exec(s))) return str(m[1] || m[2]).trim();
    if ((m = /CastAbility(?:_Relay)?\[\s*"[^"]*"\s*,\s*"([^"]+)"/i.exec(s))) return m[1];
    if ((m = /-CastAbility(?:ForWho|_?NoChecks|OnPlayer(?:NoChecks|InSeconds)?|OnNPC|InSeconds)?\s+("[^"]*"|\S+)\s+"([^"]+)"/i.exec(s))) return m[2];
    if ((m = /-CastAbility(?:ForWho|_?NoChecks)?\s+("[^"]*"|\S+)\s+([A-Za-z' ]+?)\s*(?:$|-)/i.exec(s))) return m[2].trim();
    return '';
  };

  W.parseSpellIcons = function (text) {
    var out = {}, lines = str(text).split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      if (!lines[i] || lines[i].charAt(0) === '#') continue;
      var p = lines[i].split('\t'), id = parseInt(p[1], 10);
      if (p[0] && id >= 0) out[p[0].replace(/^"|"$/g, '')] = id;
    }
    return out;
  };
  W.parseSpellIconPairs = function (text) {
    var out = {}, lines = str(text).split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      if (!lines[i] || lines[i].charAt(0) === '#') continue;
      var p = lines[i].split('\t'), id = parseInt(p[1], 10), bk = parseInt(p[2], 10);
      if (p[0] && id >= 0) out[p[0].replace(/^"|"$/g, '')] = [id, bk > 0 && bk !== 65535 ? bk : -1];
    }
    return out;
  };
  var RANK = /\s+(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv|xvi|xvii|xviii|xix|xx|xxi|xxii|xxiii|xxiv|xxv|xxvi|xxvii|xxviii|xxix|xxx)$/;
  function families(map) {
    if (map.__fam) return map.__fam;
    var fam = {}, k, b, v, key;
    for (k in map) if (map.hasOwnProperty(k)) {
      b = k.replace(RANK, ''); v = map[k]; key = typeof v === 'object' && v ? v[0] + '/' + v[1] : String(v);
      if (!fam.hasOwnProperty(b)) fam[b] = { v: v, key: key };
      else if (fam[b] && fam[b].key !== key) fam[b] = null;
    }
    try { Object.defineProperty(map, '__fam', { value: fam, enumerable: false, configurable: true }); } catch (_e) {}
    return fam;
  }
  function spellFind(map, name) {
    if (!map) return null;
    var n = str(name).toLowerCase().trim(), tries = [n, n.replace(/\s+/g, '')], i;
    for (i = 0; i < tries.length; i++) if (n && map.hasOwnProperty(tries[i])) return map[tries[i]];
    var fam = n ? families(map) : null, base = n.replace(RANK, ''), bases = [base, base.replace(/\s+/g, '')];
    for (i = 0; fam && i < bases.length; i++) if (bases[i] && fam.hasOwnProperty(bases[i])) return fam[bases[i]] ? fam[bases[i]].v : null;
    return null;
  }
  W.spellIcon = function (map, name) {
    var v = spellFind(map, name);
    return v == null ? -1 : (typeof v === 'object' ? v[0] : v);
  };
  W.spellIconPair = function (map, name) {
    var v = spellFind(map, name);
    if (v == null) return null;
    return typeof v === 'object' ? { id: v[0], back: v[1] } : { id: v, back: -1 };
  };
  W.parseSpellClasses = function (text) {
    var out = {}, lines = str(text).split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      if (!lines[i] || lines[i].charAt(0) === '#') continue;
      var p = lines[i].split('\t');
      if (!p[0] || p.length < 4) continue;
      out[p[0].replace(/^"|"$/g, '')] = p[3].split(',').filter(function (c) { return c && !/^(commoner|artisan|unskilled)$/.test(c); });
    }
    return out;
  };
  W.spellClasses = function (map, name) { var v = spellFind(map, name); return v == null ? null : v; };

  function pos(a, b, c) { return Math.round(+a) + ', ' + Math.round(+b) + ', ' + Math.round(+c); }
  function grp(fw) { var s = unq(fw).trim(); return !s || /^(all|auto)$/i.test(s) || /^igw:\s*(\$\{Me\.Name\}|\{\{me\}\})$/i.test(s); }
  var OC = [
    [/-ChangeOgreBotUIOption\s+("[^"]*"|\S+)\s+(checkbox_\w+)\s+(\S+)/i, function (m) { return W.optionLine(m[2], m[3], m[1]); }],
    [/-AbilityTag\s+("[^"]*"|\S+)\s+"?(\w+)"?\s+(\d+)\s+(Allow|Embargo)/i, function (m) {
      var tag = m[2], what = /^precast/i.test(tag) ? 'pre-cast abilities' : '"' + tag + '" abilities';
      return (/allow/i.test(m[4]) ? 'Let ' : 'Hold back ') + what + ' fire for ' + m[3] + ' s'; }],
    [/CastAbility_Relay\[\s*"([^"]*)"\s*,\s*"([^"]+)"/i, function (m) { return W.castLine(m[1], m[2]); }],
    [/OgreBotAPI\.Abilities:Cast(Relay|NoChecks|NoExport|InSeconds|OnNPC|OnPlayer(?:NoChecks|InSeconds)?)?\[\s*("[^"]*"|[^,\]]*)\s*,\s*("[^"]*"|[^,\]]*)(?:\s*,\s*("[^"]*"|[^,\]]*))?(?:\s*,\s*("[^"]*"|[^,\]]*))?/i,
      function (m) {
        var k = str(m[1]), line = W.castLine(unq(m[2]), W.val(unq(m[3])));
        if (/^On(NPC|Player)/i.test(k)) line += ' on ' + (m[4] ? W.lsName(m[4]) : 'me');
        if (/InSeconds$/i.test(k)) { var sx = /^OnPlayer/i.test(k) ? m[5] : m[4]; if (sx) line += ' in ' + q(W.val(unq(sx)), 12) + ' s'; }
        return line; }],
    [/-CastAbility(?:ForWho|_?NoChecks)?\s+("[^"]*"|\S+)\s+"?([^"\-]+?)"?\s*(?:-|$)/i, function (m) { return W.castLine(unq(m[1]), m[2].trim()); }],
    [/-(?:ChangeCampSpotWho|ChangeCampSpot|Change_CampSpot|Change_Campspot_Who|ccsw|ccsfw|ccs|CS_Set_ChangeCampSpot)\s+("[^"]*"|\S+)\s+"?(-?[\d.]+)"?[\s,]+"?(-?[\d.]+)"?[\s,]+"?(-?[\d.]+)/i,
      function (m) { return Who(unq(m[1])) + ' stand at ' + pos(m[2], m[3], m[4]); }],
    [/-(?:CampSpot|cs-set-cs|cs)\s+("[^"]*"|\S+)[^-]*-(?:joustoff|joust-off|jst-off)\s+("[^"]*"|\S+)(?:\s+-(?:joustin|joust-in|jst-in)\s+("[^"]*"|\S+))?/i,
      function (m) { return 'Camp spot on (' + W.who(unq(m[1])) + '); ' + W.who(unq(m[2])) + ' may not joust in' + (m[3] ? ', ' + W.who(unq(m[3])) + ' joust in' : ''); }],
    [/-CampSpot\s+("[^"]*"|\S+)/i, function (m) { return 'Camp spot on (' + W.who(unq(m[1])) + ')'; }],
    [/-LetsGo\b(?:\s+("[^"]*"|[^\s-]\S*))?/i, function (m) { return grp(m[1]) ? 'Everyone leaves the camp spot and follows again' : Who(unq(m[1])) + ' leave the camp spot and follow again'; }],
    [/-(?:Ofol|OgreFollow|ofollow)\b(?:\s+("[^"]*"|[^\s-]\S*))?(?:\s+("[^"]*"|[^\s-]\S*))?/i, function (m) {
      var to = m[2] ? ' ' + (/^\$\{Me\.Name\}$/i.test(unq(m[2])) ? 'me' : q(W.val(unq(m[2])), 30)) : ' me';
      return (grp(m[1]) ? 'Everyone follows' : Who(unq(m[1])) + ' follow') + to; }],
    [/-(?:pause)\b(?:\s+("[^"]*"|[^\s-]\S*))?/i, function (m) { return 'Pause the bots' + (grp(m[1]) ? '' : ' (' + W.who(unq(m[1])) + ')'); }],
    [/-(?:resume)\b(?:\s+("[^"]*"|[^\s-]\S*))?/i, function (m) { return 'Resume the bots' + (grp(m[1]) ? '' : ' (' + W.who(unq(m[1])) + ')'); }],
    [/-HoldUp\b/i, function () { return 'Hold still'; }],
    [/-NoTarget\b/i, function () { return 'Drop all targets'; }],
    [/-PetOff\b|-Pet_Off\b/i, function () { return 'Call the pets back'; }],
    [/-PetAssist\b|-Pet_Attack\b/i, function () { return 'Send the pets in'; }],
    [/-Evac\b(?:\s+("[^"]*"|[^\s-]\S*))?(?:\s+(\S+))?/i, function (m) { return 'Evac out' + (grp(m[1]) ? '' : ' (' + W.who(unq(m[1])) + ')') + (/^totem$/i.test(str(m[2])) ? ', or use a Totem of Escape' : ''); }],
    [/-DestroyItem(?:_NoChecks)?\s+("[^"]*"|\S+)\s+"([^"]+)"/i, function (m) { return Who(unq(m[1])) + ' destroy ' + m[2]; }],
    [/-UseItem\s+("[^"]*"|\S+)\s+"([^"]+)"/i, function (m) { return Who(unq(m[1])) + ' use ' + m[2]; }],
    [/-FlyUp\b/i, function () { return 'Fly up'; }], [/-FlyDown\b/i, function () { return 'Fly down'; }], [/-FlyStop\b/i, function () { return 'Stop flying'; }],
    [/-Jump\b/i, function () { return 'Jump'; }],
    [/-ApplyVerb(?:ID)?ForWho\s+("[^"]*"|\S+)\s+"([^"]+)"\s+"([^"]+)"/i, function (m) { return Who(unq(m[1])) + ' use "' + m[3] + '" on ' + m[2]; }],
    [/ApplyVerbForWho\[\s*"([^"]*)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"/i, function (m) { return Who(m[1]) + ' use "' + m[3] + '" on ' + m[2]; }],
    [/-SetCS_BehindNPC\b/i, function () { return 'Stand behind the named'; }], [/-SetCS_InFrontNPC\b/i, function () { return 'Stand in front of the named'; }],
    [/-ChangeLootOptions\s+("[^"]*"|\S+)\s+(\S+)/i, function (m) { return 'Loot setting: ' + m[2]; }],
    [/-ExecuteEvent_AP\s+("[^"]*"|\S+)\s+"([^"]+)"/i, function (m) { return 'Start the event "' + m[2] + '"'; }],
    [/-AcceptReward\b/i, function () { return 'Take the reward'; }],
    [/-ConversationBubble\s+("[^"]*"|\S+)\s+(\d+)|-OptNum\s+(\d+)/i, function (m) { return 'Pick dialog option ' + (m[2] || m[3]); }],
    [/-HailNPC\b|-Hail\b/i, function () { return 'Hail the target'; }],
    [/-ReplyDialog\s+("[^"]*"|\S+)\s+(\d+)/i, function (m) { return 'Pick dialog option ' + m[2]; }],
    [/-Zone\b/i, function () { return 'Use the zone door'; }],
    [/-Special\b/i, function () { return 'Click the special object nearby'; }],
    [/-Actor_Click\b/i, function () { return 'Click an object'; }],
    [/-(?:RunScriptRequiresOgreBot|RunScriptOB_AP|RunScriptOB|rsob)\s+("[^"]*"|\S+)\s+("[^"]*"|\S+)/i, function (m) {
      var sc = 'the script "' + unq(m[2]).replace(/^.*[\/\\]/, '').replace(/\.iss$/i, '') + '"';
      return grp(m[1]) ? 'Run ' + sc : Who(unq(m[1])) + ' run ' + sc; }],
    [/-(?:EndScriptOB|EndScript|esob)\s+("[^"]*"|\S+)\s+("[^"]*"|\S+)/i, function (m) {
      var sc = 'the script "' + unq(m[2]).replace(/^.*[\/\\]/, '').replace(/\.iss$/i, '') + '"';
      return grp(m[1]) ? 'Stop ' + sc : Who(unq(m[1])) + ' stop ' + sc; }],
    [/AutoTarget_SetScanRadius\[\s*"?[^,\]]*?"?\s*,\s*"?(\d+)/i, function (m) { return 'Auto-target range: ' + m[1] + ' m'; }],
    [/-AutoTarget_SetScanRadius\s+("[^"]*"|\S+)\s+"?(\d+)/i, function (m) { return 'Auto-target range: ' + m[2] + ' m'; }],
    [/-UO\s+("[^"]*"|\S+)\s+(checkbox_\w+)\s+(\S+)/i, function (m) { return W.optionLine(m[2], m[3], m[1]); }],
    [/-Target\s+("[^"]*"|\S+)\s+(.+)$/i, function (m) { return Who(unq(m[1])) + ' target ' + q(W.lsName(m[2]), 34); }],
    [/-(ApplyVerb|Apply_Verb|ApplyVerbQueued|ApplyVerbID|ApplyVerbIDQueued)\s+(.+)$/i, function (m) {
      var t = toks(m[2]), turn = /queued/i.test(m[1]) ? ' (in turn)' : '';
      if (t.length >= 3) return Who(t[0]) + ' use "' + t[2] + '" on ' + W.lsName(t[1]) + turn;
      return 'Use "' + (t[1] || '?') + '" on ' + W.lsName(t[0] || '') + turn; }],
    [/ApplyVerbForWho\[\s*"([^"]*)"\s*,\s*"(.*?)"\s*,\s*"([^"]+)"\s*\]/i, function (m) { return Who(m[1]) + ' use "' + m[3] + '" on ' + W.lsName(m[2]); }],
    [/-(ApplyVerbIDForWho|ApplyVerbIDQueuedForWho|ApplyVerbQueuedForWho)\s+(.+)$/i, function (m) {
      var t = toks(m[2]);
      return Who(t[0] || '') + ' use "' + (t[2] || '?') + '" on ' + W.lsName(t[1] || '') + (/queued/i.test(m[1]) ? ' (in turn)' : ''); }],
    [/OgreBotAPI:ZoneDoor\[\s*"([^"]+)"/i, function (m) { return 'Pick "' + m[1] + '" at the zone door'; }],
    [/^\s*eq2execute\s+target_none\b/i, function () { return 'Drop the target'; }],
    [/^\s*eq2execute\s+pet\s+backoff\b/i, function () { return 'Pets back off'; }],
    [/^\s*eq2execute\s+summon\b/i, function () { return 'Summon (the /summon command)'; }],
    [/^\s*eq2execute\s+target\s+(.+)$/i, function (m) { return 'Target ' + q(m[1], 34); }],
    [/^\s*eq2execute\s+apply_verb\s+.*Name\s*=*\s*\\?"([^"\\]*)\\?".*\]\.ID\}\s+(.+)$/i, function (m) { return '"' + m[2].trim() + '" on ' + (m[1] || 'the object'); }],
    [/^\s*(?:relay\s+all\s+)?ogre\s+nav\s+"([^"]+)"/i, function (m) { return 'Walk to the map point "' + m[1] + '"'; }],
    [/^\s*(?:relay\s+all\s+)?ogre\s+nav\s+-loc\b/i, function () { return 'Walk to the object on the mesh'; }],
    [/Actor\[[^\]]*Name\s*=-?=?\s*\\?"([^"\\]+)[^\]]*\]:DoubleClick/i, function (m) { return 'Double-click ' + m[1]; }],
    [/Actor\[[^\]]*(?:exactname|Name)\s*[,=-]*\s*\\?"([^"\\]+)[^\]]*\]:DoTarget/i, function (m) { return 'Target ' + m[1]; }],
    [/^\s*jb\s+mm\s+ogre\s+(-?[\d.]+),(-?[\d.]+),(-?[\d.]+)/i, function (m) { return 'Walk the group to ' + pos(m[1], m[2], m[3]) + ' on the mesh'; }],
    [/^\s*jbc\s+all\s+(.+)$/i, function (m) { var w = W.ogre(m[1]); return 'Every box: ' + (w ? w.charAt(0).toLowerCase() + w.slice(1) : q(m[1], 34)); }],
    [/^\s*jb\s+Mount\b/i, function () { return 'Mount up'; }],
    [/^\s*echo\s+(.+)$/i, function (m) { return 'Note: ' + q(W.val(unq(m[1])), 40); }],
    [/-CS_ClearAll\b/i, function () { return 'Clear all camp spots'; }],
    [/-CS_ClearCampSpot\b/i, function () { return 'Clear the camp spot'; }],
    [/-CS_ClearRelative\b(?:\s+("[^"]*"|[^\s-]\S*))?/i, function (m) { return (grp(m[1]) ? 'Everyone goes' : Who(unq(m[1])) + ' go') + ' back to the group\'s spot'; }],
    [/-CS_Set_Relative\s+("[^"]*"|\S+)\s+"?(-?[\d.]+)"?[\s,]+"?(-?[\d.]+)"?[\s,]+"?(-?[\d.]+)/i, function (m) { return Who(unq(m[1])) + ' go to ' + pos(m[2], m[3], m[4]) + ' for now'; }],
    [/-NoMove\s+("[^"]*"|\S+)/i, function (m) { return Who(unq(m[1])) + ' stand still (no moving)'; }],
    [/-Crouch\b/i, function () { return 'Crouch'; }],
    [/-AutoRun\b/i, function () { return 'Run forward (auto-run)'; }],
    [/-CancelMaintainedForWho\s+("[^"]*"|\S+)\s+"?([^"]+)"?/i, function (m) { return Who(unq(m[1])) + ' cancel ' + m[2].trim(); }],
    [/OgreBotAPI:ApplyVerb\[\s*"?(.*?)"?\s*,\s*"([^"]+)"\s*\]/i, function (m) { return 'Use "' + m[2] + '" on ' + W.lsName(m[1]); }],
    [/ChangeCampSpot\[/i, function () { return 'Move the camp spot'; }],
    [/^\s*call\s+DialogueOption\s+"?(\d+)/i, function (m) { return 'Pick dialog option ' + m[1]; }],
    [/^\s*(for|while|if)\s*\(|^\s*\w+:Set\[/i, function () { return 'A line of the old script\'s own logic'; }],
    [/^\s*call\s+(\w+)/i, function (m) { return 'An old script step (' + W.split(m[1]) + ')'; }],
    [/^\s*eq2execute\s+(\S+)(.*)$/i, function (m) { return 'Game command: /' + m[1] + q(m[2], 24); }]
  ];
  function toks(s) {
    var out = [], cur = '', inQ = false, depth = 0, had = false;
    s = str(s);
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (inQ && c === '\\' && i + 1 < s.length) { cur += s.charAt(++i); continue; }
      if (c === '"' && depth === 0) { inQ = !inQ; had = true; continue; }
      if (c === '$' && s.charAt(i + 1) === '{') depth++;
      else if (c === '}' && depth > 0) depth--;
      if (/\s/.test(c) && !inQ && depth === 0) { if (cur || had) out.push(cur); cur = ''; had = false; continue; }
      cur += c;
    }
    if (cur || had) out.push(cur);
    return out;
  }
  function isFw(t) {
    var s = unq(t).trim(), low = s.toLowerCase();
    return /^(all|auto|me|self|caster|melee|groupleader|raidleader|g[1-9]|is\d+)$/.test(low) || isMe(s) || /[+|]/.test(s) || /^[@*-]/.test(s) ||
      /^(igw|igwbn|igzw|irw|irwbn|irzw|izw|groups?|not|toonflagged|id):/i.test(s) || !!roleWord(low) || (/^not./.test(low) && !!roleWord(low.slice(3)));
  }
  function T(v, what, f) {
    var s = unq(v).toUpperCase(), w = s === 'TOGGLE' ? 'Switch: ' : (s === 'FALSE' || s === '0' ? 'Turn off: ' : 'Turn on: ');
    return w + what + (grp(f) ? '' : ' (' + W.who(unq(f)) + ')');
  }
  function vv(x) { return q(W.val(unq(x)), 34); }
  var NV = {
    'joustout joust-out jst-out': '@ run out (joust)', 'joustin joust-in jst-in': '@ come back in (joust)',
    'joustoff joust-off jst-off': '@ may not joust in', 'jouston joust-on jst-on': '@ may joust in again (it does not move them)',
    'run': '@ run (not walk)', 'walk': '@ walk (not run)', 'stand': '@ stand up', 'jumpkw': '@ jump', 'landflyingmount': '@ land the flying mount',
    'force_mounton': '@ mount up', 'force_mountoff': '@ get off the mount', 'forcefollow ffollow': '@ follow again',
    'navto nav-to nav_to': '@ walk to %L on the mesh', 'navstop': '@ stop walking the mesh',
    'movetoareanotarget move2areanotarget move2area movetoarea': '@ move to %L', 'waypoint': '@ set a waypoint at %L',
    'faceangle': '@ face heading %1', 'faceactor': '@ face %q1', 'faceloc': '@ face %L',
    'ofol--- ofol-- ofoldecdistance': '@ follow closer', 'ofolincdistance ofol++ ofol-++': '@ follow farther back',
    'gettoconcentration': '@ free up concentration until %1 is free', 'set_campspotjump_handle': '@ walk a short way and jump across',
    'pull': '@ pull (a test command)', 'donotmove': '@ stand still in the fight (until Let\'s Go)', 'holdup': '@ hold still',
    'cs_set_changerelativecampspotby': '@ step %L off the camp spot for now', 'cs_set_changecampspotby ccsb ccsbw ccsbfw ccsbyforwho changecampspotby': '@ move the camp spot by %L',
    'cs_set_formation_monkeyinmiddleraid cs-monkeyraid': function (f, a) { return 'Spread out around ' + W.loc(a.slice(2, 5)) + ' with ' + W.who(unq(a[0])) + ' in the middle (' + vv(a[1] || 7) + ' m)'; },
    'cs_set_formation_monkeyinmiddle cs-monkey': function (f, a) { return 'Spread out around ' + W.loc(a.slice(1, 4)) + ' with ' + (a[4] ? W.lsName(a[4]) : 'me') + ' in the middle (' + vv(a[0] || 7) + ' m)'; },
    'cs_set_formation_circle cs-circle': function (f, a) { return 'Spread out in a circle around ' + W.loc(a.slice(1, 4)) + ' (' + vv(a[0] || 7) + ' m)'; },
    'cs_set_howclose': 'Camp spot: stop within %1 m', 'cs_set_howfar': 'Camp spot: come back from up to %1 m',
    'setcs_npc': function (f, a) { return S(f, 'stand ' + vv(a[2] || 3) + ' m ' + W.angle(unq(a[0])) + ' ' + W.lsName(a[1] || '')); },
    'setcs_positionnpc': function (f, a) { return 'Fighters in front of ' + W.lsName(a[0] || '') + ', everyone else behind'; },
    'cast ccst cast_ability cancelcast': function (f, a) { return W.castLine(unq(f), W.val(unq(a[0]))); },
    'castabilityinseconds': function (f, a) { return W.castLine(unq(f), W.val(unq(a[0]))) + ' in ' + vv(a[1] || 1) + ' s'; },
    'castabilityonplayer caston ccaston cancelcaston cast_ability_on_player castabilityonplayernochecks': function (f, a) { return W.castLine(unq(f), W.val(unq(a[0]))) + ' on ' + W.lsName(a[1] || '${Me.Name}'); },
    'castabilityonplayerinseconds': function (f, a) { return W.castLine(unq(f), W.val(unq(a[0]))) + ' on ' + W.lsName(a[1] || '${Me.Name}') + ' in ' + vv(a[2] || 1) + ' s'; },
    'castabilityonnpc castonnpc castonmob': function (f, a) { return W.castLine(unq(f), W.val(unq(a[0]))) + ' on ' + W.lsName(a[1] || ''); },
    'cancelcastnoexport castnoexport ccstnoexport castabilitynoexport cast_abilitynoexport': function (f, a) { return W.castLine(unq(f), W.val(unq(a[0]))); },
    'castbulwarkimmediately': '@ cast Bulwark right away', 'castrescue_ap': '@ cast a rescue', 'casthoiconid': '@ cast the heroic opportunity ability %1',
    'castgroupwaterbreathing': '@ cast group water breathing', 'cancelgroupwaterbreathing': '@ cancel group water breathing',
    'abilityembargo abilityrotate': function (f, a) { return S(f, 'do not cast ' + W.abil('', unq(a[0])) + ' for ' + vv(a[1]) + ' s'); },
    'itemembargo itemrotate': function (f, a) { return S(f, 'do not use the item ability ' + vv(a[0]) + ' for ' + vv(a[1]) + ' s'); },
    'abilityembargo_resetabilityembargo': '@ may cast %1 again', 'abilityembargo_resetallabilityembargos': '@ may cast every held-back ability again',
    'canceloncast': '@ cancel what is set to stop when %1 is cast', 'abilitytracker_add': '@ keep track of %1', 'rebuff': '@ cancel their own buffs',
    'cast_interrupt castinterrupt': function (f, a) { return S(f, 'interrupt ' + (a[0] && unq(a[0]) !== '0' ? W.lsName(a[0]) : 'the mob')); },
    'dispell': '@ dispel %q1 (class ability)', 'dispellnpcwithany': '@ dispel %q1 (ability or item)', 'dispellnpcwithitem': '@ dispel %q1 with an item',
    'dispellnpcwithspell': '@ dispel %q1 with a spell',
    'enable_dispells': function (f) { return T('TRUE', 'Dispels', f); }, 'disable_dispells': function (f) { return T('FALSE', 'Dispels', f); },
    'enable_interrupts': function (f) { return T('TRUE', 'Interrupts', f); }, 'disable_interrupts': function (f) { return T('FALSE', 'Interrupts', f); },
    'set_disableallaoes_allparams': function (f, a) { return T(/^false$/i.test(unq(a[0])) ? 'TRUE' : 'FALSE', 'AE abilities', f) + (/-allowencounters/i.test(a.join(' ')) ? ' (encounter AEs still allowed)' : ''); },
    'setnooffensive': function (f, a) { return (/^false$/i.test(unq(a[0])) ? 'Allow' : 'Hold back') + ' offensive abilities' + (grp(f) ? '' : ' (' + W.who(unq(f)) + ')'); },
    'setnodefensive': function (f, a) { return (/^false$/i.test(unq(a[0])) ? 'Allow' : 'Hold back') + ' defensive abilities' + (grp(f) ? '' : ' (' + W.who(unq(f)) + ')'); },
    'setnoreqbowabilities': function (f, a) { return T(/^false$/i.test(unq(a[0])) ? 'TRUE' : 'FALSE', 'Abilities that need a bow', f); },
    'addnooffensiveon': '@ hold back offensive abilities on %q1', 'removenooffensiveon': '@ may attack %q1 again', 'clearnooffensiveon': '@ clear the hold-back list',
    'threatfighterignorelist_add': 'Put %r on the fighters\' threat-ignore list', 'threatfighterignorelist_remove': 'Take %r off the fighters\' threat-ignore list',
    'threatfighterignorelist_clear': 'Clear the fighters\' threat-ignore list', 'countdown': 'Start a countdown of %1',
    'targetlock': function (f, a) { return /^(clear|0|off)?$/i.test(unq(a[0] || '')) ? S(f, 'stop the target lock') : S(f, 'lock onto ' + W.lsName(a[0])); },
    'assistforwho': '@ assist %1',
    'autohunt': function (f, a) { var m0 = unq(a[0] || 'hunt').toLowerCase(); return 'Auto-hunt: ' + (m0 === 'off' ? 'stop' : (m0 === 'movement' ? 'roam the camp spot only' : 'hunt')) + (grp(f) ? '' : ' (' + W.who(unq(f)) + ')'); },
    'autotarget_clear autotarget_clearactors at_clear': 'Clear the kill list', 'autotarget_removeactor at_remove': 'Take %q1 off the kill list',
    'autotarget_addactor at_add': 'Add %q1 to the kill list', 'autotarget_setrescantime at_rescan': 'Kill list: look again every %1',
    'autotarget_setscanheight at_height': 'Kill list: look %1 m up and down', 'autotarget_enable at_enable': 'Resume auto-target', 'autotarget_disable at_disable': 'Pause auto-target',
    'autotargettoggle': function (f, a) { return T(a[0] || 'TOGGLE', 'Auto-target', f); }, 'autotargetocstoggle': function (f, a) { return T(a[0] || 'TOGGLE', 'Auto-target out of combat', f); },
    'loadautotargetlist loadautotargetlistforwho latl': '@ load the kill list %q1',
    'changecaststacklistboxitembytag changecaststackbytag ccaststackbytag ccstackbytag': function (f, a) { return T(a[1] || 'TRUE', '"' + vv(a[0]) + '" abilities in the casting list', f); },
    'changecaststacklistboxitem changecaststack ccaststack ccstack': function (f, a) { return T(a[1] || 'TRUE', vv(a[0]) + ' in the casting list', f); },
    'uplinkoptionsilent uplinkoptionchange': function (f, a) { return W.optionLine(unq(a[0]), unq(a[1]), unq(f)); },
    'loadprofile profile profileforwho': '@ load the profile %q1',
    'message message_nt': 'Note in the console: %q1', 'message_relay': 'Note in every console: %q1', 'tts': 'Say out loud: %q1',
    'injectchat raid group': '@ act as if %q1 was said in raid chat', 'executeevent_json_ap executeevent_ap': 'Start the event %q1',
    'actor_clickqueued': '@ click %q1 (in turn)', 'actor_click': '@ click %q1',
    'timer onscreentimer': function (f, a) { return 'Show a countdown of ' + vv(a[0] || 30) + ' s' + (a[2] ? ': "' + vv(a[2]) + '"' : ''); },
    'cov': '@ use Call of the Veteran', 'heartstone_rekindlebond': '@ use the Heartstone to rekindle the bond', 'scrollof': '@ use a Scroll of %1',
    'tempadorns': '@ apply the temp adorn profile %1', 'summon_familiar': '@ summon the familiar', 'autoitemcure': '@ drink a %1 cure potion', 'autogroupcure': 'Ask %w to watch %p1 for a group cure',
    'autocure': 'Ask %w to cure %p1', 'autocurse': 'Ask %w to cure the curse on %p1', 'groupcure': 'Ask %w for a group cure',
    'curepotions_replenish': '@ restock cure potions from the depot',
    'canceldetrimental': function (f, a) { return S(f, 'cancel ' + (W.det ? W.det(+unq(a[0]), +unq(a[1])) : 'the detriment')); },
    'cancelmaintained cancel_maintained cancel_maintainedforwho': function (f, a) { return a.length ? S(f, 'cancel ' + vv(a[0])) : 'Cancel ' + vv(f); },
    'immres': function (f, a) { return S(f, 'cast Immaculate Revival when ' + vv(a[0] || 2) + ' are dead (always for a dead priest or fighter)'); },
    'res': function (f) { return T('TRUE', 'Rezzes', f); }, 'stopres': function (f) { return T('FALSE', 'Rezzes', f); },
    'resstone': '@ cast their resurrection stone', 'revive': '@ press Revive', 'resource': '@ click the nearest resource', 'question': '@ pick up the nearest "?" shiny',
    'altaroftheancients': '@ pray at the Altar of the Ancients', 'arcannaseeffigyofrebirth': '@ use Arcanna\'se Effigy of Rebirth',
    'clear_allow_hoicon': 'Heroic opportunities: stop allowing icon %1', 'clear_allow_hoicons': 'Heroic opportunities: clear the allowed icons',
    'clear_disable_hoicon': 'Heroic opportunities: allow icon %1 again', 'clear_disable_hoicons': 'Allow every heroic opportunity icon again',
    'set_allow_hoicon': 'Heroic opportunities: allow icon %1', 'set_disable_hoicon': 'Never press heroic opportunity icon %1',
    'doho_reset': 'Reset "Do HO"', 'doho_setup': 'Set up "Do HO"', 'doho_set_enable': function (f, a) { return T(a[0] || 'TRUE', 'Do HO', f); },
    'ho_cancel_starter': 'Cancel the heroic opportunity starter', 'ho_start': 'Start a heroic opportunity', 'ho_starter_advance': 'Advance the heroic opportunity starter',
    'ho_wheel_advance': 'Advance the heroic opportunity wheel',
    'applytempadorn applytempadorns': '@ apply temporary adornments', 'pop_tempadorns': '@ use the Planes of Prophecy temporary adornments (%1)',
    'examineinventoryitem': '@ examine %1', 'unpack': '@ unpack %1', 'useitemonplayer useitemon use_item_on_player': '@ use %1 on %p2', 'useitem use_item': '@ use %1',
    'lootall': '@ loot everything in reach', 'buyfrommerchant': '@ buy %2 x %1 from the merchant', 'selltomerchant': '@ sell %2 x %1 to the merchant',
    'openandbuyfrommerchant': '@ buy %3 x %2 from %q1', 'openandbuyfrommerchantxtimes': '@ buy %3 x %2 from %q1, %4 times',
    'flagtoon': 'Give flag %1 to %w', 'unflagtoon': 'Take flag %1 from %w', 'unflagall': 'Clear every flag', 'marktoon': 'Mark %w', 'unmarktoon': 'Unmark %w',
    'mentor': '@ mentor %p1', 'unmentor': '@ stop mentoring', 'acceptquest': '@ accept the quest %q1', 'sharequest': '@ share the quest %q1',
    'comparequest': 'Compare the step of the quest %q1 across the group', 'sharequestsforzone': '@ share the quests for this zone',
    'inputtextwindow_accept': '@ press OK in the text window', 'inputtextwindow_addtext': '@ type %q1 in the text window',
    'inputtextwindow_cleartext': '@ clear the text window', 'replydialogclose': '@ close the reply window', 'select_window_ap': '@ pick a row in the select window',
    'ok_button': '@ press OK', 'closewindow clswdn': '@ close the top window', 'choicewindow': '@ pick choice %1',
    'changezoneto': '@ change to the zone copy %p1 is in', 'resetzone': 'Reset the zone lockout %q1', 'select_zone_version': '@ press OK in the zone version window',
    'specialzonespecific specialzs': '@ click the special object for this zone', 'zoneresetall resetzoneall': 'Reset EVERY zone lockout (it does not ask first)',
    'travel travelmap': '@ pick %q1 on the travel map', 'travelmesh': '@ travel to %q1', 'travelmeshgroup': 'Send the whole group to %q1', 'travelmeshstop': '@ stop travelling',
    'fasttravel travelfast': '@ fast travel to %q1', 'travelbell': '@ take the bell to %q1', 'travelspires travelspire': '@ take the spires to %q1',
    'traveldruid': '@ take the druid ring to %q1', 'callgh calltogh': '@ call to the guild hall', 'gettogh': '@ get to the guild hall',
    'portaltoguildhall toguild': '@ take the guild hall portal', 'repairgear repair': '@ repair their gear', 'cancelcasting cancel_casting': '@ stop casting',
    'petgetlost': '@ dismiss the pet', 'petattack peton pet_on pet-on pet-attack': 'Send the pets in', 'changebeltadorn': '@ put the %1 rune on the belt',
    'checkresearch': '@ check their research', 'research_material_check': '@ check their research materials', 'showavailablesetups': 'Show the fight set-ups OgreBot has',
    'spewstat spewstats': 'Show a stat of every box (%r)', 'setupfor': function (f, a) { return S(f, 'start the fight set-up for ' + (a[0] ? vv(a[0]) : 'the named nearby')); },
    'ogreapi ogrebotapi': function (f, a) { return /^setupfor_intercept$/i.test(unq(a[0] || '')) ? S(f, 'get ready to intercept') : S(f, 'run OgreBot\'s ' + W.split(unq(a[0] || ''))); },
    'ogrecommandob_ap': '@ run the Ogre command %q1', 'rawcommandob_ap rawcommandrequiresogrebot_allparams': '@ run the console line "%r"',
    'set_variable': 'Set the OgreBot value %q1 to %2', 'clear_variable': 'Forget the OgreBot value %q1', 'clear_variables': 'Forget every OgreBot value',
    'set_internalvariable': 'Set OgreBot\'s inside value %q1 to %2', 'clear_internalvariable': 'Forget OgreBot\'s inside value %q1',
    'clear_internalvariables': 'Forget every OgreBot inside value',
    'come2me cometome': function (f, a) { var w = f, t = a[0]; if (a.length && !isFw(f) && isFw(a[0])) { w = a[0]; t = f; } return S(w, 'come to ' + (t ? W.lsName(t) : 'me')); },
    'assist ass': function (f, a) { var w = f, t = a[0]; if (a.length && !isFw(f) && isFw(a[0])) { w = a[0]; t = f; } return S(w, 'assist ' + (t ? W.lsName(t) : 'me')); },
    'zonedoor door doorx zonedooroption zonedoorforwho doorforwho doorxforwho zonedooroptionforwho': function (f, a) {
      var w = f, o = a[0];
      if (!a.length && !isFw(f)) { w = ''; o = f; } else if (a.length && !isFw(f) && isFw(a[0])) { w = a[0]; o = f; }
      return S(w, 'pick ' + (o == null || o === '' ? 'the first choice' : (/^\d+$/.test(unq(o)) ? 'choice ' + unq(o) : '"' + vv(o) + '"')) + ' at the zone door'); }
  };
  var NVK = {};
  for (var nk in NV) if (NV.hasOwnProperty(nk)) { var ks = nk.split(' '); for (var ki = 0; ki < ks.length; ki++) NVK[ks[ki]] = NV[nk]; }
  function S(f, phrase) { var s = unq(f).trim(); return !s || /^auto$/i.test(s) ? phrase.charAt(0).toUpperCase() + phrase.slice(1) : Who(s) + ' ' + phrase; }
  function nvLine(verb, rest) {
    var e = NVK[str(verb).toLowerCase()];
    if (!e) return '';
    var t = toks(rest), cut = 1;
    while (cut < t.length && !(/^-[A-Za-z]/.test(t[cut]) && NVK[t[cut].slice(1).toLowerCase()])) cut++;
    t = t.slice(0, cut);
    var f = t.length ? t[0] : '', a = t.slice(1);
    if (typeof e === 'function') return e(f, a);
    var s = e.replace(/%([qp]?)([1-9wrL])/g, function (_x, qq, k) {
      if (k === 'w') return W.who(unq(f) || 'all');
      if (k === 'L') return a.length >= 3 ? W.loc(a.slice(0, 3).map(unq)) : 'where I stand';
      var x = k === 'r' ? a.map(unq).join(' ') : a[+k - 1];
      if (x == null || x === '') return qq === 'p' ? 'me' : (qq ? '""' : '?');
      if (qq === 'p') return isMe(unq(x)) ? 'me' : W.lsName(x);
      return qq ? '"' + vv(x) + '"' : vv(x);
    });
    if (s.charAt(0) === '@') return S(f, s.slice(2));
    return s + (/%w/.test(e) || grp(f) ? '' : ' (' + W.who(unq(f)) + ')');
  }
  W.lsName = function (s) {
    var t = unq(s), m = /Name\s*=[=-]?\s*\\?"([^"\\]+)/i.exec(t) || /ExactName\s*,\s*\\?"([^"\\]+)/i.exec(t);
    if (m) return '"' + W.val(m[1]) + '"';
    if (/\{\{/.test(t)) return W.val(t);
    if (/^\$\{Me\.Name\}$/i.test(t)) return 'me';
    if (/^\$\{Target(\.ID)?\}$/i.test(t)) return 'my target';
    return /\$\{/.test(t) ? 'the object it looks up' : '"' + t + '"';
  };
  W.ls = function (expr) {
    var s = str(expr).trim(), neg = /^!/.test(s), m;
    s = s.replace(/^!\s*/, '');
    if ((m = /^\$\{Actor\[[^\]]*Name\s*=[=-]?\s*\\?"([^"\\]+)[^\]]*\](?:\.ID)?\(exists\)\}$/i.exec(s))) return '"' + m[1] + '" is ' + (neg ? 'not ' : '') + 'here';
    if (/^\$\{Me\.InCombat\}$/i.test(s)) return neg ? 'I am not in combat' : 'I am in combat';
    if (/^\$\{Me\.IsDead\}$/i.test(s)) return neg ? 'I am alive' : 'I am dead';
    return (neg ? 'not ' : '') + 'a script check';
  };
  W.ogre = function (line) {
    var s = str(line);
    for (var i = 0; i < OC.length; i++) {
      var m = OC[i][0].exec(s);
      if (m) return OC[i][1](m);
    }
    if (/^\s*(?:timedcommand\s+\d+\s+)?(?:relay\s+\S+\s+)?(?:oc|irc)\s+!c/i.test(s)) {
      var re = /(?:^|\s)-([A-Za-z][\w+\-]*)(?=\s|$)/g, vm;
      while ((vm = re.exec(s))) if (NVK[vm[1].toLowerCase()]) return nvLine(vm[1], s.slice(re.lastIndex));
    }
    var say = /^\s*oc\s+(?!!c)(.+)$/i.exec(s);
    if (say && !/^\s*!/.test(say[1])) return 'Note in the console: ' + q(say[1].replace(/\$\{Me\.Name\}\s*/i, ''), 44);
    var verb = /\boc\s+!ci?\s+-(\w+)/i.exec(s);
    if (verb) return 'OgreBot: ' + W.split(verb[1]);
    return '';
  };
  W.note = function (text) {
    var s = str(text);
    if (/^\s*\[redundant IC-local call/i.test(s)) return 'An old script step, left out: the fight and route steps do it now';
    if (/^\s*===+\s*(.*?)\s*===+\s*$/.test(s)) return /^\s*===+\s*(.*?)\s*===+\s*$/.exec(s)[1];
    if (/relay remnant|^\s*\(Obj_|^\s*expand Obj_/i.test(s)) return 'A leftover from the old script (not run)';
    return '';
  };
  W.devNote = function (text) {
    return /Obj_|\$\{|\biss[:\s]|canonical|unmapped|suppressed redundant|RawCommand|YOYO_PATH|^expand |KillSpot|who=|OldBot|OgreBotAPI|EQ2_on|:\d+-\d+|relay remnant|\(was '?call |\boc !ci?\b|^ported |^PORTED |^call /i.test(str(text));
  };
})(typeof window !== 'undefined' ? window : this);
