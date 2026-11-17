/* Open IC Creator - ic-flowview.js
   Flowchart engine (IC.fv): lays out a graph of lanes and items (node, if, loop, group) as HTML boxes and one SVG of
   lines, and edits it by click and by drag and drop; zoom, parts and views. See docs/developer.md for the graph format.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var F = IC.fv = IC.fv || {};

  F.ROLES = {
    action: { c: '#4a90e2', name: 'Actions / commands', g: '&#9654;' },
    move:   { c: '#2fd6c3', name: 'Movement', g: '&#10148;' },
    cond:   { c: '#f2c94c', name: 'Conditions / whens', g: '&#9670;' },
    loop:   { c: '#3fbf6f', name: 'Loops / repeats', g: '&#8635;' },
    alt:    { c: '#e05a5a', name: 'Failure / stop / else', g: '&#10006;' },
    state:  { c: '#b388ff', name: 'Variables / state', g: '&#9673;' },
    start:  { c: '#9fb2c8', name: 'Start / end', g: '&#9679;' },
    end:    { c: '#9fb2c8', name: '', g: '&#9632;' },
    sec:    { c: '#e0b050', name: 'Sections', g: '&#9876;' },
    note:   { c: '#6f7a88', name: 'Notes', g: '&#8226;' }
  };
  F.LEGEND = ['action', 'move', 'cond', 'loop', 'alt', 'state', 'note'];
  function role(r) { return F.ROLES[r] || F.ROLES.action; }

  var NW = 236, GY = 26, GX = 34, IND = 30, GUT = 14, LANE_GAP = 54, ROW_GAP = 64, PAD = 24;
  var TCH = 31, SCH = 37, TW = 27;
  var CW = NW + 24, FAR = 0.5;
  var CMP = false;
  var NOAB = false;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function cut(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '...' : s; }
  function wrap(s, n, lines) {
    var words = String(s == null ? '' : s).replace(/\s+/g, ' ').trim().split(' '), out = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (!w) continue;
      if (!cur) cur = w;
      else if ((cur + ' ' + w).length <= n) cur += ' ' + w;
      else { out.push(cur); cur = w; }
      if (out.length === lines) break;
    }
    if (cur && out.length < lines) out.push(cur);
    if (out.length === lines && words.join(' ').length > out.join(' ').length) out[lines - 1] = cut(out[lines - 1] + ' ...', n);
    for (var j = 0; j < out.length; j++) out[j] = cut(out[j], n);
    return out;
  }
  function toks(s, list) {
    return String(s == null ? '' : s).replace(/ ?\[det:(\d+)(?:\/(\d+))?\]/g, function (x, id, bk) { list.push({ id: +id, back: bk ? +bk : -1 }); return ' \u0001'; });
  }
  function rich(s, list, opts) {
    return esc(s).replace(/\u0001/g, function () {
      var d = list.shift(), ic = d && opts.iconById ? opts.iconById(d.id, d.back) : '';
      return ic ? '<span class="fv-det">' + ic + '</span>' : (d ? '(icon ' + d.id + ')' : '');
    });
  }
  function richT(s, n, opts) { var l = []; return rich(cut(toks(s, l), n), l, opts); }
  function plainT(s) { return String(s == null ? '' : s).replace(/ ?\[det:\d+(?:\/\d+)?\]/g, ''); }
  function needOf(n, off) { return !off && !n.small && !n._cmp && n.need && n.need.length ? n.need : null; }
  function nodeSize(n) {
    n._tt = []; n._title = toks(n.title, n._tt); n._st = []; n._cmp = CMP && !n.card;
    if (n.small) { n._tl = [cut(n._title, 40)]; return { w: NW, h: 22 }; }
    if (n._cmp) { n._tl = [cut(n._title, TW - 2)]; n._sub = []; return { w: NW, h: 24 }; }
    if (n.card) {
      n._tl = n._title.length > TW + 3 ? wrap(n._title, TW + 3, 2) : [n._title];
      n._sub = n.sub ? [cut(n.sub, SCH + 4)] : [];
      return { w: CW, h: 34 + (n._tl.length - 1) * 17 + n._sub.length * 14 + (n.strip && n.strip.length ? 26 : 0) };
    }
    var tw = TW - 2 * n._tt.length;
    n._tl = n._title.length > tw ? wrap(n._title, tw, 2) : [n._title];
    var sub = n.sub ? wrap(toks(n.sub, n._st), SCH, 2) : [];
    n._sub = sub;
    return { w: NW, h: 28 + (n._tl.length - 1) * 16 + sub.length * 14 + ((n.tags && n.tags.length) || needOf(n, NOAB) ? 17 : 0) };
  }

  function slotIdx(items, k) {
    if (k < items.length) return items[k].ix != null ? items[k].ix : k;
    var last = items[items.length - 1];
    return last && last.iy != null ? last.iy + 1 : items.length;
  }
  function region(O, n0, key, n) {
    var x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
    for (var i = n0; i < O.nodes.length; i++) {
      var p = O.nodes[i];
      if (p.x < x1) x1 = p.x;
      if (p.y < y1) y1 = p.y;
      if (p.x + p.w > x2) x2 = p.x + p.w;
      if (p.y + p.h > y2) y2 = p.y + p.h;
    }
    if (x2 > x1) O.regions.push({ key: String(key), x: x1 - 10, y: y1 - 10, w: x2 - x1 + 20, h: y2 - y1 + 20, title: String(n.partTitle || n.title || ''), role: n.role || 'sec' });
  }
  function laneKey(ln, i) { return String(ln.key != null ? ln.key : (ln.id != null ? ln.id : 'lane' + i)); }
  function laneTitle(ln, i) {
    var f = (ln.items || [])[0];
    return String(ln.partTitle || (ln.head && f && f.title) || ln.title || ('Part ' + (i + 1)));
  }
  function seqBox(items, seq) {
    var boxes = [], L = 30, R = 30, h = 0, i;
    for (i = 0; i < items.length; i++) {
      var b = itemBox(items[i]);
      boxes.push(b);
      if (b.L > L) L = b.L;
      if (b.R > R) R = b.R;
      h += b.h;
    }
    h += GY * (boxes.length + 1);
    if (!boxes.length) h = GY + 8;
    return {
      L: L, R: R, h: h,
      place: function (ax, y, O, from) {
        var cy = y, prev = from, k, slots = seq != null;
        if (!boxes.length) {
          if (slots) O.ins.push({ x: ax, y: y + (GY + 8) / 2, seq: seq, idx: 0, empty: true });
          if (prev) O.edges.push({ pts: [[prev[0], prev[1]], [ax, y + GY + 8]], role: 'line' });
          return { inX: ax, inY: y, outX: ax, outY: y + GY + 8 };
        }
        for (k = 0; k < boxes.length; k++) {
          var top = cy + GY;
          if (prev) {
            O.edges.push({ pts: elbow(prev[0], prev[1], ax, top), role: 'line', arrow: true });
          }
          if (slots && !items[k].noSlot) O.ins.push({ x: ax, y: cy + GY / 2, seq: seq, idx: slotIdx(items, k) });
          var n0 = O.nodes.length, r = boxes[k].place(ax, top, O);
          if (items[k].part != null) region(O, n0, items[k].part, items[k].node || items[k]);
          cy = top + boxes[k].h;
          prev = r.outY === null ? null : [r.outX, r.outY];
        }
        if (slots && !items[boxes.length - 1].noSlotAfter) O.ins.push({ x: ax, y: cy + GY / 2, seq: seq, idx: slotIdx(items, boxes.length) });
        if (prev) O.edges.push({ pts: [[prev[0], prev[1]], [ax, cy + GY]], role: 'line' });
        return { inX: ax, inY: y, outX: ax, outY: cy + GY };
      }
    };
  }
  function elbow(x1, y1, x2, y2) {
    if (Math.abs(x1 - x2) < 0.5) return [[x1, y1], [x2, y2]];
    var my = y1 + Math.max(6, (y2 - y1) / 2);
    return [[x1, y1], [x1, my], [x2, my], [x2, y2]];
  }
  function nodeBox(n) {
    var s = nodeSize(n);
    return {
      L: s.w / 2, R: s.w / 2, h: s.h,
      place: function (ax, y, O) {
        O.nodes.push({ n: n, x: ax - s.w / 2, y: y, w: s.w, h: s.h });
        if (n.stop) {
          var sy = y + s.h / 2;
          O.edges.push({ pts: [[ax + s.w / 2, sy], [ax + s.w / 2 + 26, sy]], role: 'alt', arrow: true });
          O.labels.push({ x: ax + s.w / 2 + 6, y: sy - 15, t: n.stop === true ? 'stop' : n.stop, role: 'alt' });
          return { inX: ax, inY: y, outX: ax, outY: y + s.h };
        }
        return { inX: ax, inY: y, outX: ax, outY: y + s.h };
      }
    };
  }
  function ifBox(it) {
    var nb = nodeBox(it.node), yes = seqBox(it.yes.items || [], it.yes.seq), no = it.no ? seqBox(it.no.items || [], it.no.seq) : null;
    var LBL = 20, MERGE = 18;
    var yAx = -(GX / 2 + yes.R), nAx = no ? (GX / 2 + no.L) : (GX / 2 + 30);
    var L = Math.max(nb.L, -yAx + yes.L), R = Math.max(nb.R, no ? nAx + no.R : nAx + 30);
    var bh = Math.max(yes.h, no ? no.h : 40);
    return {
      L: L, R: R, h: nb.h + LBL + bh + MERGE,
      place: function (ax, y, O) {
        var r = nb.place(ax, y, O), by = y + nb.h + LBL, my = by + bh + MERGE / 2;
        var ry = yes.place(ax + yAx, by, O, null);
        O.edges.push({ pts: [[ax, r.outY], [ax, r.outY + 8], [ax + yAx, r.outY + 8], [ax + yAx, by + GY]], role: 'cond', arrow: true });
        O.labels.push({ x: ax + yAx + 5, y: r.outY + 9, t: it.yes.label || 'yes', role: it.yes.role || 'cond' });
        if (ry.outY !== null) O.edges.push({ pts: [[ax + yAx, ry.outY], [ax + yAx, my], [ax, my]], role: 'line' });
        if (no) {
          var rn = no.place(ax + nAx, by, O, null);
          O.edges.push({ pts: [[ax, r.outY + 8], [ax + nAx, r.outY + 8], [ax + nAx, by + GY]], role: it.no.role || 'alt', arrow: true });
          O.labels.push({ x: ax + nAx + 5, y: r.outY + 9, t: it.no.label || 'no', role: it.no.role || 'alt' });
          if (rn.outY !== null) O.edges.push({ pts: [[ax + nAx, rn.outY], [ax + nAx, my], [ax, my]], role: 'line' });
        } else {
          O.edges.push({ pts: [[ax, r.outY + 8], [ax + nAx, r.outY + 8], [ax + nAx, my], [ax, my]], role: it.pass ? 'line' : 'alt' });
          O.labels.push({ x: ax + nAx + 5, y: r.outY + 9, t: it.pass || 'no', role: it.pass ? 'note' : 'alt' });
        }
        return { inX: ax, inY: y, outX: ax, outY: my };
      }
    };
  }
  function loopBox(it) {
    var nb = nodeBox(it.node), body = seqBox(it.body.items || [], it.body.seq);
    var g1 = nb.L + GUT, g2 = nb.L + GUT * 2;
    var L = Math.max(g2 + 4, body.L - IND), R = Math.max(nb.R, IND + body.R);
    return {
      L: L, R: R, h: nb.h + body.h + 30,
      place: function (ax, y, O) {
        var r = nb.place(ax, y, O), bx = ax + IND, by = y + nb.h + 6;
        O.edges.push({ pts: [[ax, r.outY], [ax, r.outY + 6], [bx, r.outY + 6], [bx, by + GY]], role: 'loop', arrow: true });
        O.labels.push({ x: bx + 5, y: r.outY + 7, t: it.body.label || 'repeat', role: 'loop' });
        var rb = body.place(bx, by, O, null), end = y + nb.h + body.h + 30, mid = y + nb.h / 2;
        if (rb.outY !== null) O.edges.push({ pts: [[bx, rb.outY], [bx, rb.outY + 6], [ax - g1, rb.outY + 6], [ax - g1, mid], [ax - nb.L, mid]], role: 'loop', arrow: true });
        O.edges.push({ pts: [[ax - nb.L, mid + 8], [ax - g2, mid + 8], [ax - g2, end - 4], [ax, end - 4], [ax, end]], role: 'line' });
        O.labels.push({ x: ax - g2 + 4, y: end - 19, t: it.doneLabel || 'done', role: 'start' });
        return { inX: ax, inY: y, outX: ax, outY: end };
      }
    };
  }
  function groupBox(it) {
    var nb = nodeBox(it.node);
    if (!it.open) return nb;
    var inner = seqBox(it.items || [], it.seq);
    return {
      L: Math.max(nb.L, inner.L + 12), R: Math.max(nb.R, inner.R), h: nb.h + inner.h,
      place: function (ax, y, O) {
        var r = nb.place(ax, y, O);
        var ri = inner.place(ax, r.outY, O, [ax, r.outY]);
        O.brackets.push({ x: ax - Math.max(nb.L, inner.L + 12) + 2, y1: y + nb.h / 2, y2: r.outY + inner.h - 6, role: it.node.role || 'sec' });
        return { inX: ax, inY: y, outX: ax, outY: ri.outY };
      }
    };
  }
  function itemBox(it) {
    if (!it) return nodeBox({ t: 'n', title: '?' });
    if (it.t === 'if') return ifBox(it);
    if (it.t === 'loop') return loopBox(it);
    if (it.t === 'grp') return groupBox(it);
    return nodeBox(it);
  }

  F.layout = function (graph, maxW, cmp, abOff) {
    var O = { nodes: [], edges: [], ins: [], labels: [], brackets: [], heads: [], regions: [], abOff: !!abOff };
    var lanes = (graph && graph.lanes) || [], x = PAD, y = PAD, rowH = 0, W = 0;
    maxW = graph && graph.oneRow ? 1e9 : Math.max(maxW || 1400, NW + 2 * PAD);
    CMP = !!cmp;
    NOAB = !!abOff;
    for (var i = 0; i < lanes.length; i++) {
      var ln = lanes[i], box = seqBox(ln.items || [], ln.seq), w = box.L + box.R, hh = ln.title ? 34 : 0, n0 = O.nodes.length;
      if (x > PAD && x + w > maxW) { x = PAD; y += rowH + ROW_GAP; rowH = 0; }
      if (ln.title) O.heads.push({ x: x + box.L - Math.max(w, NW) / 2, y: y, w: Math.max(w, NW), lane: ln });
      box.place(x + box.L, y + hh, O, null);
      if (lanes.length > 1 || ln.key != null) region(O, n0, laneKey(ln, i), { title: laneTitle(ln, i), role: ln.role });
      if (box.h + hh > rowH) rowH = box.h + hh;
      x += w + LANE_GAP;
      if (x > W) W = x;
    }
    CMP = false;
    NOAB = false;
    O.w = Math.max(W, NW + 2 * PAD);
    O.h = y + rowH + PAD;
    return O;
  };

  F._size = nodeSize; F._laneKey = laneKey; F._laneTitle = laneTitle; F.CW = CW; F.PAD = PAD;

  function rgba(hex, a) {
    var h = String(hex).replace('#', '');
    return 'rgba(' + parseInt(h.substr(0, 2), 16) + ',' + parseInt(h.substr(2, 2), 16) + ',' + parseInt(h.substr(4, 2), 16) + ',' + a + ')';
  }
  function edgeColor(r) { return r === 'line' ? 'rgba(170,185,205,0.55)' : rgba(role(r).c, 0.9); }
  function arrowHead(p, q, col) {
    var dx = q[0] - p[0], dy = q[1] - p[1], l = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / l, uy = dy / l, s = 6;
    var a = [q[0] - ux * s - uy * s * 0.6, q[1] - uy * s + ux * s * 0.6], b = [q[0] - ux * s + uy * s * 0.6, q[1] - uy * s - ux * s * 0.6];
    return '<polygon points="' + q[0] + ',' + q[1] + ' ' + a[0].toFixed(1) + ',' + a[1].toFixed(1) + ' ' + b[0].toFixed(1) + ',' + b[1].toFixed(1) + '" fill="' + col + '"/>';
  }
  function svgHtml(O, links) {
    var s = '<svg class="fv-svg" width="' + Math.ceil(O.w) + '" height="' + Math.ceil(O.h) + '">';
    var i, k;
    for (i = 0; i < O.brackets.length; i++) {
      var b = O.brackets[i], bc = rgba(role(b.role).c, 0.35);
      s += '<polyline points="' + (b.x + 6) + ',' + b.y1 + ' ' + b.x + ',' + b.y1 + ' ' + b.x + ',' + b.y2 + ' ' + (b.x + 6) + ',' + b.y2 + '" fill="none" stroke="' + bc + '" stroke-width="2"/>';
    }
    for (i = 0; i < O.edges.length; i++) {
      var e = O.edges[i], col = edgeColor(e.role), pts = '';
      for (k = 0; k < e.pts.length; k++) pts += (k ? ' ' : '') + e.pts[k][0].toFixed(1) + ',' + e.pts[k][1].toFixed(1);
      s += '<polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="' + (e.role === 'line' ? 1.6 : 2) + '"' +
        (e.dash ? ' stroke-dasharray="5,4"' : '') + '/>';
      if (e.arrow && e.pts.length > 1) s += arrowHead(e.pts[e.pts.length - 2], e.pts[e.pts.length - 1], col);
    }
    if (links && links.length) {
      var pos = {};
      for (i = 0; i < O.nodes.length; i++) if (O.nodes[i].n.id) pos[O.nodes[i].n.id] = O.nodes[i];
      var lc = rgba(F.ROLES.state.c, 0.75);
      for (i = 0; i < links.length; i++) {
        var a = pos[links[i].from], c = pos[links[i].to];
        if (!a || !c || a === c) continue;
        var x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = c.x + c.w, y2 = c.y + c.h / 2, bend = 40 + Math.min(120, Math.abs(y2 - y1) * 0.15);
        if (c.x + c.w / 2 < a.x + a.w / 2) { x1 = a.x; x2 = c.x + c.w; bend = -bend; }
        else if (c.x > a.x + a.w) { x2 = c.x; }
        var cx = (x1 + x2) / 2 + bend, cy = (y1 + y2) / 2;
        s += '<path d="M' + x1.toFixed(1) + ',' + y1.toFixed(1) + ' Q' + cx.toFixed(1) + ',' + cy.toFixed(1) + ' ' + x2.toFixed(1) + ',' + y2.toFixed(1) +
          '" fill="none" stroke="' + lc + '" stroke-width="1.6" stroke-dasharray="5,4"/>';
        s += '<circle cx="' + x2.toFixed(1) + '" cy="' + y2.toFixed(1) + '" r="3" fill="' + lc + '"/>';
      }
    }
    return s + '</svg>';
  }
  var ACTS = [['up', '&#9650;'], ['down', '&#9660;'], ['dup', 'copy'], ['del', '&#10005;', 'fv-del']];
  function nodeHtml(p, opts, off) {
    var n = p.n, R = role(n.role), cls = 'fv-node' + (n.small ? ' fv-small' : '') + (n.card ? ' fv-card' : '') + (n.sel ? ' fv-sel' : '') + (n.dead ? ' fv-dead' : '') + (n.cls ? ' ' + n.cls : ''), tt;
    var h = '<div class="' + cls + '" data-fv-node="' + esc(n.id) + '" style="left:' + p.x.toFixed(1) + 'px;top:' + p.y.toFixed(1) + 'px;width:' + p.w +
      'px;height:' + p.h + 'px;border-color:' + rgba(R.c, n.sel ? 1 : 0.5) + ';border-left-color:' + R.c + ';">';
    var abi = !off && n.abil && opts.abilIcon ? opts.abilIcon(n.abil) : '', gi = off ? (n.giKind || n.gi) : n.gi, what = off ? '' : String(n.abil || n.item || '');
    if (!abi && gi && opts.gameIcon) abi = opts.gameIcon(gi, n.card ? 20 : 16);
    h += '<div class="fv-t"><span class="fv-ic' + (abi ? ' fv-abil' : '') + '" style="color:' + R.c + '"' + (abi && what ? ' title="' + esc(what) + '"' : '') + '>' + (abi || n.icon || R.g) + '</span>' +
      rich((n._tl || [cut(n.title, TCH)])[0], tt = (n._tt || []).slice(), opts) + '</div>';
    for (var tl = 1; n._tl && tl < n._tl.length; tl++) h += '<div class="fv-t fv-t2">' + rich(n._tl[tl], tt, opts) + '</div>';
    if (n.tog) h += '<span class="fv-tog" data-fv-tog="' + esc(n.tog.key) + '">' + (n.tog.open ? '&#8722;' : '+') + (n.tog.count != null ? ' ' + n.tog.count : '') + '</span>';
    if (n.err) h += '<span class="fv-bad">!</span>';
    else if (n.warn) h += '<span class="fv-bad fv-warn">?</span>';
    var sub = n._sub || [], st = (n._st || []).slice();
    for (var i = 0; i < sub.length; i++) h += '<div class="fv-s">' + rich(sub[i], st, opts) + '</div>';
    var need = opts.gameIcon ? needOf(n, off) : null;
    if ((n.tags && n.tags.length && !n._cmp) || need) {
      h += '<div class="fv-tags">';
      if (need) {
        h += '<span class="fv-need">';
        for (var ni = 0; ni < need.length && ni < 4; ni++) {
          var nd = need[ni], ic = opts.gameIcon(nd, 14);
          var wt = nd.cls ? 'Who: ' + nd.cls.charAt(0).toUpperCase() + nd.cls.slice(1) + (nd.k === 'who' ? '' : ', for ' + nd.name) : '';
          if (ic) h += '<span title="' + esc(wt || (nd.k === 'item' ? 'Needs the item ' : 'Needs ') + nd.name + (nd.unknown ? ' (its icon is not known yet)' : '')) + '">' + ic + '</span>';
        }
        h += '</span>';
      }
      for (var j = 0; n.tags && !n._cmp && j < n.tags.length && j < 4; j++) {
        var tg = n.tags[j], tc = role(tg.role || n.role).c;
        h += '<span class="fv-tag" style="color:' + tc + ';border-color:' + rgba(tc, 0.45) + ';">' + esc(cut(tg.t, 26)) + '</span>';
      }
      h += '</div>';
    }
    var strip = off ? (n.stripKind || n.strip) : n.strip;
    if (strip && strip.length && opts.gameIcon) {
      h += '<div class="fv-strip">';
      for (var si = 0; si < strip.length && si < 9; si++) h += opts.gameIcon(strip[si], 18);
      h += '</div>';
    }
    if (n.sel && n.ref != null && opts.onAct && !n.noActs) {
      var A = n.acts || opts.acts || ACTS;
      h += '<div class="fv-acts">';
      for (var ai = 0; ai < A.length; ai++) h += '<span data-fv-act="' + A[ai][0] + '"' + (A[ai][2] ? ' class="' + A[ai][2] + '"' : '') + '>' + A[ai][1] + '</span>';
      h += '</div>';
    }
    return h + '</div>';
  }
  function headHtml(hd) {
    var ln = hd.lane, R = role(ln.role || 'start');
    return '<div class="fv-head" style="left:' + hd.x.toFixed(1) + 'px;top:' + hd.y.toFixed(1) + 'px;width:' + hd.w + 'px;">' +
      '<span style="color:' + R.c + '">' + esc(cut(ln.title, 44)) + '</span>' + (ln.sub ? '<i>' + esc(cut(ln.sub, 60)) + '</i>' : '') + '</div>';
  }
  F.html = function (O, graph, opts) {
    var lk = graph.links || [], mode = opts.links || 'sel', sid = null, i;
    if (mode === 'sel') {
      for (i = 0; i < O.nodes.length; i++) if (O.nodes[i].n.sel) sid = O.nodes[i].n.id;
      lk = sid ? lk.filter(function (l) { return l.from === sid || l.to === sid; }) : [];
    } else if (mode === 'off') lk = [];
    var h = svgHtml(O, lk);
    for (i = 0; i < O.heads.length; i++) h += headHtml(O.heads[i]);
    for (i = 0; i < O.labels.length; i++) {
      var lb = O.labels[i];
      h += '<span class="fv-lbl" style="left:' + lb.x.toFixed(1) + 'px;top:' + lb.y.toFixed(1) + 'px;color:' + role(lb.role).c + '">' + esc(lb.t) + '</span>';
    }
    if (opts.onInsert || opts.onMove || opts.onDropNew) {
      for (i = 0; i < O.ins.length; i++) {
        var p = O.ins[i];
        h += '<span class="fv-ins' + (p.empty ? ' fv-ins-empty' : '') + (F.armedAt && F.armedAt(opts, p) ? ' fv-ins-armed' : '') + '" data-fv-ins="' + i + '" style="left:' + (p.x - 8).toFixed(1) + 'px;top:' + (p.y - 8).toFixed(1) + 'px;">+</span>';
      }
    }
    var off = !!O.abOff || !!(opts.view && opts.view.abicons === false);
    for (i = 0; i < O.nodes.length; i++) h += nodeHtml(O.nodes[i], opts, off);
    for (i = 0; i < (O.regions || []).length; i++) {
      var rg = O.regions[i], rc = role(rg.role).c;
      h += '<div class="fv-reg" data-fv-reg="' + esc(rg.key) + '" style="left:' + rg.x.toFixed(1) + 'px;top:' + rg.y.toFixed(1) + 'px;width:' + rg.w.toFixed(1) +
        'px;height:' + rg.h.toFixed(1) + 'px;border-color:' + rgba(rc, 0.65) + ';background:' + rgba(rc, 0.06) + ';"><b style="color:' + rc + '"><span>' + richT(rg.title, 40, opts) + '</span></b></div>';
    }
    return h;
  };

  F.injectStyle = function () {
    if (typeof document === 'undefined' || document.getElementById('fv-style')) return;
    var css = [
      '.fv-root{--fv-hover:color-mix(in srgb, var(--accent-cyan,#99ccff) 20%, var(--bg-content,#121a2b));--fv-hot:color-mix(in srgb, var(--accent-cyan,#99ccff) 30%, var(--bg-deep,#0b1120));position:relative;overflow:hidden;background:var(--bg-deep,#0b1120);border:1px solid var(--border-med,rgba(120,140,170,0.25));border-radius:4px;user-select:none;-webkit-user-select:none;cursor:grab;}',
      '.fv-root.fv-panning{cursor:grabbing;}',
      '.fv-canvas{position:absolute;left:0;top:0;transform-origin:0 0;-webkit-transform-origin:0 0;}',
      '.fv-svg{position:absolute;left:0;top:0;pointer-events:none;}',
      '.fv-node{position:absolute;box-sizing:border-box;background:var(--bg-content,#121a2b);border:1px solid;border-left-width:4px;border-radius:6px;padding:4px 8px 3px 8px;color:var(--text-bright,#dfe7f3);font-family:"Segoe UI",Tahoma,sans-serif;overflow:hidden;cursor:pointer;}',
      '.fv-node:hover{background:var(--bg-hover,#18233a);}',
      '.fv-node.fv-sel{background:var(--bg-selected,#1b2945);box-shadow:0 0 0 2px var(--accent-cyan,#99ccff),0 0 10px var(--line-accent,rgba(153,204,255,0.45));overflow:visible;z-index:5;}',
      '.fv-node.fv-dead{opacity:.55;border-style:dashed;}',
      '.fv-node.fv-small{padding:2px 8px;background:var(--bg-panel,#0f1626);}',
      '.fv-node.fv-small .fv-t{font-size:10.5px;font-weight:normal;color:var(--text-primary,#9aa6b8);}',
      '.fv-node.fv-drag{opacity:.35;}',
      '.fv-t{font-size:12px;font-weight:bold;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:30px;}',
      '.fv-t.fv-t2{line-height:16px;padding-left:19px;padding-right:6px;margin-top:-1px;}',
      '.fv-ic{display:inline-block;width:15px;margin-right:4px;text-align:center;font-weight:normal;}',
      '.fv-ic.fv-abil{width:17px;height:16px;vertical-align:-3px;margin-right:5px;}',
      '.fv-ic.fv-abil>span,.fv-det>span{vertical-align:top !important;}',
      '.fv-det{display:inline-block;vertical-align:-3px;margin:0 1px;}',
      '.fv-need{float:right;height:15px;margin-left:4px;}',
      '.fv-need>span{display:inline-block;margin-left:2px;vertical-align:top;line-height:0;}',
      '.fv-pi{display:inline-block;vertical-align:-3px;margin:0 4px 0 -3px;}',
      '.fv-s{font-size:10.5px;line-height:14px;color:var(--text-primary,#9fb0c6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.fv-tags{white-space:nowrap;overflow:hidden;line-height:15px;margin-top:1px;}',
      '.fv-tag{display:inline-block;font-size:9.5px;line-height:12px;padding:0 4px;margin-right:3px;border:1px solid;border-radius:7px;}',
      '.fv-tog{position:absolute;right:5px;top:3px;font-size:10px;line-height:14px;padding:0 5px;border-radius:7px;background:var(--tint-hover,rgba(255,255,255,0.08));color:var(--text-bright,#cfd8e6);cursor:pointer;}',
      '.fv-tog:hover{background:var(--tint-on,rgba(153,204,255,0.22));}',
      '.fv-bad{position:absolute;right:5px;bottom:3px;font-size:10px;font-weight:bold;color:var(--text-bad,#ff6b6b);}',
      '.fv-bad.fv-warn{color:var(--text-warn,#f2c94c);}',
      '.fv-acts{position:absolute;left:-1px;top:-23px;white-space:nowrap;}',
      '.fv-acts span{display:inline-block;font-size:10px;line-height:16px;padding:1px 6px;margin-right:2px;background:var(--bg-hover,#1d2a44);border:1px solid var(--border-light,rgba(255,255,255,0.25));border-radius:4px;color:var(--text-bright,#dfe7f3);cursor:pointer;}',
      '.fv-acts span:hover{background:var(--fv-hover,#2c4058);border-color:var(--accent-cyan,#99ccff);}',
      '.fv-acts span.fv-del{color:var(--text-bad,#ff8080);}',
      '.fv-lbl{position:absolute;font-size:10px;line-height:12px;font-family:"Segoe UI",Tahoma,sans-serif;white-space:nowrap;pointer-events:none;text-shadow:1px 1px 0 #000;}',
      '.fv-head{position:absolute;text-align:center;font-family:"Segoe UI",Tahoma,sans-serif;font-size:12.5px;font-weight:bold;line-height:16px;white-space:nowrap;overflow:hidden;}',
      '.fv-head i{display:block;font-style:normal;font-weight:normal;font-size:10px;color:var(--text-secondary,#8090a8);}',
      '.fv-ins{position:absolute;width:16px;height:16px;line-height:15px;text-align:center;font-size:12px;font-family:"Segoe UI",Tahoma,sans-serif;border-radius:8px;background:var(--bg-deep,#0b1120);border:1px solid var(--border-light,rgba(160,180,210,0.35));color:var(--text-secondary,rgba(190,205,225,0.55));cursor:pointer;z-index:3;}',
      '.fv-ins:hover,.fv-ins.fv-hot{background:var(--fv-hot,#354a63);border-color:var(--accent-cyan,#99ccff);color:var(--accent-cyan,#99ccff);box-shadow:0 0 0 3px var(--tint-on,rgba(153,204,255,0.2));}',
      '.fv-ins.fv-ins-empty{border-style:dashed;}',
      '.fv-root.fv-dragging .fv-ins{background:var(--bg-deep,#0b1120);border-color:var(--accent-cyan,#99ccff);color:var(--accent-cyan,#99ccff);width:20px;height:20px;line-height:19px;margin:-2px 0 0 -2px;border-radius:10px;}',
      '.fv-root.fv-dragging .fv-ins.fv-hot{background:var(--fv-hot,#354a63);color:var(--text-bright,#ffffff);box-shadow:0 0 0 3px var(--line-accent,rgba(153,204,255,0.45));}',
      '.fv-ghost{position:absolute;z-index:50;pointer-events:none;padding:3px 8px;border-radius:5px;background:var(--bg-selected,#1b2945);border:1px solid var(--accent-cyan,#99ccff);color:var(--text-bright,#e6f6ec);font-size:11px;font-family:"Segoe UI",Tahoma,sans-serif;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.6);}',
      '.fv-legend{position:absolute;right:6px;bottom:6px;z-index:21;padding:4px 9px;border-radius:5px;background:var(--bg-panel,#080c16);border:1px solid var(--border-med,rgba(120,140,170,0.3));font-size:10px;line-height:16px;font-family:"Segoe UI",Tahoma,sans-serif;color:var(--text-primary,#b8c4d6);cursor:default;white-space:nowrap;overflow-y:auto;}',
      '.fv-legend b{display:inline-block;box-sizing:border-box;width:10px;height:10px;border:1px solid;border-radius:2px;margin-right:5px;vertical-align:-1px;}',
      '.fv-legend div{display:block;}',
      '.fv-tools{position:absolute;right:6px;top:6px;z-index:20;white-space:nowrap;cursor:default;}',
      '.fv-tools span{display:inline-block;font-size:11px;line-height:18px;padding:0 8px;margin-left:3px;border-radius:4px;background:var(--bg-panel,rgba(20,28,46,0.92));border:1px solid var(--border-med,rgba(140,160,190,0.35));color:var(--text-bright,#dfe7f3);cursor:pointer;font-family:"Segoe UI",Tahoma,sans-serif;}',
      '.fv-tools span:hover{background:var(--fv-hover,#2c4058);border-color:var(--accent-cyan,#99ccff);}',
      '.fv-tools span.fv-on{border-color:var(--accent-cyan,#99ccff);color:var(--accent-cyan,#99ccff);background:var(--tint-on,rgba(153,204,255,0.16));}',
      '.fv-pal{position:absolute;left:6px;bottom:6px;z-index:20;max-width:calc(100% - 12px);max-height:calc(100% - 44px);overflow-y:auto;padding:3px 4px;border-radius:5px;background:var(--bg-panel,#080c16);border:1px solid var(--border-med,rgba(120,140,170,0.3));cursor:default;font-family:"Segoe UI",Tahoma,sans-serif;}',
      '.fv-pal i{font-style:normal;font-size:9.5px;color:var(--text-secondary,#8090a8);margin:0 4px;}',
      '.fv-pal>span{display:inline-block;font-size:10.5px;line-height:17px;padding:0 6px;margin:1px 2px;border-radius:9px;border:1px solid;cursor:grab;background:var(--bg-content,#121a2b);}',
      '.fv-empty{position:absolute;left:0;right:0;top:40%;text-align:center;color:var(--text-secondary,#8090a8);font-size:12px;font-family:"Segoe UI",Tahoma,sans-serif;}',
      '.fv-reg{position:absolute;display:none;box-sizing:border-box;border:2px dashed;border-radius:10px;z-index:8;cursor:pointer;}',
      '.fv-root.fv-far .fv-reg{display:block;}',
      '.fv-reg b{position:absolute;left:2px;right:2px;top:0;line-height:1.28em;text-align:center;white-space:normal;word-wrap:break-word;font-family:"Segoe UI",Tahoma,sans-serif;text-shadow:1px 1px 0 #000;pointer-events:none;}',
      '.fv-reg b span{background:var(--bg-deep,rgba(8,12,22,0.82));padding:0.05em 0.4em;border-radius:0.35em;-webkit-box-decoration-break:clone;box-decoration-break:clone;}',
      '.fv-band{position:absolute;left:0;right:0;top:0;height:30px;z-index:19;background:var(--bg-panel,#0a0f1c);border-bottom:1px solid var(--border-med,rgba(120,140,170,0.22));cursor:default;}',
      '.fv-root.fv-far .fv-node .fv-t,.fv-root.fv-far .fv-node .fv-s,.fv-root.fv-far .fv-node .fv-tags,.fv-root.fv-far .fv-tog,.fv-root.fv-far .fv-acts,.fv-root.fv-far .fv-lbl,.fv-root.fv-far .fv-head,.fv-root.fv-far .fv-ins{visibility:hidden;}',
      '.fv-mini{position:absolute;right:6px;bottom:6px;z-index:21;background:var(--bg-panel,#060a12);border:1px solid var(--border-light,rgba(140,160,190,0.45));border-radius:4px;overflow:hidden;cursor:pointer;}',
      '.fv-mini svg{position:absolute;left:0;top:0;}',
      '.fv-mini-v{position:absolute;border:1px solid var(--accent-cyan,#99ccff);background:var(--tint-on,rgba(153,204,255,0.12));pointer-events:none;}',
      '.fv-zr{min-width:30px;text-align:center;}'
    ].join('\n');
    var st = document.createElement('style');
    st.id = 'fv-style';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  };

  F.render = function (host, graph, opts) {
    if (!host) return null;
    F.injectStyle();
    if (F.partsStyle) F.partsStyle();
    opts = opts || {};
    var V = host._fv;
    if (!V) {
      V = host._fv = { host: host, view: opts.view || { z: 1, x: 0, y: 0 }, O: null, full: null, graph: null, opts: opts, drag: null, pan: null,
        parts: [], mode: 'steps', top: 34, els: {} };
      bind(V);
    }
    V.opts = opts;
    if (opts.view) V.view = opts.view;
    V.full = graph || { lanes: [] };
    draw(V);
    if (V.view.focus != null) { var fk = V.view.focus; delete V.view.focus; focusRegion(V, fk, true); }
    return {
      update: function (g) { V.full = g || V.full; draw(V); },
      fit: function (all) { fit(V, all || V.mode === 'parts'); },
      zoom: function (f) { zoomAt(V, f, (host.clientWidth || 600) / 2, (host.clientHeight || 400) / 2); },
      setZoom: function (z) { zoomAt(V, z / V.view.z, (host.clientWidth || 600) / 2, (host.clientHeight || 400) / 2); },
      view: function () { return V.view; },
      reveal: function (id) { reveal(V, id); },
      mode: function (m, i) { setMode(V, m, i); },
      parts: function () { return V.parts; },
      focus: function (key) { return focusRegion(V, key, true); }
    };
  };
  var MODES = [['parts', 'Overview', 'Every part as one box: click a part to open it'], ['steps', 'All steps', 'The whole file, every step'],
    ['part', 'One part', 'One part at a time (the arrows: the part before / after)'], ['side', 'Side by side', 'Every part as its own column']];
  function partIdx(V) {
    var P = V.parts, v = V.view, i;
    for (i = 0; i < P.length; i++) if (P[i].key === String(v.part) && (!v.partTitle || P[i].title === v.partTitle)) return i;
    for (i = 0; i < P.length; i++) if (v.partTitle && P[i].title === v.partTitle) return i;
    for (i = 0; i < P.length; i++) if (P[i].key === String(v.part)) return i;
    return Math.max(0, Math.min(P.length - 1, v.partN || 0));
  }
  function setPartIdx(V, i) { var p = V.parts[i]; if (p) { V.view.part = p.key; V.view.partTitle = p.title; V.view.partN = i; } }
  function keyIdx(V, key) { for (var i = 0; i < V.parts.length; i++) if (V.parts[i].key === String(key)) return i; return -1; }
  function findIn(items, id) {
    for (var i = 0; i < (items || []).length; i++) {
      var it = items[i];
      if (!it) continue;
      if (it.id === id || (it.node && it.node.id === id)) return it.node || it;
      var f = findIn(it.items, id) || (it.yes && findIn(it.yes.items, id)) || (it.no && findIn(it.no.items, id)) || (it.body && findIn(it.body.items, id));
      if (f) return f;
    }
    return null;
  }
  function viewOf(V) {
    var g = V.full, P = V.parts, m = V.mode, lanes = [], i;
    if (m === 'steps') return g;
    if (m === 'parts') return { cards: F.cards(P), chain: !!g.chain, lanes: [], links: [] };
    for (i = 0; i < P.length; i++) if (P[i].lane) lanes.push(P[i].lane);
    if (m === 'side') return { lanes: lanes, links: g.links, oneRow: true };
    var p = P[partIdx(V)];
    return { lanes: p && p.lane ? [p.lane] : [], links: g.links };
  }
  function barHtml(V) {
    var P = V.parts, m = V.mode, h = '<div class="fv-bar"><span class="fv-vw">', i;
    if (P.length < 2) return '';
    for (i = 0; i < MODES.length; i++) h += '<span data-fv-mode="' + MODES[i][0] + '" title="' + esc(MODES[i][2]) + '"' + (m === MODES[i][0] ? ' class="fv-on"' : '') + '>' + MODES[i][1] + '</span>';
    h += '</span></div><div class="fv-parts">';
    if (m === 'part') {
      h += '<span class="fv-pn"><span data-fv-step="-1" title="The part before">&#9664;</span><i>' + (partIdx(V) + 1) + ' of ' + P.length + '</i>' +
        '<span data-fv-step="1" title="The part after">&#9654;</span></span>';
    }
    for (i = 0; i < P.length; i++) {
      var p = P[i], pc = role(p.role).c, ic = p.gi && V.opts.gameIcon ? V.opts.gameIcon(p.gi, 14) : '';
      h += '<span class="fv-pc" data-fv-part="' + i + '" title="' + esc(plainT(p.title)) + '" style="border-color:' + rgba(pc, 0.55) + ';">' +
        (ic ? '<span class="fv-pi">' + ic + '</span>' : '<b style="color:' + pc + ';margin:0 4px 0 2px;">' + role(p.role).g + '</b>') +
        richT(p.title, 26, V.opts) + (p.count != null ? '<i>' + p.count + '</i>' : '') + (p.err ? '<b class="fv-pbad">!</b>' : '') + '</span>';
    }
    return h + '</div>';
  }
  function miniHtml(V) {
    var O = V.O, s = Math.min(170 / Math.max(1, O.w), 110 / Math.max(1, O.h)), w = Math.max(30, Math.ceil(O.w * s)), hh = Math.max(20, Math.ceil(O.h * s)), i;
    V.miniS = s; V.miniW = w; V.miniH = hh;
    var h = '<div class="fv-mini" data-fv-mini="1" style="width:' + w + 'px;height:' + hh + 'px;display:none;"><svg width="' + w + '" height="' + hh + '">';
    for (i = 0; i < O.regions.length; i++) {
      var r = O.regions[i];
      h += '<rect x="' + (r.x * s).toFixed(1) + '" y="' + (r.y * s).toFixed(1) + '" width="' + (r.w * s).toFixed(1) + '" height="' + (r.h * s).toFixed(1) + '" fill="' + rgba(role(r.role).c, 0.14) + '"/>';
    }
    for (i = 0; i < O.nodes.length; i++) {
      var p = O.nodes[i];
      h += '<rect x="' + (p.x * s).toFixed(1) + '" y="' + (p.y * s).toFixed(1) + '" width="' + Math.max(1, p.w * s).toFixed(1) + '" height="' + Math.max(1, p.h * s).toFixed(1) +
        '" ' + (p.n.sel ? 'fill="#99ccff" style="fill:var(--accent-cyan,#99ccff)"' : 'fill="' + role(p.n.role).c + '"') + ' fill-opacity="' + (p.n.sel ? 1 : 0.75) + '"/>';
    }
    return h + '</svg><div class="fv-mini-v"></div></div>';
  }
  function draw(V) {
    var host = V.host, opts = V.opts, v = V.view, full = V.full, i;
    var P = V.parts = F.parts ? F.parts(full) : [], m = P.length > 1 ? (v.mode || 'steps') : 'steps';
    if (m !== 'steps' && full.parts && full.parts.length > 1 && !full.split) m = 'steps';
    V.mode = m;
    var g = V.graph = viewOf(V), W = host.clientWidth || 900, H = host.clientHeight || 500;
    if (g.cards) V.O = F.layoutCards(g.cards, W - 16, H - V.top - 30, g.chain);
    else V.O = F.layout(g, opts.maxW || Math.max(600, W / Math.max(v.z, 0.3) - 40, 900), !!v.compact, v.abicons === false);
    V.O.abOff = v.abicons === false;
    if (F.palPrep) F.palPrep(V);
    if (host.className.indexOf('fv-root') < 0) host.className = (host.className ? host.className + ' ' : '') + 'fv-root';
    var h = '<div class="fv-canvas" style="width:' + Math.ceil(V.O.w) + 'px;height:' + Math.ceil(V.O.h) + 'px;">' + F.html(V.O, g, opts) + '</div>';
    var empty = !(g.cards && g.cards.length);
    for (i = 0; i < (g.lanes || []).length; i++) if ((g.lanes[i].items || []).length) empty = false;
    if (empty) h += '<div class="fv-empty">' + esc(m === 'part' ? 'Nothing in this part yet.' : (opts.emptyText || 'Nothing here yet.')) + '</div>';
    h += '<div class="fv-band"></div>' + barHtml(V);
    if (opts.legend !== false && v.legend) {
      h += '<div class="fv-legend">';
      var L = opts.legendRoles || F.LEGEND;
      for (var r = 0; r < L.length; r++) if (role(L[r]).name) h += '<div><b style="background:' + rgba(role(L[r]).c, 0.35) + ';border-color:' + role(L[r]).c + '"></b>' + role(L[r]).name + '</div>';
      h += '</div>';
    }
    var tSw = (g.links && g.links.length ? '<span data-fv-tool="links" class="' + (opts.links === 'all' ? 'fv-on' : '') + '">' +
        (opts.links === 'all' ? 'all variable links' : 'variable links: selected') + '</span>' : '') +
      (m !== 'parts' ? '<span data-fv-tool="cmp" class="' + (v.compact ? 'fv-on' : '') + '" title="One line a box: more of the chart on the screen">Titles only</span>' : '') +
      (opts.legend !== false ? '<span data-fv-tool="legend" class="' + (v.legend ? 'fv-on' : '') + '" title="What the colors mean">Colors</span>' : '') +
      (opts.gameIcon || opts.abilIcon ? '<span data-fv-tool="abicons" class="' + (v.abicons !== false ? 'fv-on' : '') +
        '" title="On: every ability and item shows as its own in-game icon. Off: every box shows the icon of its kind of step (detriment icons stay)">Ability icons</span>' : '');
    h += '<div class="fv-tools' + (opts.foldTools && v.toolsOpen ? ' fv-topen' : '') + '">' + (opts.tools || '') + (opts.foldTools ? '' : tSw) +
      '<span data-fv-tool="out" title="Zoom out">&#8722;</span><span data-fv-tool="z100" class="fv-zr" title="Back to 100%">' + Math.round(v.z * 100) + '%</span>' +
      '<span data-fv-tool="in" title="Zoom in">+</span><span data-fv-tool="fit" title="Fit the width">Fit</span>' +
      (opts.foldTools ? '<span data-fv-tool="viewmenu" title="The whole chart, titles only, colors, ability icons">View &#9662;</span><div class="fv-tmenu"><span data-fv-tool="all" title="The whole chart">Whole chart</span>' + tSw + '</div>'
        : '<span data-fv-tool="all" title="The whole chart">All</span>') + '</div>';
    if (F.palHtml && opts.palette && opts.palette.length && m !== 'parts') h += F.palHtml(V);
    else if (opts.palette && opts.palette.length && m !== 'parts') {
      h += '<div class="fv-pal"><i>drag in:</i>';
      for (var p = 0; p < opts.palette.length; p++) {
        var pi = opts.palette[p], pc = role(pi.role).c;
        h += '<span data-fv-pal="' + p + '" style="color:' + pc + ';border-color:' + rgba(pc, 0.5) + ';">' + (pi.gi && opts.gameIcon ? '<span class="fv-pi">' + opts.gameIcon(pi.gi, 15) + '</span>' : (pi.icon ? pi.icon + ' ' : '')) + esc(pi.label) + '</span>';
      }
      h += '</div>';
    }
    if (m !== 'parts') h += miniHtml(V);
    host.innerHTML = h;
    V.canvas = host.firstChild;
    var q = function (sel) { return host.querySelector ? host.querySelector(sel) : null; };
    V.els = { mini: q('.fv-mini'), zr: q('.fv-zr'), legend: q('.fv-legend'), pal: q('.fv-pal'),
      regs: V.canvas.querySelectorAll ? V.canvas.querySelectorAll('.fv-reg') : [], chips: host.querySelectorAll ? host.querySelectorAll('.fv-pc') : [] };
    var pb = q('.fv-parts'), band = q('.fv-band');
    V.top = pb ? pb.offsetTop + pb.offsetHeight + 8 : 34;
    if (band) band.style.height = (V.top - 4) + 'px';
    if (!v.seen) { v.seen = 1; if (v.y < V.top) v.y = V.top; }
    if (v.fitNext) {
      var fm = v.fitNext;
      delete v.fitNext;
      if (fm === 'side') { v.z = Math.max(0.7, Math.min(0.85, (H - V.top - 10) / Math.max(1, V.O.h))); v.x = 10; v.y = V.top; }
      else { fit(V, fm === 'parts'); return; }
    }
    applyView(V);
  }
  function applyView(V) {
    if (!V.canvas) return;
    var v = V.view, z = v.z, t = 'scale(' + z.toFixed(3) + ')', E = V.els || {}, host = V.host, W = host.clientWidth || 800, H = host.clientHeight || 500, i;
    V.canvas.style.left = Math.round(v.x) + 'px';
    V.canvas.style.top = Math.round(v.y) + 'px';
    V.canvas.style.transform = t;
    V.canvas.style.webkitTransform = t;
    if (E.zr) E.zr.textContent = Math.round(z * 100) + '%';
    var far = z < FAR && !!(E.regs && E.regs.length), was = /(^|\s)fv-far(\s|$)/.test(host.className);
    if (far !== was) host.className = far ? host.className + ' fv-far' : host.className.replace(/\s*fv-far/g, '');
    for (i = 0; far && i < E.regs.length; i++) {
      var rb = E.regs[i].firstChild, rr = V.O.regions[i];
      if (!rb || !rr) continue;
      rb.style.fontSize = Math.round(15 / z) + 'px';
      rb.style.top = Math.round(8 / z) + 'px';
      rb.style.display = rr.h * z >= 22 ? 'block' : 'none';
    }
    var show = false;
    if (E.mini && V.O) {
      show = V.O.w * z > W * 1.1 || V.O.h * z > (H - V.top) * 1.1;
      E.mini.style.display = show ? 'block' : 'none';
      if (show) {
        var s = V.miniS, fr = E.mini.lastChild, x1 = Math.max(0, -v.x / z * s), y1 = Math.max(0, (V.top - v.y) / z * s);
        var x2 = Math.min(V.miniW, (W - v.x) / z * s), y2 = Math.min(V.miniH, (H - v.y) / z * s);
        fr.style.left = x1.toFixed(1) + 'px';
        fr.style.top = y1.toFixed(1) + 'px';
        fr.style.width = Math.max(4, x2 - x1).toFixed(1) + 'px';
        fr.style.height = Math.max(4, y2 - y1).toFixed(1) + 'px';
      }
    }
    if (E.legend) { E.legend.style.bottom = (show ? V.miniH + 14 : 6) + 'px'; E.legend.style.maxHeight = 'calc(100% - ' + ((show ? V.miniH + 14 : 6) + 44) + 'px)'; }
    if (E.pal) E.pal.style.maxWidth = show || E.legend ? 'calc(100% - 200px)' : 'calc(100% - 12px)';
    if (E.chips && E.chips.length) {
      var on = V.mode === 'part' ? partIdx(V) : -1;
      if (V.mode !== 'part' && V.mode !== 'parts' && V.O && V.O.regions.length) {
        var cx = (W / 2 - v.x) / z, cy = ((V.top + H) / 2 - v.y) / z, bd = 1e18;
        for (i = 0; i < V.O.regions.length; i++) {
          var gr = V.O.regions[i], dx = Math.max(gr.x - cx, 0, cx - gr.x - gr.w), dy = Math.max(gr.y - cy, 0, cy - gr.y - gr.h), d = dx * dx + dy * dy;
          if (d < bd) { bd = d; on = keyIdx(V, gr.key); }
        }
      }
      for (i = 0; i < E.chips.length; i++) {
        var c = E.chips[i].className.replace(/\s*fv-on/g, '');
        E.chips[i].className = +E.chips[i].getAttribute('data-fv-part') === on ? c + ' fv-on' : c;
      }
    }
  }
  function fit(V, all) {
    var W = V.host.clientWidth || 800, H = V.host.clientHeight || 500, top = V.top || 34, z = V.view.z, zmax = +V.opts.fitMax > 0 ? +V.opts.fitMax : 1.05;
    for (var pass = 0; pass < 3 && V.O; pass++) {
      var O = V.O, z1 = all ? Math.min((W - 20) / O.w, (H - top - 10) / O.h) : Math.max(Math.min(0.6, zmax), Math.min(zmax, (W - 30) / O.w));
      z1 = Math.max(0.15, Math.min(Math.max(1.2, zmax), z1));
      if (pass && Math.abs(z1 - z) < 0.01) break;
      z = V.view.z = z1;
      draw(V);
      if (!all) break;
    }
    if (!V.O) return;
    V.view.x = Math.max(10, (W - V.O.w * V.view.z) / 2);
    V.view.y = all ? top + Math.max(0, (H - top - 10 - V.O.h * V.view.z) / 2) : top;
    applyView(V);
  }
  function zoomAt(V, f, mx, my) {
    var z0 = V.view.z, z1 = Math.max(0.2, Math.min(2, z0 * f));
    V.view.x = mx - (mx - V.view.x) * (z1 / z0);
    V.view.y = my - (my - V.view.y) * (z1 / z0);
    V.view.z = z1;
    applyView(V);
  }
  function animate(V, to, ms) {
    var v = V.view, from = { z: v.z, x: v.x, y: v.y }, t0 = Date.now();
    if (V.anim) clearTimeout(V.anim);
    (function step() {
      var k = Math.min(1, (Date.now() - t0) / (ms || 300)), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      v.z = from.z + (to.z - from.z) * e;
      v.x = from.x + (to.x - from.x) * e;
      v.y = from.y + (to.y - from.y) * e;
      applyView(V);
      if (k < 1) V.anim = setTimeout(step, 16);
      else { V.anim = 0; if (V.opts.onView) V.opts.onView(v); }
    })();
  }
  function focusRegion(V, key, anim) {
    var O = V.O, R = null, i;
    for (i = 0; O && O.regions && i < O.regions.length; i++) if (O.regions[i].key === String(key)) R = O.regions[i];
    if (!R) return false;
    var W = V.host.clientWidth || 800, H = (V.host.clientHeight || 500) - V.top - 10;
    var z = Math.max(0.4, Math.min(1, (W - 40) / R.w, Math.max(H / R.h, 0.75)));
    var to = { z: z, x: W / 2 - (R.x + R.w / 2) * z, y: R.h * z <= H ? V.top + (H - R.h * z) / 2 - R.y * z : V.top + 6 - R.y * z };
    if (anim) animate(V, to, 320);
    else { V.view.z = to.z; V.view.x = to.x; V.view.y = to.y; applyView(V); if (V.opts.onView) V.opts.onView(V.view); }
    return true;
  }
  function setMode(V, m, i) {
    var v = V.view;
    if (i != null && V.parts[i]) setPartIdx(V, i);
    v.mode = m;
    v.fitNext = m;
    if (V.opts.onView) V.opts.onView(v);
    if (V.opts.onMode) V.opts.onMode(v);
    else draw(V);
  }
  function stepPart(V, d) {
    var n = V.parts.length;
    if (!n) return;
    setPartIdx(V, (partIdx(V) + d + n) % n);
    V.view.fitNext = 'part';
    draw(V);
    if (V.opts.onView) V.opts.onView(V.view);
  }
  function partClick(V, i) {
    var p = V.parts[i], v = V.view;
    if (!p) return;
    if (V.mode === 'parts') { setMode(V, 'part', i); return; }
    if (V.mode === 'part') { setPartIdx(V, i); v.fitNext = 'part'; draw(V); if (V.opts.onView) V.opts.onView(v); return; }
    if (p.folded && p.tog && V.opts.onToggle) { v.focus = p.key; V.opts.onToggle(p.tog); return; }
    focusRegion(V, p.key, true);
  }
  function reveal(V, id) {
    var O = V.O, i, here = false;
    if (!O) return;
    for (i = 0; i < O.nodes.length; i++) if (O.nodes[i].n.id === id) here = true;
    if (!here && V.mode === 'part') {
      for (i = 0; i < V.parts.length; i++) {
        if (!V.parts[i].lane || !findIn(V.parts[i].lane.items, id)) continue;
        setPartIdx(V, i);
        if (V.opts.onView) V.opts.onView(V.view);
        draw(V);
        O = V.O;
        break;
      }
    }
    for (i = 0; i < O.nodes.length; i++) {
      if (O.nodes[i].n.id !== id) continue;
      var p = O.nodes[i], W = V.host.clientWidth || 800, H = V.host.clientHeight || 500, z = V.view.z;
      var sx = V.view.x + p.x * z, sy = V.view.y + p.y * z;
      if (sx < 10 || sx + p.w * z > W - 10) V.view.x = W / 2 - (p.x + p.w / 2) * z;
      if (sy < V.top || sy + p.h * z > H - 60) V.view.y = H / 3 - p.y * z;
      applyView(V);
      return;
    }
  }
  function local(V, e) {
    var r = V.host.getBoundingClientRect ? V.host.getBoundingClientRect() : { left: 0, top: 0 };
    return [e.clientX - r.left, e.clientY - r.top];
  }
  function attr(t, a, stop) {
    for (; t && t !== stop && t.getAttribute; t = t.parentNode) { var v = t.getAttribute(a); if (v != null) return { el: t, v: v }; }
    return null;
  }
  function nodeById(V, id) {
    var O = V.O;
    for (var i = 0; O && i < O.nodes.length; i++) if (O.nodes[i].n.id === id) return O.nodes[i].n;
    return null;
  }
  function hotSlot(V, m) {
    var O = V.O, z = V.view.z, cx = (m[0] - V.view.x) / z, cy = (m[1] - V.view.y) / z, best = -1, bd = 1600 / (z * z);
    for (var i = 0; O && i < O.ins.length; i++) {
      var p = O.ins[i], dx = p.x - cx, dy = p.y - cy, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  function chrome(t, stop) {
    for (; t && t !== stop; t = t.parentNode) if (/(^|\s)fv-(legend|pal|bar|parts|tools|mini|band)(\s|$)/.test(typeof t.className === 'string' ? t.className : '')) return true;
    return false;
  }
  function miniGo(V, e) {
    var r = V.mm.getBoundingClientRect(), s = V.miniS || 1, z = V.view.z, W = V.host.clientWidth || 800, H = V.host.clientHeight || 500;
    V.view.x = W / 2 - (e.clientX - r.left) / s * z;
    V.view.y = (V.top + H) / 2 - (e.clientY - r.top) / s * z;
    applyView(V);
  }
  function markHot(V, idx) {
    var els = V.host.querySelectorAll ? V.host.querySelectorAll('.fv-ins') : [];
    for (var i = 0; i < els.length; i++) {
      var on = +els[i].getAttribute('data-fv-ins') === idx;
      var c = els[i].className.replace(/\s*fv-hot/g, '');
      els[i].className = on ? c + ' fv-hot' : c;
    }
  }
  function bind(V) {
    var host = V.host;
    host.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      var m = local(V, e), t = e.target;
      V.panMoved = false;
      if (attr(t, 'data-fv-tool', host) || attr(t, 'data-fv-act', host) || attr(t, 'data-fv-tog', host)) return;
      if (attr(t, 'data-fv-mode', host) || attr(t, 'data-fv-step', host) || attr(t, 'data-fv-part', host)) return;
      var mm = attr(t, 'data-fv-mini', host);
      if (mm) { V.mm = mm.el; miniGo(V, e); e.preventDefault(); return; }
      var pal = attr(t, 'data-fv-pal', host);
      if (pal) { V.drag = { kind: 'new', key: +pal.v, x0: m[0], y0: m[1], on: false }; e.preventDefault(); return; }
      var nd = attr(t, 'data-fv-node', host);
      if (nd) {
        var n = nodeById(V, nd.v);
        V.drag = { kind: 'node', id: nd.v, n: n, x0: m[0], y0: m[1], on: false, el: nd.el };
        return;
      }
      if (attr(t, 'data-fv-ins', host)) return;
      if (chrome(t, host)) return;
      V.pan = { x0: m[0], y0: m[1], vx: V.view.x, vy: V.view.y };
      host.className += ' fv-panning';
      e.preventDefault();
    });
    host.addEventListener('mousemove', function (e) {
      var m = local(V, e);
      if (V.mm) { miniGo(V, e); return; }
      if (V.pan) {
        V.view.x = V.pan.vx + (m[0] - V.pan.x0);
        V.view.y = V.pan.vy + (m[1] - V.pan.y0);
        if (Math.abs(m[0] - V.pan.x0) + Math.abs(m[1] - V.pan.y0) > 4) V.panMoved = true;
        applyView(V);
        return;
      }
      var d = V.drag;
      if (!d) return;
      if (!d.on && Math.abs(m[0] - d.x0) + Math.abs(m[1] - d.y0) > 6) {
        if (d.kind === 'node' && (!d.n || d.n.ref == null || d.n.fixed || d.n.nodrag || !V.opts.onMove)) { V.drag = null; return; }
        if (d.kind === 'new' && !V.opts.onDropNew) { V.drag = null; return; }
        d.on = true;
        host.className += ' fv-dragging';
        if (d.el) d.el.className += ' fv-drag';
        var g = document.createElement('div');
        g.className = 'fv-ghost';
        g.innerHTML = d.kind === 'new' ? 'add: ' + esc(V.opts.palette[d.key].label) : 'move: ' + esc(cut(d.n.title, 40));
        host.appendChild(g);
        d.ghost = g;
      }
      if (d.on) {
        d.ghost.style.left = (m[0] + 14) + 'px';
        d.ghost.style.top = (m[1] + 10) + 'px';
        d.hot = hotSlot(V, m);
        markHot(V, d.hot);
      }
    });
    function endDrag(e) {
      if (V.mm) { V.mm = null; if (V.opts.onView) V.opts.onView(V.view); }
      if (V.pan) {
        V.pan = null;
        host.className = host.className.replace(/\s*fv-panning/g, '');
        if (V.opts.onView) V.opts.onView(V.view);
      }
      var d = V.drag;
      V.drag = null;
      if (!d) return;
      if (!d.on) {
        var cd = d.kind === 'node' ? nodeById(V, d.id) : null;
        if (cd && cd.card) { if (e && e.type === 'mouseup') setMode(V, 'part', cd.partN); return; }
        if (d.kind === 'new' && e && e.type === 'mouseup' && F.palClick) { F.palClick(V, d.key); return; }
        if (d.kind === 'node' && e && e.type === 'mouseup' && V.opts.onSelect) {
          var n = nodeById(V, d.id);
          if (n) V.opts.onSelect(n.ref, n.id, n);
        }
        return;
      }
      host.className = host.className.replace(/\s*fv-dragging/g, '');
      if (d.ghost && d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
      if (d.el) d.el.className = d.el.className.replace(/\s*fv-drag/g, '');
      markHot(V, -1);
      if (!e || e.type !== 'mouseup' || d.hot == null || d.hot < 0) return;
      var slot = V.O.ins[d.hot];
      if (d.kind === 'new') V.opts.onDropNew(V.opts.palette[d.key].key, slot.seq, slot.idx);
      else V.opts.onMove(d.n.ref, slot.seq, slot.idx, d.n);
    }
    host.addEventListener('mouseup', endDrag);
    host.addEventListener('mouseleave', function () { endDrag(null); });
    host.addEventListener('click', function (e) {
      var t = e.target, a;
      if ((a = attr(t, 'data-fv-mode', host))) { setMode(V, a.v); return; }
      if ((a = attr(t, 'data-fv-step', host))) { stepPart(V, +a.v); return; }
      if ((a = attr(t, 'data-fv-part', host))) { partClick(V, +a.v); return; }
      if ((a = attr(t, 'data-fv-reg', host))) { if (!V.panMoved) focusRegion(V, a.v, true); return; }
      if ((a = attr(t, 'data-fv-tool', host))) {
        if (a.v === 'in') zoomAt(V, 1.2, (host.clientWidth || 600) / 2, (host.clientHeight || 400) / 2);
        else if (a.v === 'out') zoomAt(V, 1 / 1.2, (host.clientWidth || 600) / 2, (host.clientHeight || 400) / 2);
        else if (a.v === 'z100') zoomAt(V, 1 / V.view.z, (host.clientWidth || 600) / 2, (host.clientHeight || 400) / 2);
        else if (a.v === 'fit') fit(V, V.mode === 'parts');
        else if (a.v === 'all') fit(V, true);
        else if (a.v === 'cmp') { V.view.compact = !V.view.compact; draw(V); }
        else if (a.v === 'legend') { V.view.legend = !V.view.legend; draw(V); }
        else if (a.v === 'abicons') { V.view.abicons = V.view.abicons === false; if (V.opts.onAbIcons) V.opts.onAbIcons(V.view.abicons !== false); else draw(V); }
        else if (a.v === 'links') { V.opts.links = V.opts.links === 'all' ? 'sel' : 'all'; if (V.opts.onLinks) V.opts.onLinks(V.opts.links); draw(V); }
        else if (V.opts.onTool) V.opts.onTool(a.v);
        if (V.opts.onView) V.opts.onView(V.view);
        return;
      }
      if ((a = attr(t, 'data-fv-act', host))) {
        var nd = attr(t, 'data-fv-node', host), n = nd ? nodeById(V, nd.v) : null;
        if (n && V.opts.onAct) V.opts.onAct(a.v, n.ref, n);
        return;
      }
      if ((a = attr(t, 'data-fv-tog', host))) { if (V.opts.onToggle) V.opts.onToggle(a.v); return; }
      if ((a = attr(t, 'data-fv-ins', host))) {
        var s = V.O.ins[+a.v];
        if (s && F.arm) F.arm(V, s);
        if (s && V.opts.onInsert) V.opts.onInsert(s.seq, s.idx);
      }
    });
    function wheel(e, dy) {
      if (e.preventDefault) e.preventDefault();
      var now = Date.now();
      if (V._lastWheel && now - V._lastWheel < 8) return;
      V._lastWheel = now;
      var m = local(V, e);
      zoomAt(V, dy < 0 ? 1.12 : 1 / 1.12, m[0], m[1]);
      if (V.opts.onView) V.opts.onView(V.view);
    }
    host.addEventListener('wheel', function (e) { wheel(e, e.deltaY || 0); });
    host.addEventListener('mousewheel', function (e) { wheel(e, -(e.wheelDelta || 0)); });
  }
})(typeof window !== 'undefined' ? window : this);
