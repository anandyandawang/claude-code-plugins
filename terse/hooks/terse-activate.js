#!/usr/bin/env node
// terse — SessionStart hook. Inject the verbosity-cap ruleset.
// Plugin on = terse on. No levels, no flags.

const fs = require('fs');
const path = require('path');

// SKILL.md is the single source of truth. Read at runtime so edits propagate.
// __dirname = <plugin_root>/hooks ; SKILL.md at <plugin_root>/skills/terse/SKILL.md
let body = '';
try {
  const skill = fs.readFileSync(path.join(__dirname, '..', 'skills', 'terse', 'SKILL.md'), 'utf8');
  body = skill.replace(/^---[\s\S]*?---\s*/, ''); // strip YAML frontmatter
} catch (e) { /* fall back to short rule below */ }

// Fallback only if SKILL.md is unreadable.
if (!body.trim()) {
  body = 'TERSE MODE. Hard cap: write at most ~20% of a normal response. Strict, no exceptions.\n'
    + 'Lead with the answer. Most answers 1-4 lines. No preamble, no recap, no options not taken.\n'
    + 'Applies everywhere: chat, commits, PRs, code comments, reviews, logs, docs.\n'
    + 'Code/commands/values stay exact and complete — cut prose, never code.';
}

process.stdout.write('TERSE MODE ACTIVE\n\n' + body);
