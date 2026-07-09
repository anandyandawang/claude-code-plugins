#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

let body = '';
try {
  const skill = fs.readFileSync(path.join(__dirname, '..', 'skills', 'no-comments', 'SKILL.md'), 'utf8');
  body = skill.replace(/^---[\s\S]*?---\s*/, '');
} catch (e) {}

if (!body.trim()) {
  body = 'no-comments: write code with ZERO comments, ever.\n'
    + 'Never write any comment in any language — no `//`, `/* */`, `#`, `--`, `<!-- -->`, no docstrings, no TODO/Note/FIXME.\n'
    + 'Make the code self-explanatory instead: better names, smaller functions, explicit types and constants.\n'
    + 'Only machine-read directives (shebangs, linter/pragma directives) may use comment syntax.';
}

process.stdout.write('NO-COMMENTS ACTIVE — zero code comments, ever.\n\n' + body);
