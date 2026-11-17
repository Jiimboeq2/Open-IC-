#!/usr/bin/env node
/*
 * build-window.js - builds the Creator as one native Ogre window (ISXOgreX.UI) from the same files
 * creator/index.html loads:
 *   host/OpenIC.html        the window: options, style, markup, the modules, the class icons
 *   host/OpenIC-assets.js   the icon sheets and the item and ability lists, which OpenIC.iss loads into the window's
 *                           page with ISXOgreX.UI:EvalFile once the window is open (kept out of the window file so it
 *                           stays small)
 *
 * An Ogre window is one HTML fragment: an options block, a style block, the markup and script blocks. It loads no
 * other file (no <script src>, no <link>, no <img src> but data: URIs), and every Ogre window shares one page, so:
 *   - the stylesheet and every script are put inline, and the class icons as data: URIs;
 *   - the modules run with a private "window" (OpenIC_LIB), so they add nothing to the shared page but that one name;
 *   - the page functions the modules call are handed to each module as parameters (IC.host.shims), not made global;
 *   - each module is its own script block: an error in one stops only that block.
 *
 * Usage: node tools/build-window.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const icons = require('./build-icon-data.js');

const ROOT = path.join(__dirname, '..');
const CREATOR = path.join(ROOT, 'creator');
const OUT = path.join(ROOT, 'host', 'OpenIC.html');
const ASSETS_OUT = path.join(ROOT, 'host', 'OpenIC-assets.js');
const WINDOW = { title: 'Open IC Creator', w: 1180, h: 720 };

function safe(js, name) {
  if (/<\/script/i.test(js)) js = js.replace(/<\/(script)/gi, '<\\/$1');
  if (/<!--/.test(js)) throw new Error(name + ' holds "<!--", which an HTML script block would misread');
  return js;
}

function parts() {
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
  return { body, scripts };
}

/* the window file */
function build() {
  const { body, scripts } = parts();
  const css = fs.readFileSync(path.join(CREATOR, 'css', 'openic.css'), 'utf8');
  const hostSrc = fs.readFileSync(path.join(CREATOR, 'js', 'openic-host.js'), 'utf8');
  const m = /H\.SHIM_NAMES = \[([^\]]+)\]/.exec(hostSrc);
  if (!m) throw new Error('openic-host.js has no SHIM_NAMES');
  const shimNames = m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''));
  const classData = {};
  for (const c of icons.classIcons()) classData[c.name] = 'data:image/webp;base64,' + fs.readFileSync(c.file).toString('base64');

  let out = '<!-- OpenIC.html - Open IC Creator as a native Ogre window (ISXOgreX.UI), opened by OpenIC.iss.\n' +
    '     Built by tools/build-window.js from creator/ (index.html, css, js): edit those, then run the tool again.\n' +
    '     The class icons in it are EverQuest II\'s own art (Daybreak Game Company). -->\n';
  out += '<script type="ogre/window">' + JSON.stringify(WINDOW) + '</script>\n\n';
  out += '<style>\n' + css.trim() + '\n</style>\n\n';
  out += body + '\n\n';
  out += '<script>\nwindow.OpenIC_LIB = window.OpenIC_LIB || {};\n' +
    'OpenIC_LIB.IC = OpenIC_LIB.IC || {};\nOpenIC_LIB.IC.iconData = OpenIC_LIB.IC.iconData || {};\n' +
    'OpenIC_LIB.IC.iconData.classData = ' + JSON.stringify(classData) + ';\n</script>\n';
  for (const src of scripts) {
    if (/^data\//.test(src)) continue;
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

/* the asset pack: the data scripts the page loads from creator/data, and the icon sheets as data: URIs */
function buildAssets() {
  const { scripts } = parts();
  let out = '/* OpenIC-assets.js - the game icons for Open IC Creator\'s in-game window: the icon sheets as data: URIs and\n' +
    '   the item and ability lists. OpenIC.iss loads it into the window\'s page (ISXOgreX.UI:EvalFile) once the window is\n' +
    '   open. Built by tools/build-window.js. The icons are EverQuest II\'s own art (Daybreak Game Company). */\n' +
    '(function () {\n' +
    '  var L = window.OpenIC_LIB;\n' +
    '  if (!L || !L.IC) return;\n';
  for (const src of scripts) {
    if (!/^data\//.test(src)) continue;
    out += '  (function (window) {\n' + fs.readFileSync(path.join(CREATOR, src), 'utf8') + '\n  })(L);\n';
  }
  out += '  var st = document.getElementById(\'openic-icon-sheets\');\n' +
    '  if (!st) { st = document.createElement(\'style\'); st.id = \'openic-icon-sheets\'; (document.head || document.body).appendChild(st); }\n' +
    '  st.textContent = ' + JSON.stringify(icons.css(true)) + ';\n' +
    '  if (L.IC.app && L.IC.app.iconsLoaded) L.IC.app.iconsLoaded();\n' +
    '})();\n';
  return out;
}

module.exports = { build, buildAssets, OUT, ASSETS_OUT };

if (require.main === module) {
  const b = build();
  fs.writeFileSync(OUT, b.text);
  console.log('wrote ' + path.relative(ROOT, OUT) + ' (' + b.text.length + ' bytes, ' + b.scripts.filter((s) => !/^data\//.test(s)).length + ' scripts)');
  const a = buildAssets();
  fs.writeFileSync(ASSETS_OUT, a);
  console.log('wrote ' + path.relative(ROOT, ASSETS_OUT) + ' (' + a.length + ' bytes)');
}
