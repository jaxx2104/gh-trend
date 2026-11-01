import { expect, test } from "bun:test";
import { unicodeWidth } from "@std/cli/unicode-width";
import { parseTrending, trendingUrl } from "./scrape.ts";
import { formatRepoLine } from "./ui.ts";

const FIXTURE = `
<div data-hpc>
  <article class="Box-row">
    <h2 class="h3 lh-condensed"><a href="/octocat/Hello-World">octocat / Hello-World</a></h2>
    <p class="col-9 color-fg-muted my-1 pr-4">My first repository on GitHub!</p>
    <div class="f6 color-fg-muted mt-2">
      <span class="d-inline-block ml-0 mr-3">
        <span class="repo-language-color" style="background-color: #3178c6;"></span>
        <span itemprop="programmingLanguage">TypeScript</span>
      </span>
      <a href="/octocat/Hello-World/stargazers" class="Link Link--muted">1,234</a>
      <a href="/octocat/Hello-World/forks" class="Link Link--muted">567</a>
      <span class="d-inline-block float-sm-right">89 stars today</span>
    </div>
  </article>
  <article class="Box-row">
    <h2 class="h3 lh-condensed"><a href="/torvalds/linux">torvalds / linux</a></h2>
    <div class="f6 color-fg-muted mt-2">
      <a href="/torvalds/linux/stargazers" class="Link Link--muted">190,000</a>
      <a href="/torvalds/linux/forks" class="Link Link--muted">55,000</a>
      <span class="d-inline-block float-sm-right">12 stars today</span>
    </div>
  </article>
</div>
`;

test("trendingUrl builds the daily URL by default", () => {
  expect(trendingUrl()).toEqual("https://github.com/trending?since=daily");
  expect(trendingUrl("weekly")).toEqual(
    "https://github.com/trending?since=weekly",
  );
});

test("parseTrending extracts repo fields", () => {
  const repos = parseTrending(FIXTURE);
  expect(repos.length).toEqual(2);

  const first = repos[0];
  expect(first.rank).toEqual(1);
  expect(first.owner).toEqual("octocat");
  expect(first.name).toEqual("Hello-World");
  expect(first.fullName).toEqual("octocat/Hello-World");
  expect(first.url).toEqual("https://github.com/octocat/Hello-World");
  expect(first.description).toEqual("My first repository on GitHub!");
  expect(first.language).toEqual("TypeScript");
  expect(first.languageColor).toEqual("#3178c6");
  expect(first.stars).toEqual(1234);
  expect(first.forks).toEqual(567);
  expect(first.periodStars).toEqual(89);
});

test("parseTrending tolerates missing language/description", () => {
  const second = parseTrending(FIXTURE)[1];
  expect(second.fullName).toEqual("torvalds/linux");
  expect(second.language).toEqual(null);
  expect(second.languageColor).toEqual(null);
  expect(second.description).toEqual("");
  expect(second.stars).toEqual(190000);
  expect(second.rank).toEqual(2);
});

// Strip ANSI so assertions run against the visible text.
function stripAnsi(s: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: matching ANSI escapes is the point
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

test("formatRepoLine includes the repo name", () => {
  const plain = stripAnsi(
    formatRepoLine(parseTrending(FIXTURE)[0], { maxWidth: 120 }),
  );
  expect(plain.includes("octocat/Hello-World")).toEqual(true);
  expect(plain.includes("★ 1,234")).toEqual(true);
  expect(plain.includes("▲ 89 today")).toEqual(true);
});

// A wide (CJK + emoji) description must be truncated by display width, not by
// character count, so the rendered line never exceeds maxWidth and wraps.
const WIDE_FIXTURE = `
<div data-hpc>
  <article class="Box-row">
    <h2 class="h3 lh-condensed"><a href="/acme/widget">acme / widget</a></h2>
    <p class="col-9 color-fg-muted my-1 pr-4">日本語の説明と絵文字🚀がいっぱい詰まった長い説明文です日本語の説明と絵文字</p>
    <div class="f6 color-fg-muted mt-2">
      <a href="/acme/widget/stargazers" class="Link Link--muted">1,234</a>
      <a href="/acme/widget/forks" class="Link Link--muted">5</a>
      <span class="d-inline-block float-sm-right">56 stars today</span>
    </div>
  </article>
</div>
`;

test("formatRepoLine keeps wide-character lines within maxWidth", () => {
  const repo = parseTrending(WIDE_FIXTURE)[0];
  for (const maxWidth of [80, 60]) {
    const width = unicodeWidth(stripAnsi(formatRepoLine(repo, { maxWidth })));
    expect(width).toBeLessThanOrEqual(maxWidth);
  }
});

test("formatRepoLine labels the trending window", () => {
  const repo = parseTrending(FIXTURE)[0];
  expect(
    stripAnsi(
      formatRepoLine(repo, { since: "weekly", maxWidth: 120 }),
    ).includes("▲ 89 this week"),
  ).toEqual(true);
  expect(
    stripAnsi(
      formatRepoLine(repo, { since: "monthly", maxWidth: 120 }),
    ).includes("▲ 89 this month"),
  ).toEqual(true);
});
