// Runs the page's own self test (creator/index.html#selftest) in a headless Chromium browser (Edge or Chrome) over
// the DevTools protocol, and prints its report and any page errors. Optional: skipped when no browser is found.
//   node tests/browser-selftest.js [--browser <msedge.exe or chrome.exe>] [--page <html file>] [--profile <dir>] [--shot <png>]
// --page can point at another page that runs the self test (for example the in-game window in a stand-in for Ogre).
// --eval <expression> runs after the report (a promise is waited for), --wait <ms> before it.
// Needs Node 22 or newer (its built-in WebSocket).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const ROOT = path.join(__dirname, '..');
const page = path.resolve(opt('--page', path.join(ROOT, 'creator', 'index.html')));
const shot = opt('--shot', '');
const CANDIDATES = [opt('--browser', process.env.OPENIC_BROWSER || ''),
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const browser = CANDIDATES.find((p) => { try { return fs.statSync(p).isFile(); } catch (e) { return false; } });
if (!browser) { console.log('No Chromium browser found: the browser self test is skipped (give one with --browser).'); process.exit(0); }
if (typeof WebSocket !== 'function') { console.log('This Node has no WebSocket (Node 22 or newer needed): the browser self test is skipped.'); process.exit(0); }

const profile = path.resolve(opt('--profile', fs.mkdtempSync(path.join(os.tmpdir(), 'openic-'))));
fs.mkdirSync(profile, { recursive: true });
try { fs.unlinkSync(path.join(profile, 'DevToolsActivePort')); } catch (e) { /* not there */ }
const url = 'file:///' + page.replace(/\\/g, '/').replace(/^\/+/, '') + '#selftest';
const child = cp.spawn(browser, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--no-sandbox',
  '--remote-debugging-port=0', '--user-data-dir=' + profile, '--window-size=1400,900', 'about:blank'], { stdio: 'ignore', detached: false });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function main() {
  let port = 0;
  for (let i = 0; i < 100 && !port; i++) {
    await sleep(200);
    try { port = +fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split(/\r?\n/)[0]; } catch (e) { port = 0; }
  }
  if (!port) throw new Error('the browser did not open its DevTools port');
  const target = await (await fetch('http://127.0.0.1:' + port + '/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('no DevTools connection')); });
  let id = 0;
  const waiting = {}, errors = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && waiting[m.id]) { waiting[m.id](m); delete waiting[m.id]; return; }
    if (m.method === 'Runtime.exceptionThrown') errors.push('page error: ' + ((m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description) || m.params.exceptionDetails.text));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('console error: ' + m.params.args.map((a) => a.value || a.description).join(' '));
  };
  const send = (method, params) => new Promise((res) => { const n = ++id; waiting[n] = res; ws.send(JSON.stringify({ id: n, method, params: params || {} })); });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url });
  let report = '';
  for (let i = 0; i < 100 && !/SELFTEST (OK|FAILED)/.test(report); i++) {
    await sleep(200);
    const r = await send('Runtime.evaluate', { expression: "(document.getElementById('openic-selftest')||{}).textContent||''", returnByValue: true });
    report = (r.result && r.result.result && r.result.result.value) || '';
  }
  const extra = opt('--eval', '');
  if (extra) {
    await sleep(+opt('--wait', '0') || 0);
    const r = await send('Runtime.evaluate', { expression: extra, returnByValue: true, awaitPromise: true });
    console.log('eval: ' + JSON.stringify(r.result && r.result.result ? r.result.result.value : r));
  }
  if (shot) {
    const s = await send('Page.captureScreenshot', { format: 'png' });
    if (s.result && s.result.data) fs.writeFileSync(shot, Buffer.from(s.result.data, 'base64'));
  }
  try { await send('Browser.close'); } catch (e) { /* closing */ }
  ws.close();
  return { report, errors };
}
main().then(({ report, errors }) => {
  for (const e of errors) console.log(e);
  if (!report) { console.log('No self-test report from the page.'); process.exitCode = 1; }
  else { console.log(report.trim()); process.exitCode = /SELFTEST OK/.test(report) && !errors.length ? 0 : 1; }
}).catch((e) => { console.log('Browser self test could not run: ' + e.message); process.exitCode = 1; })
  .finally(() => { setTimeout(() => { try { child.kill(); } catch (e) { /* gone */ } }, 500); });
