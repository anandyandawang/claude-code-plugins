# clear-comments

> the code says **what**; a comment says **why** — and most lines need neither.

clear-comments makes Claude write code comments in the house style used across `paywithextend` repos
(`astrada-integrator`, `wex-integrator`, `fis-integrator`, …). Distilled from how these comments are
actually written: comment sparingly, explain the reason and the gotcha, ticket your TODOs with the
condition that unblocks them, and keep code identifiers exact.

## the style

**Comment sparingly.** In this codebase only ~1% of production lines are standalone comments — the
default is self-documenting code. Write a comment for the *why*, the gotcha, the cross-system contract,
or deferred work; not to narrate the line below.

**Two markers, that's the set:**

| Marker | When | Shape |
|---|---|---|
| `//` | the why / a failure mode / a contract; mapping-row labels | sentence case, backtick identifiers, wrap long reasons across `//` lines |
| `/** … */` (KDoc) | public ports & complex services only | one-line summary, an enumerated state/transition table where it earns it, `@param` only when non-obvious |
| `// TODO(EX-####):` | deferred work | **ticketed**, and states the unblocking condition ("once X", "until Y", "pending Z") |
| `// Note:` | an intentional, surprising decision | capital N, emphasize the surprising word |

**Never:** `/* */` block comments, `FIXME`/`HACK`/`XXX`, decorative banners in source, commented-out
code, or a comment that just restates the code.

The full spec, with worked examples drawn from the real repos, lives in
[`skills/clear-comments/SKILL.md`](./skills/clear-comments/SKILL.md) — the single source of truth.

## what clear-comments does

- **Skill** (`skills/clear-comments/clear-comments`) — auto-applies whenever Claude writes or edits a
  code comment, KDoc, or TODO, so comments come out in this style without being asked. Invoke it directly
  with `/clear-comments` to re-affirm the style mid-session.

Skill-only — no command, no hooks, nothing always-on. clear-comments just shapes how comments come out
whenever there are comments to write.

## install

```
/plugin marketplace add anandyandawang/claude-code-plugins
/plugin install clear-comments@anandyandawang-plugins
```

Then let it apply automatically as you write code.

## tweak the style

Edit [`skills/clear-comments/SKILL.md`](./skills/clear-comments/SKILL.md) — the single source of truth
for the style.
