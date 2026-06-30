---
name: clear-pr
description: >
  Write pull request titles and descriptions in anandyandawang's house style. Title is a lowercase
  imperative summary, like a git commit subject (no ticket prefix). Body is two sections: `## What` —
  one or two lines of high-level outcome (not a diff summary) — and `## Why` — the context a reviewer
  can't get from the diff. Focus on the one main change; keep `## What` short, spend your words on the
  why, stay brief about secondary changes, link evidence instead of inlining it, name code identifiers
  sparingly (only the ones central to the idea, backticked), and size the description to the change. Use
  whenever opening a pull request or drafting/editing a PR description, or when the user says "write the
  PR" or "PR description".
---

# clear-pr — house style for PR descriptions

Goal: a reviewer understands **the one main change, at a high level, and why** in the first few seconds,
and can reach the evidence in one click. The diff already shows *what changed and how* — the reviewer
will read it. The description's job is the part the diff **can't** show: the high-level framing and the
context. Brief beats long. High-level and focused beats complete. Reasoning beats restating the diff.

> **Correct for two biases.** Left alone, an AI-written PR (1) over-describes *what* and *how the code
> changed* — the part the reviewer already sees — and skimps on the *why*; and (2) gives every change
> equal weight, burying the main point under secondary ones. It also reaches for code and file names —
> the diff's vocabulary — when plain language would read better. Push the other way: keep `## What`
> short and high-level, lead with the main subject, spend the words on `## Why`, stay brief about the
> rest, and name identifiers sparingly.

Match this format when opening a PR or writing/editing a PR body.

## The shape

```markdown
<imperative summary>   ← title

## What

<one or two lines: the main change at a high level, in plain language — the outcome, not the diff. A
reviewer reads this and knows what they're looking at.>

## Why

<the context the diff can't show: the trigger, the constraint, the decision and what you ruled out.
This is the part that earns the PR — spend your words here. Link evidence; inline only the decisive
line.>
```

`## Notes` is an optional third section — use it only for something that's neither what nor why and
genuinely adds value: a tradeoff, a follow-up, or how you verified a non-obvious fix.

## One main subject

A PR is about one thing. Find that thing and make the description about it — the title, the `## What`,
and the bulk of the `## Why` all serve the main change. Secondary edits (a drive-by rename, a bumped
dep, a moved file) get a brief mention or none at all; never let them crowd out the main point or pull
the description to equal length. If you can't name the one main change in a sentence, the PR may be
doing too much.

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

## `## What` — the main change, high-level and short

One or two lines, plain language, stating the high-level **outcome** of the main change: what behaves differently
now, or what capability exists that didn't. Write it for someone deciding whether this PR is theirs to
review.

- **High level, not a diff summary.** Say "auths polling now succeeds against the upstream API," not
  "reordered `SecurityToken` and `AccountNumber` in `AuthRequest`." Plain language over the diff's field
  and file names.
- **Don't enumerate the changes.** A bullet per file or per function means you're restating the diff.
  Step up a level: what does the sum amount to?
- **Keep it to one or two lines.** If the what genuinely has a couple of distinct parts, one short
  bullet each — each an outcome, not a code change.

## `## Why` — where the words go

The diff shows every line that changed and never explains why any of it changed. That goes here.

- **Start with the trigger** — the bug, the 500, the requirement, the tech debt that bit. Link it.
- **Give the missing context** — the constraint, the upstream behavior you matched, the surprising thing
  someone would otherwise "fix" and break.
- **Name the decision and the road not taken** — why this and not the obvious alternative; if you shipped
  the 80/20 fix, say so and link a follow-up.
- **Link evidence; don't inline it.** Traces, threads, docs, CI runs, related PRs — link inline as
  `[text](url)`. Inline only the crux: if the why *is* "these two payloads differ," show the few
  decisive lines and link the other 300.
- **Name identifiers sparingly.** Mention a class, field, method, or file only when it's central to the
  point you're making — the one field whose order is the bug, not every type it touches. When you do name
  one, backtick it. Prose over a scatter of code names.
- **Voice:** first person, conversational, plain. A little personality is fine; clarity comes first.

## Right-size to the change

- **Trivial PR** (version bump, fixture, rename): a one-line `## What` is complete. Drop `## Why` when
  there's genuinely nothing a reviewer is missing — don't pad it.
- **Substantive PR**: a tight `## What`, then a `## Why` that does the real work — evidence linked,
  alternatives named, the crux inlined.
- Err toward fewer words. Every sentence in `## Why` should add context the diff can't — cut the rest.
  `## What` never grows past a couple of lines.

## Worked example (substantive fix)

````markdown
fix auths inquiry request failures by matching the upstream field order

## What

Auths polling now succeeds against the upstream API — it was returning 500s on every request.

## Why

We're getting [500s on auths polling](https://example.com/trace/abc123). The upstream API rejects the
request with `The element 'AuthorizationsInquiry' has invalid child element 'AccountNumber'. List of
possible elements expected: 'SecurityToken'.`

A working request orders the fields `SecurityToken` then `AccountNumber`:

```xml
<AuthorizationsInquiry>
  <SecurityToken>...</SecurityToken>
  <AccountNumber>...</AccountNumber>
</AuthorizationsInquiry>
```

Ours sends `AccountNumber` first. The auths request is the only one with that ordering, which is why
nothing else has hit this. So — as odd as it is — field order is the fix. We could relax our schema
instead, but the upstream is strict and we don't own it, so matching its order is the only real option.
````

## Worked example (trivial)

```markdown
update GeneralInquiry fixtures with ones from prod

## What

update `GeneralInquiry` fixtures with ones from prod
```

## Checklist before opening

- Title is an imperative summary, like a commit subject — no issue-tracker prefix; a `feat:` / `fix:`
  semver prefix is fine if the repo uses one.
- The description is about the one main change; secondary edits stay brief or unmentioned.
- `## What` is high-level outcome, one or two lines — not a restatement of the diff.
- `## Why` carries the context the diff can't: trigger, constraint, decision, alternatives. Code
  identifiers named only where central (and backticked); evidence linked; the decisive error/payload
  (if any) inlined.
- `## Notes` only if a tradeoff, follow-up, or verification genuinely needs its own home.
