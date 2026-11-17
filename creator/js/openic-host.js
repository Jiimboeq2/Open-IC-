/* Open IC Creator - openic-host.js
   The host for the Creator modules (IC.host): stand-ins for the page functions the modules call (sendCommand,
   requestFileWith, lazyLoadJS, jbDropdown, jbConfirm, colToast, invItemIcon ...), the dialogs and toasts, and the
   bridge to the game. In a normal browser there is no game: every line that would run in game is shown in the
   console-lines box instead. Inside native Ogre's window (ISXOgreX.UI, window.ogreCall present) the page talks to
   host/OpenIC.iss: it puts values in hidden fields with ogreUISet and fires one fixed event per action; the script
   answers by setting the openic-msg-* fields, whose change events land here.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var H = IC.host = IC.host || {};
  var G = (typeof globalThis === 'object' && globalThis) || Function('return this')();

  function str(v) { return v == null ? '' : String(v); }
  function $(id) { return typeof document !== 'undefined' ? document.getElementById(id) : null; }
  function esc(s) { return str(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

  H.WIN = 'openic';
  H.inGame = typeof G.ogreCall === 'function';
  H.ext = { ogrex: H.inGame ? true : null, eq2: null, ogreEq2: null, bot: null, jqb: null, add: null, note: '' };
  H.me = null;
  H.lines = [];
  H.handlers = {};
  H.seen = {};

  /* ------------------------------------------------------------ small storage that never throws (Ogre's page has none) */
  H.store = function (key, val) {
    try {
      if (!G.localStorage) return null;
      if (val === undefined) return G.localStorage.getItem('openic.' + key);
      G.localStorage.setItem('openic.' + key, String(val));
    } catch (e) { return null; }
    return null;
  };

  /* ------------------------------------------------------------ toasts, dialogs, the console-lines box */
  H.toast = function (msg, kind) {
    if (typeof document === 'undefined') return;
    var box = $('openic-toasts');
    if (!box) { box = document.createElement('div'); box.id = 'openic-toasts'; ($('openic-root') || document.body).appendChild(box); }
    var d = document.createElement('div');
    d.className = 'oic-toast oic-toast-' + (kind === 'err' || kind === 'warn' ? kind : 'ok');
    d.textContent = str(msg);
    box.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, kind === 'err' ? 6000 : 3500);
  };

  var modalCb = null, modalMode = 'alert';
  function modal(title, msg, mode, def, cb) {
    var m = $('openic-modal');
    if (!m) { if (cb) cb(mode === 'confirm' ? false : (mode === 'prompt' ? null : undefined)); return; }
    $('openic-modal-title').textContent = title || '';
    $('openic-modal-msg').textContent = msg || '';
    var inp = $('openic-modal-input');
    inp.style.display = mode === 'prompt' ? '' : 'none';
    inp.value = mode === 'prompt' ? str(def) : '';
    $('openic-modal-cancel').style.display = mode === 'alert' ? 'none' : '';
    $('openic-modal-ok').textContent = mode === 'confirm' ? 'Yes' : 'OK';
    modalCb = cb || null; modalMode = mode;
    m.style.display = 'flex';
    if (mode === 'prompt') setTimeout(function () { try { inp.focus(); inp.select(); } catch (e) {} }, 20);
  }
  H.modalDone = function (ok) {
    var m = $('openic-modal'), cb = modalCb, mode = modalMode, v = $('openic-modal-input') ? $('openic-modal-input').value : '';
    if (m) m.style.display = 'none';
    modalCb = null;
    if (!cb) return;
    if (mode === 'prompt') cb(ok ? v : null);
    else if (mode === 'confirm') cb(!!ok);
    else cb();
  };
  H.alert = function (title, msg, cb) { modal(title, msg, 'alert', '', cb); };
  H.confirm = function (title, msg, cb) { modal(title, msg, 'confirm', '', cb); };
  H.prompt = function (title, msg, def, cb) { modal(title, msg, 'prompt', def, cb); };

  /* a console line: run it in game when the bridge can, else show it so it can be typed into the InnerSpace console */
  H.showLine = function (line, why) {
    H.lines.unshift({ line: str(line), why: str(why || '') });
    if (H.lines.length > 40) H.lines.length = 40;
    var el = $('openic-lines');
    if (!el) return;
    var h = '';
    for (var i = 0; i < H.lines.length; i++) h += '<div class="oic-line"><code>' + esc(H.lines[i].line) + '</code>' + (H.lines[i].why ? '<span>' + esc(H.lines[i].why) + '</span>' : '') + '</div>';
    el.innerHTML = h;
    var box = $('openic-linebox');
    if (box) box.style.display = '';
  };

  /* ------------------------------------------------------------ the game bridge */
  /* page -> script: fields first (ogreUISet keeps the script's Value reads in step), then one fixed event per action */
  H.set = function (id, value) {
    var el = $(id);
    if (H.inGame && typeof G.ogreUISet === 'function') G.ogreUISet(H.WIN, id, str(value));
    else if (el) el.value = str(value);
  };
  H.call = function (action, fields) {
    if (!/^[A-Za-z]+$/.test(action)) return false;
    for (var k in fields) if (Object.prototype.hasOwnProperty.call(fields, k)) H.set('openic-arg-' + k, fields[k]);
    if (!H.inGame) return false;
    G.ogreCall('cmd', 'Event[OpenIC_' + action + ']:Execute');
    return true;
  };
  /* script -> page: "<seq>|<payload>" in an openic-msg-<channel> field */
  H.on = function (channel, fn) { (H.handlers[channel] = H.handlers[channel] || []).push(fn); };
  function deliver(channel, raw) {
    raw = str(raw);
    var bar = raw.indexOf('|'), seq = bar > 0 ? raw.slice(0, bar) : '', payload = bar > 0 ? raw.slice(bar + 1) : raw;
    if (seq && H.seen[channel] === seq) return;
    if (seq) H.seen[channel] = seq;
    var L = H.handlers[channel] || [];
    for (var i = 0; i < L.length; i++) { try { L[i](payload); } catch (e) { H.toast('Could not read what the game sent (' + channel + '): ' + e.message, 'err'); } }
  }
  H.CHANNELS = ['ext', 'me', 'file', 'say', 'route', 'check'];
  H.bind = function () {
    for (var i = 0; i < H.CHANNELS.length; i++) (function (ch) {
      var el = $('openic-msg-' + ch);
      if (!el || el._oic) return;
      el._oic = true;
      var go = function () { if (el.value) deliver(ch, el.value); };
      el.addEventListener('input', go);
      el.addEventListener('change', go);
    })(H.CHANNELS[i]);
    H.on('ext', function (p) {
      var o = {};
      p.split(';').forEach(function (kv) { var e = kv.indexOf('='); if (e > 0) o[kv.slice(0, e)] = kv.slice(e + 1); });
      H.ext.ogrex = true;
      H.ext.eq2 = o.eq2 === '1'; H.ext.ogreEq2 = o.ogreeq2 === '1'; H.ext.bot = o.bot === '1'; H.ext.jqb = o.jqb === '1'; H.ext.add = o.add === '1';
      H.ext.note = o.note || '';
      if (H.onExt) H.onExt(H.ext);
    });
    H.on('me', function (p) {
      var a = p.split('|'), xyz = (a[0] || '').split(',');
      if (xyz.length === 3 && isFinite(+xyz[0]) && isFinite(+xyz[1]) && isFinite(+xyz[2]) && a[0] !== '') {
        H.me = { x: +xyz[0], y: +xyz[1], z: +xyz[2], zone: a[1] || '', target: a[2] || '', subclass: str(a[3]).toLowerCase() };
      }
      if (H.onMe) H.onMe(H.me);
    });
    H.on('say', function (p) { var k = /^(err|warn|ok):/.exec(p); H.toast(k ? p.slice(k[0].length) : p, k ? k[1] : 'ok'); });
  };
  /* the page is up: ask the script for the extension list (a call sent while loading reaches it before the window
     counts as open, so this goes out on a timer) */
  H.hello = function () { if (H.inGame) setTimeout(function () { H.call('Hello', {}); }, 300); };

  /* ------------------------------------------------------------ stand-ins for the page functions the modules call */
  var S = H.shims = {};
  S.sendCommand = function (cmd, args) {
    if (cmd === 'exec') { H.showLine(args, 'a console line'); return; }
    H.toast('This needs ISXJQB\'s own window (' + str(cmd) + ').', 'warn');
  };
  S.requestFileWith = function (path, cb) { setTimeout(function () { if (cb) cb(path, null); }, 0); };
  S.requestDirWith = function (path, cb) { setTimeout(function () { if (cb) cb(path, []); }, 0); };
  var loaded = {};
  S.lazyLoadJS = function (src, cb) {
    if (H.inGame || loaded[src] || typeof document === 'undefined') { if (cb) setTimeout(cb, 0); return; }
    var s = document.createElement('script');
    s.src = src;
    s.onload = function () { loaded[src] = true; if (cb) cb(); };
    s.onerror = function () { if (G.console) G.console.log('not loaded: ' + src); };
    document.head.appendChild(s);
  };
  S.colToast = function (msg, kind) { H.toast(msg, kind); };
  S.jbAlert = function (t, m, cb) { H.alert(t, m, cb); };
  S.jbConfirm = function (t, m, cb) { H.confirm(t, m, cb); };
  S.jbPrompt = function (t, m, d, cb) { H.prompt(t, m, d, cb); };
  /* game icons: EverQuest II's own sheets, 6 x 6 cells of 42 px on 256 px; icon id n is in sheet floor(n / 36) + 1 at
     place n % 36. Each sheet is a CSS class (css/openic-icons.css in a browser; in game, the asset pack's data: URIs). */
  H.ASSETS = 'assets/';
  H.CLASSES = ['Assassin', 'Beastlord', 'Berserker', 'Brigand', 'Bruiser', 'Channeler', 'Coercer', 'Conjuror', 'Defiler', 'Dirge', 'Fury',
    'Guardian', 'Illusionist', 'Inquisitor', 'Monk', 'Mystic', 'Necromancer', 'Paladin', 'Ranger', 'Shadowknight', 'Swashbuckler', 'Templar',
    'Troubador', 'Warden', 'Warlock', 'Wizard'];
  H.cell = function (id) {
    id = Math.floor(+id);
    if (!(id > 0)) return null;
    var tile = id % 36;
    return { sheet: Math.floor(id / 36) + 1, tile: tile, x: -((tile % 6) * 42), y: -(Math.floor(tile / 6) * 42) };
  };
  H.iconData = function () { return IC.iconData || {}; };
  S.invItemIcon = function (item, px, spell) {
    var c = H.cell(item && item.icon_id), D = H.iconData();
    if (!c || c.sheet > (spell ? (+D.spellSheets || 0) : (+D.itemSheets || 0))) return '';
    var dpr = (typeof G.devicePixelRatio === 'number' && G.devicePixelRatio) || 1, size = Math.round((px || 18) * dpr) / dpr, scale = size / 42;
    return '<span class="oic-ic oic-' + (spell ? 'sp' : 'it') + '-' + c.sheet + '" style="width:' + size + 'px;height:' + size + 'px;background-size:' +
      (256 * scale) + 'px ' + (256 * scale) + 'px;background-position:' + (c.x * scale) + 'px ' + (c.y * scale) + 'px;"></span>';
  };
  /* a class icon; the title is left to whoever shows it ("Who: <Class>" on a box) */
  S.jbClassIcon = function (sub, px) {
    var k = str(sub).trim().toLowerCase(), cap = '';
    for (var i = 0; i < H.CLASSES.length; i++) if (H.CLASSES[i].toLowerCase() === k) cap = H.CLASSES[i];
    if (!cap) return '';
    var D = H.iconData(), src = D.classData ? D.classData[cap] : (H.inGame ? '' : H.ASSETS + 'class_icons/' + cap + '.webp');
    if (!src) return '';
    var size = px || 15;
    return '<img class="oic-cls" src="' + src + '" style="width:' + size + 'px;height:' + size + 'px;" alt="' + cap + '">';
  };
  H.hasClassIcons = function () { return !H.inGame || !!H.iconData().classData; };
  S.escHtml = function (s) { return s == null || s === '' ? '' : esc(s); };
  S.escJs = function (s) { s = str(s); var h = ''; for (var i = 0; i < s.length; i++) h += ('0' + s.charCodeAt(i).toString(16)).slice(-2); return h; };
  S.unescJs = function (h) { h = str(h); var s = ''; for (var i = 0; i < h.length; i += 2) s += String.fromCharCode(parseInt(h.substr(i, 2), 16)); return s; };
  S.jbTipAttr = function (text) { return text ? ' title="' + esc(text) + '"' : ''; };
  S.jbDispName = function (s) { return s; };
  S._getPos = function () { return H.me ? { x: H.me.x.toFixed(2), y: H.me.y.toFixed(2), z: H.me.z.toFixed(2) } : { x: '0', y: '0', z: '0' }; };
  S._getTarget = function () { return H.me ? H.me.target : ''; };

  /* the theme's own drop-down (a <select> does not open in Ogre's window) */
  S.jbDropdown = function (id, options, selected, attrs) {
    attrs = attrs || {};
    var selValue = str(selected), selLabel = '', opts = '';
    for (var i = 0; i < (options || []).length; i++) {
      var o = options[i], val = str(typeof o === 'object' ? o.value : o), lab = typeof o === 'object' ? str(o.label || o.value) : str(o);
      if (val === selValue) selLabel = lab;
      opts += '<div class="jb-dropdown-opt' + (val === selValue ? ' selected' : '') + '" data-value="' + esc(val) + '" onclick="jbSelectOpt(this)">' + lab + '</div>';
    }
    if (!selLabel && options && options.length) {
      var f = options[0];
      selLabel = typeof f === 'object' ? str(f.label || f.value) : str(f);
      selValue = str(typeof f === 'object' ? f.value : f);
    }
    return '<div class="jb-dropdown" id="' + id + '-wrap" style="' + str(attrs.style) + '">' +
      '<div class="jb-dropdown-trigger" onclick="jbToggleDropdown(this)" data-value="' + esc(selValue) + '">' + selLabel + '</div>' +
      '<div class="jb-dropdown-menu">' + opts + '</div>' +
      '<input type="hidden" id="' + id + '" value="' + esc(selValue) + '"' + (attrs.onchange ? ' data-onchange="' + esc(attrs.onchange) + '"' : '') + '></div>';
  };
  S.jbCloseAllDropdowns = function () {
    var all = document.querySelectorAll('.jb-dropdown-menu.open');
    for (var i = 0; i < all.length; i++) { all[i].classList.remove('open'); if (all[i].previousElementSibling) all[i].previousElementSibling.classList.remove('open'); }
  };
  S.jbToggleDropdown = function (trigger) {
    var menu = trigger.nextElementSibling, open = menu.classList.contains('open');
    S.jbCloseAllDropdowns();
    if (!open) { trigger.classList.add('open'); menu.classList.add('open'); }
  };
  S.jbSelectOpt = function (opt) {
    var wrap = opt.closest('.jb-dropdown'), trigger = wrap.querySelector('.jb-dropdown-trigger'), hidden = wrap.querySelector('input[type=hidden]');
    var old = hidden.value, all = wrap.querySelectorAll('.jb-dropdown-opt');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('selected');
    opt.classList.add('selected');
    trigger.textContent = opt.textContent;
    trigger.setAttribute('data-value', opt.getAttribute('data-value'));
    hidden.value = opt.getAttribute('data-value');
    S.jbCloseAllDropdowns();
    var cb = hidden.getAttribute('data-onchange');
    if (cb && hidden.value !== old) { try { (new Function(cb))(); } catch (e) { H.toast('That choice did not work: ' + e.message, 'err'); } }
  };
  S.jbVal = function (id) { var el = $(id); return el ? el.value : ''; };
  S.jbSetVal = function (id, val) {
    var hidden = $(id);
    if (!hidden) return;
    hidden.value = val;
    var wrap = hidden.closest ? hidden.closest('.jb-dropdown') : null;
    if (!wrap) return;
    var all = wrap.querySelectorAll('.jb-dropdown-opt'), trigger = wrap.querySelector('.jb-dropdown-trigger');
    for (var i = 0; i < all.length; i++) {
      var on = all[i].getAttribute('data-value') === str(val);
      all[i].classList[on ? 'add' : 'remove']('selected');
      if (on) { trigger.textContent = all[i].textContent; trigger.setAttribute('data-value', str(val)); }
    }
  };
  S.jbSetOptions = function (id, options, selected) {
    var hidden = $(id), wrap = hidden && hidden.closest ? hidden.closest('.jb-dropdown') : null;
    if (!wrap) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = S.jbDropdown(id, options, selected);
    wrap.parentNode.replaceChild(tmp.firstChild, wrap);
  };

  /* the names the modules reach for, in the order the in-game build passes them (tools/build-window.js) */
  H.SHIM_NAMES = ['sendCommand', 'requestFileWith', 'requestDirWith', 'lazyLoadJS', 'colToast', 'jbAlert', 'jbConfirm', 'jbPrompt', 'invItemIcon',
    'jbClassIcon', 'escHtml', 'escJs', 'unescJs', 'jbTipAttr', 'jbDispName', '_getPos', '_getTarget', 'jbDropdown', 'jbVal', 'jbSetVal', 'jbSetOptions'];
  /* a normal browser page: the modules find these as page globals (nothing is replaced that the page already has) */
  H.exportGlobals = function () {
    var names = H.SHIM_NAMES.concat(['jbToggleDropdown', 'jbSelectOpt', 'jbCloseAllDropdowns']);
    for (var i = 0; i < names.length; i++) if (typeof G[names[i]] !== 'function') G[names[i]] = S[names[i]];
  };
  if (!H.inGame && root === G) H.exportGlobals();
})(typeof window !== 'undefined' ? window : this);
