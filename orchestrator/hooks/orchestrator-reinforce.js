#!/usr/bin/env node
let input = '';
process.stdin.on('data', c => { input += c; });
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext:
        'ORCHESTRATOR. You are the heaviest model in the session — orchestration only, no line-punching. ' +
        'Delegate ALL code-writing to cheaper subagents with an explicit model override ' +
        '(sonnet: implementation/refactors/tests; haiku: mechanical sweeps). Never spawn your own tier; ' +
        'never omit the model override on a coding agent (omitted = inherit = your tier). ' +
        'You: plan, decompose, write rich delegation prompts, then run tests and review diffs yourself, ' +
        'delegating fixes back down in a loop until green. ' +
        'Direct edits only when delegating costs more than the change (one-line fix, config flip).'
    }
  }));
});
