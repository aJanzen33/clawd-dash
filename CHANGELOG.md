# Changelog

## 0.2.0 - October 5, 2026

### 🎨 Dashboard

- The stats now spread across three columns (limits, session, repo) that share the width between the hint text and the crab, with thin dividers between them
- Every label and value has its own color, so the rows are easier to scan
- The 5h, 7d, and context rows use smooth block gauges that fill in eighth-cell steps, colored green, yellow, or red by how full they are
- Columns drop from the right on narrower terminals: repo first, then session

### ✨ New stats

- Session uptime and how long the last turn took
- Prompts sent and tool calls made this session
- Git branch, commits ahead and behind, and the number of changed files (or a check mark when it's clean)
- The Claude Code version
- The uptime and reset countdowns refresh every 15 seconds

### 🧪 Tests

- Added tests for the three-column layout, the column breakpoints, the gauge, elapsed time, and git status parsing

## 0.1.1 - October 5, 2026

### 🎨 Dashboard

- The context row is now labeled `context` instead of `ctx`

### 📦 Install

- Added a `pinkpixel` plugin marketplace, so clawd-dash installs with `/plugin install clawd-dash@pinkpixel`

## 0.1.0 - October 5, 2026

### ✨ First version

- Dashboard under the prompt with the 5h and 7d plan limits, context fill and tokens, session cost, model, effort, and lines and files changed
- The normal hint line stays as the dashboard's last row
- Animated pixel Clawd with `working`, `done`, `idle`, and `relax` moods that follow the session
- The crab hides on terminals narrower than 90 columns

### 🧪 Tests

- Render tests at wide and narrow widths, plus a raster test for every mood
