import { writeSync } from "node:fs";
import { keypress } from "@cliffy/keypress";
import { unicodeWidth } from "@std/cli/unicode-width";
import {
  blue,
  bold,
  cyan,
  dim,
  green,
  red,
  rgb24,
  yellow,
} from "@std/fmt/colors";
import type { Repo, Since } from "./types.ts";

function consoleColumns(): number {
  return process.stdout.columns || 80;
}

function consoleRows(): number {
  return process.stdout.rows || 24;
}

/** Truncates `s` to a display width of at most `max` columns, adding "…" when cut. */
function truncate(s: string, max: number): string {
  if (max <= 1) return "";
  if (unicodeWidth(s) <= max) return s;
  let width = 0;
  let out = "";
  for (const ch of s) {
    const w = unicodeWidth(ch);
    if (width + w > max - 1) break; // reserve 1 column for the "…"
    width += w;
    out += ch;
  }
  return `${out}…`;
}

const n = (x: number): string => x.toLocaleString("en-US");

const PERIOD_LABEL: Record<Since, string> = {
  daily: "today",
  weekly: "this week",
  monthly: "this month",
};

/** Renders one repo as a single, decorated line (safe to use as a list label). */
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
  const periodPlain =
    repo.periodStars > 0 ? ` ▲ ${n(repo.periodStars)} ${periodLabel}` : "";

  const dot = repo.languageColor
    ? rgb24("●", parseInt(repo.languageColor.slice(1), 16))
    : "●";
  const head =
    dim(rankPlain) +
    " " +
    dim(`${repo.owner}/`) +
    bold(cyan(repo.name)) +
    (repo.language ? ` ${dot} ${repo.language}` : "") +
    yellow(starsPlain) +
    (repo.periodStars > 0 ? green(periodPlain) : "");

  const headPlainLen = unicodeWidth(
    `${rankPlain} ${namePlain}${langPlain}${starsPlain}${periodPlain}`,
  );
  const budget = maxWidth - headPlainLen - 2;
  if (repo.description && budget > 5) {
    return `${head}  ${dim(truncate(repo.description, budget))}`;
  }
  return head;
}

/** Plain (non-interactive) listing, used when stdout is piped. */
export function renderList(repos: Repo[], since: Since = "daily"): string {
  return repos.map((r) => formatRepoLine(r, { since })).join("\n");
}

/** Side effects the interactive browser applies to the current row. */
export interface RepoActions {
  star(repo: Repo): Promise<{ ok: boolean; error?: string }>;
  open(repo: Repo): Promise<{ ok: boolean; error?: string }>;
}

type RepoStatus =
  | { kind: "idle" }
  | { kind: "starring" }
  | { kind: "starred" }
  | { kind: "opening" }
  | { kind: "opened" }
  | { kind: "error"; msg: string };

function statusSuffix(s: RepoStatus): { plain: string; colored: string } {
  switch (s.kind) {
    case "idle":
      return { plain: "", colored: "" };
    case "starring":
      return { plain: "…", colored: dim("…") };
    case "opening":
      return { plain: "…", colored: dim("…") };
    case "starred":
      return { plain: "★ starred", colored: green("★ starred") };
    case "opened":
      return { plain: "🔗 opened", colored: blue("🔗 opened") };
    case "error":
      return { plain: `✗ ${s.msg}`, colored: red(`✗ ${s.msg}`) };
  }
}

const HINT = "↑↓/jk move · s star · o open · q quit";
function write(s: string): void {
  writeSync(process.stdout.fd, s);
}

/**
 * Interactive trending browser: move the cursor through the list and act on the
 * current row — `s` stars it, `o` opens it in the browser. `q`/Esc/Ctrl+C quit.
 * Rendering only; the star/open side effects are injected via `actions`.
 */
export async function browseRepos(
  repos: Repo[],
  actions: RepoActions,
  since: Since = "daily",
): Promise<void> {
  let cursor = 0;
  let offset = 0;
  let prevLines = 0;
  const statuses: RepoStatus[] = repos.map(() => ({ kind: "idle" }));

  const render = (): void => {
    const cols = consoleColumns();
    const viewport = Math.max(1, consoleRows() - 2); // 1 header + 1 spare row
    if (cursor < offset) offset = cursor;
    else if (cursor >= offset + viewport) offset = cursor - viewport + 1;
    const end = Math.min(repos.length, offset + viewport);

    const lines = [dim(HINT)];
    for (let i = offset; i < end; i++) {
      const { plain, colored } = statusSuffix(statuses[i]);
      const statusW = plain ? unicodeWidth(plain) + 1 : 0;
      const body = formatRepoLine(repos[i], {
        since,
        maxWidth: cols - 2 - statusW,
      });
      const prefix = i === cursor ? cyan(bold("❯ ")) : "  ";
      lines.push(prefix + body + (plain ? ` ${colored}` : ""));
    }

    let out = prevLines > 0 ? `\x1b[${prevLines}A` : "";
    out += `\r\x1b[0J${lines.map((l) => `${l}\n`).join("")}`;
    write(out);
    prevLines = lines.length;
  };

  const act = async (
    kind: "starring" | "opening",
    run: (repo: Repo) => Promise<{ ok: boolean; error?: string }>,
    done: "starred" | "opened",
  ): Promise<void> => {
    statuses[cursor] = { kind };
    render();
    const res = await run(repos[cursor]);
    statuses[cursor] = res.ok
      ? { kind: done }
      : {
          kind: "error",
          msg: truncate(
            (res.error ?? `${done} failed`).split("\n")[0].trim(),
            40,
          ),
        };
    render();
  };

  write("\x1b[?25l"); // hide cursor while navigating
  try {
    render();
    for await (const event of keypress()) {
      const k = event.key;
      if (k === "q" || k === "escape" || (k === "c" && event.ctrlKey)) break;
      else if (k === "up" || k === "k") {
        cursor = (cursor - 1 + repos.length) % repos.length;
        render();
      } else if (k === "down" || k === "j") {
        cursor = (cursor + 1) % repos.length;
        render();
      } else if (k === "s") {
        await act("starring", actions.star, "starred");
      } else if (k === "o") {
        await act("opening", actions.open, "opened");
      }
    }
  } finally {
    write("\x1b[?25h"); // restore the cursor, leaving the final frame in place
  }
}
