// Builds a stand-in for native Ogre's window host around host/OpenIC.html, so the in-game build can run its self
// test in a normal browser: window.ogreCall records each command line, window.ogreUISet sets a field and fires its
// events the way Ogre does, the stand-in answers the window's Hello like OpenIC.iss would, and the asset pack is run
// after the window, as OpenIC.iss's ISXOgreX.UI:EvalFile does.
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
  window.ogreCall = function (kind, line) {
    if (kind !== 'cmd') return;
    log.push(line);
    var fake = window.__openicFakeGame.log;
    if (fake !== log) fake.push(line);
    setTimeout(function () {
      if (/OpenIC_Hello/.test(line)) { say('ext', 'ogrex=1;eq2=1;ogreeq2=1;bot=1;jqb=0;add=1'); say('me', '10.5,2,-30.25|Sample Zone: The Test Halls [Heroic]|A Target|fury'); }
      if (/OpenIC_Check/.test(line)) say('check', '{"ok":false,"errors":1,"warnings":0,"issues":[{"list":"steps","step":1,"message":"a sample problem","warning":false}]}');
      if (/OpenIC_Reload/.test(line)) say('say', 'ok:reloaded');
    }, 0);
  };
})();
</script>
`;
/* what OpenIC.iss does once the window is open: ISXOgreX.UI:EvalFile of the asset pack */
const pack = fs.readFileSync(path.join(ROOT, 'host', 'OpenIC-assets.js'), 'utf8').replace(/<\/(script)/gi, '<\\/$1');
fs.writeFileSync(out, '<!doctype html>\n<html><head><meta charset="utf-8"><title>Ogre window stand-in</title></head><body style="margin:0;background:#000;">\n' +
  prelude + '\n' + win + '\n<script>\n' + pack + '\n</script>\n</body></html>\n');
console.log('wrote ' + out);
