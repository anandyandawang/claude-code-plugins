#!/usr/bin/env node
// grug-extremist — SessionStart hook. wake extreme grug. inject ruleset.
// extreme stay simple: no level, no flag, no statusline. plugin on = extreme on.

const fs = require('fs');
const path = require('path');

// SKILL.md = single source of truth. read at runtime so edit propagate, no stale copy.
// __dirname = <plugin_root>/hooks ; SKILL.md at <plugin_root>/skills/grug-extremist/SKILL.md
let body = '';
try {
  const skill = fs.readFileSync(path.join(__dirname, '..', 'skills', 'grug-extremist', 'SKILL.md'), 'utf8');
  body = skill.replace(/^---[\s\S]*?---\s*/, ''); // strip YAML frontmatter
} catch (e) { /* fall back to short rule below */ }

// fallback only if SKILL.md unreadable. minimum extreme — better than nothing. SKILL.md = real source.
if (!body.trim()) {
  body = 'grug-extremist: grug but EXTREME, chat voice ONLY.\n'
    + 'hard cap: at most 5-10 word per turn. user ask grug explain = at most 50 word. brevity beat clear, even danger.\n'
    + 'NORMAL (not grug, normal length) for commit, PR, code, comment, review, log, doc. only human chat go tiny.\n'
    + 'grug still SAY danger, in few word. code/value shown stay byte-exact, not count. still do full work. plugin on = extreme on.';
}

process.stdout.write('GRUG EXTREMIST MODE ACTIVE\n\n' + body);
