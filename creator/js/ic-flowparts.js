/* Open IC Creator - ic-flowparts.js
   Flowchart parts (IC.fv.parts / cards / layoutCards): the parts a chart breaks into and the Overview's cards.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var F = IC.fv = IC.fv || {};

  function giKey(g) { return (g.item ? 'i' : 's') + g.id + '/' + g.back; }
  function stats(items, s) {
    s = s || { n: 0, gi: [], seen: {}, gk: [], seenK: {}, err: 0, warn: 0 };
    function one(n) {
      if (!n || n.ref == null || n.fixed || n.noSlot) return;
      s.n += n.span || 1;
      if (n.err) s.err++;
      else if (n.warn) s.warn++;
      if (n.gi && n.gi.id > 0 && !s.seen[giKey(n.gi)]) { s.seen[giKey(n.gi)] = 1; s.gi.push(n.gi); }
      var k = n.giKind || n.gi;
      if (k && k.id > 0 && !s.seenK[giKey(k)]) { s.seenK[giKey(k)] = 1; s.gk.push(k); }
    }
    for (var i = 0; i < (items || []).length; i++) {
      var it = items[i];
      if (!it) continue;
      if (it.t === 'grp') { if (it.node && !it.node.span) one(it.node); stats(it.items, s); continue; }
      one(it.t === 'n' ? it : it.node);
      if (it.yes) stats(it.yes.items, s);
      if (it.no) stats(it.no.items, s);
      if (it.body) stats(it.body.items, s);
    }
    return s;
  }
  F.parts = function (g) {
    var src = (g && (g.split || ((g.lanes || []).length > 1 ? g.lanes : null))) || [], by = {}, out = [], i, k;
    var list = g && g.parts && g.parts.length > 1 ? g.parts : null;
    for (i = 0; i < src.length; i++) by[F._laneKey(src[i], i)] = src[i];
    for (i = 0; i < (list ? list.length : src.length); i++) {
      var p = {}, ln;
      if (list) { for (k in list[i]) if (list[i].hasOwnProperty(k)) p[k] = list[i][k]; p.key = String(p.key); ln = by[p.key] || null; }
      else { ln = src[i]; p = { key: F._laneKey(ln, i), title: F._laneTitle(ln, i), role: ln.role || 'action' }; }
      p.lane = ln;
      p.n = i;
      if (ln) {
        var st = stats(ln.items);
        if (p.count == null) p.count = st.n;
        p.strip = st.gi.slice(0, 9); p.stripKind = st.gk.slice(0, 9); p.err = st.err; p.warn = st.warn;
        if (!p.gi) { var f = (ln.items || [])[0]; p.gi = ln.gi || (f && (f.gi || (f.node && f.node.gi))) || null; }
      }
      out.push(p);
    }
    return out.length > 1 ? out : [];
  };
  F.cards = function (P) {
    var out = [];
    for (var i = 0; i < P.length; i++) {
      var p = P[i], c = p.count;
      out.push({ t: 'n', id: 'card:' + i, card: true, partN: i, role: p.role || 'sec', gi: p.gi || null, icon: p.icon, title: p.title, noActs: true,
        sub: c != null ? c + ' step' + (c === 1 ? '' : 's') + (p.err ? ' -- ' + p.err + ' with a problem' : (p.warn ? ' -- ' + p.warn + ' to check' : '')) : '',
        strip: p.strip || [], stripKind: p.stripKind || p.strip || [], err: p.err > 0, warn: !p.err && p.warn > 0 });
    }
    return out;
  };
  F.layoutCards = function (cards, W, H, chain) {
    var O = { nodes: [], edges: [], ins: [], labels: [], brackets: [], heads: [], regions: [], cards: true };
    var n = cards.length, gx = chain ? 70 : 34, gy = chain ? 52 : 30, ch = 0, cols = 1, bs = -1, be = 1e9, i, c;
    for (i = 0; i < n; i++) ch = Math.max(ch, F._size(cards[i]).h);
    W = W || 1200; H = H || 700;
    for (c = 1; c <= n; c++) {
      var r = Math.ceil(n / c), w = c * F.CW + (c - 1) * gx + 2 * F.PAD, h = r * ch + (r - 1) * gy + 2 * F.PAD;
      var sc = Math.min(1, W / w, H / h), emp = r * c - n;
      if (sc > bs + 0.01 || (Math.abs(sc - bs) <= 0.01 && (emp < be || (emp === be && c > cols)))) { bs = sc; be = emp; cols = c; }
    }
    for (i = 0; i < n; i++) {
      var row = Math.floor(i / cols), col = i % cols;
      if (chain && row % 2) col = cols - 1 - col;
      O.nodes.push({ n: cards[i], x: F.PAD + col * (F.CW + gx), y: F.PAD + row * (ch + gy), w: F.CW, h: ch });
    }
    for (i = 0; chain && i + 1 < n; i++) {
      var a = O.nodes[i], b = O.nodes[i + 1];
      if (Math.abs(a.y - b.y) < 1) {
        var lr = b.x > a.x;
        O.edges.push({ pts: [[lr ? a.x + a.w : a.x, a.y + ch / 2], [lr ? b.x : b.x + b.w, b.y + ch / 2]], role: 'line', arrow: true });
      } else O.edges.push({ pts: [[a.x + a.w / 2, a.y + ch], [b.x + b.w / 2, b.y]], role: 'line', arrow: true });
    }
    O.w = 2 * F.PAD + cols * F.CW + (cols - 1) * gx;
    O.h = 2 * F.PAD + Math.ceil(n / cols) * ch + (Math.ceil(n / cols) - 1) * gy;
    return O;
  };

  F.partsStyle = function () {
    if (typeof document === 'undefined' || document.getElementById('fvp-style')) return;
    var css = [
      '.fv-bar{position:absolute;left:6px;top:6px;z-index:20;white-space:nowrap;font-family:"Segoe UI",Tahoma,sans-serif;cursor:default;}',
      '.fv-vw{display:inline-block;vertical-align:top;border:1px solid var(--border-med,rgba(140,160,190,0.35));border-radius:var(--radius,4px);overflow:hidden;background:var(--bg-panel,#141c2e);}',
      '.fv-vw span{display:inline-block;font-size:11px;line-height:18px;padding:0 9px;color:var(--text-primary,#b8c4d6);cursor:pointer;}',
      '.fv-vw span:hover{background:var(--tint-hover,#2b3d62);color:var(--text-bright,#fff);}',
      '.fv-vw span.fv-on{background:var(--tint-on,rgba(153,204,255,0.2));color:var(--accent-cyan,#99ccff);box-shadow:inset 0 -2px 0 var(--accent-cyan,#99ccff);font-weight:bold;}',
      '.fv-parts{position:absolute;left:6px;right:6px;top:30px;z-index:20;max-height:42px;overflow-x:hidden;overflow-y:auto;cursor:default;font-family:"Segoe UI",Tahoma,sans-serif;}',
      '.fv-pn{display:inline-block;vertical-align:top;margin:0 6px 3px 0;border:1px solid var(--border-med,rgba(140,160,190,0.35));border-radius:9px;background:var(--bg-panel,#080c16);font-size:10.5px;line-height:17px;color:var(--text-bright,#dfe7f3);}',
      '.fv-pn span{display:inline-block;padding:0 7px;color:var(--accent-cyan,#99ccff);cursor:pointer;}',
      '.fv-pn span:hover{color:var(--text-bright,#fff);background:var(--fv-hover,#2c4058);}',
      '.fv-pn i{font-style:normal;color:var(--text-secondary,#8fa0b8);}',
      '.fv-pc{display:inline-block;vertical-align:top;font-size:10.5px;line-height:17px;padding:0 7px 0 4px;margin:0 3px 3px 0;border:1px solid;border-radius:9px;background:var(--bg-content,#121a2b);color:var(--text-bright,#cfd8e6);cursor:pointer;white-space:nowrap;}',
      '.fv-pc:hover{background:var(--bg-hover,#22314f);color:var(--text-bright,#fff);}',
      '.fv-pc.fv-on{background:var(--bg-selected,#26406a);color:var(--text-bright,#fff);box-shadow:0 0 0 1px var(--accent-cyan,#99ccff);}',
      '.fv-pc i{font-style:normal;color:var(--text-secondary,#8fa0b8);margin-left:5px;}',
      '.fv-pc .fv-pi{margin:0 3px 0 0;}',
      '.fv-pc b.fv-pbad{color:var(--text-bad,#ff6b6b);margin-left:4px;}',
      '.fv-node.fv-card{padding:7px 10px 5px 10px;border-radius:9px;background:var(--bg-content,#131d31);}',
      '.fv-node.fv-card:hover{background:var(--bg-hover,#1b2a47);box-shadow:0 0 0 1px var(--accent-cyan,#99ccff);}',
      '.fv-card .fv-t{font-size:13px;line-height:19px;}',
      '.fv-card .fv-ic.fv-abil{width:21px;height:20px;vertical-align:-4px;}',
      '.fv-card .fv-s{font-size:11px;}',
      '.fv-strip{margin-top:5px;height:20px;white-space:nowrap;overflow:hidden;}',
      '.fv-strip>*{margin-right:3px;vertical-align:top;}'
    ].join('\n');
    var st = document.createElement('style');
    st.id = 'fvp-style';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  };
})(typeof window !== 'undefined' ? window : this);
