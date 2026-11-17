/* Open IC Creator - ic-flow.js
   An ISXJQB instance file as a flowchart graph (IC.icflow): sections, folded waypoint runs, IF / WHILE branches and
   fight rules, plus the moves a flowchart makes on the file.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var G = IC.icflow = IC.icflow || {};
  function R() { return IC.reg; }
  function M() { return IC.model; }
  function str(v) { return v == null ? '' : String(v); }
  G.open = G.open || {};

  var STATE_RE = /ChangeOgreBotUIOption|AbilityTag|ChangeLootOptions|AutoTarget_Set|SetScanRadius|-Pause\b|-Resume\b|-HoldUp\b|-NoTarget\b|-PetOff\b|-PetOn\b|-LetsGo\b|-Ofol\b|-ChangeBeltAdorn|declarevariable|:Set\[/i;
  var MOVE_RE = /ChangeCampSpotWho|-ccsfw\b|-CampSpot\b|-SetCS_|\bogre nav\b|jb mm\b|jb nav\b|-FlyUp\b|-FlyDown\b|-FlyStop\b|-Jump\b/i;
  G.roleOf = function (e, s, active) {
    var t = str(s && s.type);
    if (!active) return 'alt';
    if (t === 'WIPE_RECOVERY' || t === 'SHUTDOWN') return 'alt';
    if (t === 'IF' || t === 'ON_EVENT' || t === 'PHASE') return 'cond';
    if (t === 'WHILE' || t === 'LOOP') return 'loop';
    if (t === 'COMMENT' || t === 'MSGBOX' || t === 'NATIVE_ANNOUNCE' || t === 'NATIVE_NOTE') return 'note';
    if (t === 'SETVAR' || t === 'REG') return 'state';
    if (s && s.cat === 'group') return 'state';
    if (s && s.cat === 'move') return 'move';
    if (s && s.cat === 'wait') return 'cond';
    if (t === 'OC' || t === 'CMD' || t === 'SCRIPT') {
      var d = str(e && e.data);
      if (MOVE_RE.test(d)) return 'move';
      if (STATE_RE.test(d)) return 'state';
    }
    return 'action';
  };
  function isSmall(e, s) {
    var t = str(s && s.type);
    if (t === 'WAIT') return true;
    if (t === 'COMMENT' && !/^\s*===/.test(str(e.data))) return true;
    return false;
  }
  function subOf(e, s) {
    var raw = str(e.raw).trim();
    if (!raw) return '';
    if (/^(WAYPOINT|CAMPSPOT|TARGET|CLEARAREA|COMBAT|OC:|CMD:|WAIT \d|CLICK |APPLYVERB|MOVETOACTOR|log$|control flow|kill trash|campspot arrival)/i.test(raw)) return '';
    if (raw === str(e.data).trim()) return '';
    if (IC.words && IC.words.devNote(raw)) return '';
    return raw;
  }
  function tagsOf(e, s) {
    var out = [], t = str(s.type), m = str(e.mode).toLowerCase();
    if (t === 'WAYPOINT') {
      if (m === 'ogrenav') out.push({ t: 'mesh, group follows', role: 'move' });
      else if (m === 'quick') out.push({ t: 'passing through', role: 'move' });
    }
    if (t === 'CAMPSPOT_WHO') out.push({ t: 'split: ' + str(R().U.who(e.who, R().WHO_OGRE)), role: 'move' });
    if (t === 'OC' && /ChangeCampSpotWho/i.test(str(e.data))) out.push({ t: 'split', role: 'move' });
    if (e.verb) out.push({ t: 'verb: ' + e.verb, role: 'action' });
    if (t === 'APPLYVERB') { var p = str(e.data).split('|'); if (p[1]) out.push({ t: 'verb: ' + p[1], role: 'action' }); }
    if (t === 'CAST' && e.who && e.who !== 'all') out.push({ t: str(R().U.who(e.who)), role: 'action' });
    if (e.group) out.push({ t: 'skip-group ' + e.group, role: 'state' });
    if (e.phase === 'outside') out.push({ t: 'only from outside', role: 'cond' });
    return out;
  }

  function abilOf(e, t) {
    if (t === 'CAST') return str(e.ability || e.data);
    if (t === 'PREBUFF' && e.ability && e.ability !== 'blockers') return str(e.ability);
    if ((t === 'OC' || t === 'CMD') && IC.words) return IC.words.abilityOf(e.data);
    return '';
  }
  function iconsOf(n, e, t) {
    var I = IC.icons, Wd = IC.words, g = null;
    n.giKind = I.forStep(e, t, n.role);
    n.item = (t === 'OC' || t === 'CMD') && I.itemOfLine ? I.itemOfLine(e.data) : '';
    if (n.abil && I.forAbil) g = I.forAbil(n.abil);
    if (!g && n.item && I.forItem) g = I.forItem(n.item);
    if (t === 'ON_EVENT') {
      var tt = I.trig ? I.trig(e.trigger_type) : str(e.trigger_type), pat = str(e.pattern || e.trigger_pattern).trim(), dp = tt === 'debuff' && I.detPair ? I.detPair(pat) : null;
      if (dp) n.giKind = g = dp;
      else if (tt === 'cast' && pat) {
        n.npc = /^\d+$/.test(pat) ? (Wd && Wd.abilNames && Wd.abilNames[pat]) || '' : pat;
        g = n.npc && I.forNpcSpell ? I.forNpcSpell(n.npc) : null;
      }
    }
    var who = g && g.cls ? g : null;
    if (who) g = null;
    n.gi = g || n.giKind;
    n.need = I.needs && I.icNames && !I.off ? I.needs(I.icNames(e, t), 4) : [];
    if (!I.off && I.withWho) {
      n.need = I.withWho(n.need, e.forwho || e.who || e.for_who || '', '', 4);
      if (who && !(n.need[0] && n.need[0].cls)) n.need = [who].concat(n.need).slice(0, 4);
    }
  }
  function titleOf(e, t) {
    var Wd = IC.words, w;
    if (!Wd) return R().labelFor(e);
    if (t === 'OC' || t === 'CMD' || t === 'SCRIPT') { w = Wd.ogre(e.data); if (w) return w; }
    if (t === 'COMMENT') { w = Wd.note(e.data); if (w) return w; }
    var lab = str(R().labelFor(e)).replace(/\s{2,}/g, ' ');
    if (/^\s*===/.test(lab)) { w = Wd.note(lab); if (w) return w; }
    lab = lab.replace(/\boc\s+!ci?\s+.*$/i, function (x) { var o = Wd.ogre(x); return o ? o.charAt(0).toLowerCase() + o.slice(1) : x; });
    if (t === 'ON_EVENT') {
      lab = lab.replace(/detriment (\d+) \/ (\d+)/g, function (x, a, b) { return Wd.det(a, b).replace(/^the /, ''); })
        .replace(/casts (\d{5,})/g, function (x, id) { return 'casts ' + Wd.abil('', id); });
    }
    if ((t === 'IF' || t === 'WHILE') && /\$\{/.test(lab)) {
      lab = lab.replace(/(NOT )?(\$\{.*\})\s*$/, function (x, not, ex) { return Wd.ls((not ? '!' : '') + ex); });
    }
    return /\$\{/.test(lab) ? Wd.val(lab) : lab;
  }

  function ctx() { var s = M().st; return { fmt: M().rtFmt(), diff: s.diff, showInactive: s.showInactive }; }
  function nodeOf(e, path, idx, o) {
    var s = R().forEntry(e), fmt = M().rtFmt(), active = R().typeActive(s, fmt);
    var probs = (IC.val && IC.val.step) ? IC.val.step(e, o.ctx, o.prev || []) : [], err = 0, warn = 0;
    for (var i = 0; i < probs.length; i++) { if (probs[i].level === 'error') err++; else if (probs[i].level === 'warn') warn++; }
    var ps = M().pathStr(path), sel = M().samePath(path, M().st.sel);
    var n = { t: 'n', id: 'p' + ps, ref: ps, ix: idx, iy: idx, role: G.roleOf(e, s, active), icon: s.icon,
      title: titleOf(e, str(s.type)), sub: subOf(e, s), tags: tagsOf(e, s), sel: sel, err: err > 0, warn: warn > 0, dead: !active,
      small: isSmall(e, s), type: str(s.type), abil: abilOf(e, str(s.type)) };
    if (IC.icons) iconsOf(n, e, str(s.type));
    if (!active) n.tags.unshift({ t: 'not run', role: 'alt' });
    if (o.problems && (err || warn)) o.problems.push({ ref: ps, level: err ? 'error' : 'warn', msg: (probs[0] && probs[0].msg) || '', title: n.title });
    if (o.hit && o.hit(e, n)) { n.tags.unshift({ t: 'match', role: 'cond' }); o.hits.push(n.id); }
    return n;
  }
  function selInside(path) {
    var sel = M().st.sel;
    if (!sel || sel.length < path.length) return false;
    for (var i = 0; i < path.length; i++) if (sel[i] !== path[i]) return false;
    return true;
  }
  function walk(arr, base, o, from, to) {
    var items = [], i = from || 0, fmt = M().rtFmt(), stop = to == null ? arr.length : Math.min(arr.length, to + 1);
    arr = arr.slice(0, stop);
    while (i < arr.length) {
      var e = arr[i], s = R().forEntry(e), path = base.concat([i]);
      if (!R().typeActive(s, fmt) && !M().st.showInactive && !o.showDead) { i++; continue; }
      if (str(s.type) === 'WAYPOINT') {
        var j = i, mode = str(e.mode);
        while (j < arr.length && str(arr[j] && arr[j].type) === 'WAYPOINT' && str(arr[j].mode) === mode) j++;
        if (j - i >= 3) {
          var key = 'run:' + M().pathStr(path), inSel = false;
          for (var q = i; q < j; q++) if (selInside(base.concat([q]))) inSel = true;
          var open = G.open.hasOwnProperty(key) ? G.open[key] : false;
          if (inSel && o.reveal) open = G.open[key] = true;
          var first = nodeOf(e, path, i, o);
          var head = { t: 'n', id: 'r' + M().pathStr(path), ref: M().pathStr(path), span: j - i, ix: i, iy: j - 1, role: 'move', icon: s.icon,
            title: 'Move the group along ' + (j - i) + ' points', sub: 'to ' + R().U.pos(arr[j - 1].data),
            tags: mode === 'ogrenav' ? [{ t: 'mesh, group follows', role: 'move' }] : (mode === 'quick' ? [{ t: 'passing through', role: 'move' }] : []),
            tog: { key: key, open: open, count: j - i }, sel: inSel && !open, dead: first.dead, gi: IC.icons ? IC.icons.forIcBox('run', 'move') : null };
          if (!open) { items.push(head); i = j; continue; }
          var inner = [];
          for (var w = i; w < j; w++) inner.push(nodeOf(arr[w], base.concat([w]), w, o));
          items.push({ t: 'grp', id: 'g' + head.id, node: head, open: true, items: inner, seq: o.seqOf(base), ix: i, iy: j - 1 });
          i = j;
          continue;
        }
      }
      o.prev = arr.slice(0, i);
      var n = nodeOf(e, path, i, o), t = str(s.type), ps = M().pathStr(path);
      if (t === 'IF') {
        items.push({ t: 'if', id: 'i' + ps, ix: i, iy: i, node: n,
          yes: { label: 'then', role: 'cond', seq: { p: ps, k: 'sub_steps' }, items: walk(e.sub_steps || [], path.concat(['sub_steps']), o) },
          no: { label: 'otherwise', role: 'alt', seq: { p: ps, k: 'else_steps' }, items: walk(e.else_steps || [], path.concat(['else_steps']), o) } });
      } else if (t === 'WHILE' || t === 'LOOP') {
        n.sub = n.sub || (e.max_iterations ? 'at most ' + e.max_iterations + ' rounds' : 'stops after ' + (e.timeout || '600') + ' s');
        items.push({ t: 'loop', id: 'l' + ps, ix: i, iy: i, node: n, doneLabel: 'done',
          body: { label: 'repeat', seq: { p: ps, k: 'sub_steps' }, items: walk(e.sub_steps || [], path.concat(['sub_steps']), o) } });
      } else if (t === 'ON_EVENT') {
        items.push({ t: 'if', id: 'w' + ps, ix: i, iy: i, node: n, pass: 'goes on',
          yes: { label: 'then do', role: 'cond', seq: { p: ps, k: 'sub_steps' }, items: walk(e.sub_steps || [], path.concat(['sub_steps']), o) }, no: null });
      } else if (Array.isArray(e.fight_rules) && e.fight_rules.length) {
        var rk = 'rules:' + ps, ro = G.open.hasOwnProperty(rk) ? G.open[rk] : false;
        if (o.reveal && selInside(path.concat(['fight_rules']))) ro = G.open[rk] = true;
        n.tog = { key: rk, open: ro, count: e.fight_rules.length };
        n.tags.push({ t: e.fight_rules.length + ' fight rule' + (e.fight_rules.length === 1 ? '' : 's'), role: 'cond' });
        if (!ro) items.push(n);
        else items.push({ t: 'grp', id: 'f' + ps, ix: i, iy: i, node: n, open: true, seq: { p: ps, k: 'fight_rules' },
          items: walk(e.fight_rules, path.concat(['fight_rules']), o) });
      } else items.push(n);
      i++;
    }
    return items;
  }

  function norm(s) { return str(s).replace(/^\s*Boss\s+\d+\s*[-:]\s*/i, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function clean(s) { return str(s).replace(/^\s*Boss\s+\d+\s*[-:]\s*/i, '').trim() || '?'; }
  G.sections = function (L) {
    var out = [], cur = null, n = 0;
    function start(i, name, kind) {
      if (cur) { cur.end = i - 1; out.push(cur); }
      if (kind === 'boss') n++;
      cur = { kind: kind, label: kind === 'boss' ? 'Boss ' + n + ': ' + clean(name) : clean(name), start: i, end: i, norm: norm(name) };
    }
    for (var i = 0; i < L.length; i++) {
      var e = L[i], s = R().forEntry(e), name = null, kind = 'boss';
      if (s.section === 'anchor') name = s.tpl ? e.boss : (e.boss || e.data);
      else if (s.section === true) {
        var nm = norm(e.data || e.target);
        if (!cur || cur.kind !== 'boss' || (nm && cur.norm && nm !== cur.norm)) name = e.data || e.target;
      } else if (s.section === 'label' && /^\s*===/.test(str(e.data))) {
        if (n > 0 && /\b(clean ?up|exit|zone ?out|leave|leaving)\b/i.test(str(e.data))) { name = str(e.data).replace(/=+/g, '').trim(); kind = 'exit'; }
        else {
          var took = -1;
          for (var k = i + 1; k < L.length && k <= i + 3; k++) {
            var sk = R().forEntry(L[k]);
            if (sk.section === 'anchor') { took = k; break; }
            if (sk.section === true || (sk.section === 'label' && /^\s*===/.test(str(L[k].data)))) break;
          }
          if (took >= 0) {
            var sa = R().forEntry(L[took]);
            start(i, sa.tpl ? L[took].boss : (L[took].boss || L[took].data), 'boss');
            i = took;
            continue;
          }
        }
      }
      if (name !== null) start(i, name, kind);
      else if (!cur) cur = { kind: 'setup', label: 'Setup & zone-in', start: i, end: i };
    }
    if (cur) { cur.end = L.length - 1; out.push(cur); }
    return out;
  };

  G.graph = function (opts) {
    opts = opts || {};
    var st = M().st, L = M().list(), d = st.doc || {};
    var o = { ctx: ctx(), problems: [], hits: [], reveal: !!opts.reveal, showDead: !!opts.showDead,
      seqOf: function (base) { return base.length ? { p: M().pathStr(base.slice(0, base.length - 1)), k: base[base.length - 1] } : { p: '', k: '' }; } };
    var q = str(opts.find).trim().toLowerCase();
    if (q) o.hit = function (e, n) { return (n.title + ' ' + str(e.data) + ' ' + str(e.raw) + ' ' + str(e.target)).toLowerCase().indexOf(q) >= 0; };
    var zone = M().zoneName ? M().zoneName() : str(d.zone);
    var lane = { id: 'ic', title: zone || 'New instance file', sub: (st.path || 'not saved yet') + (st.fmt !== 'v2' ? '  (' + st.fmt + ')' : ''),
      role: 'start', items: [] };
    if (!M().editable()) {
      lane.items.push({ t: 'n', id: 'x', role: 'note', gi: IC.icons ? IC.icons.mk('note', 'note') : null, title: st.fmt === 'wrapper' ? 'A difficulty wrapper: its steps come from ' + str(d.base_file) : 'Not an instance file', fixed: true });
      return { lanes: [lane], links: [], problems: [], hits: [] };
    }
    var secs = G.sections(L), big = L.length > 40, parts = [], split = null;
    if (secs.length <= 1) {
      lane.seq = { p: '', k: '' };
      lane.items = walk(L, [], o);
    } else {
      lane.seq = null;
      for (var i = 0; i < secs.length; i++) {
        var S = secs[i], key = 'sec:' + S.start, has = false;
        for (var j = S.start; j <= S.end; j++) if (selInside([j])) has = true;
        var open = G.open.hasOwnProperty(key) ? G.open[key] : (!big || i === 0 || has);
        if (has && opts.reveal) open = G.open[key] = true;
        var cnt = S.end - S.start + 1;
        var head = { t: 'n', id: 's' + S.start, ref: M().pathStr([S.start]), ix: S.start, iy: S.end, span: cnt,
          role: S.kind === 'boss' ? 'sec' : (S.kind === 'exit' ? 'end' : 'start'),
          icon: S.kind === 'boss' ? '&#9876;' : (S.kind === 'exit' ? '&#128682;' : '&#128295;'),
          title: S.label, sub: cnt + ' step' + (cnt === 1 ? '' : 's'), tog: { key: key, open: open, count: cnt }, sel: has && !open,
          gi: IC.icons ? IC.icons.forIcBox(S.kind, S.kind === 'boss' ? 'sec' : 'start') : null };
        var pk = 'S' + i;
        parts.push({ key: pk, title: S.label, role: head.role, gi: head.gi, count: cnt, tog: key, folded: !open });
        if (!open) { head.part = pk; lane.items.push(head); continue; }
        var part = walk(L, [], o, S.start, S.end);
        lane.items.push({ t: 'grp', id: 'G' + S.start, ix: S.start, iy: S.end, node: head, open: true, seq: { p: '', k: '' }, items: part, part: pk });
      }
      if (opts.split) {
        var o2 = { ctx: o.ctx, problems: [], hits: [], reveal: o.reveal, showDead: o.showDead, seqOf: o.seqOf, hit: o.hit };
        split = [];
        for (var si = 0; si < secs.length; si++) {
          var S2 = secs[si], c2 = S2.end - S2.start + 1;
          split.push({ id: 'S' + si, key: 'S' + si, title: S2.label, sub: c2 + ' step' + (c2 === 1 ? '' : 's'), role: parts[si].role, gi: parts[si].gi,
            seq: { p: '', k: '' }, items: walk(L, [], o2, S2.start, S2.end) });
        }
      }
    }
    lane.items.unshift({ t: 'n', id: 'start', role: 'start', icon: '&#9679;', fixed: true, noActs: true, noSlot: true, ix: 0, iy: -1,
      gi: IC.icons ? IC.icons.forIcBox('start', 'start') : null, title: 'Start' + (zone ? ': ' + zone : ''), sub: [str(d.difficulty).replace(/^./, function (c) { return c.toUpperCase(); }), d.outside_zone ? 'from ' + d.outside_zone : ''].filter(Boolean).join(', '), small: false });
    lane.items.push({ t: 'n', id: 'end', role: 'end', icon: '&#9632;', fixed: true, noActs: true, noSlotAfter: true, ix: L.length, iy: L.length - 1,
      gi: IC.icons ? IC.icons.forIcBox('end', 'end') : null,
      title: 'Done', small: true });
    return { lanes: [lane], links: [], problems: o.problems, hits: o.hits, parts: parts, split: split, chain: true };
  };

  G.listOf = function (seq) {
    if (!seq) return null;
    if (seq.p === '' && seq.k === '') return M().list();
    var host = M().get(M().pathParse(seq.p));
    if (!host || typeof host !== 'object') return null;
    if (!Array.isArray(host[seq.k])) host[seq.k] = [];
    return host[seq.k];
  };
  G.onlyFor = function (seq) {
    if (!seq || (seq.p === '' && seq.k === '')) return null;
    return R().onlyFor(M().get(M().pathParse(seq.p)), seq.k);
  };
  G.target = function (seq, idx) {
    if (!seq || (seq.p === '' && seq.k === '')) return { after: [idx - 1] };
    return { into: M().pathParse(seq.p), key: seq.k, index: idx };
  };
  G.move = function (ref, span, seq, idx) {
    var p = M().pathParse(ref), from = M().parent(p);
    if (!from || !from.arr[from.idx]) return 'That step is gone.';
    span = Math.max(1, Math.min(span || 1, from.arr.length - from.idx));
    var dest = G.listOf(seq);
    if (!dest) return 'Cannot drop there.';
    var moving = from.arr.slice(from.idx, from.idx + span);
    var dp = seq.p === '' ? [] : M().pathParse(seq.p);
    if (dp.length) {
      var pre = p.slice(0, p.length - 1);
      var same = dp.length >= p.length;
      for (var a = 0; same && a < pre.length; a++) if (dp[a] !== pre[a]) same = false;
      if (same) { var di = dp[p.length - 1]; if (di >= from.idx && di < from.idx + span) return 'A step cannot go inside itself.'; }
    }
    var only = G.onlyFor(seq);
    if (only) {
      for (var m = 0; m < moving.length; m++) {
        var t = str(R().forEntry(moving[m]).type);
        if (only.indexOf(t) < 0) return '"' + R().forEntry(moving[m]).name + '" cannot run there (that list takes: ' + only.join(', ') + ').';
      }
    } else {
      for (var f = 0; f < moving.length; f++) if (R().forEntry(moving[f]).fightOnly) return '"' + R().forEntry(moving[f]).name + '" only runs inside a fight rule.';
    }
    if (dest === from.arr) {
      if (idx >= from.idx && idx <= from.idx + span) return '';
      if (idx > from.idx + span) idx -= span;
    }
    from.arr.splice(from.idx, span);
    for (var k = 0; k < moving.length; k++) dest.splice(idx + k, 0, moving[k]);
    var found = null;
    M().each(function (e, path) { if (!found && e === moving[0]) found = path; });
    if (found) M().select(found);
    return '';
  };
  G.removeSpan = function (ref, span) {
    var p = M().pathParse(ref), pr = M().parent(p);
    if (!pr) return false;
    pr.arr.splice(pr.idx, Math.max(1, span || 1));
    var n = pr.arr.length;
    M().select(n ? p.slice(0, p.length - 1).concat([Math.min(pr.idx, n - 1)]) : (p.length > 1 ? p.slice(0, p.length - 2) : null));
    return true;
  };

  G.PALETTE = [
    { key: 'T:WAYPOINT', label: 'Move group (mesh)', role: 'move', icon: '&#10148;', make: function () { return { type: 'WAYPOINT', data: '', mode: 'ogrenav' }; } },
    { key: 'T:CAMPSPOT', label: 'Hold a spot', role: 'move', icon: '&#128205;' },
    { key: 'T:CAMPSPOT_WHO', label: 'Split the group', role: 'move', icon: '&#128101;', more: true },
    { key: 'tpl:boss', label: 'Fight a named', role: 'sec', icon: '&#9876;' },
    { key: 'tpl:trash', label: 'Clear a room', role: 'action', icon: '&#128481;' },
    { key: 'T:CLICK', label: 'Click', role: 'action', icon: '&#128433;' },
    { key: 'T:APPLYVERB', label: 'Use a verb', role: 'action', icon: '&#128073;', more: true },
    { key: 'T:WAITGROUP', label: 'Wait for group', role: 'cond', icon: '&#9203;', more: true },
    { key: 'T:CHEST', label: 'Loot', role: 'action', icon: '&#127873;' },
    { key: 'T:WAIT', label: 'Wait', role: 'cond', icon: '&#9202;', ik: 'wait', tip: 'Wait a number of seconds (0.5 = half a second, 0 = no wait)' },
    { key: 'snip:gate', label: 'Open a gate', role: 'action', icon: '&#128682;', ik: 'click', tip: 'Walk to a gate, click its lever, wait for it to swing, walk past it' },
    { key: 'precast', label: 'Pre-cast (20 s)', role: 'state', icon: '&#9733;', more: true, make: function () { return { type: 'PREBUFF', data: 'precasttag' }; } },
    { key: 'aeblock', label: 'AE block', role: 'action', icon: '&#128737;', make: function () { return G.aeBlockSteps(); } },
    { key: 'T:EVAC', label: 'Evac', role: 'alt', icon: '&#128640;', more: true },
    { key: 'T:IF', label: 'Only if', role: 'cond', icon: '&#10067;', more: true },
    { key: 'T:WHILE', label: 'Repeat while', role: 'loop', icon: '&#128260;', more: true },
    { key: 'loopcombat', label: 'Loop while in combat', role: 'loop', icon: '&#8635;', more: true, make: function () {
      return { type: 'WHILE', data: '', condition: 'in_combat', condition_value: '', sub_steps: [], timeout: '600' }; } },
    { key: 'catch', label: 'From fights...', role: 'cond', icon: '&#128269;' },
    { key: 'tpl:door', label: 'Leave by the door', role: 'end', icon: '&#128682;', more: true, ik: 'door', tip: 'Walk to the exit, use it, wait for the zone change' },
    { key: 'tpl:teleporter', label: 'Teleporter', role: 'move', icon: '&#10024;', more: true, ik: 'door', tip: 'Walk next to it, use it, wait a moment' },
    { key: 'T:HAIL', label: 'Hail', role: 'action', icon: '&#128075;', more: true, ik: 'hail', tip: 'Hail an NPC' },
    { key: 'T:CAST', label: 'Cast', role: 'action', icon: '&#10024;', more: true, ik: 'cast', tip: 'Cast an ability: pick it from the list, each with its icon' },
    { key: 'import', label: 'Import...', role: 'start', icon: '&#128229;', ik: 'bag', tip: 'Bring in steps: a ready-made snippet, an OgreBot zone file\'s nameds, another instance file\'s sections' }
  ];
  G.paletteItem = function (key) { for (var i = 0; i < G.PALETTE.length; i++) if (G.PALETTE[i].key === key) return G.PALETTE[i]; return null; };
  G.palIcons = function () {
    var I = IC.icons;
    if (!I || !I.forPalette || !I.mk || I.forPalette._ik) return;
    var base = I.forPalette;
    I.forPalette = function (key, role) {
      var r = base(key, role), it = G.paletteItem(key);
      return it && it.ik && (!r || (I.K && r.id === I.K.note)) ? (I.mk(it.ik, role) || r) : r;
    };
    I.forPalette._ik = true;
  };
  G.palIcons();
  G.aeBlockSteps = function () {
    var L = (IC.words && IC.words.AE_BLOCKERS) || [], top = null, cur = null;
    for (var i = 0; i < L.length; i++) {
      if (!L[i].chain) continue;
      var st = { type: 'IF', data: '', condition: 'group_has_class', condition_value: L[i].classes.join(','),
        sub_steps: [{ type: 'CAST', who: 'igw:${Me.Name}+' + L[i].cls, ability: L[i].name, action: 'nochecks' }] };
      if (cur) cur.else_steps = [st]; else top = st;
      cur = st;
    }
    return top;
  };
})(typeof window !== 'undefined' ? window : this);
