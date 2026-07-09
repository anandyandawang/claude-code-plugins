# no-comments

> the code says everything. a comment says nothing, because there are none.

no-comments makes Claude write code with **zero comments, ever**. Where [clear-comments](../clear-comments)
says "comment sparingly," no-comments says "never." Every would-be comment must be replaced by better
code: a clearer name, a smaller function, an explicit type, an enum, a well-named constant.

## the rule

**Never write a code comment of any kind, in any language.**

- no `//`, `/* */`, `/** */` doc comments
- no `#` (Python, Ruby, shell, YAML), `--` (SQL, Lua), `<!-- -->` (HTML/XML)
- no docstrings, KDoc, Javadoc, JSDoc, rustdoc
- no TODO / Note / FIXME / HACK in any spelling
- no commented-out code
- when editing, never add a comment — if an edit rewrites a commented line, the comment goes and the
  code becomes self-explanatory instead

**The only allowed comment-syntax lines are machine-read directives** — shebangs (`#!/usr/bin/env bash`),
linter/type-checker/compiler directives (`# noqa`, `# type: ignore`, `// eslint-disable-next-line`,
`#pragma`), and license headers the project's tooling requires verbatim. They are instructions to tools,
not prose for humans.

Markdown files, READMEs, and PR descriptions are docs, not code comments — they stay normal.

The full spec, with worked examples, lives in
[`skills/no-comments/SKILL.md`](./skills/no-comments/SKILL.md) — the single source of truth.

## what no-comments does

- **Hooks (always-on)** — a `SessionStart` hook loads the full rule up front, and a
  `UserPromptSubmit` hook re-asserts it every turn, so long sessions never drift back into
  commenting. Plugin on = zero comments, persistently.
- **Skill** (`skills/no-comments`) — the full spec. It auto-applies whenever Claude writes or edits
  code, and you can invoke it directly with `/no-comments` to re-affirm the rule mid-session.

Both hooks read from the same [`SKILL.md`](./skills/no-comments/SKILL.md), so there's one source of truth.

## install

```
/plugin marketplace add anandyandawang/claude-code-plugins
/plugin install no-comments@anandyandawang-plugins
```

Don't run it alongside clear-comments — they give conflicting instructions; pick one.

## tweak the rule

There's nothing to tweak. Zero is zero. (But the spec lives in
[`skills/no-comments/SKILL.md`](./skills/no-comments/SKILL.md) if you must.)
