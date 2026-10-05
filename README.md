# clawd-dash

![clawd-dash](https://raw.githubusercontent.com/pinkpixel-dev/clawd-dash/refs/heads/main/demo.gif)

clawd-dash is a Claude Code mod that puts a little session dashboard under the prompt: plan limits, context, cost, model, effort, and file changes, with an animated pixel Clawd on the right that reacts to what Claude is doing.

## What it shows

- **5h and 7d plan limits** as a small ring, the percent used, and when each window resets
- **Context** as a bar with the percent full and tokens used out of the window (like `84k/200k`)
- **Session cost** in dollars
- **Model and effort** for the current session (like `Opus 5.5 · high`)
- **File changes**: lines added and removed, plus how many files Claude has edited or written
- **The normal hint line** (`? for shortcuts`, `esc to interrupt`) stays as the last row, so you don't lose it

The colors change at 50% (yellow) and 80% (red), and the numbers are always shown too, so you're not reading status from color alone.

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

This repo is also a small plugin marketplace called `pinkpixel`, so you can install it straight from GitHub. Inside Claude Code:

```
/plugin marketplace add pinkpixel-dev/clawd-dash
/plugin install clawd-dash@pinkpixel
```

Or from your shell:

```bash
claude plugin marketplace add pinkpixel-dev/clawd-dash
claude plugin install clawd-dash@pinkpixel
```

Run `/plugin` and you should see `clawd-dash` in the `mods active` line under the tabs. To pick up new versions later, run `claude plugin marketplace update pinkpixel`.

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

- Mods run with your permissions. This one only reads usage numbers, the session model, and the results of Claude's `Edit`/`Write`/`MultiEdit`/`NotebookEdit` calls. It doesn't touch files, run processes, or make network requests. You can check that yourself with `claude plugin validate .`, which lists every hook and call the mod makes.
- Effort shows up after your first message, since it comes from the first model request.
- The file change counter starts over whenever the mod reloads (for example, while you're editing it).
- On terminals narrower than 90 columns, the crab hides and the stats stay.
- The dashboard only draws in the terminal. In the Desktop app and the VS Code panel, you get the normal hint line.

## How it works

The mod is a few small TypeScript files in `hooks/`:

- `register.tsx` hooks into Claude Code's events. `session.measure` feeds the usage numbers, `turn.start` and `turn.complete` switch the mood, `turn.step` picks up the model and effort, and `tool.call` counts lines from edit results. A `ui.render` hook on `PromptHint` draws the dashboard in the hint row under the prompt.
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

The tests render the dashboard at a wide and a narrow width and make sure every mood actually draws the mascot.

When Claude Code loads the mod from this folder, it writes type declarations into `.claude-plugin/types/`, and `tsconfig.json` extends them. After one load, `npx -p typescript tsc -p .` type-checks the mod. That folder is generated, so it's in `.gitignore`.

If you start Claude Code with `--plugin-dir` pointing here, saving a file reloads the mod live.

## License

Apache 2.0. See [LICENSE](LICENSE).

Clawd is Anthropic's mascot. This is a fan-made mod and isn't affiliated with Anthropic.

Made with 💖 by [Pink Pixel](https://pinkpixel.dev)
