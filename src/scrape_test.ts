import { assertEquals } from "@std/assert";
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

Deno.test("trendingUrl builds the daily URL by default", () => {
  assertEquals(trendingUrl(), "https://github.com/trending?since=daily");
  assertEquals(
    trendingUrl("weekly"),
    "https://github.com/trending?since=weekly",
  );
});

Deno.test("parseTrending extracts repo fields", () => {
  const repos = parseTrending(FIXTURE);
  assertEquals(repos.length, 2);

  const first = repos[0];
  assertEquals(first.rank, 1);
  assertEquals(first.owner, "octocat");
  assertEquals(first.name, "Hello-World");
  assertEquals(first.fullName, "octocat/Hello-World");
  assertEquals(first.url, "https://github.com/octocat/Hello-World");
  assertEquals(first.description, "My first repository on GitHub!");
  assertEquals(first.language, "TypeScript");
  assertEquals(first.languageColor, "#3178c6");
  assertEquals(first.stars, 1234);
  assertEquals(first.forks, 567);
  assertEquals(first.periodStars, 89);
});

Deno.test("parseTrending tolerates missing language/description", () => {
  const second = parseTrending(FIXTURE)[1];
  assertEquals(second.fullName, "torvalds/linux");
  assertEquals(second.language, null);
  assertEquals(second.languageColor, null);
  assertEquals(second.description, "");
  assertEquals(second.stars, 190000);
  assertEquals(second.rank, 2);
});

// Strip ANSI so assertions run against the visible text.
function stripAnsi(s: string): string {
  // deno-lint-ignore no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

Deno.test("formatRepoLine includes the repo name", () => {
  const plain = stripAnsi(
    formatRepoLine(parseTrending(FIXTURE)[0], { maxWidth: 120 }),
  );
  assertEquals(plain.includes("octocat/Hello-World"), true);
  assertEquals(plain.includes("★ 1,234"), true);
  assertEquals(plain.includes("▲ 89 today"), true);
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

Deno.test("formatRepoLine keeps wide-character lines within maxWidth", () => {
  const repo = parseTrending(WIDE_FIXTURE)[0];
  for (const maxWidth of [80, 60]) {
    const width = unicodeWidth(stripAnsi(formatRepoLine(repo, { maxWidth })));
    assertEquals(
      width <= maxWidth,
      true,
      `width ${width} > maxWidth ${maxWidth}`,
    );
  }
});

Deno.test("formatRepoLine labels the trending window", () => {
  const repo = parseTrending(FIXTURE)[0];
  assertEquals(
    stripAnsi(formatRepoLine(repo, { since: "weekly", maxWidth: 120 }))
      .includes("▲ 89 this week"),
    true,
  );
  assertEquals(
    stripAnsi(formatRepoLine(repo, { since: "monthly", maxWidth: 120 }))
      .includes("▲ 89 this month"),
    true,
  );
});
