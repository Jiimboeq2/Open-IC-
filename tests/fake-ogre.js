// Builds a stand-in for native Ogre's window host around host/OpenIC.html, so the in-game build can run its self
// test in a normal browser: window.ogreCall records each command line, window.ogreUISet sets a field and fires its
// events the way Ogre does, the stand-in answers the window's Hello like OpenIC.iss would, and the asset parts are run
// after the window in order, as OpenIC.iss's ISXOgreX.UI:EvalFile does one part at a time.
//   node tests/fake-ogre.js [<out.html>]      then: node tests/browser-selftest.js --page <out.html>
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const out = process.argv[2] || path.join(require('os').tmpdir(), 'openic-fake-ogre.html');
const win = fs.readFileSync(path.join(ROOT, 'host', 'OpenIC.html'), 'utf8');

const prelude = `
<script>
(function () {
  var log = [], seq = 0;
  window.__openicFakeGame = { log: log };
  window.__openicSelftest = true;
  function setField(id, value) {
    var el = document.getElementById(id);
    if (!el) return;
    el.value = String(value);
    el.dispatchEvent(new Event('input'));
    el.dispatchEvent(new Event('change'));
  }
  function say(ch, v) { seq++; setField('openic-msg-' + ch, seq + '|' + v); }
  window.ogreUISet = function (name, id, value) { if (name === 'openic') setField(id, value); };
  /* a folder's listing as OpenIC.iss sends it, at once (the self test reads it straight after) */
  function listAnswer() {
    var r = (document.getElementById('openic-arg-root') || {}).value || '', p = (document.getElementById('openic-arg-path') || {}).value || '';
    var body = p === '' ? '>D|Sample Expansion>F|sample.json|2048' : (p === 'Sample Expansion' ? '>F|inner.json|1024' : '');
    say('list', '1/1|' + r + '|' + p + '|1' + body);
  }
  /* ISXJQB's saved map of the sample zone, as OpenIC.iss runs its files in the page: two floors, a picture of the
     lower one only */
  function mapAnswer() {
    var kind = (document.getElementById('openic-arg-kind') || {}).value || '', name = (document.getElementById('openic-arg-name') || {}).value || '';
    var got = false;
    if (kind === 'zone' && name === 'sample_zone') {
      window.__jqbmapZone = { zone: 'sample_zone', ok: true, key: 'sample_zone_f0', min_x: -100, max_x: 100, min_z: -100, max_z: 100,
        exits: [[0, 2, 90, 5, 'Sample Exit', 'jb', '', 1, '']], places: [],
        floors: [{ key: 'sample_zone_f0', name: 'Sample Zone - (Main Floor)', min_x: -100, max_x: 100, min_z: -100, max_z: 100, hmax: 50, prio: 1 },
          { key: 'sample_zone_f1', name: 'Sample Zone - (Upper Floor)', min_x: -100, max_x: 100, min_z: -100, max_z: 100, hmin: 50, prio: 1 }] };
      got = true;
    }
    if (kind === 'art' && name === 'sample_zone_f0') {
      (window.__jqbmapArt = window.__jqbmapArt || {})[name] = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      got = true;
    }
    say('map', kind + '|' + name + '|' + (got ? '1' : '0'));
  }
  /* Ask Ogre without Ogre's Validate, as OpenIC_SendVerify answers it (Ogre's colour codes are BEL and a letter) */
  function verifyAnswer() {
    var v = function (id) { return (document.getElementById(id) || {}).value || ''; };
    var file = v('openic-arg-tier') + '/' + v('openic-arg-path'), B = String.fromCharCode(7);
    say('verify', 'begin|' + file);
    say('verify', 's|[14:00:00.000] [Ogre][IC] ' + B + 'g3 zone(s) from 3 file(s) - 0 skipped, 1 warning(s)' + B + 'w');
    say('verify', 'l|[14:00:00.001] [Ogre][IC] ' + B + 'y  [' + v('openic-arg-tier') + '] ' + v('openic-arg-path') + '  ->  Sample Zone: The Test Halls [Heroic]' + B + 'w');
    say('verify', 'l|[14:00:00.001] [Ogre][IC] ' + B + 'y  [default] Sample/other.json  ->  Sample Zone: The Test Halls [Heroic]' + B + 'w');
    say('verify', 'l|[14:00:00.002] [Ogre][IC] ' + B + 'g2 of 3 zone file(s) matching' + B + 'w');
    say('verify', 'p|[14:00:00.000] [Ogre][IC] ' + file + ': steps[3]: loot: "sample" is not a field of this action - nothing reads it');
    say('verify', 'end|');
  }
  window.ogreCall = function (kind, line) {
    if (kind !== 'cmd') return;
    log.push(line);
    var fake = window.__openicFakeGame.log;
    if (fake !== log) fake.push(line);
    if (/OpenIC_List/.test(line)) { listAnswer(); return; }
    setTimeout(function () {
      if (/OpenIC_Map/.test(line)) mapAnswer();
      if (/OpenIC_Verify/.test(line)) verifyAnswer();
      /* Save, Test and FightTest, as OpenIC.iss answers them */
      if (/OpenIC_Save\]/.test(line)) say('say', 'ok:saved ' + ((document.getElementById('openic-arg-path') || {}).value || ''));
      if (/OpenIC_Test\]/.test(line)) {
        say('test', 'out|[14:00:00.000] [Ogre][IC] ' + String.fromCharCode(7) + 'g3 zone(s) from 3 file(s) - 0 skipped, 0 warning(s)' + String.fromCharCode(7) + 'w');
        say('test', 'state|running|pending|');
        setTimeout(function () { say('test', 'end|done|completed|'); }, 30);
      }
      if (/OpenIC_FightTest\]/.test(line)) { say('test', 'fight|asked'); say('test', 'fight|TRUE'); say('test', 'fightend|TRUE'); }
      if (/OpenIC_Hello/.test(line)) { say('ext', 'ogrex=1;eq2=1;ogreeq2=1;bot=1;jqb=0;add=1;check=1;fcheck=1'); say('me', '10.5,2,-30.25|Sample Zone: The Test Halls [Heroic]|A Target|fury|Sample_Zone'); }
      if (/OpenIC_Check/.test(line)) {
        var answer = '{"ok":false,"errors":1,"warnings":0,"issues":[{"list":"steps","step":1,"message":"a sample problem","warning":false}]}';
        say('check', '1/2|' + answer.slice(0, 40));
        say('check', '2/2|' + answer.slice(40));
      }
      if (/OpenIC_Reload/.test(line)) say('say', 'ok:reloaded');
    }, 0);
  };
})();
</script>
`;
/* what OpenIC.iss does once the window is open: ISXOgreX.UI:EvalFile of each asset part, in order */
const parts = fs.readdirSync(path.join(ROOT, 'host')).map((f) => /^OpenIC-assets-(\d+)\.js$/.exec(f)).filter(Boolean)
  .sort((a, b) => a[1] - b[1]).map((m) => fs.readFileSync(path.join(ROOT, 'host', m[0]), 'utf8').replace(/<\/(script)/gi, '<\\/$1'));
/* the window's body is a box of its own size, as in Ogre's window (the page fits itself to it: IC.app.fitWindow) */
fs.writeFileSync(out, '<!doctype html>\n<html><head><meta charset="utf-8"><title>Ogre window stand-in</title></head><body style="margin:0;background:#000;">\n' +
  prelude + '\n<div id="ogre-window-body" style="position:fixed;left:0;top:0;width:1180px;height:880px;overflow:hidden;">\n' + win + '\n</div>\n' +
  parts.map((p) => '<script>\n' + p + '\n</script>\n').join('') + '</body></html>\n');
console.log('wrote ' + out);
