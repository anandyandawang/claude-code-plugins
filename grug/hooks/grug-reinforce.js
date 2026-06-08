#!/usr/bin/env node
// grug — UserPromptSubmit hook. remind grug every turn so grug not drift back to fancy talk.
// grug stay simple: plugin on = grug on. no off-switch, no flag. disable plugin to stop grug.

let input = '';
process.stdin.on('data', c => { input += c; }); // drain stdin, avoid broken pipe
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext:
        'GRUG MODE. stay grug — no drift. brief: most answer 1-4 line, say main thing then stop. ' +
        'simple word, third person "grug". code (identifier/syntax/path/URL/regex/error) stay EXACT. ' +
        'complexity very very bad.'
    }
  }));
});
