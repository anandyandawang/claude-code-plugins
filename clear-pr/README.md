# clear-pr

> a reviewer should know **what changed and why** in the first few seconds.

clear-pr makes Claude write PR titles and descriptions in anandyandawang's house style. Distilled from
the way these PRs are actually written: lead with the change and the why, link the evidence, keep code
exact, and size the description to the change.

## the format

**Title** — `<imperative summary>` (lowercase, verb-first, like a commit subject — no ticket prefix).

**Body** — a single `## What?` section: what the PR does, then **why**, immediately. Prose for a simple
change, bullets for a multi-part one. Code identifiers in backticks. Evidence linked (traces, Slack,
API docs, CI runs, related PRs, follow-up tickets); the decisive error/payload inlined only when the
change hinges on it. Tradeoffs named honestly.

The full spec, with worked examples for both a trivial and a substantive PR, lives in
[`skills/clear-pr/SKILL.md`](./skills/clear-pr/SKILL.md) — the single source of truth.

## what clear-pr does

- **Skill** (`skills/clear-pr/clear-pr`) — auto-applies whenever Claude opens a PR or drafts/edits a PR
  body, so descriptions come out in this format without being asked. Invoke it directly with `/clear-pr`
  to re-affirm the format mid-session.
- **Command** (`/pr`) — drafts a title + body for the **current branch**: reads the branch's commits and
  diff, writes the description in the format, shows it to you, and opens the PR **only after you confirm**
  (never auto-creates).

No hooks, nothing always-on — unlike `grug`/`terse`, clear-pr only speaks up when there's a PR to write.

## install

```
/plugin marketplace add anandyandawang/claude-code-plugins
/plugin install clear-pr@anandyandawang-plugins
```

Then either let it apply automatically when you open a PR, or run `/pr` on a feature branch.

## tweak the format

Edit [`skills/clear-pr/SKILL.md`](./skills/clear-pr/SKILL.md). Both the skill and the `/pr` command read
from it, so one edit changes everything.
