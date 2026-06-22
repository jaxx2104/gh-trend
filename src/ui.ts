import { Checkbox } from "@cliffy/prompt";
import { bold, cyan, dim, green, rgb24, yellow } from "@std/fmt/colors";
import type { Repo, Since } from "./types.ts";

function consoleColumns(): number {
  try {
    return Deno.consoleSize().columns;
  } catch {
    return 80;
  }
}

function truncate(s: string, max: number): string {
  if (max <= 1) return "";
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

const n = (x: number): string => x.toLocaleString("en-US");

const PERIOD_LABEL: Record<Since, string> = {
  daily: "today",
  weekly: "this week",
  monthly: "this month",
};

/** Renders one repo as a single, decorated line (safe to use as a cliffy option label). */
export function formatRepoLine(
  repo: Repo,
  opts: { since?: Since; maxWidth?: number } = {},
): string {
  const { since = "daily", maxWidth = consoleColumns() } = opts;
  const periodLabel = PERIOD_LABEL[since];

  const rankPlain = `#${String(repo.rank).padStart(2, " ")}`;
  const namePlain = `${repo.owner}/${repo.name}`;
  const langPlain = repo.language ? ` ● ${repo.language}` : "";
  const starsPlain = ` ★ ${n(repo.stars)}`;
  const periodPlain = repo.periodStars > 0
    ? ` ▲ ${n(repo.periodStars)} ${periodLabel}`
    : "";

  const dot = repo.languageColor
    ? rgb24("●", parseInt(repo.languageColor.slice(1), 16))
    : "●";
  const head = dim(rankPlain) + " " +
    dim(`${repo.owner}/`) + bold(cyan(repo.name)) +
    (repo.language ? ` ${dot} ${repo.language}` : "") +
    yellow(starsPlain) +
    (repo.periodStars > 0 ? green(periodPlain) : "");

  const headPlainLen =
    `${rankPlain} ${namePlain}${langPlain}${starsPlain}${periodPlain}`.length;
  const budget = maxWidth - headPlainLen - 2;
  if (repo.description && budget > 5) {
    return head + "  " + dim(truncate(repo.description, budget));
  }
  return head;
}

/** Plain (non-interactive) listing, used when stdout is piped. */
export function renderList(repos: Repo[], since: Since = "daily"): string {
  return repos.map((r) => formatRepoLine(r, { since })).join("\n");
}

/** Interactive multi-select. Returns the repos the user chose to star. */
export async function selectRepos(
  repos: Repo[],
  since: Since = "daily",
): Promise<Repo[]> {
  const byName = new Map(repos.map((r) => [r.fullName, r]));
  const selected = await Checkbox.prompt({
    message: "Select repos to star (space to toggle, enter to confirm)",
    options: repos.map((r) => ({
      name: formatRepoLine(r, { since }),
      value: r.fullName,
    })),
    minOptions: 0,
  });
  return selected
    .map((fullName) => byName.get(fullName))
    .filter((r): r is Repo => r !== undefined);
}
