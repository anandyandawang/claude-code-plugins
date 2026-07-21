#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

let body = '';
try {
  const skill = fs.readFileSync(path.join(__dirname, '..', 'skills', 'orchestrator', 'SKILL.md'), 'utf8');
  body = skill.replace(/^---[\s\S]*?---\s*/, '');
} catch (e) {}

if (!body.trim()) {
  body = 'orchestrator: the main-loop model is the heaviest agent in the session — orchestration only.\n'
    + 'Plan, decompose, delegate. Coding subagents always get an explicit cheaper model override '
    + '(sonnet for implementation, haiku for mechanical sweeps); never spawn your own tier, never omit the override.\n'
    + 'Then test and review yourself; delegate fixes to cheaper agents in a loop until green.\n'
    + 'Direct edits only when delegating costs more than the change (one-liners, config flips).';
}

process.stdout.write('ORCHESTRATOR MODE ACTIVE\n\n' + body);
