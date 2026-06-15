---
name: clear-pr
description: >
  Write pull request titles and descriptions in anandyandawang's house style. Title is a lowercase
  imperative summary, like a git commit subject (no ticket prefix). Body is a single `## What?` section
  that leads with the change then the why. Lead with what + why, link evidence instead of inlining it,
  backtick every code identifier, be honest about tradeoffs, and size the description to the change. Use
  whenever opening a pull request or drafting/editing a PR description, or when the user runs /pr, says
  "write the PR", or "PR description".
---

# clear-pr — house style for PR descriptions

Goal: a reviewer understands **what changed and why** in the first few seconds, and can reach the
evidence in one click. Clear beats long. Reasoning beats restating the diff.

Match this format when opening a PR or writing/editing a PR body.

## The shape

```markdown
<imperative summary>   ← title

## What?

<one line: what this PR does> — <why / the context that makes it make sense>.

<for a multi-part change, use bullets instead of a paragraph>
- <change one + the why>
- <change two + the why>
```

## Title

- Format: `<imperative summary>` — just the summary, no ticket/issue prefix.
- Imperative, verb-first: `add`, `fix`, `refactor`, `implement`, `handle`, `remove`, `bump`, `update`,
  `introduce`, `enable`, `send`, `persist`. Same mood as a git commit subject.
- Lowercase is the norm (`add vcn refresh command`). Capitalizing the first word is fine when it reads
  better (``Introduce `IssuerReader` to fetch external issuer IDs by env``).
- Backtick code identifiers in the title when it sharpens it (``refactor `objectMapper` to use snake_case``).
- Keep it to one scannable line. No trailing period.

## `## What?` — always present

Open with a single line stating what the PR does, then give the why. For a one-line change the whole
section can be that one line; for anything with moving parts, the why is the part that earns the PR.

- **Lead with the change, then the why — immediately.** Don't make the reviewer hunt for the point, and
  don't restate the diff line by line. Say what moved and the reason it moved.
- **Prose for a simple change, bullets for a multi-part one.** When there are several distinct changes,
  one bullet each, and fold the reasoning into the bullet (sub-bullets for consequences/follow-on work).
- **Backtick every code identifier** — class, field, method, type, enum value, env name, JSON/XML tag,
  path, version: `SecurityConfig`, `@JsonProperty`, `AccountNumber`, `SUNFLOWER`, `/sysinfo`,
  `1.4.2 -> 1.7.0`. This is what makes the body scannable.
- **Link evidence; don't inline it.** Traces, Slack threads, API/Swagger docs, failing CI runs, related
  PRs, code in other repos, follow-up tickets — link them inline as `[text](url)`.
- **…but inline the crux when the change hinges on it.** If the fix is "these two payloads differ", show
  the few decisive lines in a fenced code block (error message, the request before/after, the offending
  field) and link the full trace. Inline the 3 lines that matter, link the other 300.
- **Be honest about tradeoffs.** Name the alternative you considered and why you didn't take it; if you
  shipped the simpler 80/20 fix, say so and link a follow-up for the better version. State uncertainty
  plainly ("as crazy as it is, I think field order is the fix").
- **Show how you verified** when the fix is non-obvious — a short bulleted account of what you ran and
  what you observed (a `---` rule above it is a fine separator).
- **Voice:** first person, conversational, plain. A little personality / the occasional emoji is fine
  when it lands; clarity comes first.

## Right-size to the change

- **Trivial PR** (version bump, fixture update, rename): a one-line `## What?` is correct and complete.
  Don't pad it — see the trivial worked example below.
- **Substantive PR** (new behavior, a fix with a story, a refactor with tradeoffs): bullets or short
  paragraphs in `## What?`, evidence linked, alternatives named, verification shown.
- Err toward fewer words. Every sentence should add what, why, or how-verified — cut the rest.

## Worked example (substantive fix)

````markdown
fix auths inquiry request failures by matching the upstream field order

## What?

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
nothing else has hit this. So — as odd as it is — field order is the fix here. This PR reorders the
fields to match.
````

## Worked example (trivial)

```markdown
update GeneralInquiry fixtures with ones from prod

## What?

update `GeneralInquiry` fixtures with ones from prod
```

## Checklist before opening

- Title is an imperative summary (no ticket prefix), like a commit subject.
- `## What?` leads with the change and gives the why; code identifiers are backticked.
- Evidence is linked; the decisive error/payload (if any) is inlined, the rest linked.
- Tradeoffs / alternatives named where relevant; follow-up work is linked.
