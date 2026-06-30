# claude-code-plugins

Personal [Claude Code](https://docs.claude.com/en/docs/claude-code) plugin marketplace.

**One folder = one plugin.** The marketplace catalog lives in
[`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json).

## Plugins

| Plugin | What it does |
|--------|--------------|
| [`grug`](./grug) | Talk like grug brain developer. Very clear, very very simple. Fewest words, simple words, short sentences. Keeps all technical truth and code exact. Voice applies everywhere — chat, commits, PRs, code comments, reviews. |
| [`grug-extremist`](./grug-extremist) | grug but **extreme**, and **chat only** (commits, PRs, code, comments, reviews, logs stay normal). Hard cap: at most 5-10 words per turn; if you ask grug to explain, at most 50 words. Brevity beats clarity — short wins even for security/danger (grug still says the danger, in few words). Code and values stay byte-exact. |
| [`terse`](./terse) | Hard global cap on output verbosity: at most ~20% of a normal response. Strict, no exceptions, every medium. Lead with the answer, then stop. Code and technical values stay exact and complete. |
| [`codecat`](./codecat) | 🐱 An ASCII-art cat companion that pads into your session on its own — greets you on session start, loafs/does zoomies between turns, celebrates git commits and pushes, and curls up at session end. Pure art via hooks; never changes how Claude talks. Frequency is tunable. |
| [`clear-pr`](./clear-pr) | Write PR titles and descriptions in anandyandawang's house style: an imperative title (like a commit subject, no ticket prefix), a high-level `## What` (one or two lines of outcome, not a diff summary), then `## Why` (the context the diff can't show). The diff shows what changed and how; the description carries the high-level what and the why. Link evidence, backtick code, name tradeoffs, size to the change. Auto-applies when opening a PR; invoke `/clear-pr` to apply the format on demand. |
| [`context-rich-paywithextend-pr`](./context-rich-paywithextend-pr) | After a PR is created, enrich its description with context a human reviewer wants but the diff can't show. When a JIRA key (e.g. `EX-12345`) is in play, fetch the ticket via the Atlassian MCP, add a `## JIRA` section linking it, fold the ticket's high-level what/why into the body, and attach Datadog links (traces, logs, metrics, dashboards) where they aid the why. A content enricher, not a formatter — independent of `clear-pr`. Invoke `/context-rich-paywithextend-pr` on demand. |
| [`clear-comments`](./clear-comments) | Write code comments in anandyandawang's house style: comment sparingly (the code says what, a comment says why), `// TODO:` with the unblocking condition (tracker key when the project uses one), `// Note:` for intentional surprises, doc comments as a mini-spec, mapping rows tagged with the source label. No `/* */`, no FIXME/HACK, no commented-out code. Auto-applies when writing comments. |

## Install

Add the marketplace once, then install any plugin from it:

```
/plugin marketplace add anandyandawang/claude-code-plugins
/plugin install grug@anandyandawang-plugins
```

## Add a new plugin

1. Make a new folder at repo root (the plugin name), e.g. `myplugin/`.
2. Add a manifest at `myplugin/.claude-plugin/plugin.json`.
3. Register it in `.claude-plugin/marketplace.json` under `plugins` with `"source": "./myplugin"`.

That's it. One folder, one plugin.
