#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

let body = '';
try {
  const skill = fs.readFileSync(path.join(__dirname, '..', 'skills', 'ultracodinator', 'SKILL.md'), 'utf8');
  body = skill.replace(/^---[\s\S]*?---\s*/, '');
} catch (e) {}

if (!body.trim()) {
  body = 'ultracodinator: binds only while ultracode is ON for the session (system-reminder says so); dormant otherwise.\n'
    + 'When active: every substantive task runs as a Workflow orchestration — the coordinator scouts, authors the '
    + 'script, and reads results between chained phases. Every workflow agent() call and every subagent carries an '
    + 'explicit model override below the heaviest tier — never omit it (omitted = inherit = main-loop model), '
    + 'and never spawn the heaviest model as a stage; the hardest stages get the high tier with higher effort. '
    + 'Size by role: the mid tier is the workhorse and default for implementation and verification; the high tier '
    + '(one below the coordinator) for the most complex stages; the low tier for the simplest mechanical stages.\n'
    + 'Coordinator keeps: decomposition, scripts, stage prompts, reading results between phases, final tests, '
    + 'final review, synthesis.\n'
    + 'Direct work only when orchestrating obviously costs more than the change.';
}

process.stdout.write('ULTRACODINATOR MODE ACTIVE\n\n' + body);
