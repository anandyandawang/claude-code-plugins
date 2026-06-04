# claude-code-plugins

Personal [Claude Code](https://docs.claude.com/en/docs/claude-code) plugin marketplace.

**One folder = one plugin.** The marketplace catalog lives in
[`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json).

## Plugins

| Plugin | What it does |
|--------|--------------|
| [`grug`](./grug) | Talk like grug brain developer. Very clear, very very simple. Fewest words, simple words, short sentences. Keeps all technical truth and code exact. Voice applies everywhere — chat, commits, PRs, code comments, reviews. |

## Install

Add the marketplace once, then install any plugin from it:

```
/plugin marketplace add anandyandawang/claude-code-plugins
/plugin install grug@claude-code-plugins
```

## Add a new plugin

1. Make a new folder at repo root (the plugin name), e.g. `myplugin/`.
2. Add a manifest at `myplugin/.claude-plugin/plugin.json`.
3. Register it in `.claude-plugin/marketplace.json` under `plugins` with `"source": "./myplugin"`.

That's it. One folder, one plugin.
