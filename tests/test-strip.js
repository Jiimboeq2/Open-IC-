// tools/strip-comments.js: comments go, literals that only look like comments stay, line breaks that matter stay,
// and every Creator module carries exactly one comment (its header).
//   node tests/test-strip.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { strip } = require('../tools/strip-comments.js');
const { ROOT, ok, test, done } = require('./lib.js');

function run(code) { const ctx = {}; vm.createContext(ctx); return vm.runInContext(code, ctx); }
/* the stripped code gives the same answer as the original, and the named comment words are gone */
function same(src, gone) {
  const out = strip(src), a = JSON.stringify(run(src)), b = JSON.stringify(run(out));
  ok(a === b, 'same result: ' + a + ' / ' + b + ' for ' + JSON.stringify(out));
  for (const g of gone || []) ok(out.indexOf(g) < 0, '"' + g + '" is gone from ' + JSON.stringify(out));
  return out;
}

test('line and block comments go; a line that held only a comment goes with it', () => {
  const out = strip('var a = 1; // one\n// two\n/* three\n   four */\nvar b = 2; /* five */\n');
  ok(out === 'var a = 1;\nvar b = 2;\n', JSON.stringify(out));
});
test('strings keep what looks like comments', () => {
  same('var s = "http://x // y /* z */"; var t = \'/* not */\'; // gone1\ns + t;\n', ['gone1']);
});
test('template literals: their text and ${ } inside are kept, comments inside ${ } go', () => {
  same('var n = 2; var s = `a // b ${ n /* gone2 */ + 1 } /* c */ ${ `in ${ n }` }`;\ns;\n', ['gone2']);
});
test('a regular expression is not taken for a comment, a division is not taken for a regex', () => {
  same('var r = /\\/*[^*]*\\*\\//g; var d = 10 / 2 / 5; var k = (4) / 2; var t = "a/*b*/c".replace(/[/*]/g, ""); // gone3\n[r.source, d, k, t];\n', ['gone3']);
});
test('a regex after a keyword, a division after a closing bracket or an object', () => {
  same('function f(x) { return /ab+c/.test(x); }\nvar a = [6][0] / 3;\nvar o = { v: 8 }.v / 4; /* gone4 */\n[f("abbc"), a, o];\n', ['gone4']);
});
test('a block comment across lines still ends a statement', () => {
  same('function f() { return /* gone5\n*/ 1; }\n[f()];\n', ['gone5']);
  same('var a = 1, b = 0\n/* gone6 */ b = a\n++a\n;[a, b];\n', ['gone6']);
});
test('two tokens a comment kept apart stay apart', () => {
  same('var a = 1, b = 2; var c = a/*x*/+/*y*/+b;\nc;\n');
});
test('a slash in a regex character class does not end it', () => {
  same('var r = /[/]+x/; // gone7\nr.test("//x");\n', ['gone7']);
});
test('an unterminated string or comment is refused', () => {
  let threw = 0;
  for (const bad of ['var s = "abc;\n', 'var a = 1; /* never ends', 'var t = `open ${ 1 }']) { try { strip(bad); } catch (e) { threw++; } }
  ok(threw === 3, threw + ' of 3 refused');
});
test('every Creator module: one header comment, nothing else to strip', () => {
  const dir = path.join(ROOT, 'creator', 'js');
  let n = 0;
  for (const f of fs.readdirSync(dir).filter((x) => /\.js$/.test(x))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    new vm.Script(src, { filename: f });
    const end = src.indexOf('*/');
    ok(src.slice(0, 2) === '/*' && end > 0, f + ': starts with its header');
    /* a Windows checkout turns line ends into CR LF: compare the text, not the line ends */
    const body = src.slice(end + 2).replace(/^\r?\n/, '').replace(/\r\n/g, '\n');
    if (/^ic-/.test(f)) ok(strip(body) === body, f + ': no comment left but the header');
    n++;
  }
  ok(n >= 33, n + ' modules');
});
done('test-strip');
