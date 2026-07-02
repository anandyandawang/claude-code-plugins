---
name: clear-pr
description: >
  Write pull request titles and descriptions in anandyandawang's house style. Title is a lowercase
  imperative summary, like a git commit subject (no ticket prefix). Body is a single `## Summary`
  section, 25-100 words (fewer is better), in at least two paragraphs: one describing the current
  state of things ("Currently, …"), one describing what this PR does ("This PR introduces …").
  Written in as simple, plain and natural English as possible — no fluff — with backticks/code used
  sparingly, only for particularly important files, and flowing naturally as part of the sentence.
  Use whenever opening a pull request or drafting/editing a PR description, or when the user says
  "write the PR" or "PR description".
---

# clear-pr — house style for PR descriptions

Goal: a reviewer understands **the one main change, at a high level**, in the first few seconds. The
diff already shows *what changed, line by line* — the reviewer will read it. The description's job is
the simple, high-level framing the diff can't give: where things stand today, and what this PR does
about it. Brief beats long. Simple beats complete. Plain beats fancy.

> **Correct for two biases.** Left alone, an AI-written PR (1) over-describes the code changes — the
> part the reviewer already sees — and buries the main point under secondary ones; and (2) reaches for
> code and file names — the diff's vocabulary — when plain language would read better. Push the other
> way: high-level, brief, plain English, and code names only where they truly earn their place.

Match this format when opening a PR or writing/editing a PR body.

## The shape

```markdown
<imperative summary>   ← title

## Summary

Currently, <the state of things today — what exists, what's missing, what hurts>.

This PR <what it does or introduces, at a high level>.
```

That's the whole body: one `## Summary` section. No `## What`, no `## Why`, no `## Notes`.

**Word limit: 25-100 words** for the whole section (a guideline, not a hard cap) — and lean low. The
fewer words, the more concise, the better. The range exists so a substantive change has room, not so
you fill it.

**At least two paragraphs, in this order:**

1. **The current state of things.** How the world is today — what exists, what's missing, what's
   broken or painful. Usually opens with "Currently, …". *Only* the situation; no change yet.
2. **What this PR does or introduces.** The move, at a high level. Usually opens with "This PR …".
   A short bullet list inside this paragraph is fine when the change genuinely has a few distinct
   parts — each bullet an outcome, still in plain language.

Each paragraph has one job — "the situation" and "the move" — so never tangle both into one block.

**More than two paragraphs is fine** — the real rule is that every paragraph is succinct and carries
exactly one idea, while the core "Currently" vs "This PR" separation stays the spine. Extra paragraphs
attach to one side or the other: another fact about today's state goes after "Currently, …"; evidence
or verification of the change goes after "This PR …". For example:

```markdown
## Summary

Currently, listing cards fires one query per card — a classic n+1.

This makes the page slow; p95 sits around 5 seconds.

This PR introduces a single batched query that loads all the cards at once.

Local testing with `EXPLAIN PLAN` suggests this improves things significantly.
```

Four paragraphs, four ideas — the problem, how much it hurts, the fix, the evidence — and the
situation/move split is still obvious at a glance.

## Plain, natural English — no fluffing

Write in **as simple, plain and natural English as possible**. Aim for a level a non-engineer could
follow and get the gist of. Short sentences. Everyday words. No filler, no throat-clearing, no
"comprehensive", "robust", "seamless", or any other word that adds sound but no meaning.

**Use backticks/code sparingly** — only to highlight particularly important files, endpoints, or
identifiers, the ones central to the idea. When you do use one, it should flow naturally as part of
the rest of the sentence ("fetching transactions from the issuer's `GET /virtualcards/:id/transactions`
endpoint"), never appear as a scatter of code names standing in for prose.

## One main subject

A PR is about one thing. Find that thing and make the description about it — the title and the
`## Summary` both serve the main change. Secondary edits (a drive-by rename, a bumped dep, a moved
file) get a brief mention or none at all; never let them crowd out the main point. If you can't name
the one main change in a sentence, the PR may be doing too much.

## Title

- Format: `<imperative summary>` — no issue-tracker prefix like `[EX-####]`.
- A conventional-commit / semver prefix is welcome when the repo uses one: `feat:`, `fix:`,
  `refactor(scope):`, `!` for breaking (`feat(api)!: …`). Mirror the repo's own convention — that prefix
  carries the version-bump signal. It's the issue-tracker prefix we drop, not semver.
- Imperative, verb-first: `add`, `fix`, `refactor`, `handle`, `remove`, `bump`, `update`. Same mood as a
  git commit subject.
- Lowercase is the norm (`add vcn refresh command`). Capitalize the first word only when it reads better
  (``Introduce `IssuerReader` to fetch external issuer IDs by env``).
- Prefer plain words; reach for a code identifier only when it *is* the subject, and backtick it then.
  One scannable line, no trailing period.

## Right-size to the change

- **Trivial PR** (version bump, fixture, rename): both paragraphs can be a single short line each —
  "Currently our fixtures are stale." / "This PR updates them from prod." Don't pad.
- **Substantive PR**: still lean low; use the room only when the change genuinely has parts worth
  naming, and prefer a short bullet list over a dense paragraph.
- Err toward fewer words. Every sentence should tell the reviewer something the diff can't — cut the
  rest. The 25-100 range is a ceiling to lean under, not a target to fill.

## Worked example (substantive fix)

```markdown
fix auths inquiry request failures by matching the upstream field order

## Summary

Currently, auths polling is broken — the upstream API returns a 500 on every request, because we send
`AccountNumber` before `SecurityToken` and its strict schema expects the opposite order.

This PR reorders our request fields to match the upstream. Odd as it is, field order is the fix — the
upstream is strict about it and we don't own its schema.
```

## Worked example (feature)

```markdown
add transaction fetching for virtual cards

## Summary

Currently, we have virtual card CRUD in place, but we have not implemented a way to get transactions
for those cards from the issuer's endpoints.

This PR introduces fetching transactions from the issuer's `GET /virtualcards/:id/transactions`
endpoint.
```

## Worked example (refactor)

```markdown
move shared integrator test setup into a common base

## Summary

Currently, all of our integrators have integration tests with lots of commonalities between them, but
are repeated per-integrator.

This PR introduces multiple refactors to move a lot of those commonalities to
`IntegratorIntegrationTestBase`, including:
- Spinning up RabbitMQ testcontainers
- Exposing Rabbit helpers to send messages to our inbound sync/async integrator queues, as well as the
  outbound queue to `ExtendAPI`
- Clearing the outbound Rabbit queue in a `beforeTest { }` block, to ensure that outbound Rabbit
  messages do not leak between tests
```

## Worked example (trivial)

```markdown
add GeneralInquiry fixtures from prod

## Summary

Currently, we have no fixtures for `GeneralInquiry` responses, so its tests build payloads by hand.

This PR introduces fixtures taken from real prod responses.
```

## Checklist before opening

- Title is an imperative summary, like a commit subject — no issue-tracker prefix; a `feat:` / `fix:`
  semver prefix is fine if the repo uses one.
- The body is a single `## Summary` section — no `## What`, `## Why`, or `## Notes`.
- `## Summary` is 25-100 words, leaning low — fewer and more concise is better.
- At least two paragraphs: the first describes the current state of things ("Currently, …"), the
  second what this PR does ("This PR …").
- Written in simple, plain, natural English — no fluff; a non-engineer could get the gist.
- Backticks/code appear sparingly, only for particularly important files or identifiers, and flow
  naturally as part of the sentence.
- The description is about the one main change; secondary edits stay brief or unmentioned.
