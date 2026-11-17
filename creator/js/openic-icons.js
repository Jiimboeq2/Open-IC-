/* Open IC Creator - openic-icons.js
   Game icons in the page (IC.app): the ability list and the item list handed to IC.icons the way ic-icons.js asks for
   them; my class and my group's classes (only my class's ability art shows, another class's ability shows that
   class's icon first in the box's strip, "Who: <Class>"; no detriment icons on boxes); the Ability icons switch; the
   icons of boxes, chips and lines; and the class picker. The icons are EverQuest II's own art (Daybreak Game Company).
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var A = IC.app = IC.app || {};
  var G = (typeof globalThis === 'object' && globalThis) || Function('return this')();

  function H() { return IC.host; }
  function str(v) { return v == null ? '' : String(v); }
  function esc(s) { return str(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function $(id) { return document.getElementById(id); }

  A.iconPref = { abicons: true, myClass: '', group: [] };
  function isClass(c) { var L = H().CLASSES; for (var i = 0; i < L.length; i++) if (L[i].toLowerCase() === c) return true; return false; }
  function cap(c) { c = str(c); return c ? c.charAt(0).toUpperCase() + c.slice(1) : ''; }

  /* the saved choices, then whatever icon data is here (in game the asset pack calls A.iconsLoaded when it lands) */
  A.startIcons = function () {
    var p = A.iconPref, st = H().store, my = str(st('myClass')).toLowerCase(), grp = str(st('groupClasses')).toLowerCase();
    p.abicons = st('abicons') !== '0';
    p.myClass = isClass(my) ? my : '';
    p.group = grp.split(',').filter(isClass);
    A.st.fv.abicons = p.abicons;
    A.iconsLoaded(true);
  };
  A.iconsLoaded = function (quiet) {
    var D = IC.iconData || {}, W = IC.words;
    if (D.spellText && !A._spell && W && W.parseSpellIconPairs) A._spell = { pairs: W.parseSpellIconPairs(D.spellText), cls: W.parseSpellClasses(D.spellText) };
    A.applyIcons();
    if (!quiet && A.st && A.refresh) A.refresh();
  };
  A.myClass = function () { return A.iconPref.myClass || A._gameClass || ''; };
  /* in game: the class the character plays, used until a class is picked */
  A.gameClass = function (c) {
    c = str(c).toLowerCase();
    if (!isClass(c) || c === A._gameClass) return;
    A._gameClass = c;
    if (!A.iconPref.myClass) { A.applyIcons(); A.renderClassButton(); if (A.st.doc && A.st.view === 'flow') A.renderFlow(); }
  };
  /* IC.icons reads these when a graph is made (ic-icons.js: abilPair, abilClasses, itemPair, myClass, groupClasses,
     canClass, dets, off) */
  A.applyIcons = function () {
    var I = IC.icons, W = IC.words, D = IC.iconData || {}, sp = A._spell, on = A.st.fv.abicons !== false;
    if (!I) return;
    I.off = !on;
    I.abilPair = on && sp ? function (n) { return W.spellIconPair(sp.pairs, n); } : null;
    I.abilClasses = sp ? function (n) { return W.spellClasses(sp.cls, n) || []; } : null;
    I.itemPair = on && D.items ? function (n) { return D.items[str(n).trim().toLowerCase()] || 0; } : null;
    var mine = A.myClass(), grp = mine ? [mine] : [];
    for (var i = 0; i < A.iconPref.group.length; i++) if (grp.indexOf(A.iconPref.group[i]) < 0) grp.push(A.iconPref.group[i]);
    I.myClass = mine;
    I.groupClasses = grp;
    I.canClass = H().hasClassIcons();
    I.dets = false;
  };
  A.setAbIcons = function (on) {
    A.st.fv.abicons = !!on;
    A.iconPref.abicons = !!on;
    H().store('abicons', on ? '1' : '0');
    A.applyIcons();
    A.refresh();
  };

  /* a game icon: a class icon, an item picture, or a spell icon over its backdrop tile */
  A.gameIcon = function (gi, px) {
    var S = H().shims;
    px = px || 16;
    if (gi && gi.cls) return S.jbClassIcon(gi.cls, px);
    if (!gi || !(+gi.id > 0)) return '';
    if (gi.item) return S.invItemIcon({ icon_id: +gi.id }, px, false);
    var I = IC.icons, bt = I && I.backTile ? I.backTile(gi.back) : -1;
    var main = S.invItemIcon({ icon_id: +gi.id }, px, true);
    if (!main) return '';
    var back = bt > 0 ? S.invItemIcon({ icon_id: bt }, px, true) : '';
    if (!back) return main;
    var lay = function (h) { return h.replace('style="', 'style="position:absolute;left:0;top:0;'); };
    return '<span class="oic-stack" style="width:' + px + 'px;height:' + px + 'px;">' + lay(back) + lay(main) + '</span>';
  };
  A.abilIcon = function (name) { var p = IC.icons && IC.icons.forAbil ? IC.icons.forAbil(name) : null; return p && p.id > 0 ? A.gameIcon(p, 16) : ''; };
  A.iconById = function (id, back) { return +id > 0 ? A.gameIcon({ id: +id, back: back == null ? -1 : back }, 15) : ''; };

  /* the icon of a palette chip */
  A.ZONE_CHIP = { 'z:path': 'move', 'z:named': 'named', 'z:chest': 'loot', 'z:wait': 'wait', 'z:click': 'click', 'z:announce': 'tell', 'z:exit': 'door',
    'z:door': 'door', 'z:shinies': 'loot', 'z:waitFor': 'watch', 'z:waitForCombat': 'fight', 'z:teleporter': 'door', 'z:trash': 'trash', 'z:cast': 'cast',
    'z:hold': 'camp', 'z:release': 'move', 'z:option': 'option', 'z:setup': 'named', 'z:raw': 'message', 'z:repeat': 'repeat' };
  A.chipIcon = function (kind, chip) {
    var I = IC.icons;
    if (!I) return null;
    if (kind === 'fight') return I.forFightPalette(chip.key, chip.role);
    if (kind === 'jb') return I.forPalette(chip.key, chip.role);
    if (chip.key.indexOf('snip:') === 0) {
      var sn = IC.snip && IC.snip.get(chip.key.slice(5)), ik = sn ? str(sn.icon) : '';
      if (/^ability:/.test(ik)) { var a = I.forAbil(ik.slice(8)); if (a && !a.cls) return a; ik = 'cast'; }
      return I.mk(ik || 'note', chip.role);
    }
    return I.mk(A.ZONE_CHIP[chip.key] || 'note', chip.role);
  };

  /* ------------------------------------------------------------ the class picker */
  A.classLabel = function () {
    var mine = A.myClass();
    return 'Pictures: ' + (A.st.fv.abicons === false ? 'off' : (mine ? cap(mine) + (A.iconPref.myClass ? '' : ' (you)') : 'every class'));
  };
  A.renderClassButton = function () { var b = $('openic-classbtn'); if (b) b.title = A.classLabel() + '. Click to change'; };
  A.classMenu = function (anchor) {
    var m = $('openic-menu');
    if (!m) return;
    var mine = A.myClass(), L = H().CLASSES, S = H().shims, on = A.st.fv.abicons !== false;
    function chip(kind, c, on, label) {
      return '<span class="oic-cc' + (on ? ' oic-on' : '') + '" data-oic="cls-' + kind + ':' + c + '">' + (c && kind !== 'pic' ? S.jbClassIcon(c, 14) : '') + esc(label) + '</span>';
    }
    var h = '<div class="oic-mh">Pictures on the steps (they only change how the steps look, never the file)</div><div class="oic-cgrid">' +
      chip('pic', '1', on, 'On') + chip('pic', '0', !on, 'Off') + '</div>' +
      '<div class="oic-mh">Ability pictures for: every class, or one class (another class\'s ability then shows that class\'s picture)</div><div class="oic-cgrid">' +
      chip('my', '', !A.iconPref.myClass, A._gameClass ? 'The class I play (' + cap(A._gameClass) + ')' : 'Every class');
    for (var i = 0; i < L.length; i++) h += chip('my', L[i].toLowerCase(), A.iconPref.myClass === L[i].toLowerCase(), L[i]);
    h += '</div><div class="oic-mh">Also in my group: a step one of them does shows that class\'s picture</div><div class="oic-cgrid">';
    for (var j = 0; j < L.length; j++) h += chip('grp', L[j].toLowerCase(), A.iconPref.group.indexOf(L[j].toLowerCase()) >= 0, L[j]);
    h += '</div><div class="oic-mi" data-oic="cls-done">Done</div>';
    m.innerHTML = h;
    m._items = null;
    m.style.display = 'block';
    m.className = 'oic-menu oic-menu-wide';
    var r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: 60, bottom: 60 }, x = Math.round(r.left), y = Math.round(r.bottom + 2);
    if (typeof G.ogrePlaceFixed === 'function') G.ogrePlaceFixed(m, x, y);
    else { m.style.left = Math.max(4, Math.min(x, (G.innerWidth || 1200) - 470)) + 'px'; m.style.top = Math.max(4, Math.min(y, (G.innerHeight || 800) - m.offsetHeight - 4)) + 'px'; }
  };
  /* clicks the app hands on: the class button and the picker's chips (the picker stays open) */
  A.onClickExtra = function (v, el, menu) {
    if (v === 'class') { A._classAnchor = el; if (menu && menu.style.display === 'block' && menu.className.indexOf('oic-menu-wide') >= 0) A.closeMenu(); else A.classMenu(el); return true; }
    if (v === 'cls-done') { A.closeMenu(); return true; }
    var pic = /^cls-pic:([01])$/.exec(v);
    if (pic) { A.setAbIcons(pic[1] === '1'); A.renderClassButton(); A.classMenu($('openic-classbtn') || A._classAnchor); return true; }
    var m = /^cls-(my|grp):([a-z]*)$/.exec(v);
    if (!m) return false;
    var p = A.iconPref, st = H().store;
    if (m[1] === 'my') { p.myClass = m[2]; st('myClass', m[2]); }
    else {
      var at = p.group.indexOf(m[2]);
      if (at >= 0) p.group.splice(at, 1); else p.group.push(m[2]);
      st('groupClasses', p.group.join(','));
    }
    A.applyIcons();
    A.renderClassButton();
    A.refresh();
    var b = $('openic-classbtn') || A._classAnchor;
    A.classMenu(b);
    return true;
  };
})(typeof window !== 'undefined' ? window : this);
