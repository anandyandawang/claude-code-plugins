#!/usr/bin/env node
// clear-comments — UserPromptSubmit hook. Re-assert sparse-comment default every turn so long
// sessions don't drift back to over-commenting. Plugin on = always on; disable the plugin to stop.

let input = '';
process.stdin.on('data', c => { input += c; }); // drain stdin, avoid broken pipe
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext:
        'CLEAR-COMMENTS DEFAULT (always on). Comment sparingly — default to NO comment. ' +
        'Before writing one, delete the need: better name, smaller function, an enum over a magic value. ' +
        'Roughly 1 line in 100 earns a standalone comment. Say WHY, never restate the code below it. ' +
        'Vocabulary is only `//`, `/** */`, `// TODO:` (with its unblocking condition), `// Note:` (a surprising decision). ' +
        'Never `/* */`, FIXME/HACK/XXX, decorative banners, or commented-out code. Backtick every code identifier. ' +
        'This applies to every comment you write or touch while implementing, fixing, refactoring, or testing — ' +
        'not only when comments are the explicit ask. When in doubt, write less; self-documenting code beats a comment.'
    }
  }));
});
