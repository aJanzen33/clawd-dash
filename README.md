# clawd-dash

![clawd-dash](https://raw.githubusercontent.com/pinkpixel-dev/clawd-dash/refs/heads/main/demo.gif)

clawd-dash is a Claude Code mod that puts a little session dashboard under the prompt: plan limits, context, cost, model, effort, session stats, git status, and file changes, with an animated pixel Clawd on the right that reacts to what Claude is doing.

## What it shows

The stats sit in three columns that spread out to fill the space between the hint text and the crab.

**Limits**

- **5h and 7d plan limits** as a block gauge, the percent used, and when each window resets (`↻ 44m`)
- **Context** as the same kind of gauge, with the percent full and tokens used out of the window (like `84k/200k`)

**Session**

- **Model and effort** (like `Opus 5.5 · high`)
- **Cost** in dollars, how long the session has been up, and how long the last turn took
- **Prompts** you've sent and **tool calls** Claude has made

**Repo**

- **Git branch**, with `↑`/`↓` for commits ahead of or behind the remote, and `●3` for three changed files (or `✓` when the tree is clean)
- **File changes**: lines added and removed, plus how many files Claude has edited or written
- **The Claude Code version**

**The normal hint line** (`? for shortcuts`, `esc to interrupt`) stays as the last row, so you don't lose it.

The gauges turn yellow at 50% and red at 80%, and the numbers are always shown too, so you're not reading status from color alone. On narrower terminals the columns drop from the right: repo goes first, then session.

## The mascot

Clawd has four moods, and each one cycles through a few little scenes:

| Mood | When | What happens |
| --- | --- | --- |
| `working` | While Claude is running a turn | Typing on a laptop, shuffling papers, carrying boxes, running charts |
| `done` | Right after a turn finishes | One burst of confetti and a dance |
| `idle` | After the celebration | Sweeping, walking, scrolling a phone, reading |
| `relax` | After about 3 minutes with nothing happening | Sunset chair, fishing, hammock, campfire, barbecue, a drive |

## Requirements

- Claude Code v2.1.287 or later (that's when mods shipped). Check with `claude --version`.
- A terminal that supports the kitty graphics protocol, like **kitty** or **Ghostty**, if you want to see the crab. Other terminals still get the stats, and the crab falls back to a short text label.
- A Claude subscription if you want the 5h and 7d limits. On an API key, those rows just say no limits were reported.

## Install

This repo is also a small plugin marketplace called `pinkpixel-aja-fork` (a reviewed fork of [pinkpixel-dev/clawd-dash](https://github.com/pinkpixel-dev/clawd-dash)), so you can install it straight from GitHub. Inside Claude Code:

```
/plugin marketplace add aJanzen33/clawd-dash
/plugin install clawd-dash@pinkpixel-aja-fork
```

Or from your shell:

```bash
claude plugin marketplace add aJanzen33/clawd-dash
claude plugin install clawd-dash@pinkpixel-aja-fork
```

Run `/plugin` and you should see `clawd-dash` in the `mods active` line under the tabs. To pick up new versions later, run `claude plugin marketplace update pinkpixel-aja-fork`.

A **models** column lists the tokens each model answered with this session, subagents included, and its share of the total.

Past 600k context tokens the context gauge turns red and suggests a fresh session; set **Context warning (tokens)** (`clawd-dash.contextWarnTokens`) in `/config` to move the mark, or to 0 to turn it off.

To hide the animated Clawd and keep only the stats, turn off **Show Clawd** (`clawd-dash.showClawd`) in `/config`.

### Load it from a local folder

If you've cloned the repo and want to hack on it, you can load it from the folder instead. To try it for one session:

```bash
claude --plugin-dir /home/sizzlebop/PINKPIXEL/PROJECTS/CURRENT/clawd-dash
```

To load it every time, add the folder to `CLAUDE_CODE_PLUGIN_DIRS`, either in your shell or in the `env` block of `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "/home/sizzlebop/PINKPIXEL/PROJECTS/CURRENT/clawd-dash"
  }
}
```

Run `/plugin` inside Claude Code and you should see `clawd-dash` in the `mods active` line under the tabs.

To turn it off, remove the folder from that setting, or start Claude Code with `--safe-mode` for one session.

## Good to know

- Mods run with your permissions. This one reads usage numbers, session info (model, prompt count, version), and the results of Claude's `Edit`/`Write`/`MultiEdit`/`NotebookEdit` calls. The only process it runs is `git status --porcelain=v1 --branch`, at session start, after each `Bash` or edit tool call, and when a turn finishes. It doesn't write files or make network requests. You can check that yourself with `claude plugin validate .`, which lists every hook and call the mod makes.
- Effort shows up after your first message, since it comes from the first model request.
- The file change and tool call counters start over whenever the mod reloads (for example, while you're editing it).
- The tool call count includes calls made by subagents.
- On terminals narrower than 90 columns, the crab hides and the stats stay.
- The dashboard only draws in the terminal. In the Desktop app and the VS Code panel, you get the normal hint line.

## How it works

The mod is a few small TypeScript files in `hooks/`:

- `register.tsx` hooks into Claude Code's events. `session.measure` feeds the usage numbers, `turn.start` and `turn.complete` switch the mood and update the prompt count, last turn time, and git status, `turn.step` picks up the model and effort, and `tool.call` counts tool calls and lines from edit results. A `ui.render` hook on `PromptHint` draws the dashboard in the hint row under the prompt.
- `dash.tsx` builds the three stat columns and decides how many fit.
- `git.ts` runs `git status` and reads the branch, ahead/behind counts, and changed files out of it.
- `scene.ts` draws each animation frame of a mood as a 100x18 pixel SVG.
- `raster.ts` turns that SVG into RGBA pixels, crops off the mostly empty left side, and scales it up 4x so it stays crisp. The terminal can't draw SVG, but it can draw an `Image`.
- A timer repaints the crab about 8 times a second with `$.ui.blit`, which swaps the picture without redrawing the rest of the dashboard.

There's more detail in [DOCS/OVERVIEW.md](DOCS/OVERVIEW.md).

## Development

Validate the manifest and see what the mod hooks and calls:

```bash
claude plugin validate .
```

Run the tests:

```bash
claude plugin test .
```

The tests render the dashboard at a few widths, check the column breakpoints, the gauge, and git status parsing, and make sure every mood actually draws the mascot.

When Claude Code loads the mod from this folder, it writes type declarations into `.claude-plugin/types/`, and `tsconfig.json` extends them. After one load, `npx -p typescript tsc -p .` type-checks the mod. That folder is generated, so it's in `.gitignore`.

If you start Claude Code with `--plugin-dir` pointing here, saving a file reloads the mod live.

## License

Apache 2.0. See [LICENSE](LICENSE).

Clawd is Anthropic's mascot. This is a fan-made mod and isn't affiliated with Anthropic.

Made with 💖 by [Pink Pixel](https://pinkpixel.dev)
