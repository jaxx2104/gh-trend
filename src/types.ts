/** Contract layer: stable types the rest of the modules depend on. */

export type Since = "daily" | "weekly" | "monthly";

export interface Repo {
  /** 1-based position on the trending page. */
  rank: number;
  owner: string;
  /** Repository name without the owner. */
  name: string;
  /** "owner/name". */
  fullName: string;
  /** https://github.com/owner/name */
  url: string;
  /** Empty string when the repo has no description. */
  description: string;
  language: string | null;
  /** e.g. "#3178c6", taken from the trending page's inline style (decoration). */
  languageColor: string | null;
  /** Total star count. */
  stars: number;
  forks: number;
  /** Stars gained during the selected period (today, for now). */
  periodStars: number;
}
