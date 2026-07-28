#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

let body = '';
try {
  const skill = fs.readFileSync(path.join(__dirname, '..', 'skills', 'plan-big-execute-small', 'SKILL.md'), 'utf8');
  body = skill.replace(/^---[\s\S]*?---\s*/, '');
} catch (e) {}

if (!body.trim()) {
  body = 'plan-big-execute-small: the main-loop model is the frontier coordinator — it plans, briefs, judges, and synthesizes.\n'
    + 'Token-heavy reads (long files, logs, broad grep sweeps, web pages, generated output) go to cheap worker subagents '
    + 'with an explicit cheaper model override, each in its own context window, returning distilled findings with evidence '
    + '(file:line, quotes, URLs) and stated uncertainties — never raw dumps.\n'
    + 'Fan out independent sub-questions to parallel workers, and bundle related lookups into one brief since each delegation has a floor cost.\n'
    + 'Small planning peeks and reads where frontier judgment on the raw material is the point stay with the coordinator.';
}

process.stdout.write('PLAN BIG, EXECUTE SMALL — ACTIVE\n\n' + body);
