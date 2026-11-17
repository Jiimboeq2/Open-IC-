/* Open IC Creator - openic-map.js
   The Map view: every spot the file names, seen from above the way the game's own map shows it (x grows to the left,
   z grows down), the nameds numbered, a walk's spots joined, the route ISXADD found, and you (the square) when you
   stand in the file's zone. The wheel zooms, a drag moves the map, Fit shows all of it again.
   In game, under the spots: ISXJQB's saved map of the zone you stand in, when ISXJQB has one. JB Map saves a zone's
   floors and their pictures the first time it is open there (Scripts/Eq2JCommon/JB/Data: jqbmap_zone_<zone>.js and
   jqbmap_art_<floor>.js); OpenIC.iss runs them in the page one at a time (its Map action). A zone with floors shows the
   floor you stand on, else the one most of the file's spots are on; the others are a click away.
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var A = IC.app = IC.app || {};
  var G = (typeof globalThis === 'object' && globalThis) || Function('return this')();

  function H() { return IC.host; }
  function Z() { return IC.oic; }
  function str(v) { return v == null ? '' : String(v); }
  function isArr(v) { return Object.prototype.toString.call(v) === '[object Array]'; }
  function isObj(v) { return v != null && typeof v === 'object' && !isArr(v); }
  function has(o, k) { return isObj(o) && Object.prototype.hasOwnProperty.call(o, k); }
  function esc(s) { return str(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function $(id) { return typeof document !== 'undefined' ? document.getElementById(id) : null; }
  function n2(v) { return Math.round(+v * 100) / 100; }
  function f1(v) { return (Math.round(v * 10) / 10).toString(); }
  function num(v) { return typeof v === 'number' ? v : (str(v) !== '' && isFinite(+v) ? +v : NaN); }

  /* ISXJQB's name for a zone's map files (JqbMap::ZoneToken): the short name's letters, digits, _ and -, in lower
     case; nothing past 80 */
  A.mapToken = function (short) { var t = str(short).replace(/[^A-Za-z0-9_-]/g, '').toLowerCase(); return t.length > 80 ? '' : t; };

  /* ------------------------------------------------------------ ISXJQB's saved map */
  function fresh(token) { return { token: token, zone: null, none: false, want: '', art: {}, pick: -1 }; }
  A.jmap = fresh('');
  /* a zone file's floors as one list, each { key, name, minx, maxx, minz, maxz, hmin, hmax, avail, prio }; a zone
     without floors is one picture over the zone's own edges */
  A.mapFloors = function (d) {
    var out = [];
    if (!isObj(d)) return out;
    function add(f, key, name) {
      var o = { key: str(key), name: str(name), minx: num(f.min_x), maxx: num(f.max_x), minz: num(f.min_z), maxz: num(f.max_z),
        hmin: typeof f.hmin === 'number' ? f.hmin : null, hmax: typeof f.hmax === 'number' ? f.hmax : null,
        avail: isArr(f.avail) && f.avail.length === 4 ? f.avail : null, prio: num(f.prio) || 0 };
      if (o.key && isFinite(o.minx) && isFinite(o.maxx) && isFinite(o.minz) && isFinite(o.maxz) && o.maxx !== o.minx && o.maxz !== o.minz) out.push(o);
    }
    (isArr(d.floors) ? d.floors : []).forEach(function (f) { if (isObj(f)) add(f, f.key, f.name); });
    if (!out.length && d.ok && d.key) add(d, d.key, '');
    return out;
  };
  /* the floor a spot is on, the way ISXJQB's map picks it: inside the floor's height band and its rect, the highest
     priority wins; -1 when none holds it */
  A.floorOf = function (floors, p) {
    var best = -1, x = +p[0], y = +p[1], z = +p[2];
    for (var i = 0; i < floors.length; i++) {
      var f = floors[i];
      if (f.hmin !== null && y < f.hmin) continue;
      if (f.hmax !== null && y >= f.hmax) continue;
      if (f.avail && (x < f.avail[0] || x > f.avail[1] || z < f.avail[2] || z > f.avail[3])) continue;
      if (best < 0 || f.prio > floors[best].prio) best = i;
    }
    return best;
  };
  function floorWord(f, i) { var m = /\(([^)]+)\)\s*$/.exec(f.name || ''); return m ? m[1] : 'Floor ' + (i + 1); }

  /* the next file this view needs from the game, one at a time: the zone's, then the shown floor's picture */
  function ask(kind, name) { A.jmap.want = kind + '|' + name; H().call('Map', { kind: kind, name: name }); }
  function need(token, floors, fi) {
    var J = A.jmap;
    if (!H().inGame || !token) return;
    if (J.token !== token) { A.jmap = J = fresh(token); ask('zone', token); return; }
    if (J.want || !J.zone || fi < 0) return;
    var k = floors[fi].key;
    if (!has(J.art, k)) { J.art[k] = null; ask('art', k); }
  }
  /* the game's answer, "<kind>|<name>|1" (the file ran in the page: its value lands in a moment) or "|0" (ISXJQB has
     no such file) */
  A.onMapMsg = function (p) {
    var a = str(p).split('|'), kind = a[0], name = a[1], J = A.jmap;
    if (J.want !== kind + '|' + name) return;
    if (a[2] !== '1') {
      if (kind === 'zone') J.none = true; else J.art[name] = false;
      J.want = '';
      redraw();
      return;
    }
    var tries = 0, t = null;
    function look() {
      var v = kind === 'zone' ? G.__jqbmapZone : (G.__jqbmapArt || {})[name];
      var got = kind === 'zone' ? isObj(v) && str(v.zone) === name : /^data:image\/(jpeg|png);base64,/.test(str(v));
      if (!got && ++tries < 25) return false;
      if (A.jmap !== J) return true;
      if (kind === 'zone') { if (got) J.zone = { floors: A.mapFloors(v), exits: isArr(v.exits) ? v.exits.slice(0, 200) : [] }; else J.none = true; }
      else J.art[name] = got ? v : false;
      J.want = '';
      redraw();
      return true;
    }
    if (!look()) t = setInterval(function () { if (look()) clearInterval(t); }, 200);
  };
  /* after the current draw: an answer can come in while the view is drawing */
  function redraw() { setTimeout(function () { if (A.st && A.st.view === 'map') A.renderMap(); }, 0); }

  /* ------------------------------------------------------------ zoom and drag */
  A.mapView = { k: 1, ox: 0, oy: 0 };
  A.mapFit = function () { A.mapView = { k: 1, ox: 0, oy: 0 }; redraw(); };
  var queued = false;
  function soon() { if (queued) return; queued = true; setTimeout(function () { queued = false; redraw(); }, 16); }
  function bind(svg) {
    if (svg._oicMap) return;
    svg._oicMap = true;
    var drag = null;
    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = svg.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, V = A.mapView, W = r.width, Hh = r.height;
      var nk = Math.max(0.25, Math.min(60, V.k * (e.deltaY < 0 ? 1.2 : 1 / 1.2))), f = nk / V.k;
      V.ox = mx - W / 2 + f * (W / 2 + V.ox - mx);
      V.oy = my - Hh / 2 - f * (my - Hh / 2 - V.oy);
      V.k = nk;
      soon();
    });
    svg.addEventListener('mousedown', function (e) { if (e.button === 0) drag = { x: e.clientX, y: e.clientY, ox: A.mapView.ox, oy: A.mapView.oy, moved: false }; });
    svg.addEventListener('mousemove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
      drag.moved = true;
      A.mapView.ox = drag.ox + dx; A.mapView.oy = drag.oy + dy;
      soon();
    });
    var end = function () { if (drag && drag.moved) A._mapDragged = true; drag = null; };
    svg.addEventListener('mouseup', end);
    svg.addEventListener('mouseleave', function () { drag = null; });
    /* a drag is not a click on the dot under it */
    svg.addEventListener('click', function (e) { if (A._mapDragged) { A._mapDragged = false; e.stopPropagation(); e.preventDefault(); } }, true);
  }

  /* ------------------------------------------------------------ the view */
  A.renderMap = function () {
    var svg = $('openic-map'), note = $('openic-map-note'), s = A.st;
    if (!svg) return;
    bind(svg);
    if (A._mapDoc !== s.doc) { A._mapDoc = s.doc; A.mapView = { k: 1, ox: 0, oy: 0 }; A.jmap.pick = -1; }
    var pts = s.doc && s.kind !== 'jb' ? Z().spots(s.doc) : [], route = s.route || [], me = H().me;
    var z0n = s.doc ? (isArr(s.doc.zone) ? s.doc.zone[0] : s.doc.zone) : '', fz = str(z0n).toLowerCase().split(' [')[0].trim(), mz = str(me && me.zone).toLowerCase();
    var here = !!(me && fz && mz.indexOf(fz) === 0);
    /* you, only in this file's zone (from anywhere else your spot squeezed the file's spots into a corner) */
    if (me && !here && pts.length) me = null;
    var J = A.jmap, token = me && (here || !fz) ? A.mapToken(me.short) : '';
    var floors = token && J.token === token && J.zone ? J.zone.floors : [], all = [], i;
    pts.forEach(function (p) { all.push(p.p); });
    route.forEach(function (p) { all.push(p); });
    if (me) all.push([me.x, me.y, me.z]);
    /* the floor shown: the one picked, else the one I stand on, else the one most spots are on */
    var fi = -1;
    if (floors.length) {
      if (J.pick >= 0 && J.pick < floors.length) fi = J.pick;
      else if (me) fi = A.floorOf(floors, [me.x, me.y, me.z]);
      if (fi < 0) {
        var cnt = floors.map(function () { return 0; });
        all.forEach(function (p) { var f = A.floorOf(floors, p); if (f >= 0) cnt[f]++; });
        fi = cnt.indexOf(Math.max.apply(null, cnt));
      }
      if (fi < 0) fi = 0;
    }
    need(token, floors, fi);
    var F = fi >= 0 ? floors[fi] : null, art = F && J.art[F.key] ? J.art[F.key] : '';
    if (!all.length && !art) {
      svg.innerHTML = '';
      if (note) note.innerHTML = esc(s.kind === 'jb' ? 'The Map view is for OgreBot zone and fight files.' : (s.doc ? 'No spots in this file yet.' : 'Nothing open.')) + artNote(token, here, fz, F, art);
      return;
    }
    var W = svg.clientWidth || 600, Hh = svg.clientHeight || 400, x0 = 1e9, x1 = -1e9, zA = 1e9, zB = -1e9;
    /* the file's spots (and the route) fill the view; with none, the floor's picture does (you alone would be a 20 m view) */
    ((pts.length || route.length || !F) ? all : [[F.minx, 0, F.minz], [F.maxx, 0, F.maxz]]).forEach(function (p) { x0 = Math.min(x0, +p[0]); x1 = Math.max(x1, +p[0]); zA = Math.min(zA, +p[2]); zB = Math.max(zB, +p[2]); });
    var V = A.mapView, span = Math.max(x1 - x0, zB - zA, 20), sc = Math.min((W - 40) / span, (Hh - 40) / span) * V.k, cx = (x0 + x1) / 2, cz = (zA + zB) / 2;
    var X = function (x) { return W / 2 + V.ox - (+x - cx) * sc; }, Y = function (z) { return Hh / 2 + V.oy + (+z - cz) * sc; };
    var gArt = svg.querySelector('#openic-map-art'), gDots = svg.querySelector('#openic-map-dots');
    if (!gArt || !gDots) { svg.innerHTML = '<g id="openic-map-art"></g><g id="openic-map-dots"></g>'; gArt = svg.querySelector('#openic-map-art'); gDots = svg.querySelector('#openic-map-dots'); }
    var ak = art ? F.key : '';
    if (gArt._key !== ak) { gArt.innerHTML = art ? '<image preserveAspectRatio="none" opacity="0.9" href="' + art + '"></image>' : ''; gArt._key = ak; }
    var img = gArt.firstChild;
    if (img && F) { img.setAttribute('x', f1(X(F.maxx))); img.setAttribute('y', f1(Y(F.minz))); img.setAttribute('width', f1((F.maxx - F.minx) * sc)); img.setAttribute('height', f1((F.maxz - F.minz) * sc)); }
    var h = '', nn = 0, colors = { path: '#2fd6c3', named: '#e0b050', entrance: '#9fb2c8', spot: '#b388ff' }, byRef = {};
    var P = function (p) { return f1(X(p[0])) + ',' + f1(Y(p[2])); };
    /* the zone's ways out ISXJQB knows, on the floor shown */
    if (J.zone && F) J.zone.exits.forEach(function (e) {
      if (!isArr(e) || !isFinite(+e[0]) || !isFinite(+e[2]) || (floors.length > 1 && A.floorOf(floors, e) !== fi)) return;
      var ex = X(e[0]), ey = Y(e[2]);
      h += '<path d="M' + f1(ex) + ' ' + f1(ey - 6) + 'l6 6l-6 6l-6 -6z" fill="#9fb2c8" fill-opacity="0.8"><title>' + esc('Way out: ' + str(e[4])) + '</title></path>' +
        '<text x="' + f1(ex + 9) + '" y="' + f1(ey + 4) + '" fill="#c9d6e8" font-size="11">' + esc(str(e[4])) + '</text>';
    });
    pts.forEach(function (p) { if (p.kind === 'path') (byRef[p.ref] = byRef[p.ref] || []).push(p.p); });
    for (var r in byRef) if (has(byRef, r) && byRef[r].length > 1) h += '<polyline fill="none" stroke="#2fd6c3" stroke-opacity="0.6" stroke-width="2" points="' + byRef[r].map(P).join(' ') + '"/>';
    if (route.length > 1) h += '<polyline fill="none" stroke="#f2c94c" stroke-width="2" stroke-dasharray="6 4" points="' + route.map(P).join(' ') + '"/>';
    for (i = 0; i < pts.length; i++) {
      var p = pts[i], sel = p.ref && p.ref === s.sel, off = floors.length > 1 && A.floorOf(floors, p.p) !== fi;
      h += '<circle cx="' + f1(X(p.p[0])) + '" cy="' + f1(Y(p.p[2])) + '" r="' + (p.kind === 'named' ? 6 : 4) + '" fill="' + (colors[p.kind] || '#4a90e2') + '"' +
        (off ? ' fill-opacity="0.35"' : '') + (sel ? ' stroke="#fff" stroke-width="2"' : ' stroke="#0b1220" stroke-width="1"') + (p.ref ? ' data-oic-ref="' + esc(p.ref) + '"' : '') + '><title>' +
        esc(p.kind + (p.label ? ': ' + p.label : '') + ' (' + n2(p.p[0]) + ', ' + n2(p.p[1]) + ', ' + n2(p.p[2]) + ')' + (off ? ', on another floor' : '')) + '</title></circle>';
      if (p.kind === 'named' && p.label) { nn++; h += '<text x="' + f1(X(p.p[0]) + 9) + '" y="' + f1(Y(p.p[2]) + 4) + '" fill="#f2f7ff" font-size="12" stroke="#0b1220" stroke-width="3" paint-order="stroke">' + nn + '. ' + esc(p.label) + '</text>'; }
    }
    if (me) h += '<rect x="' + f1(X(me.x) - 5) + '" y="' + f1(Y(me.z) - 5) + '" width="10" height="10" fill="none" stroke="#ffffff" stroke-width="2"><title>you</title></rect>';
    gDots.innerHTML = h;
    if (!note) return;
    var fl = '';
    if (floors.length > 1) { fl = ' <span class="oic-note">Floor:</span>'; floors.forEach(function (f, k) { fl += ' <span class="oic-jump' + (k === fi ? ' oic-on' : '') + '" data-oic="map:floor:' + k + '">' + esc(floorWord(f, k)) + '</span>'; }); }
    note.innerHTML = esc(pts.length + ' spot' + (pts.length === 1 ? '' : 's') + ' from the file, seen from above as the game\'s map shows it' + (route.length ? '; the dashed line is the route ISXADD found' : '') +
      (me ? '; the square is you' : '') + '. Click a dot to pick its step; drag to move. ') +
      '<span class="oic-jump" data-oic="map:out" title="Zoom out">&#8722;</span> <span class="oic-jump" data-oic="map:in" title="Zoom in">+</span> ' +
      '<span class="oic-jump" data-oic="map:fit" title="Show all of it">Fit</span>' + fl + artNote(token, here, fz, F, art);
  };
  /* where the map picture comes from, or why there is none */
  function artNote(token, here, fz, F, art) {
    var J = A.jmap, t = '';
    if (art) t = 'Under the spots: ISXJQB\'s map of this zone.';
    else if (!H().inGame) t = 'In game, ISXJQB\'s saved map of the zone shows under the spots.';
    else if (!token) t = fz ? 'ISXJQB\'s saved map shows under the spots when you stand in this zone.' : '';
    else if (J.none) t = 'ISXJQB has no saved map of this zone yet: open JB Map here once (jb map), then come back to this view.';
    else if (J.want || (F && J.art[F.key] === null)) t = 'Loading ISXJQB\'s map of this zone...';
    else if (F && J.art[F.key] === false) t = 'ISXJQB has this zone, but no picture of this floor yet: open JB Map on it once.';
    else if (J.zone && !F) t = 'ISXJQB has this zone, without a picture.';
    return t ? '<div class="oic-note">' + esc(t) + '</div>' : '';
  }
  /* the view's own links: Fit and the floors */
  var ec0 = A.editClick;
  A.editClick = function (v, el) {
    var m;
    if (v === 'map:fit') { A.mapFit(); return true; }
    /* zoom about the middle: in game the wheel may never reach the page (Ogre's windows scroll natively) */
    if (v === 'map:in' || v === 'map:out') { var V0 = A.mapView, f = v === 'map:in' ? 1.25 : 0.8, nk = Math.max(0.25, Math.min(60, V0.k * f)); f = nk / V0.k; V0.ox *= f; V0.oy *= f; V0.k = nk; redraw(); return true; }
    if ((m = /^map:floor:(\d+)$/.exec(v))) { A.jmap.pick = +m[1]; A.mapView = { k: 1, ox: 0, oy: 0 }; redraw(); return true; }
    return ec0 ? ec0(v, el) : false;
  };
})(typeof window !== 'undefined' ? window : this);
