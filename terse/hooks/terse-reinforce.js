#!/usr/bin/env node
// terse — UserPromptSubmit hook. Re-assert the cap every turn so long sessions don't drift verbose.
// Plugin on = terse on. No off-switch; disable the plugin to stop.

let input = '';
process.stdin.on('data', c => { input += c; }); // drain stdin, avoid broken pipe
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext:
        'TERSE MODE. Hard cap, no exceptions: at most ~20% of a normal response. ' +
        'Lead with the answer. Most answers 1-4 lines. No preamble, no recap, no options not taken. ' +
        'Every medium: chat, commits, PRs, code comments, reviews, logs, docs. ' +
        'Code/commands/values stay exact and complete — cut prose, never code.'
    }
  }));
});
