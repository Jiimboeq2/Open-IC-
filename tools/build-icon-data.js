#!/usr/bin/env node
/*
 * build-icon-data.js - the icon data the page loads:
 *   creator/data/spell-icons.js   the ability list (name, icon, backdrop, classes), from a spell_icons.txt
 *                                 (only with --spells; the file is kept as it is otherwise)
 *   creator/css/openic-icons.css  one class per icon sheet in creator/assets (spell_atlases, item_atlases)
 * and, as a module, the same sheets as data: URIs for the in-game window's asset pack (tools/build-window.js).
 *
 * Usage: node tools/build-icon-data.js [--spells <spell_icons.txt>]
 *
 * The sheets are EverQuest II's own icon sheets: 6 x 6 cells of 42 px on a 256 px sheet, icon id n in sheet
 * floor(n / 36) + 1 at place n % 36.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'creator', 'assets');
const SPELL_JS = path.join(ROOT, 'creator', 'data', 'spell-icons.js');
const CSS = path.join(ROOT, 'creator', 'css', 'openic-icons.css');
const KINDS = [['sp', 'spell_atlases'], ['it', 'item_atlases']];

/* the sheets present, by kind: [{ kind: 'sp', n: 1, file }] in number order */
function sheets() {
  const out = [];
  for (const [kind, dir] of KINDS) {
    const d = path.join(ASSETS, dir);
    if (!fs.existsSync(d)) continue;
    const list = fs.readdirSync(d).map((f) => /^atlas-(\d+)\.png$/.exec(f)).filter(Boolean).map((m) => +m[1]).sort((a, b) => a - b);
    for (const n of list) out.push({ kind, n, file: path.join(d, 'atlas-' + n + '.png') });
  }
  return out;
}
function classIcons() {
  const d = path.join(ASSETS, 'class_icons');
  return fs.existsSync(d) ? fs.readdirSync(d).filter((f) => /\.webp$/.test(f)).sort().map((f) => ({ name: f.replace(/\.webp$/, ''), file: path.join(d, f) })) : [];
}

/* one rule per sheet: url() paths for the browser page, data: URIs for the in-game asset parts */
function cssRules(asData) {
  return sheets().map((s) => {
    const src = asData ? 'data:image/png;base64,' + fs.readFileSync(s.file).toString('base64')
      : '../assets/' + (s.kind === 'sp' ? 'spell_atlases' : 'item_atlases') + '/atlas-' + s.n + '.png';
    return '.oic-' + s.kind + '-' + s.n + '{background-image:url(' + (asData ? src : '"' + src + '"') + ');}\n';
  });
}
/* the stylesheet */
function css(asData) {
  return '/* Open IC Creator - openic-icons.css\n' +
    '   One class per icon sheet (EverQuest II\'s own art: Daybreak Game Company). Made by tools/build-icon-data.js. */\n' +
    cssRules(asData).join('');
}

/* the ability list as a script: the text itself, so the page needs no file read */
function spellJs(text, nSheets) {
  const clean = String(text).replace(/\r\n?/g, '\n');
  if (/[^\x09\x0a\x20-\x7e]/.test(clean)) throw new Error('the spell list must be plain ASCII');
  const rows = clean.split('\n').filter((l) => l && l.charAt(0) !== '#').length;
  return '/* Open IC Creator - spell-icons.js\n' +
    '   The ability list (IC.iconData.spellText, ' + rows + ' rows): an ability\'s name in lower case, its icon id in the spell\n' +
    '   sheets (assets/spell_atlases), its backdrop tile and the classes that have it, one per line, tab-separated.\n' +
    '   Made by tools/build-icon-data.js. The icons it points at are EverQuest II\'s own art (Daybreak Game Company).\n' +
    '   MIT License for this file, see LICENSE. */\n' +
    '(function (root) {\n' +
    '  var IC = root.IC = root.IC || {};\n' +
    '  var D = IC.iconData = IC.iconData || {};\n' +
    '  D.spellSheets = ' + nSheets + ';\n' +
    '  D.spellText = ' + JSON.stringify(clean) + ';\n' +
    '})(typeof window !== \'undefined\' ? window : this);\n';
}

module.exports = { sheets, classIcons, css, cssRules };

if (require.main === module) {
  const args = process.argv.slice(2);
  const at = args.indexOf('--spells');
  const nSpell = sheets().filter((s) => s.kind === 'sp').length;
  if (at >= 0) {
    fs.writeFileSync(SPELL_JS, spellJs(fs.readFileSync(args[at + 1], 'utf8'), nSpell));
    console.log('wrote ' + path.relative(ROOT, SPELL_JS));
  } else if (fs.existsSync(SPELL_JS)) {
    const t = fs.readFileSync(SPELL_JS, 'utf8').replace(/D\.spellSheets = \d+;/, 'D.spellSheets = ' + nSpell + ';');
    fs.writeFileSync(SPELL_JS, t);
  }
  fs.writeFileSync(CSS, css(false));
  console.log('wrote ' + path.relative(ROOT, CSS) + ' (' + sheets().length + ' sheets); ' + classIcons().length + ' class icons');
}
