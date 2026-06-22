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
  const cmd = new Deno.Command("gh", {
    args: [
      "api",
      "--method",
      "PUT",
      `user/starred/${repo.fullName}`,
      "--silent",
    ],
    stdout: "null",
    stderr: "piped",
  });
  try {
    const { success, stderr } = await cmd.output();
    if (success) return { repo, ok: true };
    return { repo, ok: false, error: new TextDecoder().decode(stderr).trim() };
  } catch (e) {
    return {
      repo,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
