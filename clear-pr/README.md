# clear-pr

> a reviewer should know **the high-level what and the why** in the first few seconds.

clear-pr makes Claude write PR titles and descriptions in anandyandawang's house style. Distilled from
the way these PRs are actually written: the diff already shows *what changed and how* — so the
description leads with the high-level outcome, then spends its words on the **why** the diff can't show.

## the format

**Title** — `<imperative summary>` (lowercase, verb-first, like a commit subject — no ticket prefix).

**Body** — two sections:

- `## What` — one or two lines of **high-level outcome**, not a diff summary. What behaves differently
  now, in plain language.
- `## Why` — the **context the diff can't show**: the trigger, the constraint, the decision and what you
  ruled out. This is where the words go. Evidence linked (traces, Slack, API docs, CI runs, related PRs,
  follow-up tickets); the decisive error/payload inlined only when the change hinges on it.

An optional `## Notes` holds a tradeoff, follow-up, or verification when it earns its own home.

The split is deliberate: left alone, an AI-written PR over-describes *what* and *how the code changed*
and skimps on the *why*. Giving `## Why` its own section pushes the effort back where a reviewer needs
it. The full spec, with worked examples for both a trivial and a substantive PR, lives in
[`skills/clear-pr/SKILL.md`](./skills/clear-pr/SKILL.md) — the single source of truth.

## what clear-pr does

clear-pr is a single **skill** (`skills/clear-pr/clear-pr`) — it auto-applies whenever Claude opens a PR
or drafts/edits a PR body, so descriptions come out in this format without being asked. Invoke it
directly with `/clear-pr` to apply the format on demand — e.g. to draft a title + body for the current
branch.

No hooks, no command, nothing always-on — unlike `grug`/`terse`, clear-pr only speaks up when there's a
PR to write.

## install

```
/plugin marketplace add anandyandawang/claude-code-plugins
/plugin install clear-pr@anandyandawang-plugins
```

Then let it apply automatically when you open a PR, or invoke `/clear-pr` to apply the format on demand.

## clear-pr vs context-rich-pr

clear-pr is the **house style** — how a PR is written. [`context-rich-pr`](../context-rich-pr) is a
separate, independent plugin that **enriches** an already-open PR with context pulled from a JIRA ticket
and Datadog. They compose but don't depend on each other: use clear-pr for the format, add
context-rich-pr when you want ticket/observability context folded in.

## tweak the format

Edit [`skills/clear-pr/SKILL.md`](./skills/clear-pr/SKILL.md) — the skill reads from it, so one edit
changes the format everywhere.
