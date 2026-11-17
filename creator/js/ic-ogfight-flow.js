/* Open IC Creator - ic-ogfight-flow.js
   OgreBot fight files as a flowchart (IC.ogf): one lane per setup, trigger, pulse check, kill, routine and teardown;
   links from each setVar to the checks that read it; edits by JSON path (move, copy, remove, insert).
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var O = IC.ogf = IC.ogf || {};
  function str(v) { return v == null ? '' : String(v); }
  function isArr(v) { return Object.prototype.toString.call(v) === '[object Array]'; }
  function q(s, n) { s = str(s); n = n || 40; return s.length > n ? s.slice(0, n - 1) + '...' : s; }
  O.open = O.open || {};

  function Wd() { return IC.words || null; }
  function who(fw) { return Wd() ? Wd().who(fw) : str(fw || 'everyone'); }
  function cmt(c, dflt) { return c && !(Wd() && Wd().devNote(c)) ? q(Wd() ? Wd().val(c) : c, 80) : (dflt || ''); }
  function askWords(doc) {
    var qa = {};
    (function scan(x, depth) {
      if (!x || typeof x !== 'object' || depth > 12) return;
      if (!isArr(x) && x['do'] === 'groupQuery' && x['var']) {
        var qn = str(x.question), v = str(x['var']);
        if (qn === 'abilityReady') qa[v] = { yes: 'has ' + x.ability + ' ready', not: 'does not have ' + x.ability + ' ready' };
        else if (qn === 'itemCount') qa[v] = { yes: 'has ' + x.item, not: 'does not have ' + x.item };
        else if (qn === 'slotResolve') qa[v] = { yes: 'has something in the ' + x.slot + ' slot', not: 'has nothing in the ' + x.slot + ' slot' };
      }
      for (var k in x) if (x.hasOwnProperty(k) && x[k] && typeof x[k] === 'object') scan(x[k], depth + 1);
    })(doc, 0);
    return qa;
  }

  function ref(p) { return JSON.stringify(p); }
  O.parseRef = function (r) { try { return JSON.parse(r); } catch (e) { return null; } };
  function tokenReads(x, out, depth) {
    if (x == null || depth > 10) return out;
    if (typeof x === 'string') {
      var re = /\{\{\s*(?:encounter|global)\.([^}\s]+)\s*\}\}/g, m;
      while ((m = re.exec(x))) if (out.indexOf(m[1]) < 0) out.push(m[1]);
    } else if (typeof x === 'object') {
      for (var k in x) if (x.hasOwnProperty(k) && k !== 'steps' && k.charAt(0) !== '_') tokenReads(x[k], out, depth + 1);
    }
    return out;
  }
  function setName(n) {
    if (n != null && typeof n === 'object') {
      var c = isArr(n.concat) ? n.concat : [], pre = '';
      for (var i = 0; i < c.length && typeof c[i] === 'string' && !/\{\{/.test(c[i]); i++) pre += c[i];
      return { name: '', prefix: pre };
    }
    var s = str(n), at = s.indexOf('{{');
    return { name: s, prefix: at > 0 ? s.slice(0, at) : '' };
  }
  function stepItems(list, base, ctx) {
    var items = [];
    for (var i = 0; i < (list || []).length; i++) {
      var a = list[i];
      if (!a || typeof a !== 'object') continue;
      var p = base.concat([i]), w = (ctx.labels && ctx.labels.step) ? ctx.labels.step(a) || O.stepWords(a) : O.stepWords(a);
      var n = { t: 'n', id: 'n' + ref(p), ref: ref(p), ix: i, iy: i, role: w.role, icon: w.icon, title: w.title, sub: w.sub, tags: [], sel: ctx.sel === ref(p), abil: w.abil || '',
        gi: IC.icons ? ((w.abil && IC.icons.forAbil && IC.icons.forAbil(w.abil)) || IC.icons.forFightStep(a, w.role)) : null };
      if (IC.icons && IC.icons.fightIcons) IC.icons.fightIcons(n, a, w);
      if (a.when && a.when.length) {
        n.sub = 'only if ' + condWords(a.when, ctx);
        n.tags.push({ t: 'if', role: 'cond' });
        ctx.reads(a.when, n.id);
      }
      if (a.do === 'setVar' && a.name != null && a.name !== '') {
        var sn = setName(a.name);
        if (sn.name) ctx.sets(sn.name, n.id);
        if (sn.prefix) ctx.sets(sn.prefix, n.id);
      }
      if (a.do === 'groupQuery' && a['var']) ctx.sets(str(a['var']) + '.', n.id);
      if (a.stepId) n.tags.push({ t: 'id ' + str(a.stepId), role: 'note' });
      if (a.repeat && a.repeat.until) ctx.reads(a.repeat.until, n.id);
      if (a.wait && typeof a.wait === 'object') ctx.reads(a.wait, n.id);
      if (a.awaitWhen) ctx.reads(a.awaitWhen, n.id);
      var tr = tokenReads(a, [], 0);
      for (var t = 0; t < tr.length; t++) ctx.read(tr[t], n.id);
      if (a.forEach && a.forEach.vars && a.forEach.vars.prefix) ctx.readPrefix(str(a.forEach.vars.prefix), n.id);
      if ((a.do === 'broadcast' || a.do === 'fireEvent' || (a.do === 'timer' && a.after != null) || a.do === 'report') && a.event) ctx.sends(str(a.event), n.id);
      if (a.do === 'stop') n.stop = 'stop';
      if (w.timeout) n.tags.push(w.timeout === 'fail' || w.timeout === 'stop' ? { t: 'if it never happens: stop', role: 'alt' } : { t: 'if it never happens: go on', role: 'cond' });
      if ((a.forEach || a.repeat) && isArr(a.steps)) {
        items.push({ t: 'loop', id: 'f' + ref(p), ix: i, iy: i, node: n, doneLabel: a.repeat ? 'done' : 'next',
          body: { label: a.repeat ? 'repeat' : 'each', seq: ref(p.concat(['steps'])), items: stepItems(a.steps, p.concat(['steps']), ctx) } });
      } else if (isArr(a.steps)) {
        items.push({ t: 'grp', id: 'g' + ref(p), ix: i, iy: i, node: n, open: true, seq: ref(p.concat(['steps'])), items: stepItems(a.steps, p.concat(['steps']), ctx) });
      } else items.push(n);
    }
    return items;
  }
  function condWords(list, ctx) { return (ctx.labels && ctx.labels.conds) ? ctx.labels.conds(list) : O.condsText(list); }
  var BUILTIN_ON = { text: 1, announcement: 1, chat: 1, spawn: 1, spawnDelayed: 1, despawn: 1, detAdded: 1, detRemoved: 1, detUpdated: 1, castEnded: 1 };
  function isLife(pc) { return !!(pc.activeWhile || pc.onEnter || pc.onExit || pc.abortWhen); }
  function lifeLane(pc, pp, u, ctx) {
    var cond = pc.activeWhile || pc.when, cw = condWords(cond || [], ctx), hid = 'n' + ref(pp);
    var ph = { t: 'n', id: hid, ref: ref(pp), noSlot: true, nodrag: true, ix: 0, iy: -1, role: 'loop', icon: '&#8635;',
      title: cw ? 'While ' + q(cw, 90) : 'While the fight runs', sub: cmt(pc._comment, 'checked about twice a second'),
      tags: pc.forwho ? [{ t: 'for ' + who(pc.forwho), role: 'action' }] : [], sel: ctx.sel === ref(pp),
      gi: IC.icons ? IC.icons.forFightBox('every', 'loop') : null };
    if (pc.throttleMs) ph.tags.push({ t: 'at most every ' + (Math.round(+pc.throttleMs / 100) / 10) + ' s', role: 'loop' });
    if (pc.runOncePerEncounter) ph.tags.push({ t: 'once per fight', role: 'cond' });
    if (pc.id) ph.tags.push({ t: str(pc.id), role: 'note' });
    ctx.reads(cond, hid);
    var items = [ph];
    if (pc.abortWhen) {
      var ab = { t: 'n', id: 'a' + ref(pp), ref: ref(pp), noActs: true, nodrag: true, noSlot: true, ix: 0, iy: -1, role: 'alt', icon: '&#9940;',
        title: 'Stops early if ' + q(condWords(pc.abortWhen, ctx), 80), sub: pc.runOnExitAfterwards ? 'then the "when it goes off" steps still run' : '', tags: [],
        gi: IC.icons ? IC.icons.mk('stop', 'alt') : null };
      ctx.reads(pc.abortWhen, ab.id);
      items.push(ab);
    }
    var part = function (key, title, sub, kind, role) {
      var kp = pp.concat([key]), L = isArr(pc[key]) ? pc[key] : [];
      return { t: 'grp', id: 'g' + ref(kp), ix: 0, iy: -1, noSlot: true, open: true, seq: ref(kp), items: stepItems(L, kp, ctx),
        node: { t: 'n', id: 'n' + ref(kp), ref: ref(pp), role: role, icon: '&#9670;', fixed: true, noActs: true, nodrag: true, noSlot: true, ix: 0, iy: -1,
          title: title, sub: L.length ? sub : 'nothing yet', tags: [], gi: IC.icons ? IC.icons.forFightBox(kind, role) : null } };
    };
    items.push(part('onEnter', 'When it comes on', 'each time it becomes true', 'once', 'cond'));
    if (isArr(pc['do']) && pc['do'].length) items.push(part('do', 'Over and over while it is on', 'checked about twice a second', 'every', 'loop'));
    var ex = part('onExit', 'When it goes off', 'each time it stops being true', 'end', 'end');
    ex.noSlotAfter = true;
    items.push(ex);
    return { id: 'L' + ref(pp), title: 'Loop ' + (u + 1), sub: '', role: 'loop', partTitle: cw ? 'While ' + q(cw, 50) : 'While the fight runs',
      seq: null, items: items };
  }

  O.graph = function (doc, opts) {
    opts = opts || {};
    var lanes = [], links = [], setBy = {}, readBy = [], sendBy = {}, listen = {};
    var ctx = { sel: opts.sel || '', labels: opts.labels,
      sets: function (name, id) { (setBy[name] = setBy[name] || []).push(id); },
      read: function (name, id) { readBy.push({ name: str(name), id: id }); },
      readPrefix: function (prefix, id) { readBy.push({ name: str(prefix), id: id, prefix: true }); },
      sends: function (ev, id) { (sendBy[ev] = sendBy[ev] || []).push(id); },
      reads: function (conds, id) {
        (function scan(list) {
          if (list && !isArr(list)) list = [list];
          for (var i = 0; i < (list || []).length; i++) {
            var c = list[i];
            if (!c || typeof c !== 'object') continue;
            for (var k in c) if (c.hasOwnProperty(k) && k.charAt(0) !== '_') {
              var v = c[k];
              if ((k === 'varEquals' || k === 'varCompare') && v && v.name) readBy.push({ name: str(v.name), id: id });
              else if (k === 'count' && v && str(v.of) === 'vars' && v.prefix) readBy.push({ name: str(v.prefix), id: id, prefix: true });
              else if (k === 'not' || k === 'or' || k === 'and') scan(v);
              var tr = tokenReads(v, [], 0);
              for (var t = 0; t < tr.length; t++) readBy.push({ name: tr[t], id: id });
            }
          }
        })(conds);
      } };
    doc = doc || {};
    if (Wd()) {
      Wd().qa = askWords(doc);
      if (Wd().setDets) Wd().setDets(doc);
    }
    var named = (isArr(doc.named) ? doc.named : []).map(function (n) { return n && n.name; }).filter(Boolean);
    var start = { id: 'start', title: 'Fight starts', sub: str(doc.zone), role: 'start', seq: ref(['setup']), items: [] };
    start.items.push({ t: 'n', id: 'S', role: 'start', icon: '&#9876;', fixed: true, noActs: true, noSlot: true, ix: 0, iy: -1,
      title: named.length ? named.join(', ') : 'The named', sub: str(doc.expansion), gi: IC.icons ? IC.icons.forFightBox('start', 'sec') : null });
    var su = stepItems(doc.setup, ['setup'], ctx), nsu = isArr(doc.setup) ? doc.setup.length : 0, tail = [];
    for (var i = 0; i < su.length; i++) start.items.push(su[i]);
    if (doc.initialize && isArr(doc.initialize.events)) {
      for (var e = 0; e < doc.initialize.events.length; e++)
        tail.push({ t: 'n', id: 'ev' + e, role: 'state', icon: '&#9889;', fixed: true, noActs: true, small: true, title: 'Listens for the message "' + q(doc.initialize.events[e], 30) + '"', gi: IC.icons ? IC.icons.forFightBox('listens', 'state') : null });
    }
    if (doc.initialize && doc.initialize.vars && typeof doc.initialize.vars === 'object' && !isArr(doc.initialize.vars)) {
      var IV = doc.initialize.vars;
      for (var ivk in IV) if (IV.hasOwnProperty(ivk)) {
        var ivId = 'iv' + ivk;
        tail.push({ t: 'n', id: ivId, role: 'state', icon: '&#9673;', fixed: true, noActs: true, small: true,
          title: 'Starts with "' + q(ivk, 24) + '" set to ' + q(Wd() ? Wd().val(IV[ivk]) : str(IV[ivk]), 24), gi: IC.icons ? IC.icons.mk('setvar', 'state') : null });
        ctx.sets(ivk, ivId);
      }
    }
    if (doc.spotTables && typeof doc.spotTables === 'object') {
      for (var st in doc.spotTables) if (doc.spotTables.hasOwnProperty(st))
        tail.push({ t: 'n', id: 'sp' + st, role: 'state', icon: '&#128205;', fixed: true, noActs: true, small: true, title: 'The spots "' + q(st, 20) + '" (' + (doc.spotTables[st] || []).length + ')', gi: IC.icons ? IC.icons.forFightBox('spots', 'move') : null });
    }
    for (var ti = 0; ti < tail.length; ti++) {
      tail[ti].ix = nsu; tail[ti].iy = nsu - 1;
      if (ti > 0) tail[ti].noSlot = true;
      if (ti === tail.length - 1) tail[ti].noSlotAfter = true;
      start.items.push(tail[ti]);
    }
    lanes.push(start);
    var T = isArr(doc.triggers) ? doc.triggers : [];
    for (var t = 0; t < T.length; t++) {
      var tr = T[t];
      if (!tr || typeof tr !== 'object') continue;
      var p = ['triggers', t], w = (opts.labels && opts.labels.when) ? opts.labels.when(tr) || O.whenText(tr) : O.whenText(tr);
      var head = { t: 'n', id: 'n' + ref(p), ref: ref(p), lane: 1, noSlot: true, nodrag: true, ix: 0, iy: -1, role: 'cond', icon: '&#9670;', title: 'When ' + (/^I\b/.test(w.title) ? w.title : w.title.charAt(0).toLowerCase() + w.title.slice(1)),
        sub: cmt(tr._comment), tags: tr.forwho ? [{ t: 'for ' + who(tr.forwho), role: 'action' }] : [], sel: ctx.sel === ref(p),
        gi: IC.icons ? IC.icons.forWhen(tr, 'cond') : null };
      if (tr.allowConcurrentRuns === false) head.tags.push({ t: 'not again while running', role: 'cond' });
      if (tr.throttleMs) head.tags.push({ t: 'at most every ' + (Math.round(+tr.throttleMs / 100) / 10) + ' s', role: 'loop' });
      if (tr.id) head.tags.push({ t: str(tr.id), role: 'note' });
      if (tr.on && !BUILTIN_ON[str(tr.on)]) (listen[str(tr.on)] = listen[str(tr.on)] || []).push(head.id);
      var items = [head];
      if (tr.when && tr.when.length) {
        var cn = { t: 'n', id: 'c' + ref(p), ref: ref(p), noActs: true, nodrag: true, ix: 0, iy: -1, role: 'cond', icon: '&#10067;', title: 'Only if ' + q(condWords(tr.when, ctx), 70), sub: '', tags: [],
          gi: IC.icons ? IC.icons.mk('onlyif', 'cond') : null };
        if (IC.icons && IC.icons.needs && IC.icons.namesIn) cn.need = IC.icons.off ? [] : IC.icons.needs(IC.icons.namesIn({ when: tr.when }), 4);
        ctx.reads(tr.when, cn.id);
        items.push(cn);
      }
      var acts = stepItems(tr['do'], p.concat(['do']), ctx);
      lanes.push({ id: 'L' + ref(p), title: 'Rule ' + (t + 1), sub: '', role: 'cond', seq: ref(p.concat(['do'])), items: items.concat(acts), head: 1 });
    }
    var PU = isArr(doc.onPulse) ? doc.onPulse : [];
    for (var u = 0; u < PU.length; u++) {
      var pc = PU[u];
      if (!pc || typeof pc !== 'object') continue;
      var pp = ['onPulse', u];
      if (isLife(pc)) { lanes.push(lifeLane(pc, pp, u, ctx)); continue; }
      var every = pc.everyPulse === true;
      var ph = { t: 'n', id: 'n' + ref(pp), ref: ref(pp), noSlot: true, nodrag: true, ix: 0, iy: -1, role: every ? 'loop' : 'cond', icon: every ? '&#8635;' : '&#9670;',
        title: every ? 'Over and over while ' + q(condWords(pc.when, ctx) || 'the fight runs', 90) : (condWords(pc.when, ctx) ? 'Once, when ' + q(condWords(pc.when, ctx), 90) : 'Once, when the fight starts'),
        sub: cmt(pc._comment, every ? 'checked about twice a second' : 'again only after it stops being true'), tags: pc.forwho ? [{ t: 'for ' + who(pc.forwho), role: 'action' }] : [], sel: ctx.sel === ref(pp),
        gi: IC.icons ? IC.icons.forFightBox(every ? 'every' : 'once', every ? 'loop' : 'cond') : null };
      if (pc.throttleMs) ph.tags.push({ t: 'at most every ' + (Math.round(+pc.throttleMs / 100) / 10) + ' s', role: 'loop' });
      if (pc.runOncePerEncounter) ph.tags.push({ t: 'once per fight', role: 'cond' });
      if (pc.id) ph.tags.push({ t: str(pc.id), role: 'note' });
      ctx.reads(pc.when, ph.id);
      lanes.push({ id: 'L' + ref(pp), title: every ? 'Loop ' + (u + 1) : 'Watch ' + (u + 1), sub: '', role: every ? 'loop' : 'cond',
        partTitle: every ? 'While ' + q(condWords(pc.when, ctx) || 'the fight runs', 50) : ph.title,
        seq: ref(pp.concat(['do'])), items: [ph].concat(stepItems(pc['do'], pp.concat(['do']), ctx)) });
    }
    if (doc.onKilled && typeof doc.onKilled === 'object') {
      for (var nk in doc.onKilled) if (doc.onKilled.hasOwnProperty(nk)) {
        var kp = ['onKilled', nk];
        lanes.push({ id: 'L' + ref(kp), title: 'When ' + q(nk, 30) + ' dies', role: 'cond', seq: ref(kp),
          items: [{ t: 'n', id: 'n' + ref(kp), role: 'cond', icon: '&#9760;', fixed: true, noActs: true, noSlot: true, ix: 0, iy: -1, title: 'When ' + q(nk, 34) + ' dies', sub: '',
            gi: IC.icons ? IC.icons.forFightBox('dies', 'cond') : null }].concat(stepItems(doc.onKilled[nk], kp, ctx)) });
      }
    }
    if (doc.routines && typeof doc.routines === 'object') {
      for (var rn in doc.routines) if (doc.routines.hasOwnProperty(rn)) {
        var r = doc.routines[rn], rp = isArr(r) ? ['routines', rn] : ['routines', rn, 'steps'], rs = isArr(r) ? r : (r && r.steps);
        lanes.push({ id: 'L' + ref(rp), title: 'Steps "' + q(rn, 28) + '"', sub: r && r.params && r.params.length ? 'takes ' + r.params.join(', ') : '', role: 'start', seq: ref(rp),
          items: [{ t: 'n', id: 'n' + ref(['routines', rn]), role: 'start', icon: '&#8618;', fixed: true, noActs: true, noSlot: true, ix: 0, iy: -1, title: 'The steps "' + q(rn, 30) + '"', sub: cmt(r && r._comment, 'run by "Run the steps"'),
            gi: IC.icons ? IC.icons.forFightBox('steps', 'start') : null }].concat(stepItems(rs, rp, ctx)) });
      }
    }
    var td = stepItems(doc.teardown, ['teardown'], ctx);
    lanes.push({ id: 'Lend', title: 'Fight ends', role: 'end', seq: ref(['teardown']),
      items: [{ t: 'n', id: 'E', role: 'end', icon: '&#9632;', fixed: true, noActs: true, noSlot: true, ix: 0, iy: -1, title: 'When the fight ends', sub: td.length ? '' : 'nothing to undo',
        gi: IC.icons ? IC.icons.forFightBox('end', 'end') : null }].concat(td) });
    var seen = {};
    var link = function (from, to, label) { var k = from + '>' + to; if (from === to || seen[k] || links.length >= 240) return; seen[k] = 1; links.push({ from: from, to: to, label: label }); };
    for (var b = 0; b < readBy.length && links.length < 240; b++) {
      var rb = readBy[b], rn2 = rb.name, srcs = [];
      if (rb.prefix) { for (var sk in setBy) if (setBy.hasOwnProperty(sk) && sk.indexOf(rn2) === 0) srcs = srcs.concat(setBy[sk]); }
      else {
        var dot = rn2.indexOf('.'), br = rn2.indexOf('{{');
        srcs = (setBy[rn2] || []).concat(dot > 0 ? (setBy[rn2.slice(0, dot + 1)] || []) : []).concat(br > 0 ? (setBy[rn2.slice(0, br)] || []) : []);
      }
      for (var s = 0; s < srcs.length && links.length < 240; s++) link(srcs[s], rb.id, rn2);
    }
    for (var ev in sendBy) if (sendBy.hasOwnProperty(ev) && listen[ev])
      for (var si = 0; si < sendBy[ev].length; si++) for (var li = 0; li < listen[ev].length; li++) link(sendBy[ev][si], listen[ev][li], 'message ' + ev);
    return { lanes: lanes, links: links };
  };

  O.at = function (doc, path) {
    var cur = doc;
    for (var i = 0; cur != null && i < path.length; i++) cur = cur[path[i]];
    return cur;
  };
  O.listAt = function (doc, path, make) {
    var host = O.at(doc, path.slice(0, path.length - 1)), k = path[path.length - 1];
    if (!host || typeof host !== 'object') return null;
    if (!isArr(host[k])) { if (!make) return null; host[k] = []; }
    return host[k];
  };
  function wsTake(arr, i) { var L = arr && arr.__jcWs; return L && isArr(L.m) ? (L.m.splice(i, 1)[0] || null) : null; }
  function wsPut(arr, i, m) { var L = arr && arr.__jcWs; if (L && isArr(L.m)) L.m.splice(Math.min(i, L.m.length), 0, m || null); }
  function clone(v) {
    if (isArr(v)) return v.map(clone);
    if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
      var o = {};
      for (var k in v) if (v.hasOwnProperty(k)) o[k] = clone(v[k]);
      return o;
    }
    return v;
  }
  O.clone = clone;
  O.move = function (doc, fromRef, toSeq, idx) {
    var fp = O.parseRef(fromRef), tp = O.parseRef(toSeq);
    if (!fp || !tp) return 'Cannot move that.';
    var src = O.listAt(doc, fp.slice(0, fp.length - 1)), i = fp[fp.length - 1];
    if (!src || src[i] == null) return 'That step is gone.';
    var inside = tp.length > fp.length;
    for (var a = 0; inside && a < fp.length; a++) if (tp[a] !== fp[a]) inside = false;
    if (inside) return 'A step cannot go inside itself.';
    var dst = O.listAt(doc, tp, true);
    if (!dst) return 'Cannot drop there.';
    if (dst === src) {
      if (idx === i || idx === i + 1) return '';
      if (idx > i) idx--;
    }
    var item = src.splice(i, 1)[0], m = wsTake(src, i);
    dst.splice(idx, 0, item);
    wsPut(dst, idx, dst === src ? m : null);
    return '';
  };
  O.remove = function (doc, r) {
    var p = O.parseRef(r), list = p ? O.listAt(doc, p.slice(0, p.length - 1)) : null;
    if (!list || list[p[p.length - 1]] == null) return false;
    list.splice(p[p.length - 1], 1);
    wsTake(list, p[p.length - 1]);
    return true;
  };
  O.copy = function (doc, r) {
    var p = O.parseRef(r), list = p ? O.listAt(doc, p.slice(0, p.length - 1)) : null, i = p ? p[p.length - 1] : -1;
    if (!list || list[i] == null) return false;
    list.splice(i + 1, 0, clone(list[i]));
    wsPut(list, i + 1, null);
    return true;
  };
  O.shift = function (doc, r, dir) {
    var p = O.parseRef(r), list = p ? O.listAt(doc, p.slice(0, p.length - 1)) : null, i = p ? p[p.length - 1] : -1, j = i + dir;
    if (!list || j < 0 || j >= list.length) return false;
    var x = list.splice(i, 1)[0], m = wsTake(list, i);
    list.splice(j, 0, x);
    wsPut(list, j, m);
    return true;
  };
  O.insert = function (doc, seq, idx, obj) {
    var list = O.listAt(doc, O.parseRef(seq) || [], true);
    if (!list) return false;
    var at = Math.max(0, Math.min(idx, list.length)), many = isArr(obj) ? obj : [obj];
    for (var i = 0; i < many.length; i++) { list.splice(at + i, 0, many[i]); wsPut(list, at + i, null); }
    return true;
  };
  O.namedOf = function (doc) { var n = doc && isArr(doc.named) && doc.named[0]; return n ? str(n.name || n) : ''; };
  function pulseId(doc, base) {
    var used = {}, P = isArr(doc && doc.onPulse) ? doc.onPulse : [], n = 2;
    for (var i = 0; i < P.length; i++) if (P[i] && P[i].id) used[str(P[i].id)] = 1;
    if (!used[base]) return base;
    while (used[base + n]) n++;
    return base + n;
  }
  O.loopCombat = function (doc) {
    var nm = O.namedOf(doc);
    return { id: pulseId(doc, 'loop.whileInCombat'), everyPulse: true, throttleMs: 1000, when: [nm ? { engaged: { named: nm } } : { inCombat: {} }], 'do': [],
      _comment: 'Made in Open IC Creator: over and over (at most once a second) while ' + (nm ? 'we fight ' + nm : 'I am in combat') + '.' };
  };
  O.healthAt = function (doc, pct) {
    var nm = O.namedOf(doc);
    return { id: pulseId(doc, 'health.at' + (+pct || 50)), when: [{ mobHealthPct: nm ? { named: nm, compare: '<=', value: +pct || 50 } : { compare: '<=', value: +pct || 50 } }], 'do': [],
      _comment: 'Made in Open IC Creator: once, when ' + (nm || 'the named') + '\'s health drops to ' + (+pct || 50) + '%.' };
  };
  O.whenLine = function (text, red) {
    return { on: red ? 'announcement' : 'text', match: { mode: 'substring', needle: str(text) }, allowConcurrentRuns: false, 'do': [] };
  };
  O.whenSpawn = function (name, gone) {
    return { on: gone ? 'despawn' : 'spawn', match: { name: str(name), mode: 'exact' }, allowConcurrentRuns: false, 'do': [] };
  };
  O.addPulse = function (doc, pc) {
    if (!doc || !pc) return '';
    if (!isArr(doc.onPulse)) doc.onPulse = [];
    doc.onPulse.push(pc);
    wsPut(doc.onPulse, doc.onPulse.length - 1, null);
    return ref(['onPulse', doc.onPulse.length - 1]);
  };
  O.whenDies = function (doc, name) {
    name = str(name || O.namedOf(doc));
    if (!doc || !name) return '';
    if (!doc.onKilled || typeof doc.onKilled !== 'object' || isArr(doc.onKilled)) doc.onKilled = {};
    if (!isArr(doc.onKilled[name])) doc.onKilled[name] = [];
    return ref(['onKilled', name]);
  };
  O.aeBlock = function (main, alt, mainWho, altWho) {
    main = main || 'Bladedance'; alt = alt || 'Tortoise Shell';
    var bk = function (n) { var b = IC.words && IC.words.aeBlocker ? IC.words.aeBlocker(n) : null; return b ? b.cls : 'all'; };
    mainWho = mainWho || bk(main); altWho = altWho || bk(alt);
    var ve = function (n, v) { return { varEquals: { scope: 'encounter', name: n, value: v } }; };
    return [
      { stepId: 'aeblock', repeat: { until: { or: [ve('bd.anyYes', 'TRUE'), ve('ts.anyYes', 'TRUE')] }, max: 30 }, steps: [
        { stepId: 'aeblock.ask', 'do': 'groupQuery', 'var': 'bd', question: 'abilityReady', ability: main },
        { stepId: 'aeblock.askAlt', 'do': 'groupQuery', 'var': 'ts', question: 'abilityReady', ability: alt },
        { stepId: 'aeblock.gap', wait: 'ms', limitMs: 2000, onTimeout: 'proceed' }] },
      { stepId: 'aeblock.cast', 'do': 'castAbility', forwho: mainWho, ability: main, when: [ve('bd.anyYes', 'TRUE')] },
      { stepId: 'aeblock.castAlt', 'do': 'castAbility', forwho: altWho, ability: alt, when: [{ not: [ve('bd.anyYes', 'TRUE')] }, ve('ts.anyYes', 'TRUE')] }
    ];
  };
  O.detJoust = function (det, spot, back, say) {
    var has = { hasDet: { main: +det.main, back: +det.back } }, nm = det.name || 'the detriment';
    var key = str(det.name).replace(/[^A-Za-z0-9]+/g, '') || (+det.main + '_' + (+det.back < 0 ? 'any' : +det.back));
    var latch = function (v) { return { varEquals: { scope: 'encounter', name: 'runOut' + key, value: v } }; };
    var out = [{ 'do': 'setVar', scope: 'encounter', name: 'runOut' + key, value: 'out' }];
    if (say !== false) out.push({ 'do': 'announce', console: true, message: '{{me}} has ' + nm + ': running out' });
    out.push({ 'do': 'joust', op: 'out' });
    out.push({ 'do': 'campSpot', op: 'setRelativeLoc', loc: spot });
    var home = [{ 'do': 'setVar', scope: 'encounter', name: 'runOut' + key, value: '' }, { 'do': 'campSpot', op: 'clearRelative' }];
    if (back) home.push({ 'do': 'campSpot', op: 'setLoc', loc: back });
    return [
      { id: 'runOut.' + key, everyPulse: true, throttleMs: 500, when: [has, { not: [latch('out')] }], 'do': out,
        _comment: 'Made in Open IC Creator: while I have ' + nm + ', run out to a spot for now.' },
      { id: 'runOut.' + key + '.back', everyPulse: true, throttleMs: 500, when: [latch('out'), { not: [has] }], 'do': home,
        _comment: 'Made in Open IC Creator: ' + nm + ' is gone: back to the group\'s spot.' }
    ];
  };
  O.detWatch = function (det) {
    return { on: 'detAdded', match: { main: +det.main, back: +det.back }, allowConcurrentRuns: false,
      _comment: 'Made in Open IC Creator: when I get ' + (det.name || 'this detriment') + '.', 'do': [] };
  };
  O.addTrigger = function (doc, trig) {
    if (!doc || !trig) return '';
    if (isArr(trig)) {
      var first = '';
      for (var i = 0; i < trig.length; i++) {
        var r = trig[i] && trig[i].on ? O.addTrigger(doc, trig[i]) : O.addPulse(doc, trig[i] && trig[i].id ? (trig[i].id = pulseId(doc, str(trig[i].id)), trig[i]) : trig[i]);
        if (!first) first = r;
      }
      return first;
    }
    if (!isArr(doc.triggers)) doc.triggers = [];
    doc.triggers.push(trig);
    wsPut(doc.triggers, doc.triggers.length - 1, null);
    return ref(['triggers', doc.triggers.length - 1]);
  };
  O.addRule = O.addTrigger;
  O.RULES = [
    { key: 'loopCombat', label: 'Loop while in combat', needs: [], role: 'loop' },
    { key: 'detJoust', label: 'Run out on a detriment', needs: ['det', 'spot'], role: 'move' },
    { key: 'detWatch', label: 'When I get a detriment...', needs: ['det'], role: 'cond' },
    { key: 'whenLine', label: 'When a line shows...', needs: ['line'], role: 'cond' },
    { key: 'whenSpawn', label: 'When a mob appears...', needs: ['actor'], role: 'cond' },
    { key: 'healthAt', label: 'When its health drops to...', needs: ['pct'], role: 'cond' },
    { key: 'whenDies', label: 'When it dies', needs: [], role: 'cond' },
    { key: 'caught', label: 'From what happened in a fight...', needs: ['caught'], role: 'cond' }
  ];
  O.PALETTE = [
    { key: 'campSpot', label: 'Camp spot', role: 'move', make: function () { return { 'do': 'campSpot', op: 'setLoc', forwho: 'all', loc: [0, 0, 0] }; } },
    { key: 'castAbility', label: 'Cast', role: 'action', make: function () { return { 'do': 'castAbility', forwho: 'all', ability: '' }; } },
    { key: 'announce', label: 'Note in every console', role: 'action', make: function () { return { 'do': 'announce', console: true, message: '' }; } },
    { key: 'actorInteract', label: 'Click / use', role: 'action', make: function () { return { 'do': 'actorInteract', op: 'doubleClick', name: '' }; } },
    { key: 'wait', label: 'Wait', role: 'cond', make: function () { return { wait: 'ms', limitMs: 2000, onTimeout: 'proceed' }; } },
    { key: 'forEach', label: 'For each', role: 'loop', make: function () { return { forEach: { find: { query: 'Name==""' }, as: 'it', max: 1 }, steps: [] }; } },
    { key: 'setVar', label: 'Set a variable', role: 'state', make: function () { return { 'do': 'setVar', scope: 'encounter', name: '', value: '' }; } },
    { key: 'ogreBotUIOption', label: 'Bot option', role: 'state', make: function () { return { 'do': 'ogreBotUIOption', forwho: 'all', id: '', value: 'TRUE' }; } },
    { key: 'flagToon', label: 'Give a flag', role: 'state', make: function () { return { 'do': 'flagToon', op: 'set', forwho: 'all', flag: 1 }; } },
    { key: 'repeat', label: 'Repeat until', role: 'loop', make: function () { return { repeat: { until: [], max: 10 }, steps: [] }; } },
    { key: 'groupQuery', label: 'Ask the group', role: 'state', make: function () { return { 'do': 'groupQuery', 'var': 'q', question: 'abilityReady', ability: '', sendTo: 'igw:{{me}}', limitMs: 3000 }; } },
    { key: 'aeblock', label: 'AE block (wait for one)', role: 'loop', make: function () { return O.aeBlock(); } },
    { key: 'stop', label: 'Stop here', role: 'alt', make: function () { return { 'do': 'stop', when: [] }; } }
  ];
  O.paletteItem = function (key) { for (var i = 0; i < O.PALETTE.length; i++) if (O.PALETTE[i].key === key) return O.PALETTE[i]; return null; };
  O.newTrigger = function () { return { on: 'text', match: { mode: 'substring', needle: '' }, allowConcurrentRuns: false, 'do': [] }; };
})(typeof window !== 'undefined' ? window : this);
