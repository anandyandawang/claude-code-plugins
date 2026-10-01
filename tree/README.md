# tree

A session tree for Claude Code, like the `/tree` feature of the pi coding agent.
See every branch of your conversation in a pane, jump back to any earlier turn,
and keep going from there. Old branches stay in the tree, so you can go back to
them later.

```
● 1. Remember the word APPLE.
├─ ● 2. Remember the word BANANA.
│  ● 3. Remember the word CHERRY.
│  ▶ 5. List every word I asked you to remember.
└─ ○ 4. List every word I asked you to remember.
```

`▶` is where you are, `●` is the path that led here, and `○` is another branch.

## Use it

| Command | What it does |
|---------|--------------|
| `/tree` | Open the tree pane. Tab to a turn, press Enter, then `g` to continue from it, `e` to edit its prompt, or `c` to cancel. |
| `/tree list` | Print the tree with turn numbers. |
| `/tree go <n>` | Continue from the end of turn `n`. |
| `/tree edit <n>` | Go back to just before turn `n` and put its prompt in the prompt box. |

The pane works in the terminal and in the desktop app. In the terminal,
`ctrl+x tab` moves the keyboard into the pane.

## How it works

The plugin watches the conversation after every turn and keeps its own tree of
messages. When you pick a turn, it runs `/compact` with its own instructions and
answers that compaction itself: the conversation becomes the path from the start
to the turn you picked. No summary is made, and nothing is lost: the other
branches stay in the tree.

You will see a `/compact tree: switch the conversation to another branch` line in
the chat when this happens.

## Cost

Like the built-in `/rewind`, the first reply after a switch re-reads the branch
you kept without the prompt cache. Only the system prompt and tools still come
from cache. After that one reply, caching is back to normal. The pane shows a
rough size of the messages before you switch.

## Limits

- The tree lives in memory. It starts fresh when the session restarts or the
  plugin reloads, from the conversation as it stands then.
- Turns from an old branch come back rebuilt from their text and tool calls.
  Extra context the engine attached to them (file listings, reminders) and any
  thinking blocks are not restored.
- You cannot jump to before the very first prompt. Use `/clear` for that.
- This plugin uses Claude Code's function hooks, which are an early-access API
  and may change between releases.
