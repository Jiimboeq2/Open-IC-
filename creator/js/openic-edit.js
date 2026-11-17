/* Open IC Creator - openic-edit.js
   Where a file is written. The Steps view: every step in order, in plain words, by section, with Jump to. The right
   side's tabs: Add a step (every action Ogre has, by category, searchable; a click adds it after the picked step or
   where a + was clicked), This step (its settings as a form, who does it with a backup for a group without that
   class, its text), File settings.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var A = IC.app = IC.app || {};

  function H() { return IC.host; }
  function Z() { return IC.oic; }
  function str(v) { return v == null ? '' : String(v); }
  function isArr(v) { return Object.prototype.toString.call(v) === '[object Array]'; }
  function isObj(v) { return v != null && typeof v === 'object' && !isArr(v); }
  function has(o, k) { return isObj(o) && Object.prototype.hasOwnProperty.call(o, k); }
  function esc(s) { return str(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function $(id) { return typeof document !== 'undefined' ? document.getElementById(id) : null; }
  function words(s) { return str(s).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, function (c) { return c.toUpperCase(); }); }
  function plain(s) { return IC.words && IC.words.plain ? IC.words.plain(s) : str(s); }
  /* a vocabulary line as the page shows it: "(inferred" marks what was read from Ogre's files, not its docs */
  function about(s) { return str(s).replace(/\(inferred from the shipped notes/g, '(from Ogre\'s shipped notes').replace(/\(inferred/g, '(from Ogre\'s files'); }

  /* ------------------------------------------------------------ the action categories */
  A.CATS = [
    { id: 'move', label: 'Moving' }, { id: 'fight', label: 'Fighting' }, { id: 'loot', label: 'Loot' },
    { id: 'click', label: 'Clicks and talk' }, { id: 'wait', label: 'Waiting' }, { id: 'say', label: 'Messages' },
    { id: 'group', label: 'Bot and group' }, { id: 'logic', label: 'Logic' }, { id: 'exit', label: 'The way out' },
    { id: 'ready', label: 'Ready-made' }
  ];
  var CAT_OF = {
    path: 'move', campSpot: 'move', movement: 'move', move: 'move', waypoint: 'move', joust: 'move', teleporter: 'move', repositionOnCondition: 'move', hunt: 'move',
    named: 'fight', trash: 'fight', castAbility: 'fight', castStack: 'fight', castInterrupt: 'fight', autotarget: 'fight', abilities: 'fight', noOffensive: 'fight',
    noDefensive: 'fight', pet: 'fight', heroicOpportunity: 'fight', dispel: 'fight', cancelMaintained: 'fight', useItem: 'fight', beltAdorn: 'fight', abilityTracker: 'fight',
    loot: 'loot', waitForLoot: 'loot', reward: 'loot', inventory: 'loot',
    actorInteract: 'click', choiceWindow: 'click', examine: 'click',
    wait: 'wait', waitForCombat: 'wait',
    announce: 'say', tts: 'say', onScreenTimer: 'say', report: 'say', broadcast: 'say',
    ogreBotUIOption: 'group', botPause: 'group', threatIgnoreList: 'group', assist: 'group', cures: 'group', curses: 'group', groupQuery: 'group', gameCommand: 'group',
    raw: 'group', camera: 'group',
    setVar: 'logic', flagToon: 'logic', timer: 'logic', resolve: 'logic', rosterOrder: 'logic', stop: 'logic', stopEvaluating: 'logic', template: 'logic',
    fireEvent: 'logic', forEach: 'logic', repeat: 'logic', progress: 'logic', recover: 'logic',
    zoneOut: 'exit'
  };
  var NAMES = {
    path: 'Walk along spots', named: 'Fight a named', loot: 'Loot', waitForLoot: 'Wait for the loot', zoneOut: 'Leave the zone', teleporter: 'Take a teleporter',
    hunt: 'Hunt a mob', waitForCombat: 'Wait for the fight to end', trash: 'Clear the trash', reward: 'Pick a reward', groupQuery: 'Ask the group',
    campSpot: 'Camp spot', castAbility: 'Cast an ability', castStack: 'Change a cast stack line', actorInteract: 'Click or use something',
    announce: 'Note in a console', setVar: 'Set a variable', ogreBotUIOption: 'Bot option', autotarget: 'Auto target', onScreenTimer: 'Timer on screen',
    flagToon: 'Give a flag', heroicOpportunity: 'Heroic opportunity', noOffensive: 'Stop attacking', noDefensive: 'Stop defensives', cures: 'Cures',
    curses: 'Curse cures', dispel: 'Dispel', tts: 'Say it out loud', useItem: 'Use an item', cancelMaintained: 'Cancel a maintained spell', movement: 'Run or walk',
    joust: 'Joust out and back', broadcast: 'Send a message', fireEvent: 'Set off a message', choiceWindow: 'Answer a choice window', report: 'Report',
    resolve: 'Find an actor', rosterOrder: 'Order the roster', stop: 'Stop here', stopEvaluating: 'Stop checking', timer: 'Timer', template: 'Template',
    threatIgnoreList: 'Threat ignore list', assist: 'Assist', pet: 'Pet', waypoint: 'Waypoint', move: 'Move to a spot', gameCommand: 'Game command',
    raw: 'Console line', botPause: 'Pause the bot', beltAdorn: 'Belt adornment', inventory: 'Inventory', examine: 'Examine', abilityTracker: 'Ability tracker',
    repositionOnCondition: 'Move when something happens', abilities: 'Abilities on or off', castInterrupt: 'Interrupt a cast', camera: 'Camera',
    progress: 'Mark a step done', recover: 'Wipe recovery'
  };
  function spec(verb) {
    var V = IC.vocab;
    if (!V) return null;
    return (A.st.kind === 'zone' && V.zoneFile.verbs[verb]) || V.fightFile.actions[verb] || V.fightFile.controlVerbs[verb] || null;
  }
  /* every action this kind of file takes: the palette's (they come filled in), then the rest Ogre knows */
  A.actions = function () {
    var k = A.st.kind, out = [], seen = {}, P = A.palette ? A.palette() : [], i;
    for (i = 0; i < P.length; i++) {
      var p = P[i], verb = '';
      if (/^snip:/.test(p.key)) { out.push({ key: p.key, label: p.label, about: 'Several steps in one go.', cat: 'ready', gi: p.gi }); continue; }
      try { var made = k === 'zone' ? Z().paletteItem(p.key).make() : (k === 'fight' ? IC.ogf.paletteItem(p.key).make() : null); verb = isObj(made) ? str(made['do'] || (has(made, 'wait') ? 'wait' : '')) : ''; } catch (e) { verb = ''; }
      seen[verb] = true;
      var sp = spec(verb);
      out.push({ key: p.key, label: p.label, about: sp && sp.about || '', cat: CAT_OF[verb] || (p.role === 'end' ? 'exit' : (p.role === 'loop' ? 'logic' : 'group')), gi: p.gi });
    }
    if (k === 'zone' || k === 'fight') {
      var V = IC.vocab, pools = k === 'zone' ? [V.zoneFile.verbs, V.fightFile.actions] : [V.fightFile.actions, V.fightFile.controlVerbs];
      for (var j = 0; j < pools.length; j++) for (var verb2 in pools[j]) {
        if (!Object.prototype.hasOwnProperty.call(pools[j], verb2) || seen[verb2]) continue;
        seen[verb2] = true;
        out.push({ key: 'act:' + verb2, label: NAMES[verb2] || words(verb2), about: (pools[j][verb2] || {}).about || '', cat: CAT_OF[verb2] || 'group' });
      }
    }
    return out;
  };
  /* a step of a kind the palette has no ready one for: its needed settings, at their defaults */
  A.makeGeneric = function (key) {
    var verb = str(key).replace(/^act:/, ''), sp = spec(verb);
    if (!sp) return null;
    var st = { 'do': verb }, K = sp.keys || {};
    for (var n in K) {
      if (!Object.prototype.hasOwnProperty.call(K, n) || !K[n] || !K[n].required) continue;
      var t = K[n].type;
      st[n] = K[n]['default'] !== undefined ? K[n]['default'] : (t === 'enum' ? str((K[n].values || [''])[0]) : (/^int|^num/.test(t) ? 0 : (t === 'bool' ? false : (t === 'loc' ? [0, 0, 0] :
        (t === 'spots' || t === 'list' || t === 'conditions' ? [] : (t === 'forwho' ? 'all' : ''))))));
    }
    if (K.forwho && !has(st, 'forwho') && A.st.kind === 'fight') st.forwho = 'all';
    return st;
  };
  A.addAction = function (key) {
    var s = A.st, w = s.arm || A.slotFor(null);
    s.arm = null;
    if (/^act:/.test(key)) { var made = A.makeGeneric(key); if (!made) { H().toast('That cannot be added here.', 'warn'); return; } A.insert(made, w.seq, w.idx); }
    else A.addAt(key, w.seq, w.idx);
    s.side = 'step';
    A.renderSide();
  };
  /* a + in the chart: the Add tab, armed for that place */
  A.addMenu = function (seq, idx) { A.st.arm = { seq: seq, idx: idx }; A.st.side = 'add'; A.renderSide(); };

  /* ------------------------------------------------------------ the Steps view, and Jump to */
  A.renderWords = function () {
    var host = $('openic-words'), s = A.st;
    if (!host) return;
    if (!s.doc) { host.innerHTML = '<div class="oic-empty">' + A.welcome() + '</div>'; return; }
    if (A.applyIcons) A.applyIcons();
    var W0 = IC.words || {}, keepQ = W0.qScale, lines;
    W0.qScale = 6;
    try { lines = Z().lines(A.graphNow(false)); } finally { W0.qScale = keepQ; }
    A._secs = [];
    var roles = IC.fv.ROLES || {}, icons = s.fv.abicons !== false && A.gameIcon, n = 0;
    var h = '<div class="oic-wordhead">' + esc(Z().KIND_WORDS[s.kind]) + ': every step in order. Click a step to change it on the right.</div>';
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i], c = (roles[L.role] || roles.action || { c: '#4a90e2' }).c, gi = icons && L.gi ? A.gameIcon(L.gi, 16) : '';
      var sec = L.lane || L.head, sel = L.ref && L.ref === s.sel;
      if (sec) A._secs.push({ title: plain(L.text), id: 'oic-sec-' + A._secs.length, node: (lines[i + 1] || {}).id || L.id || '' });
      h += '<div class="oic-wl' + (sec ? ' oic-wl-h' : '') + (sel ? ' oic-wl-sel' : '') + '"' + (sec ? ' id="oic-sec-' + (A._secs.length - 1) + '"' : '') +
        ' style="padding-left:' + (8 + L.depth * 18) + 'px"' + (L.ref ? ' data-oic-ref="' + esc(L.ref) + '"' : '') + '>' +
        (!sec && L.ref && !L.branch ? '<em>' + (++n) + '</em>' : '') +
        (gi ? '<span class="oic-wi">' + gi + '</span>' : '<i style="background:' + c + '"></i>') + '<span>' + esc(plain(L.text)) +
        (L.err ? ' <b class="oic-e">!</b>' : (L.warn ? ' <b class="oic-w">?</b>' : '')) + '</span>' + (L.sub ? '<small>' + esc(plain(L.sub)) + '</small>' : '') +
        (sel ? '<div class="oic-row oic-wl-acts"><button class="oic-btn" data-oic="act:up">Up</button><button class="oic-btn" data-oic="act:down">Down</button>' +
          '<button class="oic-btn" data-oic="act:dup">Copy</button><button class="oic-btn oic-danger" data-oic="act:del">Delete</button>' +
          '<button class="oic-btn" data-oic="ed:addafter" title="Pick what to add on the right">Add a step after it</button></div>' : '') + '</div>';
    }
    host.innerHTML = h;
    if (A._jumpTo != null) { var el = $('oic-sec-' + A._jumpTo); A._jumpTo = null; if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' }); }
    else { var se = host.querySelector ? host.querySelector('.oic-wl-sel') : null; if (se && se.scrollIntoView && A._scrollSel) { A._scrollSel = false; se.scrollIntoView({ block: 'nearest' }); } }
  };
  A.renderNav = function () {
    var nav = $('openic-nav'), s = A.st;
    if (!nav) return;
    /* the Steps view only: the Chart has its own chips for its parts */
    if (!s.doc || s.view !== 'words') { nav.style.display = 'none'; return; }
    if (!A._secs) { A._secs = []; Z().lines(A.graphNow(false)).forEach(function (L, i, all) { if (L.lane || L.head) A._secs.push({ title: plain(L.text), node: (all[i + 1] || {}).id || L.id || '' }); }); }
    if (A._secs.length < 2) { nav.style.display = 'none'; return; }
    var h = '<span class="oic-note">Jump to:</span>';
    for (var i = 0; i < A._secs.length; i++) h += '<span class="oic-jump" data-oic="ed:jump:' + i + '">' + esc(A._secs[i].title) + '</span>';
    nav.innerHTML = h;
    nav.style.display = '';
  };

  /* ------------------------------------------------------------ the right side: tabs */
  var sel0 = A.select;
  A.select = function (r) { A.st.side = r ? 'step' : (A.st.side === 'step' ? 'file' : A.st.side); A._scrollSel = true; sel0(r); };
  A.renderSide = function () {
    var host = $('openic-side'), s = A.st, tabs = $('openic-sidetabs');
    if (!host) return;
    var side = s.side || 'add';
    if (side === 'step' && !s.sel) side = 'add';
    if (!s.doc) side = 'file';
    if (tabs) {
      var T = [['add', 'Add a step'], ['step', 'This step'], ['file', 'File settings']], th = '';
      for (var i = 0; i < T.length; i++) th += '<span data-oic="side:' + T[i][0] + '" class="' + (T[i][0] === side ? 'oic-on' : '') + (T[i][0] === 'step' && !s.sel ? ' oic-off' : '') + '">' + T[i][1] + '</span>';
      tabs.innerHTML = th;
    }
    if (s.snip && s.doc && s.kind === 'zone') { if (host._snip !== s.snip || !host.querySelector('#openic-snip')) A.snipForm(host); return; }
    host._snip = null;
    s.snip = null;
    if (!s.doc) { host.innerHTML = '<div class="oic-h">Nothing open</div><div class="oic-note">New, or Open. Your files stay on your PC.</div>' + A.helpHtml(); return; }
    if (side === 'add') host.innerHTML = A.addHtml();
    else if (side === 'step') host.innerHTML = A.stepHtml(A.at(s.sel));
    else host.innerHTML = A.fileHtml();
  };
  A.addHtml = function () {
    var s = A.st, q = str(A._find).toLowerCase(), cat = A._cat || '', L = A.actions(), at = s.arm ? 'where you clicked the +' : '';
    if (!at) { var w = s.sel ? A.at(s.sel) : null; at = w !== undefined && w !== null ? 'after the picked step' : 'at the end'; }
    var h = '<div class="oic-h">Add a step <span class="oic-note">goes ' + esc(at) + '</span></div>' +
      '<input type="text" id="openic-find" class="oic-find" placeholder="Find an action..." value="' + esc(A._find || '') + '" spellcheck="false">' +
      '<div class="oic-cats"><span data-oic="ed:cat:" class="' + (cat ? '' : 'oic-on') + '">All</span>';
    for (var c = 0; c < A.CATS.length; c++) if (L.some(function (a) { return a.cat === A.CATS[c].id; })) h += '<span data-oic="ed:cat:' + A.CATS[c].id + '" class="' + (cat === A.CATS[c].id ? 'oic-on' : '') + '">' + A.CATS[c].label + '</span>';
    h += '</div>';
    var shown = 0;
    for (var k = 0; k < A.CATS.length; k++) {
      var C = A.CATS[k], rows = '';
      if (cat && cat !== C.id) continue;
      for (var i = 0; i < L.length; i++) {
        var a = L[i];
        if (a.cat !== C.id || (q && (a.label + ' ' + a.about + ' ' + a.key).toLowerCase().indexOf(q) < 0)) continue;
        shown++;
        rows += '<div class="oic-act" data-oic="ed:add:' + esc(a.key) + '">' + (a.gi && A.gameIcon ? '<span class="oic-wi">' + A.gameIcon(a.gi, 16) + '</span>' : '') +
          '<b>' + esc(a.label) + '</b>' + (a.about ? '<span>' + esc(about(a.about)) + '</span>' : '') + '</div>';
      }
      if (rows) h += '<div class="oic-h2">' + C.label + '</div>' + rows;
    }
    if (!shown) h += '<div class="oic-note">Nothing matches.</div>';
    return h;
  };

  /* ------------------------------------------------------------ This step: a form */
  var WHO = [['Everyone', ['all']], ['One box', ['me', 'groupleader', '@Tank', '@Healer1', '@Fighter1', '@Priest1', '@Mage1', '@Scout1', '@DPS1']],
    ['Archetypes', ['fighter', 'priest', 'mage', 'scout', 'notfighter', 'notpriest', 'notmage', 'notscout']],
    ['Classes', ['warrior', 'crusader', 'brawler', 'cleric', 'druid', 'shaman', 'sorcerer', 'enchanter', 'summoner', 'rogue', 'bard', 'predator', 'animalist', 'shaper']],
    ['One class', ['guardian', 'berserker', 'paladin', 'shadowknight', 'monk', 'bruiser', 'templar', 'inquisitor', 'warden', 'fury', 'mystic', 'defiler', 'wizard', 'warlock',
      'illusionist', 'coercer', 'conjuror', 'necromancer', 'swashbuckler', 'brigand', 'troubador', 'dirge', 'ranger', 'assassin', 'beastlord', 'channeler']],
    ['Raid groups', ['groups:1', 'groups:2', 'groups:3', 'groups:4']]];
  var WHO_SAY = { all: 'Everyone', me: 'Me (the box running it)', groupleader: 'The group leader', '@Tank': 'The tank', '@Healer1': 'The first healer',
    '@Fighter1': 'The first fighter', '@Priest1': 'The first priest', '@Mage1': 'The first mage', '@Scout1': 'The first scout', '@DPS1': 'The first damage dealer' };
  function whoSay(w) { return WHO_SAY[w] || (/^not/.test(w) ? 'Everyone but ' + w.slice(3) + 's' : (/^groups:/.test(w) ? 'Raid group ' + w.slice(7) : words(w) + (/^[a-z]+$/.test(w) ? 's' : ''))); }
  var FAMILY = { warrior: ['Guardian', 'Berserker'], crusader: ['Paladin', 'Shadowknight'], brawler: ['Monk', 'Bruiser'], cleric: ['Templar', 'Inquisitor'],
    druid: ['Warden', 'Fury'], shaman: ['Mystic', 'Defiler'], sorcerer: ['Wizard', 'Warlock'], enchanter: ['Illusionist', 'Coercer'], summoner: ['Conjuror', 'Necromancer'],
    rogue: ['Swashbuckler', 'Brigand'], bard: ['Troubador', 'Dirge'], predator: ['Ranger', 'Assassin'], animalist: ['Beastlord'], shaper: ['Channeler'] };
  A.WHO = WHO; A.FAMILY = FAMILY; A.whoSay = whoSay;
  /* "the group has one", as Ogre's own fight files write it: a count of the roster by archetype, class or role */
  A.hasCond = function (who) {
    var w = str(who).trim(), lw = w.toLowerCase(), cnt = function (by, is) { return { count: { of: 'roster', scope: 'group', by: by, is: is, compare: '>=', value: 1 } }; };
    if (/^(fighter|priest|mage|scout)$/.test(lw)) return cnt('Archetype', lw);
    if (FAMILY[lw]) return FAMILY[lw].length === 1 ? cnt('Class', FAMILY[lw][0]) : { or: FAMILY[lw].map(function (c) { return cnt('Class', c); }) };
    for (var f in FAMILY) for (var i = 0; i < FAMILY[f].length; i++) if (FAMILY[f][i].toLowerCase() === lw) return cnt('Class', FAMILY[f][i]);
    if (lw === '@tank') return cnt('Role', 'tank');
    if (/^@healer/.test(lw)) return cnt('Role', 'healer');
    return null;
  };
  A.whoHtml = function (key, cur) {
    var h = '<select data-oic-sf="' + key + '|forwho" class="oic-who">', found = false;
    for (var g = 0; g < WHO.length; g++) {
      h += '<optgroup label="' + WHO[g][0] + '">';
      for (var i = 0; i < WHO[g][1].length; i++) { var w = WHO[g][1][i], on = w === cur; found = found || on; h += '<option value="' + esc(w) + '"' + (on ? ' selected' : '') + '>' + esc(whoSay(w)) + '</option>'; }
      h += '</optgroup>';
    }
    if (cur && !found) h += '<option value="' + esc(cur) + '" selected>' + esc(cur) + '</option>';
    h += '</select><input type="text" data-oic-sf="' + key + '|string" value="' + esc(cur) + '" title="Or type it: | for or, + for and, - for not" spellcheck="false">';
    if (A.hasCond(cur)) {
      h += '<div class="oic-row oic-backup"><span class="oic-note">If the group has no ' + esc(whoSay(cur).toLowerCase()) + ', then</span><select id="openic-backup">';
      for (var b = 0; b < WHO.length; b++) for (var j = 0; j < WHO[b][1].length; j++) if (WHO[b][1][j] !== cur) h += '<option value="' + esc(WHO[b][1][j]) + '">' + esc(whoSay(WHO[b][1][j]).toLowerCase()) + '</option>';
      h += '</select><span>does it</span><button class="oic-btn" data-oic="ed:backup:' + key + '" title="Adds a copy of this step for them, and a check on both: this one runs only if the group has one, the copy only if not">Add</button></div>';
    }
    return h;
  };
  /* the backup: this step only if the group has one; a copy right after it for the other box, only if not */
  A.addBackup = function (key) {
    var s = A.st, st = A.at(s.sel), sel = $('openic-backup'), alt = sel ? sel.value : '';
    if (!isObj(st) || !alt) return;
    var cond = A.hasCond(st[key]);
    if (!cond) { H().toast('A backup works for an archetype, a class or a role.', 'warn'); return; }
    var path = JSON.parse(s.sel), when = isArr(st.when) ? st.when.slice() : (st.when ? [st.when] : []);
    var copy = JSON.parse(JSON.stringify(st));
    copy[key] = alt;
    copy.when = when.concat([{ not: [cond] }]);
    if (copy.stepId) copy.stepId = str(copy.stepId) + '.backup';
    A.edit(function (doc) {
      var o = IC.ogf.at(doc, path);
      o.when = when.concat([cond]);
      IC.ogf.insert(doc, JSON.stringify(path.slice(0, -1)), path[path.length - 1] + 1, copy);
    });
    H().toast('Added: ' + whoSay(alt).toLowerCase() + ' do it when the group has no ' + whoSay(st[key]).toLowerCase() + '.');
  };
  A.stepHtml = function (st) {
    var s = A.st, w0 = '', sub = '';
    if (s.kind === 'jb') w0 = IC.reg.labelFor(st);
    else if (isObj(st) && has(st, 'on')) { var wt = IC.ogf.whenText(st); w0 = 'When ' + wt.title; sub = wt.sub || ''; }
    else if (isArr(st)) w0 = 'A list of ' + st.length + ' step' + (st.length === 1 ? '' : 's');
    else { var w = Z().stepWords(st, Z().ctxOf(s.doc), s.kind); w0 = w.title; sub = w.sub; }
    var h = '<div class="oic-words"><b>' + esc(plain(w0)) + '</b>' + (sub ? '<div>' + esc(plain(sub)) + '</div>' : '') + '</div>';
    var ro = s.kind !== 'jb' && isObj(st) ? Z().runsOn(st, s.kind) : null;
    if (ro) h += '<div class="oic-runs"><b>Who runs it:</b> ' + esc(ro.text) + (ro.warn ? '<div class="oic-pr oic-pr-warn">' + esc(ro.warn) + '</div>' : '') + '</div>';
    var pre = s.kind === 'jb' ? s.sel + '.' : s.sel.slice(0, -1) + ',';
    var mine = s.probs.filter(function (p) { return p.ref === s.sel || (!!p.ref && !!s.sel && p.ref.indexOf(pre) === 0); });
    for (var i = 0; i < mine.length && i < 12; i++) h += '<div class="oic-pr oic-pr-' + mine[i].level + '">' + esc(mine[i].msg) + '</div>';
    h += '<div class="oic-row"><button class="oic-btn" data-oic="act:up">Up</button><button class="oic-btn" data-oic="act:down">Down</button>' +
      '<button class="oic-btn" data-oic="act:dup">Copy</button><button class="oic-btn oic-danger" data-oic="act:del">Delete</button></div>';
    if (H().inGame && isObj(st)) {
      var gb = '';
      if (isArr(st.spots)) gb += '<button class="oic-btn" data-oic="here:spots" title="Add the spot you stand on to this walk">Add my spot</button>';
      if (has(st, 'loc') || has(st, 'spot')) gb += '<button class="oic-btn" data-oic="here:' + (has(st, 'loc') ? 'loc' : 'spot') + '" title="Use the spot you stand on">Here</button>';
      if (has(st, 'name')) gb += '<button class="oic-btn" data-oic="here:name" title="Use your current target\'s name">My target</button>';
      if (gb) h += '<div class="oic-row">' + gb + '</div>';
    }
    if (A.testRowHtml) h += A.testRowHtml(st, JSON.parse(s.sel));
    var sp = A.stepSpec(st), K = sp && sp.keys ? sp.keys : null;
    /* who does it, only if, repeat: first, in words (openic-cond.js); the form below leaves those keys out */
    var WHEN = { forwho: 1, sendTo: 1, when: 1 };
    if (A.whenHtml && isObj(st) && (s.kind === 'zone' || s.kind === 'fight')) {
      var whoKeys = ['forwho', 'sendTo'].filter(function (k) { return (K && has(K, k)) || has(st, k) || (k === 'forwho' && s.kind === 'fight'); });
      h += A.whenHtml(st, JSON.parse(s.sel), whoKeys);
    } else WHEN = {};
    if (K && isObj(st)) {
      var keys = Object.keys(K).filter(function (k) { return !WHEN[k]; }), main = '', more = '';
      keys.sort(function (a, b) { var ra = (K[a].required ? 0 : (has(st, a) ? 1 : 2)), rb = (K[b].required ? 0 : (has(st, b) ? 1 : 2)); return ra - rb || (a < b ? -1 : 1); });
      for (var k = 0; k < keys.length; k++) {
        var row = A.fieldHtml(keys[k], K[keys[k]] || {}, st);
        if (K[keys[k]].required || has(st, keys[k])) main += row; else more += row;
      }
      h += '<div class="oic-h2">Settings</div>' + main + (more ? '<details class="oic-more"><summary>More settings (' + (keys.length - (main.match(/oic-key/g) || []).length) + ')</summary>' + more + '</details>' : '');
    }
    h += '<details class="oic-more"' + (K ? '' : ' open') + '><summary>The step as text</summary><textarea id="openic-step-json" class="oic-ta" spellcheck="false">' + esc(A.pretty(st)) + '</textarea>' +
      '<div class="oic-row"><button class="oic-btn oic-primary" data-oic="step-apply">Apply</button><button class="oic-btn" data-oic="step-revert">Revert</button><span id="openic-step-msg" class="oic-note"></span></div></details>';
    return h;
  };
  A.fieldHtml = function (key, ks, st) {
    var set = has(st, key), v = set ? st[key] : ks['default'], t = ks.type || 'string', input;
    var lab = '<label title="' + esc(about(ks.about)) + '">' + esc(words(key)) + (ks.required ? ' <i>needed</i>' : '') + '</label>';
    if (key === 'forwho' || key === 'sendTo' || t === 'forwho') input = A.whoHtml(key, str(v == null ? '' : v));
    else if (t === 'bool') input = '<input type="checkbox" data-oic-sf="' + key + '|bool"' + (v === true || str(v).toUpperCase() === 'TRUE' ? ' checked' : '') + '>';
    else if (t === 'enum') {
      var VA = ks.valuesAbout || {}, cut = function (x) { x = about(x); return x.length > 70 ? x.slice(0, 68) + '...' : x; };
      input = '<select data-oic-sf="' + key + '|string"><option value=""></option>';
      (ks.values || []).forEach(function (x) { input += '<option value="' + esc(x) + '"' + (str(x) === str(v) ? ' selected' : '') + '>' + esc(x) + (VA[x] ? ': ' + esc(cut(VA[x])) : '') + '</option>'; });
      input += '</select>' + (VA[str(v)] ? '<small class="oic-opnow">' + esc(str(v)) + ': ' + esc(about(VA[str(v)])) + '</small>' : '');
    } else if (/^int|^num/.test(t)) input = '<input type="number" data-oic-sf="' + key + '|num" value="' + esc(v == null ? '' : v) + '">';
    else if (t === 'loc') input = '<input type="text" data-oic-sf="' + key + '|loc" value="' + esc(isArr(v) ? v.join(', ') : str(v)) + '" placeholder="x, y, z">';
    else if (t === 'string' || t === 'row' || t === 'string|int') input = '<input type="text" data-oic-sf="' + key + '|string" value="' + esc(v == null ? '' : v) + '" spellcheck="false">';
    else input = '<textarea data-oic-sf="' + key + '|json" class="oic-ta oic-ta-s" spellcheck="false">' + esc(v === undefined ? '' : JSON.stringify(v, null, 1)) + '</textarea>';
    /* a line that only lists an op list's values says nothing the op's own words do not */
    var listOnly = t === 'enum' && ks.valuesAbout && !str(ks.about).replace(new RegExp('\\b(' + (ks.values || []).map(function (x) { return str(x).replace(/[^\w]/g, ''); }).filter(Boolean).join('|') + '|or|and)\\b', 'g'), '').replace(/[\s,.;]/g, '');
    return '<div class="oic-key oic-field' + (set ? ' oic-key-set' : '') + '">' + lab + input + (ks.about && !listOnly ? '<small>' + esc(about(ks.about)) + '</small>' : '') + '</div>';
  };
  /* a field changed: the step takes the value (empty = the key goes, unless it is needed) */
  A.setStepField = function (spec0, val) {
    var s = A.st, p = str(spec0).split('|'), key = p[0], type = p[1], st = A.at(s.sel), out;
    if (!isObj(st)) return;
    if (type === 'bool') out = !!val;
    else if (type === 'num') out = str(val).trim() === '' ? undefined : +val;
    else if (type === 'loc') { var xyz = str(val).split(/[\s,]+/).filter(Boolean).map(Number); out = str(val).trim() === '' ? undefined : (xyz.length === 3 && xyz.every(isFinite) ? xyz : null); }
    else if (type === 'json') { if (str(val).trim() === '') out = undefined; else { try { out = JSON.parse(val); } catch (e) { H().toast('Not valid JSON: ' + e.message, 'err'); return; } } }
    else out = str(val) === '' ? undefined : str(val);
    if (out === null) { H().toast('A spot is three numbers: x, y, z', 'warn'); return; }
    if (typeof out === 'number' && !isFinite(out)) { H().toast('That is not a number.', 'warn'); return; }
    A.edit(function () { if (out === undefined) delete st[key]; else st[key] = out; });
  };

  /* ------------------------------------------------------------ clicks and typing this module owns */
  A.editClick = function (v) {
    var m;
    if ((m = /^side:(\w+)$/.exec(v))) { if (m[1] !== 'step' || A.st.sel) { A.st.side = m[1]; A.renderSide(); } return true; }
    if ((m = /^ed:cat:(\w*)$/.exec(v))) { A._cat = m[1]; A.renderSide(); return true; }
    if ((m = /^ed:add:(.+)$/.exec(v))) { A.addAction(m[1]); return true; }
    if (v === 'ed:addafter') { A.st.arm = null; A.st.side = 'add'; A.renderSide(); return true; }
    if ((m = /^ed:backup:(\w+)$/.exec(v))) { A.addBackup(m[1]); return true; }
    if ((m = /^ed:jump:(\d+)$/.exec(v))) {
      var sec = (A._secs || [])[+m[1]];
      if (!sec) return true;
      if (A.st.view === 'flow' && A.st.chart && sec.node) A.st.chart.reveal(sec.node);
      else { A._jumpTo = +m[1]; A.renderWords(); }
      return true;
    }
    return false;
  };
  A.onInput = function (e) {
    if (e.target && e.target.id === 'openic-find') {
      A._find = e.target.value;
      var pos = e.target.selectionStart;
      A.renderSide();
      var f = $('openic-find');
      if (f) { f.focus(); try { f.setSelectionRange(pos, pos); } catch (x) { /* a field that cannot */ } }
    }
  };
})(typeof window !== 'undefined' ? window : this);
