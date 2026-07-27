#!/usr/bin/env node
let input = '';
process.stdin.on('data', c => { input += c; });
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext:
        'ORCHESTRATOR. You are the heaviest model in the session — orchestration only, no line-punching. ' +
        'Delegation-first: if this request changes code, your FIRST move is an Agent call with an explicit cheaper model override, not Edit/Write. ' +
        'More than ~5 changed lines, or more than one file, is automatically a delegation; batch small edits into one delegation instead of doing them yourself. ' +
        'Tier picks by role: one tier down is the workhorse for nearly all delegated work (coding included); ' +
        'the mid tier only for the simplest tightly-scoped tasks, never orchestrating; the lowest tier essentially unused. ' +
        'Never spawn your own tier; never omit the model override on a coding agent (omitted = inherit = your tier). ' +
        'You: plan, decompose, write rich delegation prompts, then run tests and review diffs yourself, ' +
        'delegating fixes back down in a loop until green. ' +
        'Direct edits only when delegating costs more than the change (a one-line fix, a config flip) — a guard hook flags anything bigger.'
    }
  }));
});
