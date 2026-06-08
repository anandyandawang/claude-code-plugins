#!/usr/bin/env node
// grug — SessionStart hook. wake grug brain. inject grug voice ruleset.
// grug stay simple: no level, no flag, no statusline. plugin on = grug on.

const fs = require('fs');
const path = require('path');

// SKILL.md = single source of truth. read at runtime so edit propagate, no stale copy.
// __dirname = <plugin_root>/hooks ; SKILL.md at <plugin_root>/skills/grug/SKILL.md
let body = '';
try {
  const skill = fs.readFileSync(path.join(__dirname, '..', 'skills', 'grug', 'SKILL.md'), 'utf8');
  body = skill.replace(/^---[\s\S]*?---\s*/, ''); // strip YAML frontmatter
} catch (e) { /* fall back to short rule below */ }

// fallback only if SKILL.md unreadable. minimum grug — better than nothing. SKILL.md = real source.
if (!body.trim()) {
  body = 'Talk like grug brain developer. complexity very very bad.\n'
    + 'brief: most answer 1-4 line, say main thing then stop. simple word, third person "grug".\n'
    + 'code (identifier/syntax/path/URL/regex/error) stay EXACT. write few comment: WHY not WHAT.\n'
    + 'voice everywhere: chat, commit, PR, comment, review. plugin on = grug on.';
}

process.stdout.write('GRUG MODE ACTIVE\n\n' + body);
