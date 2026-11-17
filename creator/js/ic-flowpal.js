/* Open IC Creator - ic-flowpal.js
   Flowchart palette add-on (IC.fv): chips work by click or by drag, the armed + slot, snippet forms.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var F = IC.fv = IC.fv || {};
  function str(v) { return v == null ? '' : String(v); }
  function esc(s) { return str(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function cut(s, n) { s = str(s); return s.length > n ? s.slice(0, n - 1) + '...' : s; }
  function rgba(hex, a) {
    var h = str(hex).replace('#', '');
    return 'rgba(' + parseInt(h.substr(0, 2), 16) + ',' + parseInt(h.substr(2, 2), 16) + ',' + parseInt(h.substr(4, 2), 16) + ',' + a + ')';
  }
  function roleC(r) { return ((F.ROLES || {})[r] || (F.ROLES || {}).action || { c: '#4a90e2' }).c; }
  function key(seq) { return typeof seq === 'string' ? seq : JSON.stringify(seq == null ? null : seq); }

  function selNode(O) { for (var i = 0; O && i < O.nodes.length; i++) if (O.nodes[i].n.sel) return O.nodes[i].n; return null; }
  function slotOf(O, a) {
    for (var i = 0; O && a && i < O.ins.length; i++) if (key(O.ins[i].seq) === a.seq && O.ins[i].idx === a.idx) return O.ins[i];
    return null;
  }
  F.palPrep = function (V) {
    var a = V.view && V.view.armed, sn = selNode(V.O), sid = sn ? str(sn.id) : '';
    if (!a) return;
    if (a.sel === '*') a.sel = sid;
    else if (a.sel !== sid || (V.O && V.O.ins.length && !slotOf(V.O, a))) V.view.armed = null;
  };
  F.armedAt = function (opts, p) { var a = opts && opts.view && opts.view.armed; return !!a && key(p.seq) === a.seq && p.idx === a.idx; };
  F.arm = function (V, s) {
    if (!s || !V.view) return;
    var sn = selNode(V.O);
    V.view.armed = { seq: key(s.seq), idx: s.idx, sel: sn ? str(sn.id) : '' };
    F.palMark(V);
  };
  F.armNext = function (view, seq, idx) { if (view) view.armed = { seq: key(seq), idx: idx, sel: '*' }; };
  F.palMark = function (V) {
    var els = V.host.querySelectorAll ? V.host.querySelectorAll('.fv-ins') : [], a = V.view.armed, i;
    for (i = 0; i < els.length; i++) {
      var p = V.O && V.O.ins[+els[i].getAttribute('data-fv-ins')], c = els[i].className.replace(/\s*fv-ins-armed/g, '');
      els[i].className = p && F.armedAt({ view: V.view }, p) ? c + ' fv-ins-armed' : c;
    }
    var w = V.host.querySelector ? V.host.querySelector('.fvp-where') : null;
    if (w) w.innerHTML = whereText(V);
  };
  function before(V, s) {
    var O = V.O, sq = s && s.seq, i;
    if (!O || !sq || typeof sq !== 'object' || s.idx < 1) return null;
    var base = sq.p === '' && sq.k === '' ? '' : sq.p + '.' + sq.k + '.', ref = base + (s.idx - 1);
    for (i = 0; i < O.nodes.length; i++) if (str(O.nodes[i].n.ref) === ref && !O.nodes[i].n.card) return O.nodes[i].n;
    for (i = 0; i < O.nodes.length; i++) {
      var n = O.nodes[i].n, r = str(n.ref);
      if (n.ref != null && n.iy === s.idx - 1 && (base ? r.indexOf(base) === 0 : r.indexOf('.') < 0) && !n.fixed) return n;
    }
    return null;
  }
  F.whereSlot = function (V) {
    var O = V.O, a = V.view && V.view.armed, s = slotOf(O, a), n;
    if (s) { n = before(V, s); return { seq: s.seq, idx: s.idx, how: 'armed', after: n ? n.title : '' }; }
    var sn = selNode(O);
    if (sn && sn.ref != null && !sn.fixed && !sn.card) {
      var r = str(sn.ref).split('.'), last = +r[r.length - 1], idx = (sn.iy != null && sn.iy >= last ? sn.iy : last) + 1;
      var seq = r.length > 1 ? { p: r.slice(0, r.length - 2).join('.'), k: r[r.length - 2] } : { p: '', k: '' };
      for (var i = 0; O && i < O.ins.length; i++) if (key(O.ins[i].seq) === key(seq) && O.ins[i].idx === idx) return { seq: O.ins[i].seq, idx: idx, how: 'sel', after: sn.title };
      return { seq: seq, idx: idx, how: 'sel', after: sn.title };
    }
    var best = null;
    for (var j = 0; O && j < O.ins.length; j++) {
      var q = O.ins[j];
      if (q.seq && typeof q.seq === 'object' && q.seq.p === '' && q.seq.k === '' && (!best || q.idx > best.idx)) best = q;
    }
    if (!best && O && O.ins.length) best = O.ins[O.ins.length - 1];
    return best ? { seq: best.seq, idx: best.idx, how: 'end', after: '' } : { seq: { p: '', k: '' }, idx: 0, how: 'end', after: '' };
  };
  function plainT(s) { return str(s).replace(/ ?\[det:\d+(?:\/\d+)?\]/g, ''); }
  function whereText(V) {
    var w = F.whereSlot(V);
    if (w.how === 'armed') return 'A click adds at the <b>+ you picked</b>' + (w.after ? ' (after "' + esc(cut(plainT(w.after), 34)) + '")' : '');
    if (w.how === 'sel') return 'A click adds after the selected box: <b>' + esc(cut(plainT(w.after), 40)) + '</b> <i>(or click a + to pick)</i>';
    return 'A click adds <b>at the end</b> <i>(select a box or click a + to pick)</i>';
  }

  F.palStyle = function () {
    if (typeof document === 'undefined' || document.getElementById('fvq-style')) return;
    var css = [
      '.fv-pal .fvp-chips{display:flex;flex-wrap:wrap;align-items:center;}',
      '.fv-pal .fvp-chips>span[data-fv-pal]{display:inline-block;font-size:10.5px;line-height:17px;padding:0 6px;margin:1px 2px;border-radius:9px;border:1px solid;cursor:pointer;background:var(--bg-content,#121a2b);white-space:nowrap;}',
      '.fv-pal .fvp-chips>span[data-fv-pal]:hover{background:var(--bg-hover,#1d2b47);}',
      '.fv-pal .fvp-more{display:inline-block;font-size:10.5px;line-height:17px;padding:0 7px;margin:1px 2px;border-radius:9px;border:1px dashed var(--border-light,rgba(160,180,210,0.55));color:var(--text-bright,#cfd8e6);cursor:pointer;}',
      '.fv-pal .fvp-more:hover{background:var(--fv-hover,#2c4058);color:var(--text-bright,#fff);}',
      '.fv-pal .fvp-chips>span.fvp-x{display:none;}',
      '.fv-pal.fvp-open .fvp-chips>span.fvp-x{display:inline-block;}',
      '.fv-pal .fvp-fold{display:inline-block;font-size:10.5px;line-height:17px;padding:0 7px;margin:1px 2px;border-radius:9px;border:1px solid var(--border-light,rgba(160,180,210,0.55));color:var(--text-bright,#cfd8e6);cursor:pointer;white-space:nowrap;}',
      '.fv-pal .fvp-fold:hover{background:var(--fv-hover,#2c4058);color:var(--text-bright,#fff);}',
      '.fv-pal .fvp-fo{display:none;}',
      '.fv-pal.fvp-shut{overflow:hidden;max-width:none !important;}',
      '.fv-pal.fvp-shut .fvp-fo{display:inline-block;}',
      '.fv-pal.fvp-shut .fvp-chips,.fv-pal.fvp-shut .fvp-where{display:none;}',
      '.fv-pal .fvp-where{font-size:10px;line-height:14px;color:var(--text-primary,#9fb0c6);padding:2px 4px 0 4px;}',
      '.fv-pal .fvp-where b{color:var(--accent-cyan,#99ccff);font-weight:normal;}',
      '.fv-pal .fvp-where i{font-style:normal;color:var(--text-secondary,#6f7f96);}',
      '.fv-ins.fv-ins-armed{background:var(--fv-hot,#354a63);border-color:var(--accent-cyan,#99ccff);color:var(--accent-cyan,#99ccff);box-shadow:0 0 0 3px var(--line-accent,rgba(153,204,255,0.45));}'
    ].join('\n');
    var st = document.createElement('style');
    st.id = 'fvq-style';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  };
  function chip(V, p, i) {
    var pc = roleC(p.role), g = p.gi && V.opts.gameIcon ? V.opts.gameIcon(p.gi, 15) : '';
    return '<span data-fv-pal="' + i + '"' + (p.more ? ' class="fvp-x"' : '') + (p.tip ? ' title="' + esc(p.tip) + '"' : '') + ' style="color:' + pc + ';border-color:' + rgba(pc, 0.5) + ';">' +
      (g ? '<span class="fv-pi">' + g + '</span>' : (p.icon ? p.icon + ' ' : '')) + esc(p.label) + '</span>';
  }
  function moreText(open) { return open ? 'Less &#9652;' : 'More... &#9662;'; }
  F.PAL_ROOM = 560;
  F.palIsShut = function (V) {
    if (!V.opts.palFold) return false;
    var s = V.view && V.view.palShut, hh = V.host.clientHeight || 0;
    if (s != null) return !!s;
    if (V._palAuto == null && hh > 0) V._palAuto = hh < F.PAL_ROOM;
    return V._palAuto == null ? true : V._palAuto;
  };
  F.palHtml = function (V) {
    F.palStyle();
    var P = V.opts.palette || [], open = !!(V.view && V.view.palMore), more = 0, i, fold = !!V.opts.palFold;
    var h = '<div class="fv-pal' + (open ? ' fvp-open' : '') + (F.palIsShut(V) ? ' fvp-shut' : '') + '">' +
      (fold ? '<span class="fvp-fold fvp-fo" data-fvp="fold" title="Show the quick buttons: a click adds a step, or drag one onto a +">+ Quick add &#9652;</span>' : '') +
      '<div class="fvp-chips"><i>add (click) or drag:</i>';
    for (i = 0; i < P.length; i++) if (!P[i].more) h += chip(V, P[i], i); else more++;
    if (more) h += '<span class="fvp-more" data-fvp="more" title="The less used buttons">' + moreText(open) + '</span>';
    if (fold) h += '<span class="fvp-fold" data-fvp="fold" title="Fold the quick buttons away">Hide &#9662;</span>';
    for (i = 0; more && i < P.length; i++) if (P[i].more) h += chip(V, P[i], i);
    h += '</div><div class="fvp-where">' + whereText(V) + '</div></div>';
    if (!V._palBound && V.host.addEventListener) {
      V._palBound = true;
      V.host.addEventListener('click', function (e) {
        for (var t = e.target; t && t !== V.host && t.getAttribute; t = t.parentNode) {
          var fv = t.getAttribute('data-fvp');
          if (fv !== 'more' && fv !== 'fold') continue;
          var pal = t;
          while (pal && pal !== V.host && !/(^|\s)fv-pal(\s|$)/.test(String(pal.className || ''))) pal = pal.parentNode;
          if (pal === V.host) pal = null;
          if (fv === 'fold') V.view.palShut = !F.palIsShut(V);
          else { V.view.palMore = !V.view.palMore; t.innerHTML = moreText(V.view.palMore); }
          if (pal) pal.className = 'fv-pal' + (V.view.palMore ? ' fvp-open' : '') + (F.palIsShut(V) ? ' fvp-shut' : '');
          if (V.opts.onView) V.opts.onView(V.view);
          return;
        }
      });
    }
    return h;
  };
  F.palClick = function (V, i) {
    var p = (V.opts.palette || [])[i];
    if (!p) return;
    var w = F.whereSlot(V);
    if (V.opts.onPick) V.opts.onPick(p.key, w);
    else if (V.opts.onDropNew) V.opts.onDropNew(p.key, w.seq, w.idx);
  };

  var BTN = { pos: ['Here', 'Use the spot your character stands on'], points: ['Spots &#9662;', 'One of this file\'s own spots'], target: ['Target', 'Use the name of your current target'],
    hover: ['Hover', 'Hover it in game: the name fills in after 3 seconds'], fights: ['From fights', 'Pick what appeared in a fight (JB Analysis)'],
    abil: ['Pick &#9662;', 'The ability list, with each ability\'s icon'] };
  var WHO_OIC = [['', 'the whole group'], ['igw:{{me}}+fighter', 'the fighters'], ['igw:{{me}}+priest', 'the healers'], ['igw:{{me}}+mage', 'the mages'],
    ['igw:{{me}}+scout', 'the scouts'], ['igwbn:{{me}}', 'everyone but me']];
  F.snipStyle = function () {
    if (typeof document === 'undefined' || document.getElementById('fvs-style')) return;
    var css = [
      '.fvs{font-family:"Segoe UI",Tahoma,sans-serif;font-size:11px;color:var(--text-bright,#dfe7f3);}',
      '.fvs-h{display:flex;align-items:center;gap:6px;margin-bottom:3px;}',
      '.fvs-h b{font-size:12.5px;color:var(--header-gold,#e6c34d);}',
      '.fvs-help{color:var(--text-primary,#9fb0c6);font-size:10.5px;line-height:1.35;margin-bottom:6px;}',
      '.fvs-row{display:grid;grid-template-columns:150px 1fr;gap:2px 8px;align-items:center;margin:4px 0;}',
      '.fvs-lab{color:var(--text-primary,#b8c4d6);}',
      '.fvs-lab .fvs-req{color:var(--text-warn,#e0a040);margin-left:2px;}',
      '.fvs-ctl{display:flex;gap:4px;align-items:center;flex-wrap:wrap;min-width:0;}',
      '.fvs-ctl input[type=text]{flex:1;min-width:90px;font-size:11px;padding:2px 6px;background:var(--bg-input,#0b1120);color:var(--text-bright,#dfe7f3);border:1px solid var(--border-med,rgba(140,160,190,0.45));border-radius:var(--radius,3px);}',
      '.fvs-ctl input.fvs-short{flex:0 0 60px;min-width:50px;}',
      '.fvs-ctl select{font-size:11px;background:var(--bg-input,#0b1120);color:var(--text-bright,#dfe7f3);border:1px solid var(--border-med,rgba(140,160,190,0.45));border-radius:var(--radius,3px);}',
      '.fvs-b{display:inline-block;padding:1px 7px;font-size:10.5px;line-height:16px;border:1px solid var(--border-med,rgba(140,160,190,0.45));border-radius:var(--radius,4px);cursor:pointer;color:var(--text-bright,#dfe7f3);background:var(--tint-hover,rgba(255,255,255,0.04));white-space:nowrap;}',
      '.fvs-b:hover{background:var(--tint-on,rgba(153,204,255,0.2));border-color:var(--accent-cyan,#99ccff);}',
      '.fvs-tick{grid-column:1 / span 2;display:flex;gap:6px;align-items:center;cursor:pointer;color:var(--text-bright,#dfe7f3);}',
      '.fvs-sub{grid-column:2;color:var(--text-secondary,#8fa0b8);font-size:10px;}',
      '.fvs-spot{display:flex;gap:4px;align-items:center;width:100%;}',
      '.fvs-ic{display:inline-block;width:18px;height:18px;line-height:0;}',
      '.fvs-prev{margin-top:6px;border-top:1px dashed var(--border-med,rgba(140,160,190,0.3));padding-top:4px;max-height:150px;overflow-y:auto;}',
      '.fvs-prev div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:18px;}',
      '.fvs-miss{color:var(--text-warn,#f2c94c);font-size:10.5px;margin-top:4px;}',
      '.fvs-note{color:var(--text-secondary,#8fa0b8);font-size:10px;margin-top:2px;}',
      '.fvs-acts{display:flex;gap:6px;justify-content:flex-end;align-items:center;margin-top:6px;}',
      '.fvs-add{padding:2px 12px;border-radius:var(--radius,4px);border:1px solid var(--line-accent,rgba(0,204,255,0.45));background:var(--tint-accent,rgba(0,204,255,0.14));color:var(--accent-blue,#00ccff);cursor:pointer;font-size:11.5px;}',
      '.fvs-add.fvs-off{border-color:var(--border-med,rgba(140,160,190,0.35));background:var(--tint-hover,rgba(255,255,255,0.03));color:var(--text-secondary,#6f7f96);cursor:default;}',
      '.fvs-menu{position:fixed;z-index:260;max-height:260px;min-width:220px;overflow-y:auto;background:var(--bg-panel,#0b1120);border:1px solid var(--line-accent,rgba(153,204,255,0.5));border-radius:5px;box-shadow:0 6px 18px rgba(0,0,0,0.6);font-size:11px;padding:3px 0;}',
      '.fvs-menu input{margin:3px 6px;width:calc(100% - 12px);font-size:11px;background:var(--bg-input,#0b1120);color:var(--text-bright,#dfe7f3);border:1px solid var(--border-med,rgba(140,160,190,0.45));}',
      '.fvs-menu div[data-fvsm]{padding:2px 8px;cursor:pointer;white-space:nowrap;display:flex;gap:6px;align-items:center;}',
      '.fvs-menu div[data-fvsm]:hover{background:var(--tint-on,rgba(153,204,255,0.12));}'
    ].join('\n');
    var st = document.createElement('style');
    st.id = 'fvs-style';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  };
  F.snipForm = function (host, sn, fmt, opts) {
    var S = IC.snip, I = IC.icons;
    if (!host || !S || !sn) return null;
    F.snipStyle();
    opts = opts || {};
    var ps = S.paramsFor(sn, fmt), vals = S.values(sn, opts.values || {}), live = true;
    function shown(p) {
      var v = vals[p.name];
      if (p.type === 'point3f') return v ? S.spotText(v).replace(/,/g, ', ') : '';
      if (p.unit === 'ms') return v == null || v === '' ? '' : String(v / 1000);
      return v == null ? '' : str(v);
    }
    function btns(p, i) {
      var h = '';
      (p.grab || []).forEach(function (g) {
        if (g === 'points' && !opts.points) return;
        if (g === 'fights' && !opts.fights) return;
        if (g === 'abil' && !opts.abilPick) return;
        if ((g === 'pos' || g === 'target' || g === 'hover') && !opts.grab) return;
        var b = BTN[g];
        if (b) h += '<span class="fvs-b" data-fvs="' + g + ':' + i + '" title="' + esc(b[1]) + '">' + (g === 'pos' && p.list ? '+ Where I stand' : b[0]) + '</span>';
      });
      return h;
    }
    function icon(p, i) { return p.ability && I && opts.gameIcon ? '<span class="fvs-ic" data-fvic="' + i + '">' + iconHtml(p) + '</span>' : ''; }
    function row(p, i) {
      var lab = '<div class="fvs-lab">' + esc(p.label) + (p.required ? '<span class="fvs-req">*</span>' : '') + '</div>';
      if (p.type === 'bool') return '<label class="fvs-tick"><input type="checkbox" data-fvi="' + i + '"' + (vals[p.name] ? ' checked' : '') + '> ' + esc(p.label) + '</label>';
      if (p.type === 'point3f' && p.list) {
        var L = vals[p.name] || [], h = '';
        for (var k = 0; k < L.length; k++) h += '<div class="fvs-spot"><span>' + (k + 1) + '.</span><span style="flex:1">' + esc(S.spotText(L[k]).replace(/,/g, ', ')) + '</span><span class="fvs-b" data-fvs="del:' + i + ':' + k + '" title="Take this spot out">&#10005;</span></div>';
        return '<div class="fvs-row">' + lab + '<div class="fvs-ctl">' + (h || '<span class="fvs-note">no spots yet</span>') + btns(p, i) + '</div>' +
          (p.help ? '<div class="fvs-sub">' + esc(p.help) + '</div>' : '') + '</div>';
      }
      var ctl;
      if (p.type === 'forwho') {
        var W = fmt === 'oic' ? WHO_OIC : ((IC.reg && IC.reg.WHO_JB) || [['all', 'Everyone']]);
        ctl = '<select data-fvi="' + i + '">';
        for (var w = 0; w < W.length; w++) ctl += '<option value="' + esc(W[w][0]) + '"' + (str(vals[p.name]) === W[w][0] ? ' selected' : '') + '>' + esc(W[w][1]) + '</option>';
        ctl += '</select>';
      } else {
        ctl = icon(p, i) + '<input type="text" data-fvi="' + i + '"' + (p.type === 'int' ? ' class="fvs-short"' : '') + ' value="' + esc(shown(p)) + '"' +
          (p.type === 'point3f' ? ' placeholder="x, y, z"' : '') + '>' + (p.unit ? '<span>' + (p.unit === 'ms' ? 's' : esc(p.unit)) + '</span>' : '') + btns(p, i);
      }
      return '<div class="fvs-row">' + lab + '<div class="fvs-ctl">' + ctl + '</div>' + (p.help ? '<div class="fvs-sub">' + esc(p.help) + '</div>' : '') + '</div>';
    }
    function draw() {
      var h = '<div class="fvs"><div class="fvs-h">' + (opts.title !== false ? '<b>' + esc(sn.label) + '</b>' : '') + '</div>' +
        (sn.help ? '<div class="fvs-help">' + esc(sn.help) + '</div>' : '');
      for (var i = 0; i < ps.length; i++) h += row(ps[i], i);
      h += '<div class="fvs-prev"></div><div class="fvs-miss"></div><div class="fvs-note">' + (opts.where || '') + '</div>' +
        '<div class="fvs-acts"><span class="fvs-b" data-fvs="cancel">Cancel</span><span class="fvs-add" data-fvs="add">Add</span></div></div>';
      host.innerHTML = h;
      refresh();
    }
    function q(sel) { return host.querySelector ? host.querySelector(sel) : null; }
    function refresh() {
      var miss = S.missing(sn, vals, fmt), b = S.build(sn, vals, fmt, opts.ctx ? opts.ctx() : {}), n = b.steps.length;
      var add = q('[data-fvs="add"]'), m = q('.fvs-miss'), pv = q('.fvs-prev');
      if (add) { add.className = 'fvs-add' + (miss.length || !n ? ' fvs-off' : ''); add.textContent = 'Add ' + (n === 1 ? 'the step' : n + ' steps'); }
      if (m) m.textContent = miss.length ? 'Still needed: ' + miss.map(function (x) { return x.label.toLowerCase(); }).join(', ') : (b.notes.length ? b.notes.join(' ') : '');
      if (pv) pv.innerHTML = opts.preview ? opts.preview(b.steps, vals) : '';
      for (var i = 0; i < ps.length; i++) if (ps[i].ability) { var ic = q('[data-fvic="' + i + '"]'); if (ic) ic.innerHTML = iconHtml(ps[i]); }
    }
    function iconHtml(p) { var g = I && I.forAbil ? I.forAbil(vals[p.name]) : null; return g && opts.gameIcon ? opts.gameIcon(g, 18) : ''; }
    function read(el) {
      var i = +el.getAttribute('data-fvi'), p = ps[i];
      if (!p) return;
      if (p.type === 'bool') vals[p.name] = !!el.checked;
      else if (p.unit === 'ms') { var s = parseFloat(el.value); vals[p.name] = isFinite(s) ? Math.round(s * 1000) : null; }
      else vals[p.name] = S.norm(p, el.value);
      refresh();
    }
    function set(i, v, redraw) {
      var p = ps[i];
      if (!p || v == null || v === '') return;
      if (p.type === 'point3f' && p.list) { var s = S.spot(v); if (s) vals[p.name] = (vals[p.name] || []).concat([s]); }
      else vals[p.name] = S.norm(p, v);
      if (redraw || p.list) draw();
      else {
        var el = q('[data-fvi="' + i + '"]');
        if (el) el.value = shown(p);
        refresh();
      }
    }
    function menu(anchor, items, onPick, search) {
      if (typeof document === 'undefined') return;
      var old = document.getElementById('fvs-menu');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var m = document.createElement('div'), r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: 40, bottom: 40 };
      m.id = 'fvs-menu';
      m.className = 'fvs-menu';
      function list(qy) {
        var h = '', n = 0;
        for (var i = 0; i < items.length && n < 120; i++) if (!qy || items[i].t.toLowerCase().indexOf(qy) >= 0) { h += '<div data-fvsm="' + i + '">' + (items[i].ic || '') + '<span>' + esc(items[i].t) + '</span></div>'; n++; }
        return h || '<div style="padding:4px 8px;color:var(--text-secondary,#8fa0b8);">Nothing here.</div>';
      }
      m.innerHTML = (search ? '<input type="text" placeholder="search...">' : '') + '<div class="fvs-ml">' + list('') + '</div>';
      try { var cs = root.getComputedStyle ? root.getComputedStyle(anchor) : null; if (cs) ['--bg-panel', '--bg-input', '--line-accent', '--text-bright', '--border-med', '--tint-on'].forEach(function (k) { var v = cs.getPropertyValue(k); if (v) m.style.setProperty(k, v); }); } catch (_e) {}
      document.body.appendChild(m);
      m.style.left = Math.max(4, Math.min(Math.round(r.left), (root.innerWidth || 1200) - 260)) + 'px';
      m.style.top = Math.max(4, Math.min(Math.round(r.bottom + 2), (root.innerHeight || 800) - 270)) + 'px';
      var inp = m.getElementsByTagName('input')[0];
      if (inp) { inp.addEventListener('input', function () { m.lastChild.innerHTML = list(inp.value.toLowerCase()); }); setTimeout(function () { try { inp.focus(); } catch (_e) {} }, 20); }
      m.addEventListener('mousedown', function (e) { e.stopPropagation(); });
      m.addEventListener('click', function (e) {
        for (var t = e.target; t && t !== m && t.getAttribute; t = t.parentNode) {
          var i = t.getAttribute('data-fvsm');
          if (i != null) { m.parentNode.removeChild(m); onPick(items[+i]); return; }
        }
      });
      setTimeout(function () {
        document.addEventListener('mousedown', function off(e) {
          for (var t = e.target; t; t = t.parentNode) if (t === m) return;
          if (m.parentNode) m.parentNode.removeChild(m);
          document.removeEventListener('mousedown', off);
        });
      }, 0);
    }
    function onClick(e) {
      for (var t = e.target; t && t !== host && t.getAttribute; t = t.parentNode) {
        var a = t.getAttribute('data-fvs');
        if (!a) continue;
        var bits = a.split(':'), what = bits[0], i = +bits[1], p = ps[i];
        if (what === 'cancel') { live = false; if (opts.onCancel) opts.onCancel(); return; }
        if (what === 'add') { if (!S.missing(sn, vals, fmt).length && S.build(sn, vals, fmt, opts.ctx ? opts.ctx() : {}).steps.length) { live = false; if (opts.onAdd) opts.onAdd(vals); } return; }
        if (what === 'del') { vals[p.name].splice(+bits[2], 1); draw(); return; }
        if (what === 'pos' || what === 'target' || what === 'hover') { opts.grab(what, function (v) { if (live) set(i, v); }); return; }
        if (what === 'points') {
          var P = opts.points() || [];
          menu(t, P.map(function (x) { return { t: x.t, v: x.spot }; }), function (it) { set(i, it.v); }, P.length > 12);
          return;
        }
        if (what === 'fights') { opts.fights(t, function (v) { if (live && v) set(i, v); }); return; }
        if (what === 'abil') { opts.abilPick(t, function (v) { if (live && v) set(i, v, true); }); return; }
      }
    }
    function onInput(e) { var t = e.target; if (t && t.getAttribute && t.getAttribute('data-fvi') != null) read(t); }
    host.onclick = onClick;
    host.oninput = onInput;
    host.onchange = onInput;
    draw();
    if (opts.autoGrab) {
      for (var a = 0; a < ps.length; a++) {
        var p0 = ps[a];
        if (p0.required && p0.type === 'string' && (p0.grab || []).indexOf('hover') >= 0 && !vals[p0.name]) {
          (function (i, lab) { opts.autoGrab(lab, function (v) { if (live && v && !vals[ps[i].name]) set(i, v); }); })(a, p0.label);
          break;
        }
      }
    }
    return { values: function () { return vals; }, refresh: refresh, close: function () { live = false; } };
  };
})(typeof window !== 'undefined' ? window : this);
