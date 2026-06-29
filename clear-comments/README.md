# clear-comments

> the code says **what**; a comment says **why** — and most lines need neither.

clear-comments makes Claude write code comments in anandyandawang's house style. Distilled from how the
comments are actually written: comment sparingly, explain the reason and the gotcha, give your TODOs the
condition that unblocks them, and keep code identifiers exact.

## the style

**Comment sparingly.** Only about 1 line in 100 earns a standalone comment — the default is
self-documenting code. Write a comment for the *why*, the gotcha, the cross-system contract, or deferred
work; not to narrate the line below.

**The markers, that's the set:**

| Marker | When | Shape |
|---|---|---|
| `//` | the why / a failure mode / a contract; mapping-row labels | sentence case, backtick identifiers, wrap long reasons across `//` lines |
| `/** … */` (doc comment) | public interfaces & complex services only | one-line summary, an enumerated state/transition table where it earns it, `@param` only when non-obvious |
| `// TODO:` | deferred work | states the unblocking condition ("once X", "until Y", "pending Z"); tracker key in parens (`TODO(ABC-123):`) when the project uses one |
| `// Note:` | an intentional, surprising decision | capital N, emphasize the surprising word |

**Never:** `/* */` block comments, `FIXME`/`HACK`/`XXX`, decorative banners in source, commented-out
code, or a comment that just restates the code.

The full spec, with worked examples, lives in
[`skills/clear-comments/SKILL.md`](./skills/clear-comments/SKILL.md) — the single source of truth.

## what clear-comments does

- **Hooks (always-on)** — a `SessionStart` hook loads the full house style up front, and a
  `UserPromptSubmit` hook re-asserts the sparse-comment default every turn. This keeps the style in
  context from the first edit instead of only when the skill happens to fire, so Claude defaults to
  *fewer* comments and more self-documenting code as a persistent state — not just on demand.
- **Skill** (`skills/clear-comments/clear-comments`) — the full spec, with worked examples. It still
  auto-applies whenever Claude writes or edits a comment, and you can invoke it directly with
  `/clear-comments` to re-affirm the style mid-session.

The hooks make the sparse-comment default persistent; the skill carries the detail. Both read from the
same [`SKILL.md`](./skills/clear-comments/SKILL.md), so there's one source of truth.

## install

```
/plugin marketplace add anandyandawang/claude-code-plugins
/plugin install clear-comments@anandyandawang-plugins
```

Then let it apply automatically as you write code.

## tweak the style

Edit [`skills/clear-comments/SKILL.md`](./skills/clear-comments/SKILL.md) — the single source of truth
for the style.
