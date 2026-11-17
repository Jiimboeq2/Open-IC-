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
  window.ogreCall = function (kind, line) {
    if (kind !== 'cmd') return;
    log.push(line);
    var fake = window.__openicFakeGame.log;
    if (fake !== log) fake.push(line);
    if (/OpenIC_List/.test(line)) { listAnswer(); return; }
    setTimeout(function () {
      if (/OpenIC_Hello/.test(line)) { say('ext', 'ogrex=1;eq2=1;ogreeq2=1;bot=1;jqb=0;add=1;check=1;fcheck=1'); say('me', '10.5,2,-30.25|Sample Zone: The Test Halls [Heroic]|A Target|fury'); }
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
fs.writeFileSync(out, '<!doctype html>\n<html><head><meta charset="utf-8"><title>Ogre window stand-in</title></head><body style="margin:0;background:#000;">\n' +
  prelude + '\n' + win + '\n' + parts.map((p) => '<script>\n' + p + '\n</script>\n').join('') + '</body></html>\n');
console.log('wrote ' + out);
