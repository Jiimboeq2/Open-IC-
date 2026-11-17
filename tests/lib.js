// Shared test helpers: load the Creator's modules into a private namespace, the way the in-game window does.
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JS = path.join(ROOT, 'creator', 'js');

/* the modules the page loads, in order (creator/index.html and tools/build-window.js use the same list) */
const ENGINE = ['openic-host.js', 'ic-registry.js', 'ic-steps-move.js', 'ic-steps-fight.js', 'ic-steps-wait.js', 'ic-pack.js', 'ic-model.js',
  'ic-validate.js', 'ic-words.js', 'ic-icons.js', 'ic-oc-picker.js', 'ic-flowview.js', 'ic-flowparts.js', 'ic-flow.js', 'ic-ogf-words.js',
  'ic-ogfight-flow.js', 'ic-snippets.js', 'ic-import.js', 'ic-flowpal.js', 'ic-nmap.js', 'ic-nmap-enc.js', 'openic-vocab.js', 'openic-zone.js'];

function load(mods, extra) {
  const priv = {};
  const ctx = Object.assign({ console, JSON, String, Number, Boolean, parseInt, parseFloat, isFinite, isNaN, Array, Object, Math, Date, RegExp, Error,
    TypeError, Promise, encodeURIComponent, decodeURIComponent, setTimeout: (f) => { if (typeof f === 'function') f(); return 0; }, clearTimeout() {} }, extra || {});
  vm.createContext(ctx);
  for (const m of mods || ENGINE) {
    new vm.Script('(function (window) {\n' + fs.readFileSync(path.join(JS, m), 'utf8') + '\n})(this.__priv);', { filename: m })
      .runInContext(Object.assign(ctx, { __priv: priv }));
  }
  return priv.IC;
}

let fails = 0, checks = 0;
function ok(cond, msg) { checks++; if (!cond) { fails++; console.log('  FAIL ' + msg); } }
function test(name, fn) {
  const f0 = fails;
  try { fn(); } catch (e) { fails++; console.log('  FAIL ' + name + ' threw ' + (e && e.stack)); }
  console.log((fails === f0 ? '  pass ' : '  FAIL ') + name);
}
function done(label) {
  console.log((fails ? 'FAILED: ' + fails + ' of ' : 'OK: ') + checks + ' checks' + (fails ? '' : ' passed') + (label ? ' (' + label + ')' : ''));
  process.exitCode = fails ? 1 : 0;
  return fails;
}
function walkJson(dir, out) {
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walkJson(p, out); else if (/\.json$/i.test(f)) out.push(p);
  }
  return out;
}
function readJson(p) { let t = fs.readFileSync(p, 'utf8'); if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1); return JSON.parse(t); }

module.exports = { ROOT, JS, ENGINE, load, ok, test, done, walkJson, readJson, counts: () => ({ fails, checks }) };
