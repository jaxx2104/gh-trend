import type { Repo } from "./types.ts";

export interface OpenResult {
  repo: Repo;
  ok: boolean;
  error?: string;
}

/**
 * Opens a repo's GitHub page in the browser via `gh`, reusing gh's own opener
 * (and the user's existing auth) so no extra run permissions are needed.
 * Command: gh repo view {owner}/{repo} --web.
 */
export async function openRepo(repo: Repo): Promise<OpenResult> {
  const cmd = new Deno.Command("gh", {
    args: ["repo", "view", repo.fullName, "--web"],
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
