/* Open IC Creator - openic-zone.js
   Native OgreBot files in the Creator (IC.oic): which kind a file is, new files, a zone file as a flowchart graph for
   IC.fv, plain words for every zone step, the checks (Ogre's own rules from IC.nmap plus the vocabulary in IC.vocab),
   the zone palette, Ogre's file-name rule, the spots a file names, and the quest-pack lines that run a file through
   ISXJQB. Pure logic, no DOM.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var Z = IC.oic = IC.oic || {};

  function str(v) { return v == null ? '' : String(v); }
  function isArr(v) { return Object.prototype.toString.call(v) === '[object Array]'; }
  function isObj(v) { return v != null && typeof v === 'object' && !isArr(v); }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function ref(p) { return JSON.stringify(p); }
  function cut(s, n) { s = str(s); return s.length > n ? s.slice(0, n - 1) + '...' : s; }
  function V() { return IC.vocab || { zoneFile: { topKeys: {}, verbs: {}, commonKeys: {} }, fightFile: { topKeys: {}, actions: {} }, conditions: {}, tokens: { roots: [] } }; }
  function secs(ms) { var n = +ms; return isFinite(n) ? String(Math.round(n / 100) / 10) : str(ms); }
  function loc(p) { return isArr(p) && p.length >= 3 ? Math.round(+p[0]) + ', ' + Math.round(+p[1]) + ', ' + Math.round(+p[2]) : '?'; }
  function who(fw) { return IC.words && IC.words.who ? IC.words.who(fw) : str(fw); }
  function subs(list) { var o = []; for (var i = 0; i < list.length; i++) if (list[i]) o.push(list[i]); return o.join('; '); }

  Z.LISTS = ['enter', 'steps', 'exit'];
  Z.ZONE_ONLY = { path: 'move', named: 'sec', loot: 'action', zoneOut: 'end', teleporter: 'move', waitForCombat: 'cond', waitForLoot: 'cond',
    hunt: 'action', trash: 'action', reward: 'action', progress: 'state', recover: 'alt' };
  Z.ZONE_ICON = { path: 'move', named: 'named', loot: 'loot', zoneOut: 'door', teleporter: 'door', waitForCombat: 'fight', waitForLoot: 'loot',
    hunt: 'killlist', trash: 'trash', reward: 'loot', progress: 'flag', recover: 'rez' };
  Z.COMMON = { 'do': 1, stepId: 1, onFail: 1, when: 1, throttleMs: 1, forwho: 1, awaitWhen: 1, awaitTimeout: 1 };
  /* who runs a step. A zone file runs on one box, the IC character: these steps take the group along, any other acts
     on the IC character unless it carries sendTo (and these per-box actions cannot). A fight file runs on every box,
     each for itself; forwho picks which. */
  Z.GROUP_MOVES = { path: 1, named: 1, loot: 1, teleporter: 1, zoneOut: 1 };
  Z.ONE_BOX = { castStack: 1, cancelMaintained: 1, useItem: 1, beltAdorn: 1 };
  Z.runsOn = function (st, kind) {
    if (!isObj(st)) return null;
    var W = IC.words, who = function (x) { return W && W.who ? W.who(x) : str(x); }, d = str(st['do']), fw = st.forwho, to = st.sendTo;
    var fwOn = fw != null && fw !== '' && !/^all$/i.test(str(fw)), toOn = to != null && to !== '';
    if (kind === 'zone') {
      var t = 'The IC character', warn = '';
      if (Z.GROUP_MOVES[d]) t += toOn ? ', and ' + who(to) + ' go along' : ', and the whole group goes along';
      else if (toOn) t += ' tells ' + who(to) + ' to do it';
      else if (Z.ONE_BOX[d]) { t += ' only'; warn = 'It cannot be sent to the others. For every box, put it in the named\'s fight file.'; }
      else if (d) t += ' only' + (has(V().fightFile.actions[d] || {}, 'keys') && has(V().fightFile.actions[d].keys, 'sendTo') ? ' (Send to adds others)' : '');
      if (fwOn) t += ' (when the IC character is among ' + who(fw) + ')';
      return { text: t + '.', warn: warn };
    }
    if (kind === 'fight') return { text: (fwOn ? 'Only ' + who(fw) + ', each box for itself' : 'Every box, each for itself') + (toOn ? '; each tells ' + who(to) + ' to do it' : '') + '.', warn: '' };
    return null;
  };

  /* ------------------------------------------------------------ which kind of file */
  Z.kindOf = function (doc) {
    if (!isObj(doc)) return '';
    if (typeof doc.base_file === 'string' && doc.base_file) return 'jb';
    if (Z.isJbEncounter(doc)) return '';
    if (isArr(doc.named) && !isArr(doc.variants)) return 'fight';
    if (has(doc, 'triggers') || has(doc, 'onPulse') || has(doc, 'setup') || has(doc, 'teardown') || has(doc, 'onKilled') || has(doc, 'routines')) return 'fight';
    if (IC.imp && IC.imp.isZoneFile && IC.imp.isZoneFile(doc)) return 'zone';
    if (has(doc, 'zone') && (isObj(doc.run) || isArr(doc.variants))) return 'zone';
    if (isArr(doc.steps) || isArr(doc.sequence)) return 'jb';
    return '';
  };
  /* an ISXJQB fight mechanics file (one named as a name, a setup object, mechanics and cleanup): not an Ogre fight file */
  Z.isJbEncounter = function (doc) { return isObj(doc) && has(doc, 'mechanics') && !isArr(doc.named) && !isArr(doc.setup) && !has(doc, 'triggers'); };
  Z.KIND_WORDS = { zone: 'OgreBot zone file', fight: 'OgreBot fight file', jb: 'ISXJQB instance file' };

  /* ------------------------------------------------------------ new files */
  Z.newZone = function (meta) {
    meta = meta || {};
    return { zone: str(meta.zone) || 'New Zone', variants: isArr(meta.variants) ? meta.variants : ['[Heroic]'], expansion: str(meta.expansion), author: str(meta.author),
      progression: 'sequential', steps: [{ stepId: 'exit', 'do': 'zoneOut', op: 'auto' }] };
  };
  Z.newFight = function (meta) {
    meta = meta || {};
    var d = { named: [{ name: str(meta.named) || 'The Named', distance: 50 }], zone: str(meta.zone), expansion: str(meta.expansion), setup: [], triggers: [], teardown: [] };
    if (!d.zone) delete d.zone;
    return d;
  };

  /* Ogre's file-name rule: spaces become _, and : ' , [ ] and the backtick are left out; one variant adds its tag */
  Z.fileName = function (doc, number) {
    var clean = function (s) { return str(s).replace(/[:',\[\]`]/g, '').trim().replace(/\s+/g, '_'); };
    var kind = Z.kindOf(doc);
    if (kind === 'fight') {
      var n = isArr(doc.named) && doc.named[0] ? str(doc.named[0].name || doc.named[0]) : 'Named';
      return n.replace(/[\\\/:*?"<>|]/g, '').trim() + '.json';
    }
    var z = clean(doc && doc.zone) || 'New_Zone', v = isArr(doc && doc.variants) && doc.variants.length === 1 ? '_' + clean(doc.variants[0]) : '';
    var pre = number != null ? '_' + ('0' + (+number || 1)).slice(-2) + '_' : '';
    return pre + z + v + '.json';
  };
  /* the folder Ogre reads a fight file from: <Expansion>\<Zone with ": " as " - ">\<Named>.json */
  Z.fightFolder = function (doc) {
    var z = isArr(doc && doc.zone) ? str(doc.zone[0]) : str(doc && doc.zone);
    return (str(doc && doc.expansion) || 'Expansion') + '/' + (z.replace(/:\s*/g, ' - ').replace(/[\\\/*?"<>|]/g, '') || 'Zone');
  };

  /* ------------------------------------------------------------ plain words for a step */
  Z.ctxOf = function (doc) {
    var c = { named: {}, loot: {} };
    Z.eachStep(doc, function (st) {
      if (st['do'] === 'named' && st.stepId) c.named[str(st.stepId)] = [str(st.name)];
      if (st['do'] === 'loot' && st.stepId) c.loot[str(st.stepId)] = str(st.op);
    });
    return c;
  };
  Z.eachStep = function (doc, fn) {
    var lists = ['enter', 'steps', 'exit', 'onWipe', 'afterWipe', 'setup', 'teardown'];
    function walk(L, path) {
      for (var i = 0; isArr(L) && i < L.length; i++) {
        var st = L[i], p = path.concat([i]);
        if (!isObj(st)) continue;
        fn(st, p);
        if (isArr(st.steps)) walk(st.steps, p.concat(['steps']));
        if (isArr(st['do'])) walk(st['do'], p.concat(['do']));
      }
    }
    if (!isObj(doc)) return;
    for (var l = 0; l < lists.length; l++) if (isArr(doc[lists[l]])) walk(doc[lists[l]], [lists[l]]);
    var T = isArr(doc.triggers) ? doc.triggers : [];
    for (var t = 0; t < T.length; t++) if (isObj(T[t]) && isArr(T[t]['do'])) walk(T[t]['do'], ['triggers', t, 'do']);
    var P = isArr(doc.onPulse) ? doc.onPulse : [];
    for (var u = 0; u < P.length; u++) if (isObj(P[u])) ['do', 'onEnter', 'onExit'].forEach(function (k) { if (isArr(P[u][k])) walk(P[u][k], ['onPulse', u, k]); });
    if (isObj(doc.onKilled)) for (var nk in doc.onKilled) if (has(doc.onKilled, nk)) walk(doc.onKilled[nk], ['onKilled', nk]);
    if (isObj(doc.routines)) for (var rn in doc.routines) if (has(doc.routines, rn)) {
      var r = doc.routines[rn];
      if (isArr(r)) walk(r, ['routines', rn]); else if (isObj(r) && isArr(r.steps)) walk(r.steps, ['routines', rn, 'steps']);
    }
  };

  Z.stepWords = function (st, c, fileKind) {
    if (!isObj(st)) return { title: 'A step that is not one object', sub: 'open it as text to change it', role: 'alt', icon: '' };
    var d = str(st['do']);
    if (!(fileKind !== 'fight' && Z.ZONE_ONLY[d])) {
      var w = IC.ogf && IC.ogf.stepWords ? IC.ogf.stepWords(st) : null;
      if (w) return { title: w.title, sub: w.sub || '', role: w.role || 'action', icon: w.icon || '', abil: w.abil || '', timeout: w.timeout };
      return { title: d || 'A step', sub: '', role: 'action', icon: '' };
    }
    var t = IC.imp && IC.imp.zoneWords ? IC.imp.zoneWords(st, c || { named: {}, loot: {} }) : d, s = '';
    switch (d) {
      case 'path':
        s = subs([st.using === 'campspot' ? 'camp spot by camp spot' : 'on the nav mesh', st.killWithin != null ? 'fights what is within ' + st.killWithin + ' m on the way' : '',
          st.fly ? 'flying' : '', st.exitOnActorAggro ? 'stops if ' + st.exitOnActorAggro + ' attacks' : '', st.sendTo ? 'for ' + who(st.sendTo) : '']);
        break;
      case 'named':
        s = subs([st.boss ? 'the zone\'s last boss' : '', +st.spawnWaitMs > 0 ? 'waits up to ' + secs(st.spawnWaitMs) + ' s for it to spawn' : '',
          st.prebuffMs === 0 ? 'no buff-up first' : 'buffs up for ' + secs(st.prebuffMs != null ? st.prebuffMs : 10000) + ' s first',
          st.preCastTagMs != null ? 'pre-cast tag ' + secs(st.preCastTagMs) + ' s' : '', st.navTo ? 'walks to it on the mesh' : '',
          isArr(st.spot) ? 'fights at ' + loc(st.spot) : '', isArr(st.aliases) && st.aliases.length ? 'also called ' + st.aliases.join(', ') : '']);
        break;
      case 'loot': s = subs([st.within != null ? 'within ' + st.within + ' m' : '', st.boss ? 'the boss chest' : '', st.back === false ? 'stays there after' : '']); break;
      case 'zoneOut': s = subs([st.destination != null ? 'picks ' + str(st.destination) : '', st.walk === true ? 'walks to it' : '']); break;
      case 'teleporter': s = isArr(st.walkOnto) ? 'walks onto the pad at ' + loc(st.walkOnto) : (isArr(st.landing) ? 'lands at ' + loc(st.landing) : ''); break;
      case 'waitForCombat': s = subs([st.limitMs != null ? 'at most ' + secs(st.limitMs) + ' s' : '', st.noProgressMs != null ? (st.onNoProgress === 'fail' ? 'fails' : 'moves on') + ' after ' + secs(st.noProgressMs) + ' s with no progress' : '']); break;
      case 'waitForLoot': s = st.limitMs != null ? (+st.limitMs === 0 ? 'no time limit' : 'at most ' + secs(st.limitMs) + ' s') : ''; break;
      case 'hunt': s = st.limitMs != null ? 'at most ' + secs(st.limitMs) + ' s' : ''; break;
      case 'trash': s = subs([st.whenEmpty === 'wait' ? 'waits for more until it is quiet for ' + secs(st.quietMs != null ? st.quietMs : 60000) + ' s' : '', st.until ? 'until ' + st.until + ' shows up' : '']); break;
      case 'reward': s = st.choose != null ? 'picks ' + str(st.choose) : ''; break;
      case 'progress': s = st.id ? 'step ' + str(st.id) : ''; break;
      case 'recover': s = str(st.op); break;
    }
    return { title: t, sub: s, role: Z.ZONE_ONLY[d], icon: d === 'named' ? '&#9876;' : '' };
  };
  function condWords(list) {
    if (IC.ogf && IC.ogf.condsText) return IC.ogf.condsText(isArr(list) ? list : [list]);
    return IC.pack && IC.pack.nativeCondText ? IC.pack.nativeCondText(JSON.stringify(isArr(list) ? list : [list])) : 'a check';
  }
  Z.condWords = condWords;

  /* ------------------------------------------------------------ a zone file as a flowchart graph (IC.fv's shape) */
  Z.open = {};
  function stepItems(list, base, offset, ctx) {
    var items = [];
    for (var j = 0; isArr(list) && j < list.length; j++) {
      var st = list[j], i = offset + j, p = base.concat([i]), r = ref(p);
      if (!isObj(st)) { items.push({ t: 'n', id: 'n' + r, ref: r, ix: i, iy: i, role: 'alt', title: 'Not a step', sub: 'open it as text', tags: [], err: true }); continue; }
      var w = Z.stepWords(st, ctx.c, 'zone'), n = { t: 'n', id: 'n' + r, ref: r, ix: i, iy: i, role: w.role, icon: w.icon, title: w.title, sub: w.sub, tags: [], sel: ctx.sel === r, abil: w.abil || '' };
      if (st.when && (!isArr(st.when) || st.when.length)) { n.sub = 'only if ' + cut(condWords(st.when), 120) + (n.sub ? '; ' + n.sub : ''); n.tags.push({ t: 'if', role: 'cond' }); }
      if (st.stepId) n.tags.push({ t: 'id ' + str(st.stepId), role: 'note' });
      if (st.onFail === 'proceed' && !has(st, 'wait')) n.tags.push({ t: 'goes on if it fails', role: 'cond' });
      if (st.forwho) n.tags.push({ t: 'for ' + who(st.forwho), role: 'action' });
      if (st.throttleMs) n.tags.push({ t: 'at most every ' + secs(st.throttleMs) + ' s', role: 'loop' });
      if (w.timeout) n.tags.push(w.timeout === 'fail' ? { t: 'if it never happens: stop', role: 'alt' } : { t: 'if it never happens: go on', role: 'cond' });
      Z.stepIcons(n, st, w);
      var pr = ctx.probs[r];
      if (pr === 'error') n.err = true; else if (pr === 'warn') n.warn = true;
      if ((st.repeat || st.forEach) && isArr(st.steps)) {
        items.push({ t: 'loop', id: 'f' + r, ix: i, iy: i, node: n, doneLabel: st.repeat ? 'done' : 'next',
          body: { label: st.repeat ? 'repeat' : 'each', seq: ref(p.concat(['steps'])), items: stepItems(st.steps, p.concat(['steps']), 0, ctx) } });
      } else items.push(n);
    }
    return items;
  }
  /* a box's icons (IC.icons): a zone-only action by its kind, any other action the way fight-file boxes get theirs */
  Z.stepIcons = function (n, st, w) {
    var I = IC.icons, d = str(st['do']);
    if (!I) return n;
    if (Z.ZONE_ONLY[d]) {
      n.gi = I.mk(Z.ZONE_ICON[d], n.role);
      n.giKind = n.gi;
      n.need = I.off ? [] : I.withWho(I.needs(I.namesIn(st), 4), st.sendTo != null ? st.sendTo : st.forwho, '', 4);
      return n;
    }
    n.gi = (w.abil && I.forAbil(w.abil)) || I.forFightStep(st, n.role);
    if (I.fightIcons) I.fightIcons(n, st, w);
    return n;
  };
  function kindRole(k) { return k === 'named' ? 'sec' : (k === 'exit' ? 'end' : 'start'); }
  Z.graph = function (doc, opts) {
    opts = opts || {};
    doc = isObj(doc) ? doc : {};
    var ctx = { c: Z.ctxOf(doc), sel: str(opts.sel), probs: opts.probs || {} };
    var zone = str(doc.zone), vars = isArr(doc.variants) ? doc.variants.join(' ') : '';
    var lane = { id: 'zone', title: zone || 'New zone file', sub: vars, role: 'start', seq: null, items: [] }, parts = [], split = [];
    var ent = isObj(doc.entrance) && isArr(doc.entrance.loc) ? 'entrance at ' + loc(doc.entrance.loc) : 'no entrance yet';
    var I = IC.icons;
    lane.items.push({ t: 'n', id: 'start', role: 'start', icon: '&#9679;', fixed: true, noActs: true, noSlot: true, ix: 0, iy: -1, gi: I ? I.forIcBox('start', 'start') : null,
      title: 'Start' + (zone ? ': ' + zone : ''), sub: subs([vars, ent, doc.progression === 'open' ? 'nameds in any order' : '']) });
    if (isObj(doc.run)) {
      lane.items.push({ t: 'n', id: 'run', role: 'note', fixed: true, noActs: true, noSlot: true, ix: 0, iy: -1, title: 'Runs a script instead of steps',
        sub: str(doc.run.iss || doc.run.json) });
      return { lanes: [lane], links: [], parts: [], split: null, chain: true };
    }
    function group(list, key, title, role, from, to) {
      var L = isArr(doc[list]) ? doc[list] : [], cnt = Math.max(0, to - from + 1), ok = 'z:' + list + ':' + from;
      var open = has(Z.open, ok) ? Z.open[ok] : true;
      var head = { t: 'n', id: 'h' + list + from, ref: L.length > from ? ref([list, from]) : null, nodrag: true, noActs: true, noSlot: true, ix: from, iy: to, role: role,
        icon: role === 'sec' ? '&#9876;' : '', title: title, sub: cnt ? cnt + ' step' + (cnt === 1 ? '' : 's') : 'nothing yet',
        tog: cnt ? { key: ok, open: open, count: cnt } : null, sel: false,
        gi: I ? I.forIcBox(role === 'sec' ? 'boss' : (role === 'end' ? 'exit' : 'setup'), role) : null };
      var pk = 'P' + parts.length;
      parts.push({ key: pk, title: title, role: role, count: cnt });
      var inner = stepItems(L.slice(from, to + 1), [list], from, ctx);
      split.push({ id: pk, key: pk, title: title, sub: head.sub, role: role, seq: ref([list]), items: inner.length ? inner : [] });
      if (!open) { head.part = pk; lane.items.push(head); return; }
      lane.items.push({ t: 'grp', id: 'G' + list + from, ix: from, iy: to, node: head, open: true, seq: ref([list]), items: inner, part: pk });
    }
    if (isArr(doc.enter) && doc.enter.length) group('enter', 'enter', 'Zone-in steps (enter)', 'start', 0, doc.enter.length - 1);
    var S = isArr(doc.steps) ? doc.steps : [];
    var P = IC.imp && IC.imp.partsOf ? IC.imp.partsOf({ steps: S }, 'oic').filter(function (x) { return x.list === 'steps'; }) : [];
    if (!S.length) group('steps', 'steps', 'Steps', 'start', 0, -1);
    else if (!P.length) group('steps', 'steps', 'Steps', 'start', 0, S.length - 1);
    for (var k = 0; k < P.length; k++) group('steps', 'steps', P[k].title, kindRole(P[k].kind), P[k].from, P[k].to);
    if (isArr(doc.exit) && doc.exit.length) group('exit', 'exit', 'The way out (exit)', 'end', 0, doc.exit.length - 1);
    lane.items.push({ t: 'n', id: 'end', role: 'end', icon: '&#9632;', fixed: true, noActs: true, noSlot: true, noSlotAfter: true, ix: 0, iy: -1, title: 'Done', small: true,
      gi: I ? I.forIcBox('end', 'end') : null });
    return { lanes: [lane], links: [], parts: parts.length > 1 ? parts : [], split: opts.split ? split : null, chain: true };
  };

  /* every box of any graph as lines of words (the Words view): { depth, text, sub, role, ref, head } */
  Z.lines = function (g) {
    var out = [];
    function node(n, depth, head) { if (n && n.title) out.push({ depth: depth, text: str(n.title), sub: str(n.sub), role: n.role || 'action', ref: n.ref || '', id: n.id || '', head: !!head, err: !!n.err, warn: !!n.warn, tags: n.tags || [], gi: n.gi || null }); }
    function items(L, depth) {
      for (var i = 0; i < (L || []).length; i++) {
        var it = L[i];
        if (!it) continue;
        if (it.t === 'n') { node(it, depth); continue; }
        node(it.node, depth, it.t === 'grp');
        if (it.t === 'grp') items(it.items, depth + 1);
        if (it.t === 'loop' && it.body) items(it.body.items, depth + 1);
        if (it.t === 'if') {
          if (it.yes) { out.push({ depth: depth + 1, text: it.yes.label || 'then', role: 'cond', branch: true }); items(it.yes.items, depth + 2); }
          if (it.no) { out.push({ depth: depth + 1, text: it.no.label || 'otherwise', role: 'alt', branch: true }); items(it.no.items, depth + 2); }
        }
      }
    }
    var lanes = (g && g.lanes) || [];
    for (var l = 0; l < lanes.length; l++) {
      if (lanes.length > 1) out.push({ depth: 0, text: str(lanes[l].partTitle || lanes[l].title), sub: str(lanes[l].sub), role: lanes[l].role || 'start', lane: true });
      items(lanes[l].items, lanes.length > 1 ? 1 : 0);
    }
    return out;
  };

  /* ------------------------------------------------------------ the checks */
  function lev(a, b) {
    a = a.toLowerCase(); b = b.toLowerCase();
    if (a === b) return 0;
    var m = a.length, n = b.length, d = [], i, j;
    for (i = 0; i <= m; i++) d[i] = [i];
    for (j = 0; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
    return d[m][n];
  }
  Z.nearest = function (word, list) {
    var best = '', bd = 3;
    for (var i = 0; i < list.length; i++) { var d = lev(str(word), list[i]); if (d < bd) { bd = d; best = list[i]; } }
    return bd <= (str(word).length > 4 ? 2 : 1) ? best : '';
  };
  function keysOf(o) { var a = []; for (var k in o) if (has(o, k)) a.push(k); return a; }
  function withAwait(keys) { var o = { 'await': 1 }; for (var k in keys) if (has(keys, k)) o[k] = keys[k]; return o; }
  function typeOk(t, v) {
    if (typeof v === 'string' && v.indexOf('{{') >= 0) return true;
    switch (t) {
      case 'int>0': return typeof v === 'number' && v % 1 === 0 && v > 0;
      case 'int>=0': return typeof v === 'number' && v % 1 === 0 && v >= 0;
      case 'int': return typeof v === 'number' && v % 1 === 0;
      case 'num>0': return typeof v === 'number' && v > 0;
      case 'num>=0': return typeof v === 'number' && v >= 0;
      case 'num': return typeof v === 'number';
      case 'bool': return typeof v === 'boolean';
      case 'bool|object': return typeof v === 'boolean' || isObj(v);
      case 'string': return typeof v === 'string';
      case 'string|list': return typeof v === 'string' || isArr(v);
      case 'string|int': return typeof v === 'string' || (typeof v === 'number' && v % 1 === 0);
      case 'row': return typeof v === 'string' || (typeof v === 'number' && v % 1 === 0 && v > 0);
      case 'loc': return isArr(v) && v.length === 3 && v.every(function (x) { return typeof x === 'number' && isFinite(x); });
      case 'spots': return isArr(v) && v.every(function (p) { return isArr(p) && p.length === 3 && p.every(function (x) { return typeof x === 'number' && isFinite(x); }); });
      case 'list': return isArr(v);
      case 'object': return isObj(v);
      case 'conditions': return isArr(v) || isObj(v);
      case 'steps': return isArr(v);
    }
    return true;
  }
  var TYPE_WORDS = { 'int>0': 'a whole number above 0', 'int>=0': 'a whole number, 0 or more', 'int': 'a whole number', 'num>0': 'a number above 0',
    'num>=0': 'a number, 0 or more', num: 'a number', bool: 'true or false', 'bool|object': 'true, false or an object', string: 'text', 'string|list': 'text or a list',
    'string|int': 'text or a whole number', row: 'a row text or a row number', loc: '[x, y, z] (three numbers)', spots: 'a list of [x, y, z]', list: 'a list',
    object: 'an object', conditions: 'a list of conditions', steps: 'a list of steps' };

  function checker(doc, kind) {
    var out = [], ids = {};
    var say = function (level, path, msg) { out.push({ level: level, ref: path ? ref(path) : '', path: path || null, msg: msg }); };
    var vz = V().zoneFile, vf = V().fightFile, conds = V().conditions || {};
    var condNames = keysOf(conds);

    function checkConds(c, path, where) {
      if (c == null) return;
      var list = isArr(c) ? c : [c];
      for (var i = 0; i < list.length; i++) {
        var x = list[i];
        if (!isObj(x)) { say('error', path, where + ': a condition must be an object, like { "inCombat": {} }.'); continue; }
        for (var k in x) if (has(x, k) && k.charAt(0) !== '_') {
          if (kind === 'fight' && !has(conds, k)) { var nn = Z.nearest(k, condNames); say('warn', path, where + ': "' + k + '" is not a condition OgreBot has; it would never be true.' + (nn ? ' Did you mean ' + nn + '?' : '')); }
          if (k === 'not' || k === 'or' || k === 'and') checkConds(x[k], path, where);
        }
      }
    }
    function checkKeys(st, path, allowed, what, level) {
      var names = keysOf(allowed);
      for (var k in st) if (has(st, k)) {
        if (allowed[k] || Z.COMMON[k]) continue;
        if (k.charAt(0) === '_') { if (kind === 'fight' && k !== '_comment' && k !== '_why') say('info', path, '"' + k + '" is a note; on a fight-file step Ogre only keeps _comment and _why quiet.'); continue; }
        var n = Z.nearest(k, names.concat(keysOf(Z.COMMON)));
        say(level || 'warn', path, '"' + k + '" is not a field of ' + what + ': nothing reads it.' + (n ? ' Did you mean ' + n + '?' : ''));
      }
    }
    function checkTyped(st, path, spec, what) {
      for (var k in spec) if (has(spec, k) && has(st, k) && spec[k] && spec[k].type) {
        var t = spec[k].type, v = st[k];
        if (t === 'enum') { if (spec[k].values && spec[k].values.indexOf(v) < 0 && !(typeof v === 'string' && v.indexOf('{{') >= 0)) say('error', path, what + ': ' + k + ' must be ' + spec[k].values.join(', ') + '.'); continue; }
        if (!typeOk(t, v)) say(t.indexOf('int') === 0 || t.indexOf('num') === 0 || t === 'bool' ? 'error' : 'warn', path, what + ': ' + k + ' should be ' + (TYPE_WORDS[t] || t) + '.');
        else if (spec[k].max != null && typeof v === 'number' && v > spec[k].max) say('warn', path, what + ': ' + k + ' goes up to ' + spec[k].max + '.');
      }
    }
    function checkStep(st, path, inLoop) {
      if (!isObj(st)) { say('error', path, 'A step must be an object.'); return; }
      var d = st['do'], shape = has(st, 'do') ? 'do' : (has(st, 'wait') ? 'wait' : (has(st, 'repeat') ? 'repeat' : (has(st, 'forEach') ? 'forEach' : (kind === 'fight' && has(st, 'use') ? 'use' : ''))));
      if (st.stepId != null) {
        if (typeof st.stepId !== 'string') say('warn', path, 'stepId should be text.');
        else if (kind === 'fight' && ids[st.stepId]) say('warn', path, 'Two steps are called ' + st.stepId + '.');
        ids[str(st.stepId)] = 1;
      }
      if (st.onFail != null && st.onFail !== 'fail' && st.onFail !== 'proceed') say('error', path, 'onFail must be fail or proceed.');
      if (st.when != null) checkConds(st.when, path, 'when');
      ['forwho', 'sendTo', 'responders'].forEach(function (k) {
        var odd = IC.words && IC.words.oddWho ? IC.words.oddWho(st[k]) : [];
        for (var o = 0; o < odd.length; o++) say('warn', path, k + ': "' + odd[o].word + '" is probably meant as "' + odd[o].meant + '". Ogre\'s word has no s; as written it matches only a character called ' + odd[o].word + '.');
      });
      if (!shape) { say('error', path, 'A step needs one of: do, wait, repeat or forEach' + (kind === 'fight' ? ', or use' : '') + '.'); return; }
      if (shape === 'do') {
        if (typeof d !== 'string' || !d) { say('error', path, '"do" must name an action.'); return; }
        var zoneVerb = kind === 'zone' && vz.verbs[d], act = vf.actions[d], ctl = vf.controlVerbs[d], spec = zoneVerb || act || ctl;
        if (!spec) {
          if (kind === 'fight' && vz.verbs[d]) say('warn', path, '"' + d + '" only runs in a zone file.');
          else if (kind === 'fight') { var nv = Z.nearest(d, keysOf(vf.actions).concat(keysOf(vf.controlVerbs))); say('error', path, 'OgreBot has no action "' + d + '".' + (nv ? ' Did you mean ' + nv + '?' : '')); }
          return;
        }
        var keys = spec.keys || {}, what = d, strict = !!zoneVerb;
        if (keys.op && keys.op.values) {
          if (st.op == null) { if (keys.op.required) say(strict ? 'error' : 'warn', path, d + ': op is needed: ' + keys.op.values.join(', ') + '.'); }
          else if (keys.op.values.indexOf(st.op) < 0) say('error', path, d + ': op must be ' + keys.op.values.join(', ') + '.' + (Z.nearest(st.op, keys.op.values) ? ' Did you mean ' + Z.nearest(st.op, keys.op.values) + '?' : ''));
        }
        for (var k in keys) if (has(keys, k) && keys[k] && keys[k].required && k !== 'op' && !has(st, k)) {
          var req = keys[k].required;
          if (req === true || (isArr(req) && req.indexOf(str(st.op)) >= 0)) say(strict ? 'error' : 'warn', path, d + ': ' + k + ' is needed.');
        }
        if (d === 'zoneOut' && st.op === 'door' && !has(st, 'name')) say('error', path, 'zoneOut door: name the door.');
        if (d === 'teleporter' && !has(st, 'name') && !has(st, 'walkOnto')) say('error', path, 'teleporter: give its name, or walkOnto and landing.');
        if (d === 'named' && st.stepId && !/^named\d+(\.|$)/.test(str(st.stepId))) say('info', path, 'A named\'s stepId reads best as named1, named2 ...: Skip the boss and part-way starts go by it.');
        if (kind === 'zone' && Z.ONE_BOX[d]) say('info', path, d + ' in a zone file changes the IC character only: it cannot be sent to the others. For every box, put it in the named\'s fight file.');
        if (d === 'beltAdorn' && st.type != null && ['stun', 'stifle', 'mez', 'fear', 'medic'].indexOf(str(st.type).toLowerCase()) < 0)
          say('warn', path, 'beltAdorn: the rune\'s kind is stun, stifle, mez, fear or medic (Ogre swaps by kind; data/belt-runes.json lists the runes).');
        /* Ogre's load refuses this one (its reload of 2026-11-17 skipped seven files for it) */
        if (kind === 'zone' && d === 'heroicOpportunity' && has(st, 'sendTo') && ['disableIcon', 'allowIcon', 'clearIcons'].indexOf(str(st.op)) < 0)
          say('error', path, 'heroicOpportunity: Send to works only with op disableIcon, allowIcon or clearIcons: Ogre skips the whole file. Take Send to off, or use a fight file (forwho) for the others.');
        if (d !== 'template') checkKeys(st, path, kind === 'fight' ? withAwait(keys) : keys, what, 'warn');
        if (zoneVerb) checkTyped(st, path, keys, d);
        if (has(st, 'wait')) say('warn', path, 'A step has either do or wait, not both.');
        if (isArr(st.steps)) for (var s1 = 0; s1 < st.steps.length; s1++) checkStep(st.steps[s1], path.concat(['steps', s1]), inLoop);
        return;
      }
      if (shape === 'wait') {
        var w = st.wait;
        if (typeof w === 'string') {
          var words = kind === 'fight' ? vf.waitWords : ['ms', 'atCampSpot'];
          if (words.indexOf(w) < 0) say('error', path, 'wait must be ' + words.join(', ') + ' or a condition.');
        } else checkConds(w, path, 'wait');
        if (kind === 'fight') {
          if (!has(st, 'limitMs')) say('warn', path, 'A wait needs limitMs: its longest time.');
          if (!has(st, 'onTimeout')) say('warn', path, 'A wait needs onTimeout: proceed or fail.');
        }
        if (has(st, 'limitMs') && !typeOk('int>=0', st.limitMs)) say('error', path, 'wait: limitMs should be a whole number of milliseconds.');
        if (st.onTimeout != null && st.onTimeout !== 'proceed' && st.onTimeout !== 'fail') say('error', path, 'onTimeout must be proceed or fail.');
        if (w === 'ms' && st.onTimeout === 'fail') say('error', path, 'A "ms" wait must use onTimeout proceed.');
        checkKeys(st, path, kind === 'fight' ? { wait: 1, limitMs: 1, onTimeout: 1 } : vz.waitKeys, 'a wait', 'warn');
        return;
      }
      if (shape === 'repeat' || shape === 'forEach') {
        var spec2 = shape === 'repeat' ? vz.repeatKeys : vz.forEachKeys, o = st[shape];
        if (!isObj(o)) say('error', path, shape + ' must be an object.');
        else {
          checkKeys(o, path, spec2, shape, 'warn');
          if (shape === 'repeat' && !has(o, 'times') && !has(o, 'until')) say('error', path, 'repeat needs times, or until with max.');
          if (shape === 'repeat' && has(o, 'until') && !has(o, 'max')) say('error', path, 'repeat until needs max.');
          if (shape === 'repeat' && has(o, 'until')) checkConds(o.until, path, 'repeat until');
          if (shape === 'forEach' && !has(o, 'find') && !has(o, 'spots') && !has(o, 'vars')) say('error', path, 'forEach needs find, spots or vars.');
        }
        if (!isArr(st.steps)) say('error', path, shape + ' needs its own steps list.');
        else for (var s2 = 0; s2 < st.steps.length; s2++) checkStep(st.steps[s2], path.concat(['steps', s2]), true);
        return;
      }
      if (shape === 'use' && isObj(doc.routines) && !has(doc.routines, st.use)) say('warn', path, 'There is no routine "' + str(st.use) + '" in this file.');
    }
    function checkList(L, path) {
      if (L === undefined) return;
      if (!isArr(L)) { say('error', path, path[path.length - 1] + ' must be a list of steps.'); return; }
      for (var i = 0; i < L.length; i++) checkStep(L[i], path.concat([i]), false);
    }
    function checkTop(spec, what) {
      var names = keysOf(spec);
      for (var k in doc) if (has(doc, k) && k.charAt(0) !== '_' && !spec[k]) {
        var n = Z.nearest(k, names);
        say('warn', [k], '"' + k + '" is not a key Ogre reads at the top of a ' + what + '.' + (n ? ' Did you mean ' + n + '?' : ''));
      }
      for (var r in spec) if (has(spec, r) && spec[r].required && !has(doc, r)) say('error', null, 'The file needs "' + r + '".');
    }
    function tokens() {
      var roots = (V().tokens && V().tokens.roots) || [], icRoots = ['zone', 'options', 'run', 'list', 'group'], params = {};
      if (isObj(doc.routines)) for (var rn in doc.routines) if (has(doc.routines, rn) && isObj(doc.routines[rn]) && isArr(doc.routines[rn].params))
        for (var pi = 0; pi < doc.routines[rn].params.length; pi++) params[str(doc.routines[rn].params[pi])] = 1;
      (function walk(x, path, depth) {
        if (depth > 40) return;
        if (typeof x === 'string') {
          var re = /\{\{\s*([A-Za-z_][\w.]*)/g, m;
          while ((m = re.exec(x))) {
            var parts = m[1].split('.');
            if (params[parts[0]]) continue;
            if (roots.indexOf(parts[0]) < 0) say('warn', path, 'The value {{' + m[1] + '}} is not one Ogre fills in.');
            else if (parts[0] === 'ic' && parts[1] && icRoots.indexOf(parts[1]) < 0) say('warn', path, 'The value {{' + m[1] + '}} is not one Ogre fills in.');
          }
          var bare = x.replace(/LavishScript\[\s*"(?:[^"\\]|\\.)*"\s*\]/g, '');
          if (bare.indexOf('${') >= 0) say(kind === 'zone' ? 'error' : 'warn', path, 'A bare ${...} ' + (kind === 'zone' ? 'makes the file not valid' : 'is not read as LavishScript') + ': write LavishScript["${...}"] (or {{me}} for your own name).');
          return;
        }
        if (isArr(x)) { for (var i = 0; i < x.length; i++) walk(x[i], typeof x[i] === 'object' && x[i] && !isArr(x[i]) ? path.concat([i]) : path, depth + 1); return; }
        if (isObj(x)) for (var k in x) if (has(x, k) && k.charAt(0) !== '_') walk(x[k], path, depth + 1);
      })(doc, [], 0);
    }

    if (!isObj(doc)) { say('error', null, 'The file is not one JSON object.'); return out; }
    if (kind === 'zone') {
      checkTop(vz.topKeys, 'zone file');
      if (has(doc, 'zone') && typeof doc.zone !== 'string') say('error', ['zone'], 'zone must be text: the zone name without its difficulty tag.');
      if (typeof doc.zone === 'string' && /\[[^\]]*\]\s*$/.test(doc.zone)) say('warn', ['zone'], 'The zone name ends in a tag: put the tag in variants instead.');
      if (has(doc, 'variants') && !isArr(doc.variants)) say('error', ['variants'], 'variants must be a list, [] when the zone has no difficulty tag.');
      if (isArr(doc.variants)) for (var vi = 0; vi < doc.variants.length; vi++) if (typeof doc.variants[vi] === 'string' && !/^\[.+\]$/.test(doc.variants[vi]) && doc.variants[vi].toLowerCase() !== 'all') say('warn', ['variants'], 'A variant is written with its brackets, as the game writes it: [Heroic].');
      if (isObj(doc.run) && ((isArr(doc.steps) && doc.steps.length) || (isArr(doc.enter) && doc.enter.length) || (isArr(doc.exit) && doc.exit.length))) say('error', null, 'A file has either run or steps, never both.');
      if (has(doc, 'entrance')) {
        if (!isObj(doc.entrance) || !typeOk('loc', doc.entrance.loc)) say('error', ['entrance'], 'entrance must be { "loc": [x, y, z], "tolerance": 30 }.');
        else if (+doc.entrance.loc[0] === 0 && +doc.entrance.loc[1] === 0 && +doc.entrance.loc[2] === 0) say('warn', ['entrance'], 'The entrance is 0, 0, 0: a placeholder.');
        if (isObj(doc.entrance) && has(doc.entrance, 'tolerance') && !typeOk('num>0', doc.entrance.tolerance)) say('error', ['entrance'], 'entrance tolerance must be a number above 0.');
      }
      checkTyped(doc, null, { progression: vz.topKeys.progression, rerunWholeZoneAfterWipe: vz.topKeys.rerunWholeZoneAfterWipe, wipeAttempts: vz.topKeys.wipeAttempts, enabled: vz.topKeys.enabled }, 'The file');
      if (isArr(doc.fileOptions) && doc.fileOptions.length > 3) say('error', ['fileOptions'], 'fileOptions takes up to 3 names.');
      for (var li = 0; li < Z.LISTS.length; li++) checkList(doc[Z.LISTS[li]], [Z.LISTS[li]]);
      checkList(doc.onWipe, ['onWipe']); checkList(doc.afterWipe, ['afterWipe']);
      if (IC.nmap && IC.nmap.problems) {
        var np = IC.nmap.problems(doc);
        for (var q = 0; q < np.length; q++) {
          var p0 = np[q];
          out.push({ level: p0.level === 'bad' ? 'error' : 'warn', ref: p0.r >= 0 ? ref(['steps', p0.r]) : '', path: p0.r >= 0 ? ['steps', p0.r] : null, msg: str(p0.t), fix: p0.fix || '' });
        }
      }
    } else if (kind === 'fight') {
      checkTop(vf.topKeys, 'fight file');
      if (!isArr(doc.named) || !doc.named.length) say('error', ['named'], 'named must list at least one mob: [{ "name": "...", "distance": 50 }].');
      else for (var ni = 0; ni < doc.named.length; ni++) {
        var nd = doc.named[ni];
        if (!isObj(nd) || typeof nd.name !== 'string' || !nd.name) say('error', ['named'], 'Each named needs a name.');
        else { checkKeys(nd, ['named'], vf.namedKeys, 'a named', 'warn'); if (has(nd, 'distance') && !typeOk('num>0', nd.distance)) say('warn', ['named'], 'distance should be a number above 0.'); }
      }
      if (!has(doc, 'zone')) say('info', null, 'No zone: this file matches the mob in any zone.');
      else if (!(typeof doc.zone === 'string' || (isArr(doc.zone) && doc.zone.every(function (x) { return typeof x === 'string'; })))) say('error', ['zone'], 'zone must be text or a list of texts.');
      checkList(doc.setup, ['setup']); checkList(doc.teardown, ['teardown']);
      var events = isObj(doc.initialize) && isArr(doc.initialize.events) ? doc.initialize.events.slice() : [];
      Z.eachStep(doc, function (st) { if (st.event != null && events.indexOf(str(st.event)) < 0) events.push(str(st.event)); });
      if (has(doc, 'triggers') && !isArr(doc.triggers)) say('error', ['triggers'], 'triggers must be a list.');
      var T = isArr(doc.triggers) ? doc.triggers : [];
      for (var t = 0; t < T.length; t++) {
        var tr = T[t], tp = ['triggers', t];
        if (!isObj(tr)) { say('error', tp, 'A trigger must be an object.'); continue; }
        checkKeys(tr, tp, vf.triggerKeys, 'a trigger', 'warn');
        if (typeof tr.on !== 'string' || !tr.on) say('error', tp, 'A trigger needs "on": text, spawn, announcement, chat ... or a custom event.');
        else if (vf.triggerKinds.indexOf(tr.on) < 0 && events.indexOf(tr.on) < 0) say('info', tp, '"' + tr.on + '" is a custom event that nothing in this file sends: another file or a script must send it.');
        if (has(tr, 'match')) { if (!isObj(tr.match)) say('error', tp, 'match must be an object.'); else { checkKeys(tr.match, tp, vf.matchKeys, 'match', 'warn'); checkTyped(tr.match, tp, { mode: vf.matchKeys.mode }, 'match'); } }
        if (tr.when != null) checkConds(tr.when, tp, 'when');
        checkList(tr['do'], tp.concat(['do']));
      }
      var PU = isArr(doc.onPulse) ? doc.onPulse : [];
      for (var u = 0; u < PU.length; u++) {
        var pc = PU[u], pp = ['onPulse', u];
        if (!isObj(pc)) { say('error', pp, 'A pulse check must be an object.'); continue; }
        checkKeys(pc, pp, vf.pulseKeys, 'a pulse check', 'warn');
        ['when', 'activeWhile', 'abortWhen'].forEach(function (ck) { if (pc[ck] != null) checkConds(pc[ck], pp, ck); });
        ['do', 'onEnter', 'onExit'].forEach(function (lk) { checkList(pc[lk], pp.concat([lk])); });
      }
      if (has(doc, 'onKilled')) {
        if (!isObj(doc.onKilled)) say('error', ['onKilled'], 'onKilled must be { "<named>": [steps] }.');
        else for (var nk in doc.onKilled) if (has(doc.onKilled, nk)) checkList(doc.onKilled[nk], ['onKilled', nk]);
      }
      if (isObj(doc.routines)) for (var rn in doc.routines) if (has(doc.routines, rn)) {
        var rr = doc.routines[rn];
        if (isArr(rr)) checkList(rr, ['routines', rn]);
        else if (isObj(rr)) checkList(rr.steps, ['routines', rn, 'steps']);
        else say('error', ['routines', rn], 'A routine is { "params": [], "steps": [] }.');
      }
      if (has(doc, 'initialize') && (!isObj(doc.initialize) || (has(doc.initialize, 'events') && !isArr(doc.initialize.events)))) say('error', ['initialize'], 'initialize is { "events": [names], "vars": {} }.');
    }
    tokens();
    return out;
  }
  Z.check = function (doc, kind) {
    kind = kind || Z.kindOf(doc);
    if (kind !== 'zone' && kind !== 'fight') return [];
    var out = checker(doc, kind), seen = {}, res = [];
    for (var i = 0; i < out.length; i++) { var k = out[i].level + '|' + out[i].ref + '|' + out[i].msg; if (!seen[k]) { seen[k] = 1; res.push(out[i]); } }
    var rank = { error: 0, warn: 1, info: 2 };
    res.sort(function (a, b) { return rank[a.level] - rank[b.level]; });
    return res;
  };
  Z.counts = function (list) { var c = { error: 0, warn: 0, info: 0 }; for (var i = 0; i < list.length; i++) c[list[i].level] = (c[list[i].level] || 0) + 1; return c; };
  /* the worst level per top step (a nested problem marks the box that holds it) */
  Z.probMap = function (list) {
    var m = {};
    for (var i = 0; i < list.length; i++) {
      var p = list[i].path;
      if (!p) continue;
      for (var n = 2; n <= p.length; n += 2) {
        var r = ref(p.slice(0, n)), lv = list[i].level;
        if (lv === 'info') continue;
        if (m[r] !== 'error') m[r] = lv;
      }
    }
    return m;
  };

  /* ------------------------------------------------------------ the zone palette */
  Z.PALETTE = [
    { key: 'z:path', label: 'Walk (mesh)', role: 'move', make: function () { return { 'do': 'path', using: 'nav', spots: [] }; } },
    { key: 'z:named', label: 'Fight a named', role: 'sec', make: function () { return { 'do': 'named', name: '' }; } },
    { key: 'z:chest', label: 'Loot the chest', role: 'action', make: function () { return { 'do': 'loot', op: 'chest' }; } },
    { key: 'z:wait', label: 'Wait', role: 'cond', make: function () { return { wait: 'ms', limitMs: 2000, onTimeout: 'proceed' }; } },
    { key: 'z:click', label: 'Click / use', role: 'action', make: function () { return { 'do': 'actorInteract', op: 'doubleClick', name: '', onFail: 'proceed' }; } },
    { key: 'z:announce', label: 'Say', role: 'action', make: function () { return { 'do': 'announce', message: '' }; } },
    { key: 'z:exit', label: 'Leave (nearest exit)', role: 'end', make: function () { return { stepId: 'exit', 'do': 'zoneOut', op: 'auto' }; } },
    { key: 'z:door', label: 'Leave by a door', role: 'end', more: true, make: function () { return { stepId: 'exit', 'do': 'zoneOut', op: 'door', name: '' }; } },
    { key: 'z:shinies', label: 'Pick up shinies', role: 'action', more: true, make: function () { return { 'do': 'loot', op: 'shinies' }; } },
    { key: 'z:waitFor', label: 'Wait until it shows up', role: 'cond', more: true,
      make: function () { return { wait: { count: { of: 'actors', find: { query: 'Name == ""' }, compare: '>=', value: 1 } }, limitMs: 30000, onTimeout: 'proceed' }; } },
    { key: 'z:waitForCombat', label: 'Wait for the fight to end', role: 'cond', more: true, make: function () { return { 'do': 'waitForCombat' }; } },
    { key: 'z:teleporter', label: 'Teleporter', role: 'move', more: true, make: function () { return { 'do': 'teleporter', name: '' }; } },
    { key: 'z:trash', label: 'Clear a room', role: 'action', more: true, make: function () { return { 'do': 'trash', radius: 30, whenEmpty: 'done' }; } },
    { key: 'z:cast', label: 'Cast', role: 'action', more: true, make: function () { return { 'do': 'castAbility', ability: '' }; } },
    { key: 'z:hold', label: 'Hold a spot', role: 'move', more: true, make: function () { return { 'do': 'campSpot', op: 'setLoc', loc: [0, 0, 0] }; } },
    { key: 'z:release', label: 'Follow again', role: 'move', more: true, make: function () { return { 'do': 'campSpot', op: 'release' }; } },
    { key: 'z:option', label: 'Bot option', role: 'state', more: true, make: function () { return { 'do': 'ogreBotUIOption', id: '', value: 'TRUE' }; } },
    { key: 'z:setup', label: 'Fight setup early', role: 'state', more: true,
      make: function () { return { 'do': 'raw', command: 'oc !ci -SetUpFor igw:{{me}} "Named"' }; } },
    { key: 'z:raw', label: 'Console line', role: 'action', more: true, make: function () { return { 'do': 'raw', command: '' }; } },
    { key: 'z:repeat', label: 'Repeat until', role: 'loop', more: true, make: function () { return { repeat: { until: [], max: 10 }, steps: [] }; } }
  ];
  Z.paletteItem = function (key) { for (var i = 0; i < Z.PALETTE.length; i++) if (Z.PALETTE[i].key === key) return Z.PALETTE[i]; return null; };
  /* the fight-file chips whose every step is a fight-file action (groupQuery, for one, runs only in zone files) */
  Z.fightPalette = function () {
    var A = V().fightFile.actions || {}, C = V().fightFile.controlVerbs || {}, out = [];
    function fine(s) {
      if (isArr(s)) return s.every(fine);
      if (!isObj(s)) return false;
      if (s['do'] != null && !A[s['do']] && !C[s['do']]) return false;
      return isArr(s.steps) ? s.steps.every(fine) : true;
    }
    var P = IC.ogf && IC.ogf.PALETTE ? IC.ogf.PALETTE : [];
    for (var i = 0; i < P.length; i++) { var made = null; try { made = P[i].make(); } catch (e) { made = null; } if (made && fine(made)) out.push(P[i]); }
    return out;
  };
  /* the section a new step joins: the one the + sits in, but a step put in front of the way out joins the part before it */
  Z.prefixAt = function (list, idx) {
    var head = function (s) { return isObj(s) && s.stepId ? str(s.stepId).split('.')[0] : ''; };
    list = list || [];
    var b = idx < list.length ? head(list[idx]) : '', a = idx > 0 ? head(list[idx - 1]) : '';
    return b && b !== 'exit' && b !== 'done' ? b : a;
  };
  /* a new step gets a stepId under the section it lands in (named2.wait ...), unique in the file */
  Z.withId = function (doc, list, idx, step) {
    if (!isObj(step) || step.stepId || !IC.snip) return step;
    var used = IC.snip.usedIds(doc), pre = Z.prefixAt(list || [], idx);
    var base = step['do'] === 'named' ? '' : (step['do'] ? str(step['do']).replace(/[^A-Za-z]/g, '') : (step.wait ? 'wait' : 'step'));
    if (step['do'] === 'named' && IC.snip.nextNamed) { step.stepId = IC.snip.nextNamed(used); return step; }
    step.stepId = IC.snip.freeId(used, pre, base);
    var out = {}; out.stepId = step.stepId;
    for (var k in step) if (has(step, k) && k !== 'stepId') out[k] = step[k];
    return out;
  };

  /* ------------------------------------------------------------ the spots a file names (for the sketch) */
  Z.spots = function (doc) {
    var out = [];
    if (isObj(doc) && isObj(doc.entrance) && isArr(doc.entrance.loc)) out.push({ p: doc.entrance.loc, kind: 'entrance', label: 'entrance' });
    Z.eachStep(doc, function (st, path) {
      var r = ref(path);
      if (isArr(st.spots)) for (var i = 0; i < st.spots.length; i++) if (isArr(st.spots[i])) out.push({ p: st.spots[i], kind: 'path', ref: r, label: str(st.stepId) });
      if (isArr(st.spot)) out.push({ p: st.spot, kind: 'named', ref: r, label: str(st.name) });
      if (isArr(st.loc)) out.push({ p: st.loc, kind: 'spot', ref: r, label: str(st['do']) });
      if (isArr(st.walkOnto)) out.push({ p: st.walkOnto, kind: 'spot', ref: r, label: 'pad' });
      if (isArr(st.landing)) out.push({ p: st.landing, kind: 'spot', ref: r, label: 'landing' });
    });
    return out.filter(function (s) { return s.p.length >= 3 && isFinite(+s.p[0]) && isFinite(+s.p[2]); });
  };

  /* ------------------------------------------------------------ ISXJQB: quest-pack steps that run this file */
  Z.questSteps = function (file, opts) {
    opts = opts || {};
    var f = str(file).replace(/\\/g, '/').replace(/"/g, ''), min = Math.max(1, Math.round(+opts.minutes || 90)), what = str(opts.zone) || 'the instance';
    var team = 'TeamRunIC ' + f + ',' + min + ',' + (str(opts.leader) || 'auto');
    var solo = 'RunIC "' + f + '",' + min;
    return {
      solo: { type: 'command', command: solo, description: 'Run ' + what + ' (each box on its own run)', group: false },
      team: { type: 'command', command: team, description: 'Run ' + what + ' with the group', group: false },
      groupUp: { type: 'command', command: 'GroupUp auto,3600', description: 'Group up first', group: false },
      lines: { solo: solo, team: team, console: 'jb RunIC ' + f + ',' + min }
    };
  };
})(typeof window !== 'undefined' ? window : this);
