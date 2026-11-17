/* Open IC Creator - openic-browse.js
   In game, Open and Save as work like a file window: the folders Ogre and ISXJQB read (my zone files, my fight files,
   Ogre's own, ISXJQB's instance files), their sub-folders and .json files, listed by host/OpenIC.iss (List). A click
   goes into a folder or opens a file; Save as picks the folder and takes a name; New folder makes one (MkDir). In a
   browser the PC's own file window is used instead (openic-app.js).
   MIT License, see LICENSE. */
(function (root) {
  var IC = root.IC = root.IC || {};
  var A = IC.app = IC.app || {};

  function H() { return IC.host; }
  function Z() { return IC.oic; }
  function str(v) { return v == null ? '' : String(v); }
  function esc(s) { return str(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function $(id) { return typeof document !== 'undefined' ? document.getElementById(id) : null; }

  /* the folders, inside InnerSpace's Scripts folder. script: the kind OpenIC.iss opens and saves with; prefix: what the
     script's path for that kind starts with (ISXJQB's files are found from Eq2JCommon) */
  A.ROOTS = [
    { id: 'zone', label: 'My zone files', dir: 'OgreSave\\EQ2\\IC\\custom', kind: 'zone', script: 'zone', prefix: '', write: true,
      tip: 'Your own zone files: Ogre reads every .json in here, in any folder' },
    { id: 'fight', label: 'My fight files', dir: 'OgreSave\\EQ2\\Encounters\\custom', kind: 'fight', script: 'fight', prefix: '', write: true,
      tip: 'Your own fight files. One at the same path as a shipped one (<Expansion>\\<Zone>\\<Named>.json) is laid over it' },
    { id: 'ozone', label: 'Ogre\'s zone files', dir: 'Ogre\\EQ2\\IC\\default', kind: 'zone', script: 'ozone', prefix: '', write: false,
      tip: 'The zone files Ogre ships: read only, Ogre\'s updates replace them. Save as puts your copy in My zone files' },
    { id: 'ofight', label: 'Ogre\'s fight files', dir: 'Ogre\\EQ2\\Encounters\\default', kind: 'fight', script: 'ofight', prefix: '', write: false,
      tip: 'The fight files Ogre ships: read only. Save as puts your copy at the same path in My fight files, where Ogre lays it over the shipped one' },
    { id: 'jb', label: 'ISXJQB instance files', dir: 'Eq2JCommon\\JB\\Instances', kind: 'jb', script: 'jb', prefix: 'JB/Instances/', write: true,
      tip: 'ISXJQB\'s own instance files' }
  ];
  A.rootOf = function (id) {
    for (var i = 0; i < A.ROOTS.length; i++) if (A.ROOTS[i].id === id) return A.ROOTS[i];
    return null;
  };
  /* the browser's state: mode open | save, the folder shown, what the script sent for it */
  A.br = { mode: 'open', root: 'zone', path: '', list: null, waiting: false };

  /* a Windows file or folder name: no path parts, none of \ / : * ? " < > |, not . or .. */
  A.okName = function (n) { n = str(n).trim(); return !!n && n !== '.' && n !== '..' && !/[\\\/:*?"<>|]/.test(n); };

  /* open the browser. Save: the folders of the open file's kind, starting where the file is, or for Ogre's own file at
     the same path in my folder (Ogre's override place for a fight file) */
  A.browse = function (mode) {
    var b = A.br, s = A.st;
    b.mode = mode === 'save' ? 'save' : 'open';
    b.list = null;
    if (b.mode === 'save') {
      var w = s.where || null, R = w ? A.rootOf(w.root) : null;
      if (R && R.write && R.kind === s.kind) { b.root = R.id; b.path = A.dirOf(w.rel); }
      else if (R && !R.write) { b.root = R.kind === 'fight' ? 'fight' : 'zone'; b.path = A.dirOf(w.rel); }
      else { b.root = s.kind === 'fight' ? 'fight' : (s.kind === 'jb' ? 'jb' : 'zone'); b.path = ''; }
      var nm = $('openic-br-name');
      if (nm) nm.value = (w && w.rel ? w.rel.split('/').pop() : '') || s.name || Z().fileName(s.doc);
    } else if (!A.rootOf(b.root)) { b.root = 'zone'; b.path = ''; }
    var m = $('openic-browse');
    if (m) m.style.display = 'flex';
    A.browseList(b.root, b.path);
  };
  A.closeBrowse = function () { var m = $('openic-browse'); if (m) m.style.display = 'none'; A.br.waiting = false; };
  A.dirOf = function (rel) { var p = str(rel).split('/'); p.pop(); return p.join('/'); };

  /* ask the script for one folder; its answer comes on the list channel (A.onList) */
  A.browseList = function (rootId, path) {
    var b = A.br;
    b.root = rootId; b.path = str(path).replace(/^\/+|\/+$/g, ''); b.list = null; b.waiting = true;
    A.renderBrowse();
    H().call('List', { root: b.root, path: b.path });
  };
  /* "<root>|<path>|<1|0>" then ">D|<folder>" and ">F|<file>|<bytes>" */
  A.onList = function (payload) {
    var parts = str(payload).split('>'), head = parts[0].split('|'), b = A.br;
    if (head[0] !== b.root || head[1] !== b.path) return;
    var dirs = [], files = [];
    for (var i = 1; i < parts.length; i++) {
      var f = parts[i].split('|');
      if (f[0] === 'D' && f[1]) dirs.push(f[1]);
      else if (f[0] === 'F' && f[1]) files.push({ name: f[1], size: +f[2] || 0 });
    }
    var by = function (a, c) { a = str(a.name || a).toLowerCase(); c = str(c.name || c).toLowerCase(); return a < c ? -1 : (a > c ? 1 : 0); };
    dirs.sort(by); files.sort(by);
    b.list = { exists: head[2] === '1', dirs: dirs, files: files };
    b.waiting = false;
    A.renderBrowse();
  };

  A.renderBrowse = function () {
    var b = A.br, R = A.rootOf(b.root), save = b.mode === 'save', s = A.st;
    var t = $('openic-br-title');
    if (t) t.textContent = save ? 'Save as' : 'Open a file';
    var rh = '';
    for (var i = 0; i < A.ROOTS.length; i++) {
      var r = A.ROOTS[i];
      if (save && (!r.write || r.kind !== (s.kind === 'jb' ? 'jb' : s.kind))) continue;
      rh += '<span class="oic-br-root' + (r.id === b.root ? ' oic-on' : '') + '" data-oic="br:root:' + r.id + '" title="' + esc(r.tip) + '">' + esc(r.label) + '</span>';
    }
    var roots = $('openic-br-roots');
    if (roots) roots.innerHTML = rh;
    var segs = b.path ? b.path.split('/') : [], ch = '<span class="oic-link" data-oic="br:crumb:0" title="' + esc('Scripts\\' + (R ? R.dir : '')) + '">' + esc(R ? R.label : '') + '</span>';
    for (var j = 0; j < segs.length; j++) ch += ' <span class="oic-br-gt">&#8250;</span> <span class="oic-link" data-oic="br:crumb:' + (j + 1) + '">' + esc(segs[j]) + '</span>';
    var crumbs = $('openic-br-crumbs');
    if (crumbs) crumbs.innerHTML = ch;
    var h = '';
    if (b.path) h += '<div class="oic-br-item oic-br-up" data-oic="br:up"><span>&#8593; Up one folder</span></div>';
    if (b.waiting) h += '<div class="oic-br-note">Reading the folder...</div>';
    else if (!b.list) h += '<div class="oic-br-note">No answer from the game.</div>';
    else if (!b.list.exists) h += '<div class="oic-br-note">This folder is not there yet.' + (save && R && R.write ? ' <span class="oic-link" data-oic="br:makehere">Make it</span>' : '') + '</div>';
    else {
      for (var d = 0; d < b.list.dirs.length; d++) {
        h += '<div class="oic-br-item" data-oic="br:dir:' + esc(b.list.dirs[d]) + '"><span>&#128193; ' + esc(b.list.dirs[d]) + '</span></div>';
      }
      for (var f = 0; f < b.list.files.length; f++) {
        var fl = b.list.files[f];
        h += '<div class="oic-br-item oic-br-file" data-oic="br:file:' + esc(fl.name) + '" title="' + (save ? 'Use this name (it will be replaced)' : 'Open it') + '">' +
          '<span>&#128196; ' + esc(fl.name) + '</span><span class="oic-br-size">' + Math.max(1, Math.round(fl.size / 1024)) + ' KB</span></div>';
      }
      if (!b.list.dirs.length && !b.list.files.length) h += '<div class="oic-br-note">No folders or .json files here.</div>';
    }
    var list = $('openic-br-list');
    if (list) list.innerHTML = h;
    var sr = $('openic-br-saverow'), sb = $('openic-br-save'), nf = $('openic-br-newfolder'), ty = $('openic-br-typed');
    if (sr) sr.style.display = save ? '' : 'none';
    if (sb) sb.style.display = save ? '' : 'none';
    if (nf) nf.style.display = R && R.write && b.list && b.list.exists ? '' : 'none';
    if (ty) ty.style.display = save ? 'none' : '';
  };

  /* the browser's clicks: br:<what> (openic-app.js A.onClick hands them here) */
  A.browseClick = function (v) {
    var b = A.br, m;
    if (v === 'cancel') { A.closeBrowse(); return; }
    if (v === 'up') { A.browseList(b.root, A.dirOf(b.path)); return; }
    if ((m = /^root:(\w+)$/.exec(v))) { A.browseList(m[1], ''); return; }
    if ((m = /^crumb:(\d+)$/.exec(v))) { A.browseList(b.root, (b.path ? b.path.split('/') : []).slice(0, +m[1]).join('/')); return; }
    if ((m = /^dir:(.+)$/.exec(v))) { A.browseList(b.root, (b.path ? b.path + '/' : '') + m[1]); return; }
    if ((m = /^file:(.+)$/.exec(v))) {
      if (b.mode === 'save') { var nm = $('openic-br-name'); if (nm) nm.value = m[1]; return; }
      A.browseOpen(m[1]);
      return;
    }
    if (v === 'save') { A.browseSave(); return; }
    if (v === 'newfolder') {
      H().prompt('New folder', 'The new folder\'s name (inside ' + (b.path || A.rootOf(b.root).label) + '):', '', function (n) {
        if (n == null) return;
        if (!A.okName(n)) { H().toast('A folder name cannot hold \\ / : * ? " < > |', 'warn'); return; }
        A.br.waiting = 'mkdir';
        H().call('MkDir', { root: b.root, path: b.path, name: str(n).trim() });
        A._afterMkdir = { root: b.root, path: (b.path ? b.path + '/' : '') + str(n).trim() };
      });
      return;
    }
    if (v === 'makehere') {
      A.br.waiting = 'mkdir';
      H().call('MkDir', { root: b.root, path: b.path, name: '' });
      A._afterMkdir = { root: b.root, path: b.path };
      return;
    }
    if (v === 'typed') { A.closeBrowse(); A.openGame('full'); return; }
  };
  /* after New folder: the script said how it went; show the new folder */
  A.onMkdirSaid = function (ok) {
    var to = A._afterMkdir;
    A._afterMkdir = null;
    if (!to) return;
    if (ok) A.browseList(to.root, to.path); else A.browseList(A.br.root, A.br.path);
  };

  A.browseOpen = function (name) {
    var b = A.br, R = A.rootOf(b.root), rel = (b.path ? b.path + '/' : '') + name;
    var go = function () {
      A.closeBrowse();
      A._opening = { kind: R.script, path: R.prefix + rel, root: R.id, rel: rel };
      H().call('Open', { kind: R.script, path: R.prefix + rel });
    };
    if (A.dirty()) H().confirm('Leave this file?', 'It has changes that are not saved.', function (y) { if (y) go(); }); else go();
  };
  A.browseSave = function () {
    var b = A.br, R = A.rootOf(b.root), nm = $('openic-br-name'), name = str(nm && nm.value).trim();
    if (!R || !R.write) { H().toast('Ogre\'s own folders are read only: pick one of yours.', 'warn'); return; }
    if (!b.list || !b.list.exists) { H().toast('This folder is not there yet: make it first.', 'warn'); return; }
    if (!/\.json$/i.test(name)) name += '.json';
    if (!A.okName(name)) { H().toast('A file name cannot hold \\ / : * ? " < > |', 'warn'); return; }
    var rel = (b.path ? b.path + '/' : '') + name, there = false;
    for (var i = 0; i < b.list.files.length; i++) if (b.list.files[i].name.toLowerCase() === name.toLowerCase()) there = true;
    var go = function () { A.closeBrowse(); A.saveTo(R.prefix + rel, { root: R.id, rel: rel }); };
    if (there) H().confirm('Replace it?', name + ' is already in this folder. Replace it with this file?', function (y) { if (y) go(); });
    else go();
  };
})(typeof window !== 'undefined' ? window : this);
