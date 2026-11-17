/* Open IC Creator - ic-ui-list.js
   List widget for step forms (joust points, run options, required items). Overlay UI.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var F = IC.form = IC.form || {};
  function str(v) { return v == null ? '' : String(v); }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function $(id) { return (typeof document !== 'undefined') ? document.getElementById(id) : null; }
  function fid(sc, n, sub) { return 'icf-' + sc + '-' + n + (sub ? '-' + sub : ''); }
  function esc(s) { return F.esc(s); }

  function asItem(f, it) {
    if (typeof it === 'string' && f.strItems) { var o = {}; o[f.strItems] = it; return o; }
    return it || {};
  }
  function itemVisible(g, it, items) {
    var w = g.when;
    if (!w) return true;
    var cur = str(it[w.k]);
    for (var i = 0; cur === '' && i < items.length; i++) if (items[i].key === w.k && items[i].def !== undefined) cur = str(items[i].def);
    return w['in'] ? w['in'].indexOf(cur) >= 0 : true;
  }
  function itemCtl(sc, n, i, gi, g, it) {
    var id = fid(sc, n, 'r' + i + '-' + gi), ch = "icListSet('" + sc + "'," + n + ',' + i + ',' + gi + ')';
    if (g.kind === 'check') {
      var v = has(it, g.key) ? (it[g.key] === true || it[g.key] === 'true' || it[g.key] === 1) : false;
      return '<label class="icf-chk"><input type="checkbox" id="' + id + '"' + (v ? ' checked' : '') + ' onchange="' + ch + '"> ' + esc(g.label) + '</label>';
    }
    if (g.kind === 'select') {
      var o = [], seen = false, cur = has(it, g.key) ? str(it[g.key]) : str(g.def);
      for (var k = 0; k < g.opts.length; k++) { if (str(g.opts[k][0]) === cur) seen = true; o.push({ value: str(g.opts[k][0]), label: esc(g.opts[k][1]) }); }
      if (!seen && cur !== '') o.unshift({ value: cur, label: esc('Other: ' + cur) });
      return (typeof jbDropdown === 'function') ? jbDropdown(id, o, cur, { fontSize: '10px', style: 'width:100%;', onchange: ch }) : '';
    }
    var val;
    if (g.kind === 'xyz') val = (typeof it.x === 'number' || it.x != null) ? (it.x + ',' + (it.y == null ? 0 : it.y) + ',' + (it.z == null ? 0 : it.z)) : '';
    else if (g.kind === 'pair') {
      var a = Array.isArray(it[g.key]) ? it[g.key] : [];
      return '<input type="text" class="input-text icf-in" id="' + id + '" value="' + esc(str(a[0])) + '" placeholder="' + esc(g.ph0 || 'from') + '" onchange="' + ch + '">' +
        '<input type="text" class="input-text icf-in" id="' + id + '-b" value="' + esc(str(a[1])) + '" placeholder="' + esc(g.ph1 || 'to') + '" onchange="' + ch + '">';
    }
    else val = has(it, g.key) ? str(it[g.key]) : '';
    var h = '<input type="text" class="input-text icf-in" id="' + id + '" value="' + esc(val) + '" onchange="' + ch + '">';
    if (g.kind === 'xyz' || (g.grab || []).indexOf('pos') >= 0) h += '<button class="btn btn-sm icf-grab" onclick="icListGrab(\'' + sc + '\',' + n + ',' + i + ',' + gi + ')">Pos</button>';
    return h;
  }

  F.listCtl = function (sc, n, f, arr, e) {
    var h = '<div class="icf-list">';
    if (!arr.length) h += '<div class="icf-help">Nothing here yet.</div>';
    for (var i = 0; i < arr.length; i++) {
      var it = asItem(f, arr[i]);
      h += '<div class="icf-li"><div class="icf-li-h"><b>' + (f.itemName || 'Item') + ' ' + (i + 1) + '</b>' +
        '<button class="btn btn-sm" onclick="icListOp(\'' + sc + '\',' + n + ',' + i + ',\'up\')">&#9650;</button>' +
        '<button class="btn btn-sm" onclick="icListOp(\'' + sc + '\',' + n + ',' + i + ',\'down\')">&#9660;</button>' +
        '<button class="btn btn-sm btn-danger" onclick="icListOp(\'' + sc + '\',' + n + ',' + i + ',\'del\')">&#10005;</button></div><div class="icf-li-b">';
      for (var gi = 0; gi < f.item.length; gi++) {
        var g = f.item[gi];
        if (!itemVisible(g, it, f.item)) continue;
        h += '<div class="icf-li-f">' + (g.kind === 'check' ? '' : '<span class="icf-xlab">' + esc(g.label) + '</span>') + itemCtl(sc, n, i, gi, g, it) + '</div>';
      }
      h += '</div></div>';
    }
    h += '<div class="icf-name-add"><button class="btn btn-sm btn-success" onclick="icListOp(\'' + sc + '\',' + n + ',-1,\'add\')">+ Add</button>';
    if (f.addPos) h += '<button class="btn btn-sm" onclick="icListOp(\'' + sc + '\',' + n + ',-1,\'addpos\')">+ Add where I stand</button>';
    return h + '</div></div>';
  };

  function arrOf(t, create) {
    var e = t.get(); if (!e) return null;
    var a = IC.pack.rawGet(e, t.f, t.s, t.ctx);
    if (!Array.isArray(a)) { if (!create) return null; a = []; IC.pack.set(e, t.f, t.s, t.ctx, a); }
    return a;
  }
  function setItem(it, g, el, el2) {
    var v = el ? el.value : '';
    if (g.kind === 'check') {
      var c = el && el.checked;
      if (c) it[g.key] = (g.on === undefined ? true : g.on);
      else if (g.off !== undefined) it[g.key] = g.off;
      else if (has(it, g.key)) it[g.key] = (typeof it[g.key] === 'boolean') ? false : '';
      return;
    }
    if (g.kind === 'xyz') {
      var p = IC.pack.posParse(v);
      if (p) { it.x = p.x; it.y = p.y; it.z = p.z; }
      return;
    }
    if (g.kind === 'pair') {
      var a = [v, el2 ? el2.value : ''];
      if (a[0] === '' && a[1] === '') { if (has(it, g.key)) delete it[g.key]; return; }
      it[g.key] = a;
      return;
    }
    if (v === '' && !has(it, g.key)) return;
    if (v === '' && g.dropEmpty) { delete it[g.key]; return; }
    if (typeof it[g.key] === 'number' || g.store === 'number') { var nn = Number(v); it[g.key] = (v === '' || isNaN(nn)) ? v : nn; return; }
    it[g.key] = v;
  }
  root.icListSet = function (sc, n, i, gi) {
    var t = F.tbls[sc] && F.tbls[sc][n]; if (!t) return;
    var arr = arrOf(t, false); if (!arr || i >= arr.length) return;
    var g = t.f.item[gi], id = fid(sc, n, 'r' + i + '-' + gi), el = $(id), el2 = $(id + '-b');
    if (typeof arr[i] === 'string' && t.f.strItems) {
      if (g.key === t.f.strItems) { arr[i] = el ? el.value : arr[i]; if (t.onChange) t.onChange(t, false); return; }
      var o = {}; o[t.f.strItems] = arr[i]; arr[i] = o;
    }
    if (arr[i] == null || typeof arr[i] !== 'object') arr[i] = {};
    setItem(arr[i], g, el, el2);
    if (t.onChange) t.onChange(t, g.kind === 'select' || g.kind === 'check');
  };
  root.icListOp = function (sc, n, i, op) {
    var t = F.tbls[sc] && F.tbls[sc][n]; if (!t) return;
    var arr = arrOf(t, op === 'add' || op === 'addpos'); if (!arr) return;
    if (op === 'add' || op === 'addpos') {
      var it = t.f.newItem ? t.f.newItem() : {};
      if (op === 'addpos' || t.f.addPos) {
        var p = IC.pack.posParse(F.myPos());
        if (p) { it.x = p.x; it.y = p.y; it.z = p.z; } else if (op === 'addpos') { if (typeof colToast === 'function') colToast('No position yet.', 'warn'); }
        if (it.x === undefined) { it.x = 0; it.y = 0; it.z = 0; }
      }
      for (var di = 0; di < t.f.item.length; di++) {
        var dg = t.f.item[di];
        if (dg.def !== undefined && dg.kind !== 'xyz' && !has(it, dg.key)) it[dg.key] = dg.def;
      }
      if (t.f.strItems && !t.f.newItem) it = '';
      arr.push(it);
    } else if (op === 'del') arr.splice(i, 1);
    else if (op === 'up' && i > 0) { var a = arr[i]; arr[i] = arr[i - 1]; arr[i - 1] = a; }
    else if (op === 'down' && i < arr.length - 1) { var b = arr[i]; arr[i] = arr[i + 1]; arr[i + 1] = b; }
    if (t.onChange) t.onChange(t, true);
  };
  root.icListGrab = function (sc, n, i, gi) {
    F.grabValue('pos', function (v) {
      if (!v) return;
      var el = $(fid(sc, n, 'r' + i + '-' + gi));
      if (el) { el.value = v; root.icListSet(sc, n, i, gi); }
    });
  };
})(typeof window !== 'undefined' ? window : this);
