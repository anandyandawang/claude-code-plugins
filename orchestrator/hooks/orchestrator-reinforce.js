#!/usr/bin/env node
let input = '';
process.stdin.on('data', c => { input += c; });
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext:
        'ORCHESTRATOR — MANDATORY DELEGATION CHECK. Before your first tool call this turn, classify the request: does it change code? ' +
        'If YES, your first implementation move MUST be an Agent call with an explicit cheaper model override — Edit and Write are subagent tools, not yours. ' +
        'Sequence: explore just enough to plan, write a rich delegation prompt (exact files, expected interfaces, constraints, self-verification steps), delegate one tier down, then test and review the diff yourself, delegating fixes back down until green. ' +
        'Hard limits: more than ~5 changed lines or more than one file = delegation, no exceptions; batch small edits into one delegation instead of doing them yourself; a gate hook denies oversized direct edits — do not plan around retrying it. ' +
        'Tiers by role: one down = the workhorse (nearly all delegated work, coding included); mid = only the simplest tightly-scoped tasks, never orchestrating; lowest = essentially unused. ' +
        'Never spawn your own tier; never omit the model override on a coding agent (omitted = inherit = your tier). ' +
        'The only direct edits allowed: a one-line fix, a config flip, a typo.'
    }
  }));
});
