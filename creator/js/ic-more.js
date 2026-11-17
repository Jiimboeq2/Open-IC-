/* Open IC Creator - ic-more.js
   Overlay UI: a small "More" menu (jbMoreMenu) of labelled actions.
   MIT License, see LICENSE. */
var _jbMoreBound = false;

function _jbMoreStyle() {
  if (document.getElementById('jb-more-style')) return;
  var s = document.createElement('style');
  s.id = 'jb-more-style';
  s.textContent =
    '#jb-more{position:fixed;z-index:9000;min-width:190px;max-width:360px;padding:3px 0;background:var(--bg-panel);border:1px solid var(--border-med);border-radius:4px;box-shadow:0 6px 18px rgba(0,0,0,0.55);font-size:var(--fs-11);}' +
    '.jb-more-i{display:flex;align-items:center;gap:7px;padding:4px 12px 4px 9px;color:var(--text-primary);cursor:pointer;white-space:nowrap;}' +
    '.jb-more-i:hover{background:rgba(153,204,255,0.12);color:var(--text-bright);}' +
    '.jb-more-ic{flex:none;width:16px;text-align:center;color:var(--text-secondary);}' +
    '.jb-more-i.danger,.jb-more-i.danger .jb-more-ic{color:var(--accent-red);}' +
    '.jb-more-h{padding:4px 12px 1px 9px;font-size:var(--fs-9);color:var(--text-secondary);}' +
    '.jb-more-s{height:1px;margin:3px 0;background:var(--border-dark);}' +
    '.jb-more-btn{padding:0 7px;line-height:14px;font-size:var(--fs-10);min-width:0;}';
  document.head.appendChild(s);
}

function _jbMoreTipHide() { if (window.jbTip && window.jbTip.hide) window.jbTip.hide(); }

function jbMoreClose() {
  var m = document.getElementById('jb-more');
  if (m && m.parentNode) { m.parentNode.removeChild(m); _jbMoreTipHide(); }
}

function _jbMoreInside(el, box) {
  for (; el; el = el.parentNode) if (el === box) return true;
  return false;
}

function _jbMoreBind() {
  if (_jbMoreBound) return;
  _jbMoreBound = true;
  document.addEventListener('mousedown', function (e) {
    var m = document.getElementById('jb-more');
    if (m && !_jbMoreInside(e.target, m) && !_jbMoreInside(e.target, m._anchor)) jbMoreClose();
  }, true);
  document.addEventListener('wheel', function (e) {
    var m = document.getElementById('jb-more');
    if (m && !_jbMoreInside(e.target, m)) jbMoreClose();
  }, true);
  document.addEventListener('keydown', function (e) { if (e.keyCode === 27) jbMoreClose(); }, true);
  window.addEventListener('resize', jbMoreClose);
}

function jbMoreMenu(anchor, items) {
  if (!anchor || !items || !items.length) return;
  var was = document.getElementById('jb-more'), same = !!was && was._anchor === anchor;
  jbMoreClose();
  if (same) return;
  _jbMoreStyle();
  _jbMoreBind();
  var m = document.createElement('div'), h = '', i;
  m.id = 'jb-more';
  m._anchor = anchor;
  for (i = 0; i < items.length; i++) {
    var it = items[i];
    if (it.sep) h += '<div class="jb-more-s"></div>';
    else if (it.head) h += '<div class="jb-more-h">' + escHtml(it.head) + '</div>';
    else {
      h += '<div class="jb-more-i' + (it.danger ? ' danger' : '') + '" data-more="' + i + '"' + (it.tip ? ' title="' + escHtml(it.tip) + '"' : '') + '>' +
        '<span class="jb-more-ic">' + (it.icon || '') + '</span>' + escHtml(it.label) + '</div>';
    }
  }
  m.innerHTML = h;
  m.addEventListener('click', function (e) {
    e.stopPropagation();
    for (var t = e.target; t && t !== m && t.getAttribute; t = t.parentNode) {
      var n = t.getAttribute('data-more');
      if (n == null) continue;
      jbMoreClose();
      if (items[+n] && items[+n].act) items[+n].act();
      return;
    }
  });
  document.body.appendChild(m);
  _jbMoreTipHide();
  var r = anchor.getBoundingClientRect(), w = m.offsetWidth, ht = m.offsetHeight;
  var vw = window.innerWidth || 1200, vh = window.innerHeight || 800;
  var top = r.bottom + 3 + ht > vh - 4 ? r.top - ht - 3 : r.bottom + 3;
  m.style.left = Math.max(4, Math.min(Math.round(r.right - w), vw - w - 4)) + 'px';
  m.style.top = Math.max(4, Math.round(top)) + 'px';
}

function jbInstRowMenu(btn, path, name, isDir) {
  if (isDir) {
    jbMoreMenu(btn, [
      { icon: '&#x25B8;', label: 'Open this folder', tip: 'The same as double-clicking it', act: function () { browseInstDir(path); } },
      { sep: true },
      { icon: '&#x2715;', label: 'Delete this folder...', danger: true, tip: 'Delete this folder and everything in it (asks first; cannot be undone)', act: function () { deleteInstPath(path, name, true); } }
    ]);
    return;
  }
  var stem = String(name || '').replace(/\.json$/i, '');
  var items = [];
  if (!(typeof _EMBEDDED_IC_MOVERS !== 'undefined' && _EMBEDDED_IC_MOVERS[stem])) {
    items.push({ icon: '&#128205;', label: 'Run from the step nearest me', tip: 'Find the step closest to where you are standing and run the file from there (skips everything before it)', act: function () { icBrowseRunNear(path); } });
  }
  if (items.length) items.push({ sep: true });
  items.push({ icon: '&#x2715;', label: 'Delete...', danger: true, tip: 'Delete this file (asks first; cannot be undone)', act: function () { deleteInstPath(path, name, false); } });
  jbMoreMenu(btn, items);
}
