# gh-trend

A [GitHub CLI](https://cli.github.com/) extension that shows
[GitHub Trending](https://github.com/trending) right in your terminal and lets
you star repositories on the spot.

```
$ gh trend
? Select repos to star (space to toggle, enter to confirm)
❯ ◯ # 1 owner/repo ● TypeScript ★ 1,234 ▲ 89 today  A short description…
  ◯ # 2 owner/repo ● Go         ★ 5,678 ▲ 42 today  Another description…
  ...
★ Starred owner/repo
```

## Install

```sh
gh extension install jaxx2104/gh-trend
```

Precompiled binaries are attached to each release, so you do **not** need Deno
installed to use the extension.

## Usage

```sh
gh trend            # show today's trending repos
gh trend --help
```

- Move with the arrow keys, **space** to toggle a repo, **enter** to confirm.
- Every selected repo is starred via the GitHub REST API using your existing
  `gh` authentication — no extra setup or token handling.
- Piping the output (non-interactive) prints the list instead of prompting:

  ```sh
  gh trend | head
  ```

## How it works

GitHub Trending has no official API, so the extension scrapes
`https://github.com/trending`. Starring uses `PUT /user/starred/{owner}/{repo}`
through `gh api`.

Because it relies on scraping, a GitHub layout change can break parsing; the
selectors live in [`src/scrape.ts`](src/scrape.ts) and are easy to update.

## Development

Built with [Deno](https://deno.com/).

```sh
deno task dev      # run against live trending data
deno task test     # run unit tests
deno task check    # type-check
deno task compile  # build the local ./gh-trend binary
```

To try it as an installed extension:

```sh
deno task compile
gh extension install .
gh trend
gh extension remove trend
```

## License

[MIT](LICENSE)
