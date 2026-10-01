# style-sliders

> Turn the style of Claude's replies up or down, like a mixing desk.

style-sliders gives you six sliders for how Claude writes in chat. Set a word limit, a read time, a grade level or a reading ease score. Claude gets the limits as rules. A hook then measures every reply and tells you if it fit.

This is a function-hooks mod. It is built on the early-access plugin API.

## what it does

There are six dials. Each one has a range, set in steps. Every dial is **off by default**.

| dial | limit | steps | default value |
|------|-------|-------|---------------|
| Total words | at most | 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000 | 300 |
| Read time | at most | 10 sec, 15 sec, 20 sec, 30 sec, 45 sec, 1 min, 1.5 min, 2 min, 3 min, 4 min, 5 min, 7 min, 10 min | 1 min |
| Paragraph words | at most | 15, 20, 25, 30, 40, 50, 60, 80, 100, 150 | 60 |
| Sentence words | at most | 8, 10, 12, 15, 18, 20, 25, 30, 40 | 20 |
| Grade level | at most | grade 3 to 16, one grade at a time | 8 |
| Reading ease | at least | 10, 20, 30, 40, 50, 60, 70, 80, 90 | 60 |

Turn on only the dials you want. A dial that is off does nothing.

Grade level can use one of five formulas: Flesch-Kincaid (the default), Gunning Fog, SMOG, Coleman-Liau or ARI. You pick one.

The `/sliders` command takes any number from the command line, not only the steps. For read time, the number is in seconds, or you can add a unit, like `45s` or `2m`. The number is rounded and kept inside the range of the dial. The `+` and `-` buttons in the pane move one step.

## the /sliders command

```
/sliders - open the sliders pane
/sliders show - show the settings and the last reading
/sliders <dial> <number> - set a limit and turn it on
/sliders read <time> - set the read time limit, like 45s, 90 or 2m
/sliders <dial> on|off - turn one dial on or off
/sliders formula <name> - pick the grade formula (fk, fog, smog, cli, ari)
/sliders off - turn every dial off
/sliders reset - go back to the defaults
/sliders help - show this help
Dials: words, read, paragraph, sentence, grade, ease
```

Some more names work too. `total` and `length` mean words. `readtime`, `read-time` and `time` mean read. `paragraphs` and `para` mean paragraph. `sentences` means sentence. `level` means grade. `readability` and `flesch` mean ease. `status` means show. The formula can also be `kincaid`, `gunning`, `coleman` or the full name, like `flesch-kincaid`.

Examples:

```
/sliders words 150
/sliders read 45s
/sliders read 2m
/sliders grade 6
/sliders formula fog
/sliders ease off
```

## how it works

These parts work together.

- **System prompt.** When a dial is on, the plugin adds a "style sliders" section to the system prompt. It lists each limit. It tells Claude to aim about 15 percent under each maximum. It says the limits cover replies to you only, not tool inputs, files, code or commit messages, and that subagents ignore them.
- **Per-turn reminder.** Each time you send a prompt, a short reminder of the limits is added. It also has the measurement of Claude's last reply, so Claude can adjust. If the last reply was short, Claude is told its grade and ease scores are rough.
- **Measuring each reply.** When Claude finishes a reply, the plugin measures it. Only the main reply counts, not subagent output.
- **Status line.** While a dial is on, the status line shows the limits and the last result. For example `style ≤150w · grade ≤8 FK · last 132w ✓`. A `✗` and the broken dials show when a limit was missed.
- **Toast.** If a reply breaks a limit, a toast says which one and by how much.
- **Revise button.** The pane shows a "Revise last reply" button when the last reply broke a limit. It sends a message asking Claude to rewrite that reply to fit.
- **Saved settings.** Your dials, values and formula are saved and come back in the next session. The last measurement is cleared on `/clear` and on resume.

The pane also has "All off" and "Reset" buttons, and a "Formula" button that cycles the five formulas.

## read time

The read time dial limits how long a reply takes to read.

The base is 238 words a minute. This is the average for adults reading non-fiction silently (Brysbaert, 2019).

- **Prose** is weighted by syllables. An average word has 1.5 syllables. Long words take longer, and short words take less time.
- **Code** reads at half speed.
- **Table text** counts at the normal rate.
- **URLs** add nothing.

Unlike the word limit, read time counts code and tables. So Claude may shorten or drop code and tables to fit. It must keep any code it leaves exact. The time is shown as seconds under a minute, and as minutes after that, like `45 sec` or `1.5 min`.

## what is counted

For the word, paragraph, sentence, grade and ease limits, only prose is counted. This is what that means:

- Headings, list items, bold text and link text count.
- Code blocks, inline code, URLs and tables do not count.
- Each list item counts as its own paragraph.

So a long list of short items does not break the paragraph limit.

Read time is different. It counts prose, code and tables. It still ignores URLs. See "read time" above.

## the grade formulas

`words`, `sentences`, `syllables`, `letters` and `polysyllables` (words of three or more syllables) are counted from the prose.

| name | formula |
|------|---------|
| Reading ease | 206.835 - 1.015 x (words / sentences) - 84.6 x (syllables / words) |
| Flesch-Kincaid | 0.39 x (words / sentences) + 11.8 x (syllables / words) - 15.59 |
| Gunning Fog | 0.4 x ((words / sentences) + 100 x (polysyllables / words)) |
| SMOG | 1.043 x sqrt(polysyllables x 30 / sentences) + 3.1291 |
| Coleman-Liau | 0.0588 x (100 x letters / words) - 0.296 x (100 x sentences / words) - 15.8 |
| ARI | 4.71 x (letters / words) + 0.5 x (words / sentences) - 21.43 |

Grades are rounded to one decimal and never go below 0. Reading ease is rounded to one decimal and kept between 0 and 100. A reply under 50 words is a small sample. Its scores are marked as rough.

## it is a heuristic

The measurement is a guide, not a ruling. Syllables are guessed with rules, not a dictionary. Sentence breaks are guessed too. Another tool may give a slightly different score. Claude also cannot count words exactly while it writes, so it will sometimes miss a limit by a little.

## requirements

- A Claude Code build with function hooks. style-sliders needs it and will not load without it. It was built and tested on 2.1.287.
- The plugin API it uses is early access, so it may change.

The plugin is a function-hooks mod. `hooks/hooks.json` lists the module `./register.tsx`. The code is in `hooks/`.

## try it from disk

```
claude --plugin-dir <path to style-sliders>
```

Then run `/sliders` in the session.

## test and validate

```
claude plugin test style-sliders
claude plugin validate style-sliders
```

Run them from the repo root. The tests cover the dials, the measuring and the hooks.

## turn off

- `/sliders off` turns every dial off. With all dials off, nothing is added to the prompt and the status line is empty.
- `/sliders <dial> off` turns off one dial.
- To remove it fully, disable or uninstall the plugin with `/plugin`.

## install

```
/plugin marketplace add anandyandawang/claude-code-plugins
/plugin install style-sliders@anandyandawang-plugins
```
