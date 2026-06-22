# CLAUDE.md

Project-specific context for agents. General workflow and style live in the
global `~/.claude/CLAUDE.md`; usage and dev commands live in `README.md`. This
file records only intent that isn't obvious from the code itself.

## Architecture

- `src/types.ts` is the contract layer — the stable `Repo` / `Since` types every
  other module depends on. Treat it as the source of truth; the implementation
  modules below should stay regenerable from it.
- `src/scrape.ts` separates fetching (`fetchTrendingHtml`, I/O) from parsing
  (`parseTrending`, pure). Keep `parseTrending` side-effect free so it remains
  unit-testable against fixtures.
- `src/ui.ts` is rendering only (formatting + the cliffy prompt). `src/star.ts`
  is the one side effect that mutates GitHub state. `src/cli.ts` wires them
  together and owns argument parsing (`parseArgs` is exported and tested).

## Scraping is fragile by design

GitHub Trending has no official API, so this scrapes HTML and a layout change
breaks parsing. The CSS selectors live in `src/scrape.ts`; the expected shape is
pinned by the fixture in `src/scrape_test.ts`. Update both together when GitHub's
markup changes.

## Constraints to preserve

- **Least privilege.** Runtime permissions are exactly
  `--allow-net=github.com --allow-run=gh --allow-env` (see `deno.json`,
  `script/build.sh`, `.github/workflows/release.yml`). Justify any addition.
- **No token handling.** Starring shells out to `gh api` to reuse the user's
  existing `gh` auth — don't introduce direct token reads.
- **Pipe-safe output.** `cli.ts` goes non-interactive when stdin *or* stdout is
  not a TTY. Keep both checks, or `gh trend | head` breaks.

## Before committing

Run `deno fmt`, `deno lint`, `deno task check`, `deno task test` — CI runs the
same set. The compiled `./gh-trend` binary is a build artifact (gitignored);
never commit it.
