#!/usr/bin/env node
/*
 * strip-comments.js - removes line comments and block comments from JavaScript source.
 *
 * A small tokenizer walks the source and keeps every literal intact: strings ('...' and "..."), template literals
 * (with ${ } nesting, any depth) and regular-expression literals. Whether a "/" starts a regular expression or is a
 * division is decided from the token before it, the way a JavaScript parser does. Only real comments are removed.
 *
 * Clean-up after removal:
 *   - a line that held only a comment is dropped;
 *   - trailing spaces outside literals are trimmed;
 *   - runs of blank lines become one blank line;
 *   - a block comment that spanned lines still leaves a line break behind, so automatic semicolon insertion reads
 *     the code exactly as before.
 *
 * Usage:
 *   node tools/strip-comments.js <in.js> [<out.js>]        one file (to stdout when no output is given)
 *   node tools/strip-comments.js --dir <inDir> <outDir>    every .js file in a folder (not recursive)
 *
 * As a module: const { strip } = require('./strip-comments'); strip(sourceText) -> text without comments.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const EXPR_KEYWORDS = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw',
  'case', 'do', 'else', 'yield', 'await', 'extends']);
const BLOCK_KEYWORDS = new Set(['else', 'do', 'try', 'finally']);
const PUNCT = ['>>>=', '...', '===', '!==', '**=', '<<=', '>>=', '>>>', '&&=', '||=', '??=', '=>', '==', '!=', '<=', '>=',
  '&&', '||', '??', '?.', '++', '--', '+=', '-=', '*=', '%=', '&=', '|=', '^=', '<<', '>>', '**'];

const DEL = String.fromCharCode(0x7f);
const NBSP = String.fromCharCode(0xa0);
const BOM = String.fromCharCode(0xfeff);
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);
const TAB = String.fromCharCode(0x09);
const LF = String.fromCharCode(0x0a);
const VT = String.fromCharCode(0x0b);
const FF = String.fromCharCode(0x0c);

function isIdStart(c) { return /[A-Za-z_$\\]/.test(c) || c > DEL; }
function isIdPart(c) { return /[A-Za-z0-9_$\\]/.test(c) || c > DEL; }
function isDigit(c) { return c >= '0' && c <= '9'; }
function isHws(c) { return c === ' ' || c === TAB || c === VT || c === FF || c === NBSP || c === BOM; }
function isNl(c) { return c === LF || c === LS || c === PS; }

function stripError(msg, src, at) {
  const line = src.slice(0, at).split(LF).length;
  const e = new Error(msg + ' (line ' + line + ')');
  e.line = line;
  return e;
}

/* Returns the source with every comment removed. Throws on an unterminated string, template, regex or comment. */
function strip(source) {
  const src = String(source).replace(/\r\n?/g, LF);
  const n = src.length;
  const out = [];
  const lit = [];
  const commentLines = new Set();
  let line = 0;
  let i = 0;
  let prev = { t: 'start', v: '' };
  const stack = [];

  function emit(s, isLit) {
    for (let k = 0; k < s.length; k++) {
      out.push(s[k]);
      lit.push(isLit ? 1 : 0);
      if (s[k] === LF) line++;
    }
  }
  function trimOut() {
    while (out.length && lit[out.length - 1] === 0 && isHws(out[out.length - 1])) { out.pop(); lit.pop(); }
  }
  function lastOut() { return out.length ? out[out.length - 1] : LF; }
  function regexAllowed() {
    if (prev.t === 'start' || prev.t === 'blockend' || prev.t === 'kw') return true;
    if (prev.t === 'punct') return !(prev.v === ')' || prev.v === ']' || prev.v === '++' || prev.v === '--');
    return false;
  }
  function braceKind() {
    if (prev.t === 'start' || prev.t === 'blockend' || prev.t === 'name') return 'block';
    if (prev.t === 'kw') return BLOCK_KEYWORDS.has(prev.v) ? 'block' : 'obj';
    if (prev.t === 'punct') return (prev.v === ')' || prev.v === ';' || prev.v === '{' || prev.v === '=>') ? 'block' : 'obj';
    return 'obj';
  }
  function lineIndent(at) {
    let s = at;
    while (s > 0 && src[s - 1] !== LF) s--;
    let e = s;
    while (e < n && isHws(src[e])) e++;
    return src.slice(s, e);
  }

  function scanTemplate() {
    while (i < n) {
      const c = src[i];
      if (c === '\\') { emit(src.slice(i, i + 2), true); i += 2; continue; }
      if (c === '`') { emit('`', true); i++; prev = { t: 'lit', v: '`' }; return; }
      if (c === '$' && src[i + 1] === '{') {
        emit('${', true); i += 2;
        stack.push('tpl');
        prev = { t: 'punct', v: '${' };
        return;
      }
      emit(c, true); i++;
    }
    throw stripError('unterminated template literal', src, i);
  }

  while (i < n) {
    const c = src[i];
    const d = src[i + 1];

    if (isHws(c) || isNl(c)) { emit(c, false); i++; continue; }

    if (c === '/' && d === '/') {
      let j = i + 2;
      while (j < n && !isNl(src[j])) j++;
      commentLines.add(line);
      trimOut();
      i = j;
      continue;
    }
    if (c === '/' && d === '*') {
      const end = src.indexOf('*/', i + 2);
      if (end < 0) throw stripError('unterminated block comment', src, i);
      const body = src.slice(i + 2, end);
      const startAt = i;
      i = end + 2;
      if (body.indexOf(LF) >= 0 || body.indexOf(LS) >= 0 || body.indexOf(PS) >= 0) {
        commentLines.add(line);
        trimOut();
        emit(LF, false);
        commentLines.add(line);
        while (i < n && isHws(src[i])) i++;
        if (i < n && !isNl(src[i])) emit(lineIndent(startAt), false);
        continue;
      }
      let j = i;
      while (j < n && isHws(src[j])) j++;
      const next = j < n ? src[j] : LF;
      const lo = lastOut();
      if (isNl(next)) {
        commentLines.add(line);
        trimOut();
      } else if (isHws(lo) || isNl(lo)) {
        if (')]};,'.indexOf(next) >= 0 && isHws(lo)) trimOut();
      } else if ('([{'.indexOf(lo) < 0 && ')]};,'.indexOf(next) < 0) {
        emit(' ', false);
      }
      i = j;
      continue;
    }

    if (c === '\'' || c === '"') {
      let j = i + 1;
      while (j < n) {
        const ch = src[j];
        if (ch === '\\') { j += 2; continue; }
        if (ch === c) break;
        if (ch === LF) throw stripError('unterminated string', src, i);
        j++;
      }
      if (j >= n) throw stripError('unterminated string', src, i);
      emit(src.slice(i, j + 1), true);
      i = j + 1;
      prev = { t: 'lit', v: c };
      continue;
    }

    if (c === '`') {
      emit('`', true); i++;
      scanTemplate();
      continue;
    }

    if (c === '/' && regexAllowed()) {
      let j = i + 1, inClass = false;
      while (j < n) {
        const ch = src[j];
        if (ch === '\\') { j += 2; continue; }
        if (isNl(ch)) throw stripError('unterminated regular expression', src, i);
        if (inClass) { if (ch === ']') inClass = false; }
        else if (ch === '[') inClass = true;
        else if (ch === '/') break;
        j++;
      }
      if (j >= n) throw stripError('unterminated regular expression', src, i);
      j++;
      while (j < n && isIdPart(src[j])) j++;
      emit(src.slice(i, j), true);
      i = j;
      prev = { t: 'lit', v: '/' };
      continue;
    }

    if (isDigit(c) || (c === '.' && isDigit(d))) {
      let j = i;
      const radix = c === '0' && /[xXbBoO]/.test(d || '');
      while (j < n) {
        const ch = src[j];
        if (/[0-9A-Za-z_.]/.test(ch)) { j++; continue; }
        if (!radix && (ch === '+' || ch === '-') && /[eE]/.test(src[j - 1])) { j++; continue; }
        break;
      }
      emit(src.slice(i, j), false);
      i = j;
      prev = { t: 'lit', v: '0' };
      continue;
    }

    if (isIdStart(c)) {
      let j = i + 1;
      while (j < n && isIdPart(src[j])) j++;
      const word = src.slice(i, j);
      emit(word, false);
      i = j;
      if (prev.t === 'punct' && (prev.v === '.' || prev.v === '?.')) prev = { t: 'name', v: word };
      else prev = EXPR_KEYWORDS.has(word) || BLOCK_KEYWORDS.has(word) ? { t: 'kw', v: word } : { t: 'name', v: word };
      continue;
    }

    if (c === '{') {
      stack.push(braceKind());
      emit('{', false); i++;
      prev = { t: 'punct', v: '{' };
      continue;
    }
    if (c === '}') {
      const kind = stack.length ? stack.pop() : 'block';
      if (kind === 'tpl') {
        emit('}', true); i++;
        scanTemplate();
        continue;
      }
      emit('}', false); i++;
      prev = kind === 'block' ? { t: 'blockend', v: '}' } : { t: 'exprend', v: '}' };
      continue;
    }

    let p = null;
    for (const cand of PUNCT) if (src.startsWith(cand, i)) { p = cand; break; }
    if (!p && c === '/' && d === '=') p = '/=';
    if (!p) p = c;
    emit(p, false);
    i += p.length;
    prev = { t: 'punct', v: p };
  }
  if (stack.indexOf('tpl') >= 0) throw stripError('unterminated template literal', src, n);

  return tidy(out, lit, commentLines);
}

