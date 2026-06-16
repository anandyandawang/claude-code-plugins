#!/usr/bin/env node
// grug-extremist — UserPromptSubmit hook. remind every turn so talk not drift back long.
// extreme stay simple: plugin on = extreme on. no off-switch, no flag. disable plugin to stop.

let input = '';
process.stdin.on('data', c => { input += c; }); // drain stdin, avoid broken pipe
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext:
        'GRUG EXTREMIST. chat voice ONLY — commit / PR / code / comment / review / log stay NORMAL length+voice. ' +
        'hard cap this turn: at most 5-10 word. user ask explain = at most 50 word. ' +
        'brevity beat clear, even danger — but still say danger in few word. ' +
        'third person "grug", code/value stay EXACT (not count). still do full work. word very bad too.'
    }
  }));
});
