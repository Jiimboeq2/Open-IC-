#!/usr/bin/env node
/*
 * build-window.js - builds the Creator as one native Ogre window (ISXOgreX.UI) from the same files
 * creator/index.html loads:
 *   host/OpenIC.html          the window: options, style, markup, the modules, the class icons
 *   host/OpenIC-assets-<k>.js the item and ability lists (part 1) and the icon sheets (the other parts), which
 *                             OpenIC.iss loads into the window's page with ISXOgreX.UI:EvalFile once the window is
 *                             open, one part at a time (kept out of the window file so it stays small)
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
const HOST = path.join(ROOT, 'host');
const assetName = (k) => 'OpenIC-assets-' + k + '.js';
/* One EvalFile is one message to Ogre's UI process, and a message over its limit is dropped whole: a 4.8 MB pack never
   arrived ("to-exe ring full ... DROPPED"), 4 MB did. Each part stays under 900 KB. */
const PART_MAX = 900 * 1024;
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

/* the asset parts: part 1 the data scripts the page loads from creator/data, then the icon sheets as data: URIs, as many
   to a part as fit. Each part reports "<k>/<n>" in the window's openic-assets-got field (OpenIC.iss sends the next part
   only then); the last one redraws with the icons (IC.app.iconsLoaded). Returns the parts' text, part 1 first. */
function buildAssets() {
  const { scripts } = parts();
  const bodies = [];
  let data = '';
  for (const src of scripts) {
    if (!/^data\//.test(src)) continue;
    data += '  (function (window) {\n' + fs.readFileSync(path.join(CREATOR, src), 'utf8') + '\n  })(L);\n';
  }
  bodies.push(data);
  /* the page is shared and outlives the window: a part loaded again replaces its own style element */
  const sheet = (rules, k) => '  var st = document.getElementById(\'openic-icon-sheets-' + k + '\');\n' +
    '  if (!st) { st = document.createElement(\'style\'); st.id = \'openic-icon-sheets-' + k + '\'; (document.head || document.body).appendChild(st); }\n' +
    '  st.textContent = ' + JSON.stringify(rules.join('')) + ';\n';
  let cur = [], size = 0;
  for (const rule of icons.cssRules(true)) {
    if (cur.length && size + rule.length > PART_MAX - 4096) { bodies.push(sheet(cur, bodies.length + 1)); cur = []; size = 0; }
    cur.push(rule);
    size += rule.length;
  }
  if (cur.length) bodies.push(sheet(cur, bodies.length + 1));
  const n = bodies.length;
  return bodies.map((body, i) => {
    const k = i + 1;
    const text = '/* ' + assetName(k) + ' - part ' + k + ' of ' + n + ' of the game icons for Open IC Creator\'s in-game window' +
      (k === 1 ? ': the item and\n   ability lists' : ': icon sheets as data: URIs') + '. OpenIC.iss loads the parts into the window\'s page\n' +
      '   (ISXOgreX.UI:EvalFile) one at a time once the window is open. Built by tools/build-window.js. The icons are\n' +
      '   EverQuest II\'s own art (Daybreak Game Company). */\n' +
      '(function () {\n' +
      '  var L = window.OpenIC_LIB;\n' +
      '  if (!L || !L.IC) return;\n' + body +
      (k === n ? '  if (L.IC.app && L.IC.app.iconsLoaded) L.IC.app.iconsLoaded();\n' : '') +
      '  if (typeof window.ogreUISet === \'function\') window.ogreUISet(\'openic\', \'openic-assets-got\', \'' + k + '/' + n + '\');\n' +
      '})();\n';
    if (Buffer.byteLength(text) > PART_MAX) throw new Error(assetName(k) + ' is ' + Buffer.byteLength(text) + ' bytes, over ' + PART_MAX);
    return text;
  });
}

module.exports = { build, buildAssets, assetName, OUT, HOST, PART_MAX };

if (require.main === module) {
  const b = build();
  fs.writeFileSync(OUT, b.text);
  console.log('wrote ' + path.relative(ROOT, OUT) + ' (' + b.text.length + ' bytes, ' + b.scripts.filter((s) => !/^data\//.test(s)).length + ' scripts)');
  for (const f of fs.readdirSync(HOST)) if (/^OpenIC-assets(-\d+)?\.js$/.test(f)) fs.unlinkSync(path.join(HOST, f));
  const a = buildAssets();
  a.forEach((text, i) => fs.writeFileSync(path.join(HOST, assetName(i + 1)), text));
  console.log('wrote ' + a.length + ' asset parts (' + a.map((t) => Math.round(Buffer.byteLength(t) / 1024) + ' KB').join(', ') + ')');
}