/* Line clean-up: trailing spaces outside literals, comment-only lines, blank-line runs. */
function tidy(out, lit, commentLines) {
  const lines = [];
  let chars = [], masks = [];
  for (let k = 0; k < out.length; k++) {
    if (out[k] === LF) {
      lines.push({ chars, masks, nlLit: lit[k] === 1 });
      chars = []; masks = [];
    } else { chars.push(out[k]); masks.push(lit[k]); }
  }
  lines.push({ chars, masks, nlLit: false });

  const kept = [];
  let blankRun = 0;
  for (let L = 0; L < lines.length; L++) {
    const ln = lines[L];
    let end = ln.chars.length;
    while (end > 0 && ln.masks[end - 1] === 0 && isHws(ln.chars[end - 1])) end--;
    const text = ln.chars.slice(0, end).join('');
    const protectedLine = ln.nlLit || ln.masks.some((x) => x === 1) || (L > 0 && lines[L - 1].nlLit);
    const blank = text.length === 0 && !protectedLine;
    if (blank && commentLines.has(L)) continue;
    if (blank) {
      if (kept.length === 0 || blankRun >= 1) continue;
      blankRun++;
    } else blankRun = 0;
    kept.push(text);
  }
  while (kept.length && kept[kept.length - 1] === '') kept.pop();
  return kept.join(LF) + LF;
}

function main(argv) {
  if (argv[0] === '--dir') {
    const inDir = argv[1], outDir = argv[2];
    if (!inDir || !outDir) { console.error('usage: strip-comments.js --dir <inDir> <outDir>'); return 2; }
    fs.mkdirSync(outDir, { recursive: true });
    let count = 0;
    for (const f of fs.readdirSync(inDir)) {
      if (!/\.js$/i.test(f)) continue;
      fs.writeFileSync(path.join(outDir, f), strip(fs.readFileSync(path.join(inDir, f), 'utf8')));
      count++;
    }
    console.log('stripped ' + count + ' file(s) into ' + outDir);
    return 0;
  }
  if (!argv[0]) { console.error('usage: strip-comments.js <in.js> [<out.js>] | --dir <inDir> <outDir>'); return 2; }
  const text = strip(fs.readFileSync(argv[0], 'utf8'));
  if (argv[1]) fs.writeFileSync(argv[1], text);
  else process.stdout.write(text);
  return 0;
}

module.exports = { strip };

if (require.main === module) process.exitCode = main(process.argv.slice(2));
