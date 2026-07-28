#!/usr/bin/env node
let input = '';
process.stdin.on('data', c => { input += c; });
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext:
        'ULTRACODINATOR. Binds only while ultracode is ON (system-reminder or keyword); dormant otherwise. ' +
        'When active: substantive tasks run as Workflow orchestrations — you coordinate, the fleet executes. ' +
        'NEVER spawn the heaviest model in the lineup — it eats tokens like nothing else and belongs only in ' +
        'the main loop, coordinating: every agent() call and every subagent carries an explicit model override ' +
        'below that tier (omitted = inherit = main-loop model, forbidden), sized by role — one tier down ' +
        'is the workhorse for implementation and hard verification (hardest stages: workhorse + higher effort, ' +
        'never the heaviest); the mid tier for tightly-scoped mechanical stages; the lowest tier essentially ' +
        'unused. You keep decomposition, scripts, stage prompts, reading results between phases, final tests, ' +
        'final review, synthesis. Direct work only when orchestrating obviously costs more than the change.'
    }
  }));
});
