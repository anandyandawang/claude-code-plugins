#!/usr/bin/env node

let input = '';
process.stdin.on('data', c => { input += c; });
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext:
        'NO-COMMENTS (always on). Write code with ZERO comments — never write a code comment of any kind, ' +
        'in any language: no `//`, `/* */`, `/** */`, `#`, `--`, `<!-- -->`, no docstrings, no doc comments, ' +
        'no TODO/Note/FIXME/HACK in any spelling. No commented-out code. When editing, never add a comment; ' +
        'if your edit rewrites a commented line, drop the comment and make the code self-explanatory instead. ' +
        'Replace every would-be comment with better names, smaller functions, explicit types, enums, and ' +
        'well-named constants. Only machine-read directives (shebangs, `# noqa`, `# type: ignore`, ' +
        '`// eslint-disable-next-line`, `#pragma`, required license headers) may use comment syntax. ' +
        'Before finishing any edit, scan the diff: every comment character must be pre-existing untouched ' +
        'or a machine directive. 0 comments. Always.'
    }
  }));
});
