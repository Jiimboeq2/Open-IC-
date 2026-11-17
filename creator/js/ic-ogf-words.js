/* Open IC Creator - ic-ogf-words.js
   OgreBot fight files in plain words (IC.ogf.stepWords / condText / whenText): every step, check and trigger kind as
   a sentence for the flowchart boxes. Pure logic, no DOM.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var O = IC.ogf = IC.ogf || {};
  function str(v) { return v == null ? '' : String(v); }
  function isArr(v) { return Object.prototype.toString.call(v) === '[object Array]'; }
  function Wd() { return IC.words; }
  function q(s, n) { return Wd().q(s, n); }
  function V(v, n) { return q(Wd().val(v), n || 40); }
  function QV(v, n) { return /^\s*\{\{[^}]+\}\}\s*$/.test(str(v)) ? V(v, n) : '"' + V(v, n) + '"'; }
  function who(fw) { return fw == null || fw === '' ? 'me' : Wd().who(fw); }
  function Who(fw) { return fw == null || fw === '' ? 'I' : Wd().Who(fw); }
  function nm(n) { return '"' + Wd().val(n) + '"'; }
  function loc(a, y, z) { return Wd().loc(a, y, z); }
  function secs(ms) { return Wd().secs(ms); }
  function det(a) { return Wd().det(a.main, a.back, a.det); }
  function isAll(f) { return f == null || f === '' || /^all$/i.test(str(f)); }
  function fwOf(a) { return a.sendTo != null && a.sendTo !== '' && isAll(a.forwho) ? a.sendTo : (a.forwho != null && a.forwho !== '' ? a.forwho : a.sendTo); }
  function forTag(a) { var f = fwOf(a); return f && !/^all$/i.test(str(f)) ? ' (' + who(f) + ')' : ''; }
  function onlyWho(a) { return isAll(a.forwho) ? '' : a.forwho; }
  var TEMP = 'a temporary spot; clearing it returns to the group\'s spot';
  function onOff(v) { return v === false || str(v).toUpperCase() === 'FALSE' ? 'off' : 'on'; }
  function Turn(v, what, a) { return 'Turn ' + onOff(v) + ': ' + what + (a ? forTag(a) : ''); }

  var CMP = { '<': 'below', '<=': 'at most', '==': '', '=': '', '>=': 'at least', '>': 'above', '!=': 'not' };
  var FLIP = { '<': '>=', '<=': '>', '==': '!=', '=': '!=', '>=': '<', '>': '<=', '!=': '==' };
  function cmp(c, neg) { var k = neg ? (FLIP[str(c)] || str(c)) : str(c); var w = CMP[k]; return w == null ? k + ' ' : (w ? w + ' ' : ''); }
  var STAT = { health: 'my health', power: 'my power', cursed: 'my curses', concfree: 'my free concentration', elemental: 'my elemental detriments',
    noxious: 'my noxious detriments', trauma: 'my trauma detriments', arcane: 'my arcane detriments', pet: 'my pet' };
  var FLAGS = { ismoving: ['I am moving', 'I am not moving'], isinvis: ['I am invisible', 'I am not invisible'], isstealthed: ['I am stealthed', 'I am not stealthed'],
    isfd: ['I am feigning death', 'I am not feigning death'], rangedautoattackon: ['my ranged auto-attack is on', 'my ranged auto-attack is off'] };
  var HO = { open: 'a heroic opportunity is open', primed: 'a heroic opportunity is primed', solo: 'a solo heroic opportunity is running',
    starter: 'a heroic opportunity starter is up', wheel: 'a heroic opportunity wheel is up', mystart: 'I started the heroic opportunity' };
  var OF = { me: 'me', campspot: 'my camp spot', campspotanchor: 'what my camp spot follows' };
  function ofWords(o) { return OF[str(o).toLowerCase()] || V(o, 30); }
  function spotWords(spots, index) {
    if (isArr(spots)) return spots.length === 1 ? loc(spots[0]) : 'one of ' + spots.length + ' spots';
    return (index != null && index !== '' ? 'spot ' + V(index, 26) + ' of ' : 'a spot in ') + nm(spots);
  }
  O.condText = function (c, depth, neg) {
    if (!c || typeof c !== 'object') return '?';
    depth = depth || 0;
    if (depth > 8) return '...';
    if (isArr(c)) return O.condsText(c, depth, neg);
    var keys = Object.keys(c).filter(function (x) { return x.charAt(0) !== '_'; });
    if (keys.length > 1) {
      var each = keys.map(function (x) { var one = {}; one[x] = c[x]; return O.condText(one, depth + 1, false); });
      return neg ? 'not (' + each.join(' and ') + ')' : each.join(' and ');
    }
    var k = keys[0] || Object.keys(c)[0], v = c[k], o = v && typeof v === 'object' ? v : {};
    var N = function (yes, no) { return neg ? (no != null ? no : 'not (' + yes + ')') : yes; };
    var list = function (x, j) { var L = isArr(x) ? x : [x], a = []; for (var i = 0; i < L.length; i++) a.push(O.condText(L[i], depth + 1, false)); return a.join(j); };
    switch (k) {
      case 'not': return O.condsText(v, depth + 1, !neg);
      case 'or': {
        var L = isArr(v) ? v : [v];
        if (neg) { var b = []; for (var i = 0; i < L.length; i++) b.push(O.condText(L[i], depth + 1, true)); return b.join(' and '); }
        return L.length > 1 ? 'either ' + list(L, ' or ') : list(L, '');
      }
      case 'and': return neg ? 'not (' + list(v, ' and ') + ')' : list(v, ' and ');
      case 'varEquals': {
        var val = str(o.value), ans = Wd().answer(o.name), vw = Wd().varWords(o.name, o.scope);
        if (ans && ans.bool && /^(true|false)$/i.test(val)) return (/^true$/i.test(val) !== !!neg) ? ans.text : ans.neg;
        if (val === '') return vw + (neg ? ' is set' : ' is empty');
        if (/^true$/i.test(val)) return vw + (neg ? ' is not yes' : ' is yes');
        if (/^false$/i.test(val)) return vw + (neg ? ' is not no' : ' is no');
        return vw + (neg ? ' is not ' : ' is ') + V(val, 24);
      }
      case 'varCompare': return Wd().varWords(o.name, o.scope) + ' is ' + cmp(o.compare, neg) + V(o.value, 20);
      case 'textEquals':
        if (str(o.value) === '') return srcWords(o.text) + (neg ? ' is set' : ' is empty');
        return srcWords(o.text) + (neg ? ' is not ' : ' is ') + V(o.value, 30);
      case 'textContains': return srcWords(o.text) + (neg ? ' does not have "' : ' has "') + V(o.value, 30) + '"';
      case 'mobHealthPct': return (o.named ? V(o.named, 26) + '\'s' : 'the named\'s') + ' health is ' + cmp(o.compare, neg) + V(o.value, 12) + '%';
      case 'count': return countWords(o, neg);
      case 'distance': {
        var to = o.valueOf && typeof o.valueOf === 'object' ? 'the distance to ' + V(o.valueOf.to, 26) : V(o.value, 10) + ' m';
        var from = o.from ? (isArr(o.from) ? loc(o.from) : ofWords(o.from)) : 'me';
        return 'the distance from ' + from + ' to ' + (o.to && typeof o.to === 'object' ? Wd().objVal(o.to) : V(o.to, 28)) + ' is ' + cmp(o.compare, neg) + to;
      }
      case 'actorNear': {
        var what = Wd().find(o.find), where = o.ofLoc ? loc(o.ofLoc) : (o.ofActor ? V(o.ofActor, 26) : ofWords(o.of || 'me'));
        var many = o.compare ? ' (' + cmp(o.compare, false) + V(o.value, 10) + ')' : '';
        return N(what + many + ' is within ' + V(o.within, 10) + ' m of ' + where, what + many + ' is not within ' + V(o.within, 10) + ' m of ' + where);
      }
      case 'hasDet': {
        var whoHas = o.actor ? V(o.actor, 26) : 'I', d = det(o), stacks = o.compare ? ' with ' + cmp(o.compare, false) + V(o.value, 16) + ' stacks' : '';
        if (o.actor) return N(whoHas + ' has ' + d + stacks, whoHas + ' does not have ' + d + stacks);
        return N('I have ' + d + stacks, 'I do not have ' + d + stacks);
      }
      case 'detTimeLeft': return det(o) + ' on me has ' + cmp(o.compare, neg) + Wd().seconds(o.value) + ' left';
      case 'nearSpot': {
        var ofw = ofWords(o.of || 'me'), sp = spotWords(o.spots, o.index);
        return (ofw === 'me' ? 'I am' : ofw + ' is') + (neg ? ' not' : '') + ' within ' + V(o.within, 10) + ' m of ' + sp;
      }
      case 'toonFlagged': return N('I have flag ' + V(o.flag, 10), 'I do not have flag ' + V(o.flag, 10));
      case 'timerExpired': return 'the timer ' + nm(o.name) + (neg ? ' has not run out' : ' ran out');
      case 'timerLeft': return 'the timer ' + nm(o.name) + ' has ' + cmp(o.compare, neg) + secs(o.value) + ' left';
      case 'abilityReady': {
        var an = Wd().abil(o.name || o.ability, o.abilityId);
        return an + (neg ? ' is not ready' : ' is ready') + (o.recastOnly ? ' (by its timer)' : '');
      }
      case 'hasAbility': { var hn = Wd().abil(o.ability || o.name, o.abilityId); return N('I have the ability ' + hn, 'I do not have the ability ' + hn); }
      case 'maintained': return N(V(o.ability, 30) + ' is up', V(o.ability, 30) + ' is not up');
      case 'hasItem': return N('I have ' + q(o.item, 30), 'I do not have ' + q(o.item, 30));
      case 'itemReady': return q(o.item, 30) + (neg ? ' is not ready to use' : ' is ready to use');
      case 'engaged': return N('we are fighting ' + (o.named ? q(o.named, 30) : 'the named'), 'we are not fighting ' + (o.named ? q(o.named, 30) : 'the named'));
      case 'atCampSpot': return N('I am at my camp spot', 'I am not at my camp spot');
      case 'campSpotValid': return N('my camp spot can be used', 'my camp spot cannot be used');
      case 'campSpotRelative': return N('I am on a temporary spot', 'I am on the group\'s spot');
      case 'botPaused': return N('the bot is paused', 'the bot is running');
      case 'inCombat': return N('we are in combat', 'we are not in combat');
      case 'selfCasting': return N('I am casting', 'I am not casting');
      case 'dispelReady': return N('I have a dispel ready', 'I have no dispel ready');
      case 'dispelItemReady': return N('I have a dispel item ready', 'I have no dispel item ready');
      case 'assistInControl': return N('the assist is in control', 'the assist is not in control');
      case 'zone': return o.contains ? 'the zone name ' + (neg ? 'does not have "' : 'has "') + o.contains + '"' : (neg ? 'we are not in ' : 'we are in ') + q(o.is || o.name || v, 30);
      case 'myStat': {
        var st = str(o.stat).toLowerCase(), cv = +o.value, cc = str(o.compare);
        if (FLAGS[st]) { var yes = str(o.value) !== '0' && str(o.value).toUpperCase() !== 'FALSE'; return FLAGS[st][(yes !== !!neg) ? 0 : 1]; }
        var KIND = { cursed: 'curse', elemental: 'elemental detriment', noxious: 'noxious detriment', trauma: 'trauma detriment', arcane: 'arcane detriment' }[st];
        if (KIND && ((cc === '==' || cc === '=') && cv === -1 || cc === '<' && cv === 0)) return N('I have an uncurable ' + KIND, 'I have no uncurable ' + KIND);
        if (KIND && cc === '>=' && cv === 0) return N('I have no uncurable ' + KIND, 'I have an uncurable ' + KIND);
        if (KIND && cc === '!=' && cv === 0) return N(st === 'cursed' ? 'I am cursed (curable or not)' : 'I have an ' + KIND + ' (curable or not)', st === 'cursed' ? 'I am not cursed' : 'I have no ' + KIND);
        if (KIND && st !== 'cursed' && (cc === '>' && cv === 0 || cc === '>=' && cv === 1)) return N('I have an ' + KIND + ' that can be cured', 'I have no ' + KIND + ' that can be cured');
        if (KIND && st !== 'cursed' && (cc === '==' || cc === '=') && cv === 0) return N('I have no ' + KIND, 'I have an ' + KIND);
        if (st === 'cursed' && (cc === '>' && cv === 0 || cc === '>=' && cv === 1)) return N('I am cursed', 'I am not cursed');
        if (st === 'cursed' && (cc === '==' || cc === '=') && cv === 0) return N('I am not cursed', 'I am cursed');
        if (st === 'cursed' && cc === '<=' && cv === 0) return N('I have no curse that can be cured', 'I have a curse that can be cured');
        if (st === 'pet' && (cc === '>' || cc === '>=') && cv <= 1) return N('I have a pet out', 'I have no pet out');
        if (st === 'pet' && (cc === '==' || cc === '=') && (cv === 0 || cv === 1)) return N(cv ? 'I have a pet out' : 'I have no pet out', cv ? 'I have no pet out' : 'I have a pet out');
        return (STAT[st] || 'my ' + Wd().split(o.stat)) + ' is ' + cmp(o.compare, neg) + V(o.value, 20) + (st === 'health' || st === 'power' ? '%' : '');
      }
      case 'option': { var on = !(o.value === false || str(o.value).toUpperCase() === 'FALSE'); return 'the bot option "' + Wd().option(o.id) + '" is ' + ((on !== !!neg) ? 'on' : 'off'); }
      case 'heroicOpportunity': {
        if (o.timeLeft) return 'the heroic opportunity' + (o.timeLeft === 'myWheel' ? ' I started' : '') + ' has ' + cmp(o.compare, neg) + V(o.value, 12) + ' s left';
        var hs = HO[str(o.state).toLowerCase()] || 'the heroic opportunity is ' + q(o.state, 20), hf = str(o['for']).toLowerCase();
        return N(hs + (hf === 'me' ? ' (mine)' : (hf ? ' (for a ' + hf + ')' : '')));
      }
      case 'actorIs': return actorIsWords(o, neg);
      case 'collision': return 'the way from ' + loc(o.from) + ' to ' + loc(o.to) + (neg ? ' is clear' : ' is blocked');
      case 'raidSlot': return N('I am ' + (+o.slot === 1 ? 'first' : 'number ' + V(o.slot, 10)) + ' in the raid list', 'I am not ' + (+o.slot === 1 ? 'first' : 'number ' + V(o.slot, 10)) + ' in the raid list');
      case 'afflicted': {
        var kd = (o.uncurable ? 'an uncurable ' : 'a ') + str(o.kind).toLowerCase() + ' detriment', wh = o.name ? V(o.name, 24) : (o.who ? 'someone in ' + (o.who === 'raid' ? 'the raid' : 'my group') : 'I');
        return N(wh + (wh === 'I' ? ' have ' : ' has ') + kd, wh + (wh === 'I' ? ' do not have ' : ' does not have ') + kd);
      }
      case 'actorPresent': {
        var ap = o.name ? QV(o.name, 30) : V(o.id, 30);
        if (o.compare) return 'there are ' + cmp(o.compare, neg) + V(o.count, 10) + ' of ' + ap + ' here';
        return N(ap + ' is here', ap + ' is not here');
      }
      case 'untoldTier': return 'the Untold tier is ' + cmp(o.compare, neg) + V(o.value, 10);
      case 'namedCasting': {
        var cn = o.named ? q(o.named, 26) : 'the named', ca = o.abilityId ? ' ' + Wd().abil('', o.abilityId) : '';
        return N(cn + ' is casting' + ca, cn + ' is not casting' + ca);
      }
      case 'forwho': return N('I am one of ' + who(o._value != null ? o._value : v), 'I am not one of ' + who(o._value != null ? o._value : v));
      case 'actorCoord': return (str(o.of) === 'me' ? 'my ' : V(o.of, 20) + '\'s ') + ({ x: 'x', y: 'height', z: 'z' }[str(o.axis).toLowerCase()] || o.axis) + ' is ' + cmp(o.compare, neg) + V(o.value, 16);
      case 'actorTarget': {
        var at = V(o.id, 26), tw = o.inMyGroup ? 'someone in my group' : (o.archetype ? 'a ' + str(o.archetype).toLowerCase() : 'something');
        return N(at + ' is targeting ' + tw, at + ' is not targeting ' + tw);
      }
      case 'roster': {
        var rs = str(o.state).toLowerCase(), ph = { settled: ['is settled', 'is not settled yet'], timedout: ['timed out', 'has not timed out'],
          windowover: ['has closed', 'is still open'] }[rs] || [Wd().split(o.state), 'not ' + Wd().split(o.state)];
        return 'the roll call ' + nm(o.list) + ' ' + ph[neg ? 1 : 0];
      }
      case 'inMyGroup': return N(V(o.who, 30) + ' is in my group', V(o.who, 30) + ' is not in my group');
      case 'groupDistance': return 'the ' + (str(o.pick) || 'farthest') + ' group member is ' + cmp(o.compare, neg) + V(o.value, 12) + ' m away';
      case 'jumpRoute': return str(o.is) === 'failed' ? N('the jump failed', 'the jump did not fail') : N('a jump is under way', 'no jump is under way');
      case 'curePotionReady': return 'a ' + str(o.type).toLowerCase() + ' cure potion is ' + (neg ? 'not ready' : 'ready');
      case 'lootWindow': return N('a loot window (' + q(o.type, 20) + ') with ' + q(o.item, 26) + ' is open', 'no loot window with ' + q(o.item, 26) + ' is open');
      case 'threatToMe': return 'my threat is ' + cmp(o.compare, neg) + V(o.value, 12) + '%';
      case 'cureCalled': return N('a ' + (o.kind ? str(o.kind).toLowerCase() + ' ' : '') + 'cure has been called for', 'no ' + (o.kind ? str(o.kind).toLowerCase() + ' ' : '') + 'cure is called for');
      case 'ruleState': return 'the rule ' + nm(o.id) + ' is ' + (neg ? 'not ' : '') + (str(o.is) === 'inactive' ? 'off' : str(o.is));
    }
    var plain = Wd().split(k);
    return N(plain + (o && Object.keys(o).length ? ' (' + Object.keys(o).map(function (x) { return Wd().split(x) + ' ' + q(Wd().val(o[x]), 16); }).join(', ') + ')' : ''));
  };
  O.condsText = function (list, depth, neg) {
    var L = isArr(list) ? list : (list ? [list] : []), a = [];
    for (var i = 0; i < L.length; i++) a.push(O.condText(L[i], (depth || 0) + 1, neg && L.length === 1));
    if (neg && L.length > 1) return 'not (' + a.join(' and ') + ')';
    return a.join(' and ');
  };
  function srcWords(t) { return t ? Wd().val(t) : 'the line'; }
  function countWords(o, neg) {
    var n = o.valueOf && typeof o.valueOf === 'object' ? 'the number of ' + Wd().find(o.valueOf.find) + (o.plus ? ' plus ' + o.plus : '') : V(o.value, 16);
    var of = str(o.of).toLowerCase(), c = cmp(o.compare, neg);
    if (of === 'vars') return 'the saved values starting ' + nm(o.prefix) + ' number ' + c + n;
    if (of === 'cursed') {
      if (o.member) return V(o.member, 26) + (neg ? ' is not cursed' : ' is cursed');
      return 'the ' + (o.uncurable ? 'uncurably ' : '') + 'cursed players in ' + (o.scope === 'raid' ? 'the raid' : (o.scope === 'group' ? 'my group' : 'range')) + ' number ' + c + n;
    }
    if (of === 'roster') return 'the ' + Wd().split(o.is) + (/s$/.test(str(o.is)) ? '' : 's') + ' in ' + (o.scope === 'raid' ? 'the raid' : 'my group') + ' number ' + c + n;
    return 'there are ' + c + n + ' of ' + (o.find ? Wd().find(o.find) : Wd().query(o.of));
  }
  var ACT = { tooltip: ['shows "', '"'], aura: ['has the aura "', '"'], overlay: ['has the overlay "', '"'], guild: ['is in the guild "', '"'],
    name: ['is named "', '"'], targetname: ['is targeting ', ''], type: ['is a ', ''], currentanimation: ['is playing animation ', ''], tintflags: ['has the tint ', ''] };
  function actorIsWords(o, neg) {
    var a = V(o.id, 28), parts = [];
    for (var k in o) if (o.hasOwnProperty(k) && k !== 'id') {
      var lk = k.toLowerCase();
      if (lk === 'dead') parts.push(o[k] === false ? 'is alive' : 'is dead');
      else if (lk === 'feigndeath') parts.push(o[k] === false ? 'is not feigning death' : 'is feigning death');
      else if (ACT[lk]) parts.push(ACT[lk][0] + q(Wd().val(o[k]), 26) + ACT[lk][1]);
      else parts.push('has ' + Wd().split(k) + ' ' + q(Wd().val(o[k]), 16));
    }
    var s = a + ' ' + (parts.join(' and ') || 'is there');
    return neg ? 'not (' + s + ')' : s;
  }

  var WHEN = { text: 'a line shows', announcement: 'red text shows', chat: 'a chat line shows', detAdded: 'I get', detRemoved: 'leaves me',
    detUpdated: 'changes', castEnded: 'finishes casting' };
  O.whenText = function (t) {
    var on = str(t.on), m = t.match || {}, needle = m.needle || m.text || m.value || '', name = m.name || '';
    var title;
    switch (on) {
      case 'text': case 'announcement': case 'chat': {
        var ct = on === 'chat' && m.chatType != null && m.chatType !== '' ? ' (chat type ' + m.chatType + ')' : '';
        title = WHEN[on].charAt(0).toUpperCase() + WHEN[on].slice(1) + ct + (needle ? (m.mode === 'regex' ? ' that matches: "' : (m.mode === 'exact' ? ': "' : ' with: "')) + q(needle, 70) + '"' : '');
        break;
      }
      case 'spawn': case 'spawnDelayed': case 'despawn': {
        var unnamed = t.match && m.hasOwnProperty('name') && str(m.name) === '';
        var who0 = !name ? (unnamed ? 'An unnamed mob' : 'A mob') : (m.mode === 'substring' ? 'A mob with "' + name + '" in its name' : '"' + name + '"');
        title = who0 + (on === 'spawn' ? ' appears' : (on === 'despawn' ? ' goes away' : ' has been up a while'));
        break;
      }
      case 'detAdded': title = 'I get ' + det(m); break;
      case 'detRemoved': title = Wd().det(m.main, m.back, m.det).replace(/^t/, 'T') + ' leaves me'; break;
      case 'detUpdated': title = Wd().det(m.main, m.back, m.det).replace(/^t/, 'T') + ' on me ' + (m.field && m.compare ? 'gets ' + cmp(m.compare) + m.value + ' stacks' : 'changes'); break;
      case 'castEnded': title = (m.named ? q(m.named, 26) : 'The named') + ' finishes casting ' + Wd().abil('', m.abilityId); break;
      default: title = 'The message "' + on + '" arrives';
    }
    return { title: title, sub: '' };
  };

  var MOVE = { campSpot: 1, joust: 1, movement: 1, move: 1, waypoint: 1, repositionOnCondition: 1 };
  var STATE = { setVar: 1, timer: 1, ogreBotUIOption: 1, autotarget: 1, noOffensive: 1, noDefensive: 1, curses: 1, cures: 1,
    abilities: 1, castStack: 1, heroicOpportunity: 1, threatIgnoreList: 1, flagToon: 1, botPause: 1, assist: 1, rosterOrder: 1, resolve: 1, report: 1, examine: 1 };
  function W(role, icon, title, sub, extra) { var o = { role: role, icon: icon, title: title, sub: sub || '' }; for (var k in extra || {}) o[k] = extra[k]; return o; }
  function withWho(a, s) { return Who(fwOf(a)) + ' ' + s; }
  function subs() { var o = []; for (var i = 0; i < arguments.length; i++) if (arguments[i]) o.push(arguments[i]); return o.join('; '); }
  function uniq(l) { var o = []; for (var i = 0; i < l.length; i++) if (o.indexOf(l[i]) < 0) o.push(l[i]); return o; }
  function actorOf(a) { return (a.query ? Wd().query(a.query) : V(a.name || a.id, 30)) + (a.nth != null && a.nth !== '' ? ' (number ' + V(a.nth, 12) + ')' : ''); }
  function spotsName(s) { return isArr(s) ? 'the ' + s.length + ' spots' : nm(s); }
  function campSpot(a) {
    var op = str(a.op), I = '&#128205;', who0 = Who(fwOf(a)), at = a.loc ? loc(a.loc) : (a.x != null ? loc(a.x, a.y, a.z) : '');
    var rel = a.relative === true || str(a.relative).toUpperCase() === 'TRUE', now = rel ? ' for now' : '', tsub = rel ? TEMP : '';
    var idx = a.indexVar ? 'remembers which in ' + nm(a.indexVar) : '';
    switch (op) {
      case 'setLoc': return W('move', I, who0 + ' stand at ' + (at || 'a spot'));
      case 'setRelativeLoc': return W('move', I, who0 + ' go to ' + (at || 'a spot') + ' for now', TEMP);
      case 'setLocBy': return W('move', I, who0 + ' move the camp spot by ' + loc(a.by));
      case 'setRelativeBy': return W('move', I, who0 + ' step ' + loc(a.by) + ' off the camp spot for now', TEMP);
      case 'setLocToActor': return W('move', I, who0 + ' stand at ' + actorOf(a));
      case 'setRelativeLocToActor': return W('move', I, who0 + ' go to ' + actorOf(a) + ' for now', TEMP);
      case 'atAngleFromActor': {
        var an = a.angle, aw = isArr(an) ? uniq(an.map(Wd().angle)).join(' or ') : Wd().angle(an);
        var asub = isArr(an) ? 'at ' + an.join(' or ') + ' degrees' + (a.pick ? ', the ' + Wd().split(a.pick) : '') : (isFinite(+an) && str(an) !== '' ? 'at ' + an + ' degrees' : '');
        return W('move', I, who0 + ' stand ' + V(a.dist, 12) + ' m ' + aw + ' ' + V(a.id || a.name, 28) + now, subs(asub, tsub));
      }
      case 'towardLoc': {
        var tw = a.towardActor != null ? V(a.towardActor, 24) : (a.toward != null ? loc(a.toward) : 'the spot');
        if (a.fraction != null) return W('move', I, who0 + ' stand ' + Math.round(+a.fraction * 100) + '% of the way from ' + V(a.id || a.name, 24) + ' to ' + tw + now, tsub);
        return W('move', I, who0 + ' stand ' + Math.abs(+a.dist || 0) + ' m from ' + V(a.id || a.name, 24) + (+a.dist < 0 ? ' away from ' : ' toward ') + tw + now, tsub);
      }
      case 'spotAt': {
        var ix = str(a.index).toLowerCase(), av = a.avoid && a.avoid.find ? ' clear of ' + Wd().find(a.avoid.find) + (a.avoid.within ? ' (' + a.avoid.within + ' m)' : '') : '';
        var sp = ix === 'next' ? 'the next spot of ' + spotsName(a.spots) : (ix === 'clear' ? 'a spot of ' + spotsName(a.spots) : spotWords(a.spots, a.index));
        return W('move', I, who0 + ' stand at ' + sp + av + now, subs(idx, tsub));
      }
      case 'bestOf': {
        var among = a.find ? Wd().find(a.find) : (isArr(a.spots) ? a.spots.length + ' spots' : 'the spots in ' + nm(a.spots));
        var from = a.from != null && a.from !== '' ? ' from ' + (/^me$/i.test(str(a.from)) ? 'me' : V(a.from, 28)) : '';
        return W('move', I, who0 + ' stand at the ' + (a.pick ? Wd().split(a.pick) : 'best') + ' of ' + among + from + now,
          subs(a.minDistance ? 'at least ' + a.minDistance + ' m away' : '', idx, tsub));
      }
      case 'setHere': return W('move', I, who0 === 'I' ? 'I hold where I stand' : who0 + ' hold where they stand',
        subs(a.howClose != null ? 'stop within ' + a.howClose + ' m' : '', a.howFar != null ? 'come back from up to ' + a.howFar + ' m' : ''));
      case 'enable': return W('move', I, 'Camp spots on (' + who(fwOf(a)) + ')',
        subs(a.howClose != null ? 'stop within ' + a.howClose + ' m' : '', a.howFar ? 'come back from up to ' + a.howFar + ' m' : '', a.keepSpot ? 'keep the spot it had' : ''));
      case 'disable': return W('move', I, 'Camp spots off (' + who(fwOf(a)) + ')');
      case 'clear': return W('move', I, 'Clear the camp spot (' + who(fwOf(a)) + ')');
      case 'clearAll': return W('move', I, 'Clear all camp spots (' + who(fwOf(a)) + ')');
      case 'clearRelative': return W('move', I, who0 + ' go back to the group\'s spot', 'drops the temporary spot');
      case 'release': return W('move', I, who0 + ' leave the camp spot and follow again');
      case 'setHowClose': return W('move', I, 'Camp spot: stop within ' + a.value + ' m' + forTag(a));
      case 'setHowFar': return W('move', I, 'Camp spot: come back from up to ' + a.value + ' m' + forTag(a));
      case 'activate': return W('move', I, who0 + ' use camp spot ' + a.slot);
      case 'formation': return W('move', I, 'Spread out around ' + (a.spots ? spotWords(a.spots, a.index) : loc(a.x, a.y, a.z)) + ' (' + a.dist + ' m apart)' +
        (a.middle ? ' with ' + who(a.middle) + ' in the middle' : ''));
      case 'clearOf': return W('move', I, who0 + ' step away from ' + Wd().find(a.avoid && a.avoid.find), a.avoid && a.avoid.within ? 'keep ' + a.avoid.within + ' m clear' : '');
    }
    if (a.spots) return W('move', I, who0 + ' spread over the spots in ' + nm(a.spots));
    return W('move', I, who0 + (at ? ' stand at ' + at : ' camp spot (' + Wd().split(op) + ')'));
  }
  var ABIL = { aoes: 'AE abilities', bowabilities: 'Bow abilities', dispels: 'Dispels', interrupts: 'Interrupts', stuns: 'Stuns', dispelsetup: 'Dispel set-up' };
  var HOW = { advance: 'Advance the heroic opportunity', cancelstarter: 'Cancel the heroic opportunity starter', startsolo: 'Start a solo heroic opportunity',
    stopsolo: 'Stop solo heroic opportunities', clearicons: 'Allow every heroic opportunity icon again' };
  O.stepWords = function (a) {
    var d = str(a['do']), op = str(a.op), fw = fwOf(a);
    if (a.repeat && typeof a.repeat === 'object') {
      var rp = a.repeat;
      return W('loop', '&#8635;', rp.times ? 'Do these ' + rp.times + ' times' : 'Repeat until ' + q(O.condsText(rp.until) || '?', 90), rp.max ? 'at most ' + rp.max + ' times' : '');
    }
    if (a.forEach) {
      var fe = a.forEach, what = fe.find ? Wd().find(fe.find) :
        (fe.spots ? (isArr(fe.spots) ? 'of ' + fe.spots.length + ' spots' : 'spot in ' + nm(fe.spots)) :
        (fe.vars ? 'saved value starting ' + nm(fe.vars.prefix) + (fe.vars.groupMember ? ' (my group\'s)' : '') + (fe.vars.order === 'descending' ? ', last first' : '') : 'of them'));
      return W('loop', '&#8635;', 'For each ' + what, (fe.max ? 'at most ' + fe.max : '') + (fe.as ? (fe.max ? ', ' : '') + 'each one is found as "' + fe.as + '"' : ''));
    }
    if (a.use && !d) {
      var args = a['with'] || a.args, aw = [];
      if (args && typeof args === 'object') for (var ak in args) if (args.hasOwnProperty(ak)) aw.push(ak + ' = ' + q(Wd().val(args[ak]), 20));
      return W('action', '&#8618;', 'Run the steps "' + q(a.use, 30) + '"' + forTag(a), aw.length ? 'with ' + aw.join(', ') : '');
    }
    if (a.wait && !d) {
      var lim = a.limitMs != null ? secs(a.limitMs) : '', ww = onlyWho(a), Wt = ww ? Who(ww) + ' wait' : 'Wait', mine = ww && Who(ww) !== 'I' ? ['they reach their', 'they are'] : ['I reach my', 'I am'];
      if (a.wait === 'ms') return W('cond', '&#9203;', Wt + ' ' + lim, '', { timeout: '' });
      if (a.wait === 'atCampSpot') return W('cond', '&#9203;', Wt + ' until ' + mine[0] + ' camp spot', 'at most ' + lim, { timeout: str(a.onTimeout) });
      if (a.wait === 'moveFinished') return W('cond', '&#9203;', Wt + ' until the move is done', 'at most ' + lim, { timeout: str(a.onTimeout) });
      return W('cond', '&#9203;', Wt + ' until ' + q(O.condsText(a.wait), 70), 'at most ' + lim, { timeout: str(a.onTimeout) });
    }
    switch (d) {
      case 'stop': {
        var sw = onlyWho(a);
        if (sw) return W('alt', '&#9940;', Who(sw) + ' stop here', 'they skip the rest of this list; the others go on');
        return W('alt', '&#9940;', 'Stop here', 'the rest of this list is skipped');
      }
      case 'stopEvaluating': return W('alt', '&#9940;', 'Stop: skip the rest of the rules this time');
      case 'groupQuery': {
        var qn = str(a.question), wq = qn === 'abilityReady' ? 'is ' + q(a.ability, 26) + ' ready?' : (qn === 'itemCount' ? 'how many ' + q(a.item, 24) + ' do you have?' :
          (qn === 'slotResolve' ? 'what is in your ' + q(a.slot, 16) + ' slot?' : 'a custom question'));
        return W('state', '&#10067;', 'Ask ' + (a.sendTo ? who(a.sendTo) : 'the group') + ': ' + wq, a['var'] ? 'the answers are saved as "' + a['var'] + '"' : '', { abil: qn === 'abilityReady' ? str(a.ability) : '' });
      }
      case 'setVar': {
        var sv = onlyWho(a), Sv = function (verb) { return sv ? Who(sv) + ' ' + verb : verb.charAt(0).toUpperCase() + verb.slice(1); };
        var vn = (str(a.scope).toLowerCase() === 'global' ? 'the shared ' : '') + nm(a.name != null && typeof a.name === 'object' ? Wd().objVal(a.name) : Wd().val(a.name));
        var aw0 = a.awaitWhen ? 'first waits until ' + q(O.condsText(a.awaitWhen), 50) + (a.awaitTimeout != null ? ' (at most ' + secs(a.awaitTimeout) + ')' : '') : '';
        if (op === 'unsetPrefix') return W('state', '&#9673;', Sv('forget every saved value starting ') + nm(a.name), aw0);
        if (op === 'unset' || (str(a.value) === '' && !op && (a.value == null || typeof a.value !== 'object'))) return W('state', '&#9673;', Sv('forget ') + vn, aw0);
        if (op === 'add') return W('state', '&#9673;', Sv('change ') + vn + ' by ' + V(a.value, 16), aw0);
        return W('state', '&#9673;', Sv('set ') + vn + ' to ' + (a.value != null && typeof a.value === 'object' ? Wd().objVal(a.value) : V(a.value, 30)),
          subs(op && op !== 'set' ? Wd().split(op) : '', aw0));
      }
      case 'timer': {
        var tf = forTag(a), tk = a.key ? 'once per "' + q(a.key, 20) + '"' : '';
        if (op === 'clear') return W('state', '&#9201;', 'Stop the timer ' + nm(a.name) + tf);
        if (a.event && a.after != null && a.after !== '') return W('state', '&#9201;', 'In ' + Wd().seconds(a.after) + ', send the message "' + q(a.event, 30) + '"' + tf, tk);
        if (a.set != null && a.set !== '' && +a.set === 0) return W('state', '&#9201;', 'Reset the timer ' + nm(a.name) + tf, 'set to 0');
        return W('state', '&#9201;', 'Start the timer ' + nm(a.name) + (a.set != null ? ' for ' + secs(a.set) : '') + tf, tk);
      }
      case 'campSpot': return campSpot(a);
      case 'castAbility': {
        var list = isArr(a.firstReady) ? a.firstReady : (isArr(a.allReady) ? a.allReady : null), extra = [];
        var ab = list ? list.join(isArr(a.firstReady) ? ' or ' : ' and ') : (a.ability || a.name ? Wd().val(a.ability || a.name) : Wd().abil('', a.abilityId));
        if (isArr(a.firstReady)) extra.push('whichever is ready first');
        else if (a.firstReady) extra.push('the first one ready');
        if (isArr(a.allReady)) extra.push('each one that is ready');
        else if (a.allReady) extra.push('only when all are ready');
        if (a.cancelCasting) extra.push('stops casting first');
        if (a.await) extra.push('waits for it');
        var first = list ? str(list[0]) : str(a.ability || a.name);
        var wh = Who(fw), bk = !list && Wd().aeBlocker ? Wd().aeBlocker(first) : null;
        if (bk && wh === 'Everyone') wh = 'The ' + Wd().who(bk.cls);
        return W('action', '&#10024;', wh + ' cast ' + q(ab, 40) + (a.target ? ' on ' + V(a.target, 26) : ''), extra.join(', '), { abil: /\{\{/.test(first) ? '' : first });
      }
      case 'actorInteract': {
        var tgt = a.name ? V(a.name, 30) : (a.id ? V(a.id, 30) : (a.find ? Wd().find(a.find) :
          (a.target != null && a.target !== '' ? (/^\s*(\{\{me\}\}|\$\{Me\.Name\})\s*$/i.test(str(a.target)) ? 'me' : V(a.target, 30)) : 'it')));
        if (op === 'target') return W('action', '&#127919;', (fw ? Who(fw) + ' target ' : 'Target ') + tgt);
        if (op === 'clearTarget') return W('action', '&#127919;', (fw ? Who(fw) + ' drop the target' : 'Drop the target'));
        if (op === 'verb') return W('action', '&#128073;', (fw ? Who(fw) + ' use ' : 'Use ') + QV(a.verb, 30) + ' on ' + tgt);
        if (op === 'dialog') return W('action', '&#128172;', (fw ? Who(fw) + ' pick' : 'Pick') + ' the reply ' + QV(a.choiceText, 34));
        return W('action', '&#128433;', (fw ? Who(fw) + ' double-click ' : 'Double-click ') + tgt, a.awaitCastBar ? 'waits for the cast bar' : '');
      }
      case 'announce': return W('action', '&#128227;', (a.console === true || str(a.console).toUpperCase() === 'TRUE' ? 'Note in every console: ' : 'Note in my console: ') +
        QV(a.message || a.text, 50), subs(a.irc === true || str(a.irc).toUpperCase() === 'TRUE' ? 'also on IRC' : '', a.noise ? 'with a sound' : '', fw ? 'from ' + who(fw) : ''));
      case 'broadcast': {
        var bargs = isArr(a.args) && a.args.length ? 'with ' + a.args.map(function (x) { return q(Wd().val(x), 24); }).join(', ') : '', bw = onlyWho(a);
        return W('action', '&#128227;', (bw ? Who(bw) + ' send' : 'Send') + ' the message "' + q(a.event, 34) + '" to ' + who(a.sendTo || 'all'),
          subs(bargs, a.includeSelf === false ? 'not to me' : ''));
      }
      case 'fireEvent': return W('action', '&#9889;', 'Set off the message "' + q(a.event, 30) + '"' + forTag(a), isArr(a.args) && a.args.length ? 'with ' + a.args.map(function (x) { return q(Wd().val(x), 24); }).join(', ') : '');
      case 'tts': return W('action', '&#128227;', 'Say out loud: ' + QV(a.message || a.text, 50) + forTag(a));
      case 'report': {
        var rl = nm(a.list), rw = a.who ? ' for ' + V(a.who, 24) : '', rb = a.broadcast ? 'to the whole raid' : '', re = a.event ? 'and send "' + a.event + '"' : '';
        if (op === 'start') return W('state', '&#128203;', 'Start the roll call ' + rl + forTag(a), rb);
        if (op === 'complete') return W('state', '&#128203;', 'Mark done in the roll call ' + rl + rw + forTag(a), subs(re, rb));
        return W('state', '&#128203;', 'Answer the roll call ' + rl + rw + forTag(a), subs(re, rb));
      }
      case 'rosterOrder': return W('state', '&#128203;', 'Number the roll call ' + nm(a.list) + (op === 'alpha' ? ' by name' : '') + ', my place into ' + nm(a['var']));
      case 'onScreenTimer': {
        if (op === 'clear') return W('action', '&#9201;', 'Clear on-screen countdown ' + (a.slot || ''));
        var ot = a.time != null && a.time !== '' && str(a.time) !== '0' && (+a.time || /\{\{/.test(str(a.time))) ? 'Show a countdown of ' + Wd().seconds(a.time) : 'Show on screen';
        return W('action', '&#9201;', ot + (a.message ? ': ' + QV(a.message, 40) : '') + forTag(a));
      }
      case 'template': {
        var use = str(a.use);
        if (use === 'tankSwap') return W('action', '&#9881;', { prepare: 'Get ready to swap tanks', swapOut: 'Tank swap: step out', swapIn: 'Tank swap: take over', remove: 'Stop tank swaps' }[op] || 'Swap tanks');
        if (use === 'removeTankSwap') return W('action', '&#9881;', 'Stop tank swaps');
        if (use === 'walkToActorAndInteract') return W('action', '&#128433;', 'Walk to ' + Wd().find(a.find) + ' and use it', a.limitMs ? 'at most ' + secs(a.limitMs) : '');
        if (use === 'dispel') return W('action', '&#10024;', withWho(a, 'dispel ' + (a.main || a.det ? det(a) + ' on ' : '') + V(a.mob, 26)));
        return W('action', '&#9881;', 'Run the built-in "' + Wd().split(use) + '"' + (op ? ' (' + Wd().split(op) + ')' : ''));
      }
      case 'useItem':
        if (op === 'cure') return W('action', '&#127873;', withWho(a, 'drink a ' + (a.type || a.item ? str(a.type || a.item).toLowerCase() + ' ' : '') + 'cure potion'));
        if (op === 'drinkAlcohol') return W('action', '&#127873;', withWho(a, 'drink ' + V(a.item || 'a drink', 34)));
        return W('action', '&#127873;', withWho(a, 'use ' + V(a.item || a.name, 34)) + (a.target ? ' on ' + V(a.target, 24) : ''));
      case 'resolve': {
        var f = a.find || {};
        return W('state', '&#128269;', 'Find ' + Wd().find(f), (a.as ? 'it is the "' + a.as + '" found' : '') + (a.onMissing === 'skip' ? (a.as ? '; ' : '') + 'skip the rest if none' : ''));
      }
      case 'ogreBotUIOption': return W('state', '&#9881;', Wd().optionLine(a.id, a.value, fw, a.op));
      case 'autotarget': {
        var T = '&#127919;';
        switch (op) {
          case 'addActor': case 'add': {
            var ex = [];
            if (+a.hp) ex.push('from ' + a.hp + '% health');
            if (a.aggroOnGroupOnly) ex.push('only when it is on my group');
            if (a.aggroOnNotMe) ex.push('only when it is not on me');
            if (a.aggroOnNonFighterOnly) ex.push('only when it is on a non-fighter');
            return W('state', T, 'Add ' + V(a.name || a.id, 30) + ' to the kill list' + forTag(a), ex.join(', '));
          }
          case 'removeActor': case 'remove': return W('state', T, 'Take ' + V(a.name || a.id, 30) + ' off the kill list' + forTag(a));
          case 'clear': return W('state', T, 'Clear the kill list' + forTag(a));
          case 'setScanRadius': return W('state', T, 'Kill list: look ' + a.radius + ' m around' + forTag(a));
          case 'setScanHeight': return W('state', T, 'Kill list: look ' + a.height + ' m up and down' + forTag(a));
          case 'setRescanTime': return W('state', T, 'Kill list: look again every ' + a.seconds + ' s' + forTag(a));
          case 'set': return W('state', T, 'Kill list:' + (a.radius != null ? ' look ' + a.radius + ' m around' : '') + (a.height != null ? (a.radius != null ? ',' : '') + ' ' + a.height + ' m up and down' : '') + forTag(a));
          case 'setEnabled': return W('state', T, Turn(a.value, 'Auto-target', a));
          case 'setOutOfCombatScanning': return W('state', T, Turn(a.value, 'Auto-target out of combat', a));
          case 'loadPreset': return W('state', T, 'Load the kill list preset "' + q(a.preset, 24) + '"' + forTag(a));
          case 'loadSaved': return W('state', T, 'Load the saved kill list "' + q(a.list, 24) + '"' + forTag(a));
          case 'suppress': return W('state', T, 'Pause auto-target' + forTag(a), a.reason ? 'for ' + q(a.reason, 40) : '');
          case 'release': return W('state', T, 'Resume auto-target' + forTag(a));
        }
        return W('state', T, 'Auto-target' + (a.radius != null ? ' range ' + a.radius + ' m' : '') + (a.enabled != null ? (a.enabled ? ' on' : ' off') : ''));
      }
      case 'joust': return W('move', '&#10148;', op === 'in' ? Who(fw) + ' come back in' : Who(fw) + ' run out (joust)',
        op === 'in' ? '' : (str(fw).toLowerCase() === 'all' ? 'for everyone at the start it clears a joust hold left from before' : 'to their joust spot, out of the mob\'s reach'));
      case 'movement': {
        var Mv = '&#10148;';
        switch (op) {
          case 'jump': return W('move', Mv, withWho(a, 'jump'));
          case 'stopFollow': return W('move', Mv, withWho(a, 'stop following'), 'a camp spot pulls them back next pulse: stand still holds them');
          case 'block': return W('move', Mv, withWho(a, 'stand still (no moving)'), a.reason ? 'for ' + q(a.reason, 40) : '');
          case 'unblock': return W('move', Mv, withWho(a, 'may move again'));
          case 'crouch': return W('move', Mv, withWho(a, 'crouch'));
          case 'stand': return W('move', Mv, withWho(a, 'stand up'));
          case 'jumpRoute': return W('move', Mv, withWho(a, isArr(a.legs) && a.legs.length ? 'jump along ' + a.legs.length + (a.legs.length === 1 ? ' leg' : ' legs') + ' to ' +
            loc(a.legs[a.legs.length - 1].to) : 'jump across from ' + loc(a.start) + ' to ' + loc(a.end)));
          case 'stopJumpRoute': return W('move', Mv, withWho(a, 'stop the jump'));
          case 'faceHeading': return W('move', Mv, withWho(a, 'face heading ' + a.heading));
          case 'faceLock': return W('move', Mv, withWho(a, 'face ' + (a.away ? 'away from ' : '') + V(a.actor, 26) + (a.seconds ? ' for ' + a.seconds + ' s' : '')));
          case 'faceUnlock': return W('move', Mv, withWho(a, 'stop facing it'));
          case 'navTo': return W('move', Mv, withWho(a, 'walk to ' + loc(a.loc) + ' on the mesh'));
          case 'navInRange': return W('move', Mv, withWho(a, 'walk within ' + a.range + ' m of ' + V(a.actor, 26)));
          case 'setRunMode': return W('move', Mv, withWho(a, str(a.mode) === 'walk' ? 'walk (not run)' : 'run'));
          case 'setCombatAutoFace': return W('state', '&#9881;', Turn(a.value, 'Face the mob in combat', a));
        }
        return W('move', Mv, str(a.mode) === 'walk' ? 'Walk (not run)' : withWho(a, Wd().split(op || 'move')));
      }
      case 'move': return W('move', '&#10148;', 'Move to ' + (a.loc ? loc(a.loc) : loc(a.x, a.y, a.z)) + forTag(a), a.await ? 'and wait until there' : '');
      case 'waypoint': return W('move', '&#10148;', withWho(a, 'get a waypoint trail to ' + (a.loc ? loc(a.loc) : loc(a.x, a.y, a.z))), 'the game\'s on-screen trail: it moves nobody');
      case 'repositionOnCondition':
        if (op === 'exit') return W('move', '&#10148;', withWho(a, 'go back to the camp spot'));
        return W('move', '&#10148;', withWho(a, 'go to their own spot of ' + (isArr(a.spots) ? a.spots.length + ' spots' : nm(a.spots))), a.indexVar ? 'by ' + nm(a.indexVar) : '');
      case 'noOffensive': return W('state', '&#9881;', (a.value === false ? 'Allow' : 'Hold back') + ' offensive abilities' + (a.mob ? ' on ' + V(a.mob, 26) : '') + ' (' + who(fw) + ')', a.reason ? 'for ' + q(a.reason, 40) : '');
      case 'noDefensive': return W('state', '&#9881;', (a.value === false ? 'Allow' : 'Hold back') + ' defensive abilities (' + who(fw) + ')', a.reason ? 'for ' + q(a.reason, 40) : '');
      case 'cancelMaintained': {
        var cm = isArr(a.args) ? a.args[0] : (a.name || a.ability);
        return W('action', '&#10006;', withWho(a, 'cancel ' + V(cm, 30)), '', { abil: /\{\{/.test(str(cm)) ? '' : str(cm) });
      }
      case 'gameCommand': return W('action', '&#9654;', withWho(a, 'type /' + V(a.command, 24) + (isArr(a.args) && a.args.length ? ' ' + a.args.map(function (x) { return Wd().val(x); }).join(' ') : '')));
      case 'raw': return W('action', '&#9654;', typeof a.command === 'string' ? (Wd().ogre(a.command) || 'Console command: ' + q(a.command, 40)) : 'Console command: a line OgreBot works out');
      case 'loot':
        if (op === 'assign') return W('action', '&#127873;', 'Give ' + q(a.item, 26) + ' to ' + V(a.to, 24));
        return W('action', '&#127873;', 'Loot' + (op === 'chest' ? ' the chest' : ''));
      case 'curses':
        if (op === 'order') return W('state', '&#10010;', 'Take turns curing curses, by ' + nm(a['var']));
        return W('state', '&#10010;', 'Ask ' + who(a.responders || 'all') + ' to cure the curse on ' + V(a.target || '{{me}}', 24));
      case 'cures':
        switch (op) {
          case 'request': return W('state', '&#10010;', 'Ask ' + who(a.responders || 'all') + ' to cure ' + V(a.target || '{{me}}', 24),
            isArr(a.kinds) && a.kinds.length ? 'the ' + a.kinds.join(' or ').toLowerCase() + ' kind' : '');
          case 'requestGroup': return W('state', '&#10010;', 'Ask ' + who(a.responders || 'all') + ' for a group cure');
          case 'castGroup': return W('action', '&#10010;', withWho(a, 'cast a group cure'));
          case 'disable': return W('state', '&#10010;', Turn(false, 'Cures', a));
          case 'enable': return W('state', '&#10010;', Turn(true, 'Cures', a));
          case 'cancelDetrimental': return W('action', '&#10006;', withWho(a, 'cancel ' + det(a)), 'clicks it off');
          case 'now': return W('action', '&#10010;', 'Cure ' + (isArr(a.kinds) ? a.kinds.join(' and ').toLowerCase() : 'it') + ' now');
          case 'clearRequests': return W('state', '&#10010;', 'Drop every cure request');
        }
        return W('state', '&#10010;', 'Cures (' + Wd().split(op) + ')');
      case 'dispel': {
        var by = { item: ' with an item', spell: ' with a spell', ability: '' }[op] || '';
        return W('action', '&#10024;', withWho(a, 'dispel ' + (a.main || a.det ? det(a) + ' on ' : '') + (a.mob ? V(a.mob, 26) : 'the mob') + by));
      }
      case 'castInterrupt': return W('action', '&#10024;', withWho(a, 'interrupt ' + (a.mob ? V(a.mob, 26) : 'the named')));
      case 'heroicOpportunity': {
        var H = '&#11088;';
        if (HOW[op.toLowerCase()]) return W('state', H, HOW[op.toLowerCase()] + forTag(a));
        if (op === 'set') {
          var hs = [];
          if (a.start != null) hs.push('start ' + onOff(a.start));
          if (a.starter != null) hs.push('starter ' + onOff(a.starter));
          if (a.wheel != null) hs.push('wheel ' + onOff(a.wheel));
          if (a.surge != null) hs.push('Heroic Surge ' + onOff(a.surge));
          return W('state', H, 'Heroic opportunities: ' + (hs.join(', ') || 'no change') + forTag(a), a.silent ? 'quietly' : '');
        }
        if (op === 'start') return W('action', H, 'Start a heroic opportunity' + (a.target ? ' on ' + V(a.target, 24) : '') + forTag(a));
        if (op === 'solo') return W('action', H, 'Do the heroic opportunity alone on ' + V(a.target, 24), a.leaveWheelOpen ? 'leave the wheel open' : '');
        if (op === 'disableIcon') return W('state', H, 'Never press heroic opportunity icon ' + a.icon + forTag(a));
        return W('state', H, 'Heroic opportunities (' + Wd().split(op) + ')');
      }
      case 'abilities': {
        var lo = op.toLowerCase();
        if (ABIL[lo]) return W('state', '&#9881;', Turn(a.enabled, ABIL[lo], a), a.allowEncounters ? 'encounter AEs still allowed' : '');
        if (lo === 'cancelcasting') return W('action', '&#10006;', withWho(a, 'stop casting'));
        if (lo === 'cancelinvis') return W('action', '&#10006;', withWho(a, 'drop invisibility'));
        if (lo === 'castbulwark') return W('action', '&#10024;', withWho(a, 'cast Bulwark of Order'), '', { abil: 'Bulwark of Order' });
        if (lo === 'setupforintercept') return W('state', '&#9881;', withWho(a, 'get ready to intercept'));
        if (lo === 'resetforintercept') return W('state', '&#9881;', withWho(a, 'stop intercepting'));
        return W('state', '&#9881;', 'Abilities: ' + Wd().split(op) + forTag(a));
      }
      case 'castStack': {
        var csa = str(a.ability), isIt = /^\s*Item:/i.test(csa), itn = isIt && IC.icons && IC.icons.itemName ? IC.icons.itemName(csa) : csa.replace(/^\s*Item:\s*/i, '');
        var csw = a.match === 'tag' ? QV(a.ability, 30) + ' abilities' : (isIt ? (itn ? 'the item ' + q(itn, 40) : 'the item worn there') : V(a.ability, 30));
        return W('state', '&#9881;', Turn(a.value, csw + ' in the casting list', a), '', { abil: a.match === 'tag' || /\{\{/.test(csa) ? '' : csa });
      }
      case 'flagToon':
        if (op === 'clearAll') return W('state', '&#9873;', 'Clear every flag' + forTag(a));
        if (op === 'nextPerson') return W('state', '&#9873;', 'Pass flag ' + a.flag + ' to the next person');
        return W('state', '&#9873;', (a.value === false ? 'Take flag ' + V(a.flag, 20) + ' from ' : 'Give flag ' + V(a.flag, 20) + ' to ') + who(fw));
      case 'threatIgnoreList':
        if (op === 'clear') return W('state', '&#9881;', 'Clear the threat-ignore list');
        return W('state', '&#9881;', (op === 'remove' ? 'Take ' : 'Put ') + who(a.sendTo || fw) + (op === 'remove' ? ' off' : ' on') + ' the threat-ignore list');
      case 'assist': return W('state', '&#129309;', Who(fwOf(a) || 'all') + ' assist ' + (a.who && typeof a.who === 'object' ? who(a.who) : V(a.who, 24)));
      case 'pet':
        if (op === 'getLost') return W('action', '&#128062;', withWho(a, 'dismiss the pet'));
        if (op === 'attack') return W('action', '&#128062;', withWho(a, 'send the pet in'));
        return W('action', '&#128062;', withWho(a, 'call the pet back' + (a.stayOff ? ' and keep it back' : '')));
      case 'choiceWindow':
        if (op === 'enterText') return W('action', '&#128172;', withWho(a, 'type ' + QV(a.text, 30) + ' in the pop-up'));
        return W('action', '&#128172;', withWho(a, 'press OK on the pop-up'));
      case 'botPause': return W('state', '&#9208;', a.value === false ? 'Resume the bot' : 'Pause the bot');
      case 'beltAdorn': return W('action', '&#128142;', withWho(a, 'use the belt ' + str(a.type).toLowerCase() + ' rune'));
      case 'inventory': return W('action', '&#128465;', withWho(a, 'destroy ' + (a.count ? a.count + ' x ' : '') + q(a.item, 30)));
      case 'examine': return W('state', '&#128269;', 'Read detriment ' + V(a.index, 16) + ' of ' + nm(a.dets) + ' into ' + nm(a['var']));
      case 'abilityTracker': return W('state', '&#9881;', 'Keep track of ' + q(a.ability, 30) + forTag(a), '', { abil: str(a.ability) });
    }
    var role = MOVE[d] ? 'move' : (STATE[d] ? 'state' : 'action');
    return W(role, '', d ? Wd().split(d).replace(/^./, function (c) { return c.toUpperCase(); }) + (op ? ' (' + Wd().split(op) + ')' : '') +
      (a.name ? ' ' + V(a.name, 24) : '') : 'A step this editor cannot read yet', d ? '' : 'open it as text to change it');
  };
})(typeof window !== 'undefined' ? window : this);
