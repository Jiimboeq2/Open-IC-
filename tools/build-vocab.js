#!/usr/bin/env node
/*
 * build-vocab.js - turns data/vocabulary.json into creator/js/openic-vocab.js, so the page has the vocabulary
 * without fetching a file (a page opened from disk, and Ogre's in-game window, cannot fetch local files).
 *
 * Usage: node tools/build-vocab.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'data', 'vocabulary.json');
const OUT = path.join(ROOT, 'creator', 'js', 'openic-vocab.js');

function build() {
  const vocab = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  return '/* Open IC Creator - openic-vocab.js\n' +
    '   The vocabulary of native OgreBot zone files and fight files (IC.vocab), made from data/vocabulary.json by\n' +
    '   tools/build-vocab.js. Edit the JSON file, then run the tool again.\n' +
    '   MIT License, see LICENSE. */\n' +
    '(function (root) {\n' +
    '  var IC = root.IC = root.IC || {};\n' +
    '  IC.vocab = ' + JSON.stringify(vocab) + ';\n' +
    '})(typeof window !== \'undefined\' ? window : this);\n';
}

module.exports = { build, OUT };

if (require.main === module) {
  const text = build();
  fs.writeFileSync(OUT, text);
  console.log('wrote ' + path.relative(ROOT, OUT) + ' (' + text.length + ' bytes)');
}
