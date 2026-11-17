#!/usr/bin/env node
/*
 * build-window.js - builds host/OpenIC.html, the Creator as one native Ogre window (ISXOgreX.UI), from the same files
 * creator/index.html loads.
 *
 * An Ogre window is one HTML fragment: an options block, a style block, the markup and script blocks. It loads no
 * other file (no <script src>, no <link>), and every Ogre window shares one page, so:
 *   - the stylesheet and every script are put inline;
 *   - the modules run with a private "window" (OpenIC_LIB), so they add nothing to the shared page but that one name;
 *   - the page functions the modules call are handed to each module as parameters (IC.host.shims), not made global;
 *   - each module is its own script block: an error in one stops only that block.
 *
 * Usage: node tools/build-window.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CREATOR = path.join(ROOT, 'creator');
const OUT = path.join(ROOT, 'host', 'OpenIC.html');
const WINDOW = { title: 'Open IC Creator', w: 1180, h: 720 };

function safe(js, name) {
  if (/<\/script/i.test(js)) js = js.replace(/<\/(script)/gi, '<\\/$1');
  if (/<!--/.test(js)) throw new Error(name + ' holds "<!--", which an HTML script block would misread');
  return js;
}

function build() {
  const html = fs.readFileSync(path.join(CREATOR, 'index.html'), 'utf8');
  const between = (a, b) => {
    const i = html.indexOf(a), j = html.indexOf(b);
    if (i < 0 || j < i) throw new Error('index.html has no ' + a + ' ... ' + b + ' block');
    return html.slice(i + a.length, j);
  };
  const body = between('<!-- OPENIC:BODY:START -->', '<!-- OPENIC:BODY:END -->').trim()
    .replace('<div id="openic-root">', '<div id="openic-root" class="oic-ingame">');
  const scripts = [];
  between('<!-- OPENIC:SCRIPTS:START -->', '<!-- OPENIC:SCRIPTS:END -->').replace(/<script src="([^"]+)"><\/script>/g, (m, src) => { scripts.push(src); return m; });
  if (scripts[0] !== 'js/openic-host.js') throw new Error('openic-host.js must load first');

  const css = fs.readFileSync(path.join(CREATOR, 'css', 'openic.css'), 'utf8');

  /* the names the modules reach for (IC.host.SHIM_NAMES, in the same order) */
  const hostSrc = fs.readFileSync(path.join(CREATOR, 'js', 'openic-host.js'), 'utf8');
  const m = /H\.SHIM_NAMES = \[([^\]]+)\]/.exec(hostSrc);
  if (!m) throw new Error('openic-host.js has no SHIM_NAMES');
  const shimNames = m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''));

  let out = '<!-- OpenIC.html - Open IC Creator as a native Ogre window (ISXOgreX.UI), opened by OpenIC.iss.\n' +
    '     Built by tools/build-window.js from creator/ (index.html, css, js): edit those, then run the tool again. -->\n';
  out += '<script type="ogre/window">' + JSON.stringify(WINDOW) + '</script>\n\n';
  out += '<style>\n' + css.trim() + '\n</style>\n\n';
  out += body + '\n\n';
  out += '<script>\nwindow.OpenIC_LIB = window.OpenIC_LIB || {};\n</script>\n';
  for (const src of scripts) {
    const name = path.basename(src);
    const js = safe(fs.readFileSync(path.join(CREATOR, src), 'utf8'), name);
    if (name === 'openic-host.js') {
      out += '<script>\n(function (window) {\n' + js + '\n})(OpenIC_LIB);\n</script>\n';
    } else {
      out += '<script>\n(function (window, ' + shimNames.join(', ') + ') {\n' + js + '\n})(OpenIC_LIB, ' +
        shimNames.map((n) => 'OpenIC_LIB.IC.host.shims.' + n).join(', ') + ');\n</script>\n';
    }
  }
  out += '<script>\nOpenIC_LIB.IC.app.start();\n</script>\n';
  return { text: out, scripts };
}

module.exports = { build, OUT };

if (require.main === module) {
  const b = build();
  fs.writeFileSync(OUT, b.text);
  console.log('wrote ' + path.relative(ROOT, OUT) + ' (' + b.text.length + ' bytes, ' + b.scripts.length + ' scripts)');
}
