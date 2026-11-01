import * as cheerio from "cheerio";
import type { Repo, Since } from "./types.ts";

const BASE = "https://github.com";

export function trendingUrl(since: Since = "daily"): string {
  return `${BASE}/trending?since=${since}`;
}

/** Fetches the raw trending HTML. A User-Agent header is required or GitHub blocks the request. */
export async function fetchTrendingHtml(
  since: Since = "daily",
): Promise<string> {
  const res = await fetch(trendingUrl(since), {
    headers: {
      "User-Agent": "gh-trend",
      Accept: "text/html",
    },
  });
  if (!res.ok) {
    throw new Error(
      `GitHub trending request failed: ${res.status} ${res.statusText}`,
    );
  }
  return await res.text();
}

const toInt = (s: string): number =>
  parseInt(s.replace(/[^0-9]/g, ""), 10) || 0;

/** Pure parser: trending HTML -> Repo[]. Side-effect free so it can be unit tested. */
export function parseTrending(html: string): Repo[] {
  const $ = cheerio.load(html);
  const repos: Repo[] = [];

  $("article.Box-row").each((i, el) => {
    const $el = $(el);

    const href = $el.find("h2 a").attr("href")?.trim() ?? "";
    const fullName = href.replace(/^\//, "");
    if (!fullName.includes("/")) return;
    const [owner, name] = fullName.split("/");

    const description = $el.find("p").first().text().trim();

    const language =
      $el.find('[itemprop="programmingLanguage"]').first().text().trim() ||
      null;

    const colorStyle =
      $el.find("span.repo-language-color").first().attr("style") ?? "";
    const colorMatch = colorStyle.match(
      /background-color:\s*(#[0-9a-fA-F]{3,8})/,
    );
    const languageColor = colorMatch ? colorMatch[1] : null;

    const stars = toInt($el.find('a[href$="/stargazers"]').first().text());
    const forks = toInt($el.find('a[href$="/forks"]').first().text());
    const periodStars = toInt($el.find(".float-sm-right").first().text());

    repos.push({
      rank: i + 1,
      owner,
      name,
      fullName,
      url: `${BASE}/${fullName}`,
      description,
      language,
      languageColor,
      stars,
      forks,
      periodStars,
    });
  });

  return repos;
}
