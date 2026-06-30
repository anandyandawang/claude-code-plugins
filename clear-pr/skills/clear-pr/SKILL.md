---
name: clear-pr
description: >
  Write pull request titles and descriptions in anandyandawang's house style. Title is a lowercase
  imperative summary, like a git commit subject (no ticket prefix). Body is two sections: `## What` —
  one or two lines of high-level outcome (not a diff summary) — and `## Why` — the context a reviewer
  can't get from the diff. Lead with the high-level what, spend your words on the why, link evidence
  instead of inlining it, backtick every code identifier, be honest about tradeoffs, and size the
  description to the change. Use whenever opening a pull request or drafting/editing a PR description,
  or when the user says "write the PR" or "PR description".
---

# clear-pr — house style for PR descriptions

Goal: a reviewer understands **the high-level what and the why** in the first few seconds, and can reach
the evidence in one click. The diff already shows *what changed and how* line by line — the reviewer
will read it. The description's job is the part the diff **can't** show: the high-level framing and the
context behind the change. Clear beats long. Reasoning beats restating the diff.

> **Correct for the bias.** Left alone, an AI-written PR over-describes *what* and *how the code
> changed* — exactly the part the reviewer sees for themselves in the diff — and skimps on the *why*.
> This format pushes the other way on purpose: keep `## What` short and high-level, and put the real
> effort into `## Why`.

Match this format when opening a PR or writing/editing a PR body.

## The shape

```markdown
<imperative summary>   ← title

## What

<one or two lines: the high-level outcome — what this PR changes, in plain language. Not the diff;
the diff shows that. A reviewer reads this and knows what they're looking at.>

## Why

<the context the diff can't show: the problem or trigger, the constraint you're working under, the
decision and what you ruled out. This is the part that earns the PR — spend your words here. Link the
evidence; inline only the decisive line.>
```

`## Notes` is an optional third section — use it only when there's something that isn't what-or-why and
genuinely adds value: a tradeoff, a follow-up, or how you verified a non-obvious fix.

## Title

- Format: `<imperative summary>` — no issue-tracker prefix like `[EX-####]`.
- A conventional-commit / semver prefix is welcome when the repo uses one: `feat:`, `fix:`,
  `refactor(scope):`, and `!` for a breaking change (`feat(api)!: …`). Mirror the repo's own commit
  convention — that prefix carries the version-bump signal, which is worth keeping. It's the
  issue-tracker prefix we drop, not semver.
- Imperative, verb-first: `add`, `fix`, `refactor`, `implement`, `handle`, `remove`, `bump`, `update`,
  `introduce`, `enable`, `send`, `persist`. Same mood as a git commit subject.
- Lowercase is the norm (`add vcn refresh command`). Capitalizing the first word is fine when it reads
  better (``Introduce `IssuerReader` to fetch external issuer IDs by env``).
- Backtick code identifiers in the title when it sharpens it (``refactor `objectMapper` to use snake_case``).
- Keep it to one scannable line. No trailing period.

## `## What` — high-level, short

One or two lines, plain language, stating the **outcome** of the PR: what behaves differently now, or
what capability exists that didn't. Write it for someone deciding whether this PR is theirs to review.

- **High level, not a diff summary.** Say "auths polling now succeeds against the upstream API," not
  "reordered `SecurityToken` and `AccountNumber` in `AuthRequest`." The diff already tells the reviewer
  which fields moved — `## What` tells them what that *amounts to*.
- **Don't enumerate the changes.** If you find yourself writing a bullet per file or per function, you're
  restating the diff. Step up a level: what does the sum of those edits do?
- **Keep it to one or two lines.** If the what genuinely has a few distinct parts, a short bullet each is
  fine — but each bullet is an outcome, not a code change.

## `## Why` — where the words go

This is the section that earns the PR. The diff can show every line that changed and never explain why
any of it changed — that's what goes here.

- **Start with the trigger.** What made this necessary — a bug, a 500, a new requirement, a piece of tech
  debt that finally bit. Link it: the failing trace, the Slack thread, the ticket, the alert.
- **Give the context a reviewer is missing.** The constraint you worked under, the upstream behavior you
  had to match, the thing that's surprising and that someone would otherwise try to "fix" and break.
- **Name the decision and the roads not taken.** Why this approach and not the obvious alternative; if you
  shipped the 80/20 fix, say so and link a follow-up for the better version. State uncertainty plainly
  ("as crazy as it is, I think field order is the fix").
- **Link evidence; don't inline it.** Traces, Slack threads, API/Swagger docs, failing CI runs, related
  PRs, follow-up tickets — link them inline as `[text](url)`.
- **…but inline the crux when the change hinges on it.** If the why *is* "these two payloads differ,"
  show the few decisive lines in a fenced code block (the error message, the request before/after, the
  offending field) and link the full trace. Inline the 3 lines that matter, link the other 300.
- **Backtick every code identifier** — class, field, method, type, enum value, env name, JSON/XML tag,
  path, version: `SecurityConfig`, `@JsonProperty`, `AccountNumber`, `SUNFLOWER`, `/sysinfo`,
  `1.4.2 -> 1.7.0`.
- **Voice:** first person, conversational, plain. A little personality / the occasional emoji is fine
  when it lands; clarity comes first.

## Right-size to the change

- **Trivial PR** (version bump, fixture update, rename): a one-line `## What` is correct and complete.
  Drop `## Why` when there's genuinely nothing a reviewer is missing — don't pad it. See the trivial
  worked example below.
- **Substantive PR** (new behavior, a fix with a story, a refactor with tradeoffs): a tight `## What`,
  then a `## Why` that does the real work — evidence linked, alternatives named, the crux inlined.
- Err toward fewer words. Every sentence in `## Why` should add context, reasoning, or evidence the diff
  can't — cut the rest. `## What` should never grow past a couple of lines.

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
nothing else has hit this. So — as odd as it is — field order is the fix here. The other approach was
to relax our schema, but the upstream is strict and we don't own it, so matching its order is the only
real option.
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
- `## What` is high-level outcome, one or two lines — not a restatement of the diff.
- `## Why` carries the context the diff can't: trigger, constraint, decision, alternatives. Code
  identifiers are backticked; evidence is linked; the decisive error/payload (if any) is inlined.
- `## Notes` only if a tradeoff, follow-up, or verification genuinely needs its own home.
