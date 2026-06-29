#!/usr/bin/env node
// clear-comments — SessionStart hook. Load the full house style up front so the sparse-comment
// default is in context from the first edit, not only when the skill happens to fire.

const fs = require('fs');
const path = require('path');

// SKILL.md is the single source of truth. Read it at runtime so edits propagate without a stale copy.
// __dirname = <plugin_root>/hooks ; SKILL.md at <plugin_root>/skills/clear-comments/SKILL.md
let body = '';
try {
  const skill = fs.readFileSync(path.join(__dirname, '..', 'skills', 'clear-comments', 'SKILL.md'), 'utf8');
  body = skill.replace(/^---[\s\S]*?---\s*/, ''); // strip YAML frontmatter
} catch (e) { /* fall back to the short rule below */ }

// Fallback only if SKILL.md is unreadable — a minimum the session can still honor.
if (!body.trim()) {
  body = 'clear-comments: write code comments in the house style.\n'
    + 'Comment sparingly — default to NO comment; delete the need with a better name or smaller function.\n'
    + 'Say WHY, never restate the code. Vocabulary is only `//`, `/** */`, `// TODO:` (with its condition), `// Note:`.\n'
    + 'Never `/* */`, FIXME/HACK/XXX, decorative banners, or commented-out code. Backtick every code identifier.';
}

process.stdout.write('CLEAR-COMMENTS DEFAULT ACTIVE — comment sparingly, say why not what.\n\n' + body);
