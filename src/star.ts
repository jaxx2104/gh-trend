import type { Repo } from "./types.ts";

export interface StarResult {
  repo: Repo;
  ok: boolean;
  error?: string;
}

/**
 * Stars a repo via `gh api`, reusing the user's existing gh authentication.
 * Endpoint: PUT /user/starred/{owner}/{repo} (204 on success).
 */
export async function starRepo(repo: Repo): Promise<StarResult> {
  try {
    // Bun.spawn throws synchronously when `gh` is not on PATH, so keep it in the try.
    const proc = Bun.spawn(
      [
        "gh",
        "api",
        "--method",
        "PUT",
        `user/starred/${repo.fullName}`,
        "--silent",
      ],
      {
        stdout: "ignore",
        stderr: "pipe",
      },
    );
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
