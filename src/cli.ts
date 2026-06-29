import { bold, green, red } from "@std/fmt/colors";
import { fetchTrendingHtml, parseTrending } from "./scrape.ts";
import { renderList, selectRepos } from "./ui.ts";
import { starRepo } from "./star.ts";
import type { Repo, Since } from "./types.ts";

const HELP = `gh-trend — browse GitHub Trending and star repos

Usage:
  gh trend            Show today's trending repos; space to select, enter to star

Options:
  --since <period>    Trending window: daily (default), weekly, or monthly
  --weekly            Shortcut for --since weekly
  --monthly           Shortcut for --since monthly
  --json              Print the repos as JSON and exit (no starring)
  -h, --help          Show this help

Notes:
  Data is scraped from https://github.com/trending (no official API).
  Starring reuses your existing gh authentication via the REST API.
`;

export interface CliOptions {
  help: boolean;
  since: Since;
  json: boolean;
}

const SINCE_VALUES: readonly Since[] = ["daily", "weekly", "monthly"];

function toSince(value: string | undefined): Since {
  if (
    value !== undefined && (SINCE_VALUES as readonly string[]).includes(value)
  ) {
    return value as Since;
  }
  throw new Error(
    `Invalid --since value: ${
      value ?? "(missing)"
    } (expected daily, weekly, or monthly)`,
  );
}

/** Parses CLI args. Throws on unknown options or an invalid --since value. */
export function parseArgs(args: string[]): CliOptions {
  if (args.includes("-h") || args.includes("--help")) {
    return { help: true, since: "daily", json: false };
  }
  let since: Since = "daily";
  let json = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--daily" || arg === "--weekly" || arg === "--monthly") {
      since = arg.slice(2) as Since;
    } else if (arg === "--since") {
      since = toSince(args[++i]);
    } else if (arg.startsWith("--since=")) {
      since = toSince(arg.slice("--since=".length));
    } else if (arg === "--json") {
      json = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return { help: false, since, json };
}

async function main(): Promise<void> {
  let opts: CliOptions;
  try {
    opts = parseArgs(Deno.args);
  } catch (e) {
    console.error(red(e instanceof Error ? e.message : String(e)));
    Deno.exit(2);
  }

  if (opts.help) {
    console.log(HELP);
    return;
  }

  let repos: Repo[];
  try {
    repos = parseTrending(await fetchTrendingHtml(opts.since));
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

  if (opts.json) {
    console.log(JSON.stringify(repos, null, 2));
    return;
  }

  // Non-interactive (stdin or stdout is not a TTY): just print the list and exit.
  if (!Deno.stdin.isTerminal() || !Deno.stdout.isTerminal()) {
    console.log(renderList(repos, opts.since));
    return;
  }

  const selected = await selectRepos(repos, opts.since);
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

if (import.meta.main) {
  await main();
}
