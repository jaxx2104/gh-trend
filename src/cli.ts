import { red, setColorEnabled } from "@std/fmt/colors";
import { openRepo } from "./open.ts";
import { fetchTrendingHtml, parseTrending } from "./scrape.ts";
import { starRepo } from "./star.ts";
import type { Repo, Since } from "./types.ts";
import { browseRepos, renderList } from "./ui.ts";

const HELP = `gh-trend — browse GitHub Trending and star repos

Usage:
  gh trend            Browse today's trending repos
                      (↑↓/jk move · s star · o open in browser · q quit)

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
    value !== undefined &&
    (SINCE_VALUES as readonly string[]).includes(value)
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
  // @std/fmt/colors only honors NO_COLOR via Deno.noColor, which Bun lacks.
  // https://no-color.org: disable color when NO_COLOR is set and non-empty.
  setColorEnabled(!process.env.NO_COLOR);

  let opts: CliOptions;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(red(e instanceof Error ? e.message : String(e)));
    process.exit(2);
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
    process.exit(1);
  }

  if (repos.length === 0) {
    console.error(
      red("No trending repositories found (the page layout may have changed)."),
    );
    process.exit(1);
  }

  if (opts.json) {
    console.log(JSON.stringify(repos, null, 2));
    return;
  }

  // Non-interactive (stdin or stdout is not a TTY): just print the list and exit.
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.log(renderList(repos, opts.since));
    return;
  }

  await browseRepos(repos, { star: starRepo, open: openRepo }, opts.since);
}

if (import.meta.main) {
  await main();
}
