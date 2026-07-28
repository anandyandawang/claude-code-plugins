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
        'below that tier (omitted = inherit = main-loop model, forbidden), sized by role — the mid tier ' +
        'is the workhorse and default for implementation and verification; the high tier (one below the ' +
        'coordinator) for the most complex stages (hardest stages: high tier + higher effort, never the ' +
        'heaviest); the low tier for the simplest mechanical stages. ' +
        'You keep decomposition, scripts, stage prompts, reading results between phases, final tests, ' +
        'final review, synthesis. Direct work only when orchestrating obviously costs more than the change.'
    }
  }));
});
