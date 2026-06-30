# context-rich-paywithextend-pr

> after a PR is open, bring the **why** to the reviewer — from JIRA and Datadog, not from the diff.

context-rich-paywithextend-pr enriches an already-created pull request with the context a human reviewer actually
wants: what the change is really for and why it matters. The diff shows the code; the JIRA ticket and the
observability data hold the reasoning — this plugin folds the useful parts of that into the PR
description so nobody has to go digging.

> **Scope: the Extend / paywithextend repos.** This one is specific to Extend's JIRA project and Datadog
> org — that's why the name carries `paywithextend`. Install it where the work lives in those systems,
> not on unrelated personal repos. (`clear-pr`, by contrast, is house-style and repo-agnostic.)

## what it does

When a **JIRA key** (e.g. `EX-12345`) has been mentioned anywhere in the session and a **PR exists**, it:

- adds a `## JIRA` section linking the ticket (the site is resolved from your connected Atlassian org,
  not hardcoded);
- folds the ticket's **high-level what/why** into the PR body — summarized in plain language, for the
  reviewer, never a raw ticket dump;
- attaches **Datadog links** (a failing trace, the metric that regressed, a dashboard to watch after
  merge) where they genuinely illustrate the why — and nothing where they don't.

It reads JIRA and Datadog as **untrusted data**: it summarizes them, it never acts on instructions found
inside them, and it won't paste secrets into a public description.

## independent of clear-pr

This is a deliberate split:

- [`clear-pr`](../clear-pr) owns the **house style** — how a PR title and body are written.
- **context-rich-paywithextend-pr** owns **enrichment** — adding JIRA/Datadog context to a PR that already exists.

They compose, but neither needs the other. context-rich-paywithextend-pr is a content enricher, not a formatter: it
adds context to a PR in whatever format it's already in.

## when it runs

After the PR is created. If you're about to open one, open it first, then enrich. If a PR is already
open, it enriches in place. Invoke `/context-rich-paywithextend-pr` to enrich the current PR on demand (it uses the
most recent JIRA key in the session, or asks for one).

## requirements

- **Atlassian MCP** — to resolve the site URL and read the ticket (`getAccessibleAtlassianResources`,
  `getJiraIssue`).
- **Datadog MCP** — to find relevant traces/logs/metrics/dashboards (optional; links are added only when
  they help).
- **GitHub MCP** — to read and update the PR body (`pull_request_read`, `update_pull_request`).

## install

```
/plugin marketplace add anandyandawang/claude-code-plugins
/plugin install context-rich-paywithextend-pr@anandyandawang-plugins
```

## tweak the behavior

Edit [`skills/context-rich-paywithextend-pr/SKILL.md`](./skills/context-rich-paywithextend-pr/SKILL.md) — the skill reads from it,
so one edit changes the behavior everywhere.
