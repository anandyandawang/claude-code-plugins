---
name: clear-pr
description: >
  Write pull request titles and descriptions in anandyandawang's house style — the format used across
  paywithextend repos like wex-integrator and fis-integrator. Title is `[EX-####] <lowercase imperative
  summary>`. Body is a `## What?` section that leads with the change then the why, an optional
  `## Examples / Screenshots?` section, and a closing `## Jira Link`. Lead with what + why, link evidence
  instead of inlining it, backtick every code identifier, be honest about tradeoffs, and size the
  description to the change. Use whenever opening a pull request or drafting/editing a PR description, or
  when the user runs /pr, says "write the PR", "PR description", or references a [EX-####] / Jira ticket.
---

# clear-pr — house style for PR descriptions

Goal: a reviewer understands **what changed and why** in the first few seconds, and can reach the
evidence in one click. Clear beats long. Reasoning beats restating the diff.

This is the format used across `paywithextend` repos (`wex-integrator`, `fis-integrator`, …). Match it
exactly when opening a PR or writing/editing a PR body.

## The shape

```markdown
[EX-####] <imperative summary>   ← title

## What?

<one line: what this PR does> — <why / the context that makes it make sense>.

<for a multi-part change, use bullets instead of a paragraph>
- <change one + the why>
- <change two + the why>

## Examples / Screenshots?   ← optional, include only when there is something to show

<one line on what this shows>
<img width="..." src="https://github.com/user-attachments/assets/..." />

## Jira Link

[Link here](https://paywithextend.atlassian.net/browse/EX-####)
```

## Title

- Format: `[EX-####] <summary>`. The bracketed Jira key always comes first and must match the `## Jira Link`.
- Imperative, verb-first: `add`, `fix`, `refactor`, `implement`, `handle`, `remove`, `bump`, `update`,
  `introduce`, `enable`, `send`, `persist`. Same mood as a git commit subject.
- Lowercase is the norm (`[EX-37492] add vcn refresh command`). Capitalizing the first word is fine when
  it reads better (``[EX-38110] Introduce `IssuerReader` to fetch external issuer IDs by env``).
- Backtick code identifiers in the title when it sharpens it (``refactor `objectMapper` to use snake_case``).
- Keep it to one scannable line. No trailing period.

## `## What?` — always first, always present

Open with a single line stating what the PR does, then give the why. For a one-line change the whole
section can be that one line; for anything with moving parts, the why is the part that earns the PR.

- **Lead with the change, then the why — immediately.** Don't make the reviewer hunt for the point, and
  don't restate the diff line by line. Say what moved and the reason it moved.
- **Prose for a simple change, bullets for a multi-part one.** When there are several distinct changes,
  one bullet each, and fold the reasoning into the bullet (sub-bullets for consequences/follow-on work).
- **Backtick every code identifier** — class, field, method, type, enum value, env name, JSON/XML tag,
  path, version: `SecurityConfig`, `@JsonProperty`, `AccountNumber`, `CorpID`, `SUNFLOWER`, `/sysinfo`,
  `1.4.2 -> 1.7.0`. This is what makes the body scannable.
- **Link evidence; don't inline it.** Datadog traces, Slack threads, Swagger/API docs, failing GitHub
  Actions runs, related PRs, code in other repos, follow-up tickets — link them inline as `[text](url)`.
- **…but inline the crux when the change hinges on it.** If the fix is "these two payloads differ", show
  the few decisive lines in a fenced code block (error message, the request before/after, the offending
  field) and link the full trace. Inline the 3 lines that matter, link the other 300.
- **Be honest about tradeoffs.** Name the alternative you considered and why you didn't take it; if you
  shipped the simpler 80/20 fix, say so and link a follow-up ticket for the better version. State
  uncertainty plainly ("as crazy as it is, I think field order is the fix").
- **Show how you verified** when the fix is non-obvious — a short bulleted account of what you ran and
  what you observed (a `---` rule above it is a fine separator).
- **Voice:** first person, conversational, plain. A little personality / the occasional emoji is fine
  when it lands; clarity comes first.

## `## Examples / Screenshots?` — optional

Include only when there's something visual or runnable worth showing (a UI screenshot, a successful vs.
failing response, a terminal capture). Precede each image with a one-line caption of what it demonstrates,
then the `<img ... />`. Skip the whole section for changes with nothing to show — don't leave it empty.

## `## Jira Link` — always last

Default form:

```markdown
## Jira Link

[Link here](https://paywithextend.atlassian.net/browse/EX-####)
```

Acceptable variants seen in the wild: `[EX-####](https://paywithextend.atlassian.net/browse/EX-####)`
(optionally with a reference-style link definition Jira auto-generates), or the bare URL. Prefer
`[Link here](...)`. The `EX-####` here must match the title.

## Right-size to the change

- **Trivial PR** (version bump, fixture update, rename): a one-line `## What?` is correct and complete.
  Don't pad it — see the trivial worked example below.
- **Substantive PR** (new behavior, a fix with a story, a refactor with tradeoffs): bullets or short
  paragraphs in `## What?`, evidence linked, alternatives named, verification shown.
- Err toward fewer words. Every sentence should add what, why, or how-verified — cut the rest.

## Worked example (substantive fix)

````markdown
[EX-38054] fix auths inquiry request failures by fixing field order

## What?

We're getting [500s in dd](https://app.datadoghq.com/apm/trace/...) on auths polling. FIS rejects the
request with `The element 'AuthorizationsInquiry.UDIB.IN' has invalid child element 'AccountNumber'.
List of possible elements expected: 'SecurityToken'.`

A working request (from Postman) orders the fields `SecurityToken` then `AccountNumber`:

```xml
<AuthorizationsInquiry.UDIB.IN Application="Extend">
  <SecurityToken>...</SecurityToken>
  <AccountNumber>...</AccountNumber>
</AuthorizationsInquiry.UDIB.IN>
```

Ours sends `AccountNumber` first. The auths requests are the only ones with that ordering, which is why
nothing else has hit this. So — as odd as it is — field order is the fix here. This PR reorders the
fields to match.

## Jira Link

[Link here](https://paywithextend.atlassian.net/browse/EX-38054)
````

## Worked example (trivial)

```markdown
[EX-38072] update GeneralInquiry fixtures with ones from prod

## What?

update `GeneralInquiry` fixtures with ones from prod

## Jira Link

[Link here](https://paywithextend.atlassian.net/browse/EX-38072)
```

## Checklist before opening

- Title is `[EX-####] <imperative summary>`, ticket matches the Jira Link.
- `## What?` leads with the change and gives the why; code identifiers are backticked.
- Evidence is linked; the decisive error/payload (if any) is inlined, the rest linked.
- Tradeoffs / alternatives named where relevant; follow-up work has a linked ticket.
- `## Examples / Screenshots?` present only if there's something to show.
- `## Jira Link` is the last section.
