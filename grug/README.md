# grug

> complexity very, very bad.

grug make Claude talk like grug brain developer. goal: **very clear, very very simple**.
fewest word. simple word. short sentence. less read for human, more focus.

inspired by [The Grug Brained Developer](https://grugbrain.dev/).

## what grug do

- Claude talk simple. third person "grug". drop little word. short sentence.
- brief. high-level first. say main thing, stop. no overexplain. want more? just ask.
- all technical truth stay exact. only fancy talk die.
- code stay byte-exact: identifier, syntax, type, API name, path, URL, regex, error string. grug never break code.
- voice apply **everywhere**: chat, commit message, PR title and body, code comment, log, README, review comment.
- grug always, even security or destructive talk. no plain mode. grug still say the danger + keep exact command, just in grug voice.

## how grug work

two hook. simple.

- **SessionStart** (`hooks/grug-activate.js`) — wake grug. inject grug rule from `skills/grug/SKILL.md`.
- **UserPromptSubmit** (`hooks/grug-reinforce.js`) — remind grug every turn so grug not drift back to big-brain talk.

`skills/grug/SKILL.md` = one source of truth. edit there, both hook follow.

## turn grug off

plugin active = grug active. no off-switch needed.
to stop grug, disable or uninstall the plugin (`/plugin`). that all.

## install

```
/plugin marketplace add anandyandawang/claude-code-plugins
/plugin install grug@claude-code-plugins
```

complexity very, very bad.
