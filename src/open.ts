import type { Repo } from "./types.ts";

export interface OpenResult {
  repo: Repo;
  ok: boolean;
  error?: string;
}

/**
 * Opens a repo's GitHub page in the browser via `gh`, reusing gh's own opener
 * (and the user's existing auth) so we never spawn anything but `gh`.
 * Command: gh repo view {owner}/{repo} --web.
 */
export async function openRepo(repo: Repo): Promise<OpenResult> {
  try {
    // Bun.spawn throws synchronously when `gh` is not on PATH, so keep it in the try.
    const proc = Bun.spawn(["gh", "repo", "view", repo.fullName, "--web"], {
      stdout: "ignore",
      stderr: "pipe",
    });
    const [exitCode, stderr] = await Promise.all([
      proc.exited,
      new Response(proc.stderr).text(),
    ]);
    if (exitCode === 0) return { repo, ok: true };
    return { repo, ok: false, error: stderr.trim() };
  } catch (e) {
    return {
      repo,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
