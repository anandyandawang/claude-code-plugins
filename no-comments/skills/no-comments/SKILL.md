---
name: no-comments
description: >
  Write code with ZERO comments. Absolute rule: never write a code comment of any kind, in any
  language — no standalone `//`, no trailing `//`, no doc comments (`/** */`, KDoc, Javadoc, JSDoc,
  docstrings), no `#` comments (Python, Ruby, shell, YAML), no `--` (SQL, Lua), no `<!-- -->`
  (HTML/XML), no block comments, no TODO/Note/FIXME of any flavor. The code must carry all meaning
  itself: names, types, small functions, and structure replace every comment. Machine-read
  directives that merely reuse comment syntax (shebang lines, linter/pragma directives like
  `# noqa`, `// eslint-disable-next-line`, `# type: ignore`) are not comments and stay allowed.
  ALWAYS use this skill — it is not optional — whenever you write or edit code in any language,
  including implementing features, fixing bugs, refactoring, and writing tests. If you are about
  to type a comment character, stop: delete the urge, improve the code instead.
---

# no-comments — zero code comments, ever

One rule: **Claude never writes a code comment. Not one. Zero.**

If the code needs explaining, fix the code — the explanation never goes in a comment. Everything a
comment would say must live in the code itself: a better name, a smaller function, an explicit type,
an enum instead of a magic value, a well-named constant, a clearer structure.

## Hard rules — no exceptions

1. **Never write a comment of any kind, in any language.** Standalone, trailing, doc comment,
   docstring, banner — none of them, ever. This includes:
   - `//`, `/* */`, `/** */` (C-family, JS/TS, Java, Kotlin, Go, Rust, Swift, …)
   - `#` (Python, Ruby, shell, YAML, TOML, Makefile, …)
   - `--` (SQL, Lua, Haskell)
   - `<!-- -->` (HTML, XML, Markdown-embedded HTML)
   - `;` (Lisp, INI, asm), `%` (LaTeX, Erlang), `'` / `REM` (VB, batch)
   - Python/Ruby docstrings and any doc-comment dialect (KDoc, Javadoc, JSDoc, rustdoc, godoc)
2. **No TODO, no Note, no FIXME, no HACK, no XXX** — in any spelling, in any syntax. Deferred work
   goes in the conversation, a commit message, a tracker — never in source.
3. **No commented-out code.** Delete it; git remembers.
4. **When editing existing code, do not add comments** — not even to match the file's existing
   style. If your edit rewrites a line that carries a comment, drop the comment and make the new
   code self-explanatory instead. Leave untouched comments alone unless the user asks you to
   remove them.
5. **Replace the need, don't relocate it.** Before the urge to comment wins, apply one of:
   - rename the function/variable so the intent is in the name
   - extract a smaller function whose name states the why
   - introduce an enum, constant, or type that makes the magic value speak
   - restructure so the surprising case is explicit control flow
6. **The only comment-syntax lines allowed are machine-read directives**, because they are
   instructions to tools, not prose for humans:
   - shebangs: `#!/usr/bin/env bash`
   - linter/type-checker/compiler directives: `# noqa`, `# type: ignore`,
     `// eslint-disable-next-line`, `//go:generate`, `// @ts-expect-error`, `#pragma`
   - license headers only when the project's tooling or policy requires them verbatim
   A directive must contain zero explanatory prose beyond what the tool parses.
7. **Markdown/docs files are not code comments.** READMEs, doc pages, and PR descriptions are
   normal prose and stay unaffected. This rule governs comments inside source code.

## The test

Before finishing any edit, scan your diff for comment characters. Every hit must be either a
pre-existing untouched line or an allowed machine directive. Anything else: delete it and make the
code say it instead.

## Worked examples

Bad:

```kotlin
// strip the leading "1" because the SMS gateway rejects NANP numbers with it
val normalized = raw.removePrefix("1")
```

Good:

```kotlin
val normalized = stripNanpCountryCodeForSmsGateway(raw)
```

Bad:

```python
# retry twice because the vendor API flakes under load
for attempt in range(3):
```

Good:

```python
VENDOR_API_FLAKE_RETRIES = 3
for attempt in range(VENDOR_API_FLAKE_RETRIES):
```

Bad:

```ts
/** Manages the verification state machine for an account. */
export class AccountVerifier {
```

Good:

```ts
export class AccountVerificationStateMachine {
```

When in doubt: no comment. There is no doubt — it is always no comment.
