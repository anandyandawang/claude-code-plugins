# claude-code-plugins

Personal [Claude Code](https://docs.claude.com/en/docs/claude-code) plugin marketplace.

**One folder = one plugin.** The marketplace catalog lives in
[`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json).

## Plugins

| Plugin | What it does |
|--------|--------------|
| [`grug`](./grug) | Talk like grug brain developer. Very clear, very very simple. Fewest words, simple words, short sentences. Keeps all technical truth and code exact. Voice applies everywhere — chat, commits, PRs, code comments, reviews. |
| [`terse`](./terse) | Hard global cap on output verbosity: at most ~20% of a normal response. Strict, no exceptions, every medium. Lead with the answer, then stop. Code and technical values stay exact and complete. |
| [`codecat`](./codecat) | 🐱 An ASCII-art cat companion that pads into your session on its own — greets you on session start, loafs/does zoomies between turns, celebrates git commits and pushes, and curls up at session end. Pure art via hooks; never changes how Claude talks. Frequency is tunable. |
| [`clear-pr`](./clear-pr) | Write PR titles and descriptions in anandyandawang's house style: an imperative title (like a commit subject, no ticket prefix) and a single `## What?` that leads with the change then the why. Link evidence, backtick code, name tradeoffs, size to the change. Auto-applies when opening a PR; `/pr` drafts one for the current branch. |
| [`clear-comments`](./clear-comments) | Write code comments in the `paywithextend` house style: comment sparingly (the code says what, a comment says why), `// TODO(EX-####):` with the unblocking condition, `// Note:` for intentional surprises, KDoc as a mini-spec, mapping rows tagged with the source label. No `/* */`, no FIXME/HACK, no commented-out code. Auto-applies when writing comments. |

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
