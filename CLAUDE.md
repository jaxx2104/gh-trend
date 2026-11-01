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
  is the one side effect that mutates GitHub state (`src/open.ts` also shells
  out to `gh`, but only to open a browser). `src/cli.ts` wires them together
  and owns argument parsing (`parseArgs` is exported and tested).

## Scraping is fragile by design

GitHub Trending has no official API, so this scrapes HTML and a layout change
breaks parsing. The CSS selectors live in `src/scrape.ts`; the expected shape is
pinned by the fixture in `src/scrape_test.ts`. Update both together when
GitHub's markup changes.

## Constraints to preserve

- **Least privilege.** Bun has no runtime permission sandbox (the Deno build
  used `--allow-net=github.com --allow-run=gh --allow-env`), so this is now a
  code-level rule: the only network access is `fetch` to `github.com` in
  `src/scrape.ts`, and the only subprocess is `gh` (`src/star.ts`,
  `src/open.ts`); the only env var read is `NO_COLOR` in `src/cli.ts`. Justify
  any new host, executable, or env var read.
- **No token handling.** Starring shells out to `gh api` to reuse the user's
  existing `gh` auth — don't introduce direct token reads.
- **Pipe-safe output.** `cli.ts` goes non-interactive when stdin _or_ stdout is
  not a TTY. Keep both checks, or `gh trend | head` breaks.

## Before committing

Run `bunx biome check --write .`, `bun run check`, `bun run test` — CI runs
the same set (`biome ci`, `tsc --noEmit`, `bun test`). Biome does not format
Markdown, so keep `*.md` wrapped at 80 columns by hand. The compiled
`./gh-trend` binary is a build artifact (gitignored); never commit it.

## Releasing

Releases are tag-driven: pushing a `v*` tag triggers
`.github/workflows/release.yml`, which cross-compiles the five target binaries
with `bun build --compile` and creates the GitHub release with
`--generate-notes`. There is no manual upload step — never run
`gh release create` by hand, and never push a `v*` tag you don't intend to
publish.

- Tag versions follow semver: patch (`v0.1.1`) for bug fixes, minor for new
  flags or behavior, major for breaking the `Repo` / CLI contract.
- Cut a release only when a commit changes runtime behavior; docs-only or
  CI-only changes don't warrant one.
- After pushing the tag, confirm the workflow succeeded and the release has all
  five assets (`gh release view <tag>`) before considering it done.
