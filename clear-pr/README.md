# clear-pr

> a reviewer should know **the one main change, at a high level** in the first few seconds.

clear-pr makes Claude write PR titles and descriptions in anandyandawang's house style. Distilled from
the way these PRs are actually written: the diff already shows *what changed, line by line* — so the
description gives the simple, high-level framing the diff can't: where things stand today, and what
this PR does about it.

## the format

**Title** — `<imperative summary>` (lowercase, verb-first, like a commit subject — no ticket prefix).

**Body** — a single section:

- `## Summary` — **25-100 words** (fewer is better), in **at least two paragraphs**: the first
  describes the current state of things ("Currently, …"), the second what this PR does or introduces
  ("This PR …"). A short bullet list in the second paragraph is fine when the change has a few
  distinct parts.

The whole thing reads in as simple, plain and natural English as possible — no fluff, written so even
a non-engineer gets the gist. Backticks/code appear sparingly, only for particularly important files
or identifiers, and flow naturally as part of the sentence.

For example:

```markdown
## Summary

Currently, we have virtual card CRUD in place, but we have not implemented a way to get transactions
for those cards from the issuer's endpoints.

This PR introduces fetching transactions from the issuer's `GET /virtualcards/:id/transactions`
endpoint.
```

The shape is deliberate: left alone, an AI-written PR over-describes the code changes and buries the
main point. Splitting "the situation" from "the move" keeps each paragraph to one job. The full spec,
with worked examples, lives in [`skills/clear-pr/SKILL.md`](./skills/clear-pr/SKILL.md) — the single
source of truth.

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

## clear-pr vs context-rich-paywithextend-pr

clear-pr is the **house style** — how a PR is written. [`context-rich-paywithextend-pr`](../context-rich-paywithextend-pr) is a
separate, independent plugin that **enriches** an already-open PR with context pulled from a JIRA ticket
and Datadog. They compose but don't depend on each other: use clear-pr for the format, add
context-rich-paywithextend-pr when you want ticket/observability context folded in.

## tweak the format

Edit [`skills/clear-pr/SKILL.md`](./skills/clear-pr/SKILL.md) — the skill reads from it, so one edit
changes the format everywhere.
