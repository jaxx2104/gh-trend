import { bold, green, red } from "@std/fmt/colors";
import { fetchTrendingHtml, parseTrending } from "./scrape.ts";
import { renderList, selectRepos } from "./ui.ts";
import { starRepo } from "./star.ts";
import type { Repo } from "./types.ts";

const HELP = `gh-trend — browse GitHub Trending and star repos

Usage:
  gh trend            Show today's trending repos; space to select, enter to star

Options:
  -h, --help          Show this help

Notes:
  Data is scraped from https://github.com/trending (no official API).
  Starring reuses your existing gh authentication via the REST API.
`;

async function main(): Promise<void> {
  const args = Deno.args;
  if (args.includes("-h") || args.includes("--help")) {
    console.log(HELP);
    return;
  }

  let repos: Repo[];
  try {
    repos = parseTrending(await fetchTrendingHtml());
  } catch (e) {
    console.error(
      red(`Failed to fetch trending: ${e instanceof Error ? e.message : e}`),
    );
    Deno.exit(1);
  }

  if (repos.length === 0) {
    console.error(
      red("No trending repositories found (the page layout may have changed)."),
    );
    Deno.exit(1);
  }

  // Piped / non-interactive: just print the list and exit.
  if (!Deno.stdin.isTerminal()) {
    console.log(renderList(repos));
    return;
  }

  const selected = await selectRepos(repos);
  if (selected.length === 0) {
    console.log("Nothing selected.");
    return;
  }

  for (const repo of selected) {
    const result = await starRepo(repo);
    if (result.ok) {
      console.log(`${green("★")} Starred ${bold(repo.fullName)}`);
    } else {
      console.error(
        `${red("✗")} Failed to star ${repo.fullName}: ${
          result.error ?? "unknown error"
        }`,
      );
    }
  }
}

await main();
