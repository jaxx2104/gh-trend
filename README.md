# gh-trend

A [GitHub CLI](https://cli.github.com/) extension that shows
[GitHub Trending](https://github.com/trending) right in your terminal and lets
you star or open repositories on the spot.

```
$ gh trend
↑↓/jk move · s star · o open · q quit
❯ # 1 owner/repo ● TypeScript ★ 1,234 ▲ 89 today  A short description…
  # 2 owner/repo ● Go         ★ 5,678 ▲ 42 today  Another description…  ★ starred
  ...
```

## Install

```sh
gh extension install jaxx2104/gh-trend
```

Precompiled binaries are attached to each release, so you do **not** need Bun
installed to use the extension.

## Usage

```sh
gh trend            # show today's trending repos
gh trend --weekly   # this week's trending repos
gh trend --monthly  # this month's trending repos
gh trend --since weekly
gh trend --json     # print repos as JSON (no starring)
gh trend --help
```

- Move with **↑/↓** (or **j/k**). Press **s** to star the highlighted repo,
  **o** to open it in your browser, **q** (or Esc) to quit.
- Starring uses the GitHub REST API and opening uses `gh repo view --web`, both
  through your existing `gh` authentication — no extra setup or token handling.
- Piping the output (non-interactive) prints the list instead of prompting:

  ```sh
  gh trend | head
  ```

- `--json` prints the repos as a JSON array (the `Repo` shape) and exits without
  starring, for scripting:

  ```sh
  gh trend --json | jq '.[].fullName'
  ```

## How it works

GitHub Trending has no official API, so the extension scrapes
`https://github.com/trending`. Starring uses `PUT /user/starred/{owner}/{repo}`
through `gh api`, and opening a repo shells out to `gh repo view --web`.

Because it relies on scraping, a GitHub layout change can break parsing; the
selectors live in [`src/scrape.ts`](src/scrape.ts) and are easy to update.

## Development

Built with [Bun](https://bun.sh/). The Bun version is managed with
[mise](https://mise.jdx.dev/) (`mise.toml`, pinned by `mise.lock`).

```sh
mise install       # install the pinned Bun
bun install        # install dependencies
bun run dev        # run against live trending data
bun run test       # run unit tests (bun:test)
bun run check      # type-check (tsc --noEmit)
bun run lint       # Biome format + lint check (fix: bunx biome check --write .)
bun run compile    # build the local ./gh-trend binary
```

To try it as an installed extension:

```sh
bun run compile
gh extension install .
gh trend
gh extension remove trend
```

## License

[MIT](LICENSE)
