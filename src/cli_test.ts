import { assertEquals, assertThrows } from "@std/assert";
import { parseArgs } from "./cli.ts";

Deno.test("parseArgs defaults to daily", () => {
  assertEquals(parseArgs([]), { help: false, since: "daily", json: false });
});

Deno.test("parseArgs --json", () => {
  assertEquals(parseArgs(["--json"]).json, true);
  assertEquals(parseArgs([]).json, false);
  assertEquals(parseArgs(["--json", "--weekly"]), {
    help: false,
    since: "weekly",
    json: true,
  });
});

Deno.test("parseArgs --weekly / --monthly shortcuts", () => {
  assertEquals(parseArgs(["--weekly"]).since, "weekly");
  assertEquals(parseArgs(["--monthly"]).since, "monthly");
});

Deno.test("parseArgs --since accepts both value and = forms", () => {
  assertEquals(parseArgs(["--since", "weekly"]).since, "weekly");
  assertEquals(parseArgs(["--since=monthly"]).since, "monthly");
});

Deno.test("parseArgs -h / --help wins", () => {
  assertEquals(parseArgs(["-h"]).help, true);
  assertEquals(parseArgs(["--help", "--bogus"]).help, true);
});

Deno.test("parseArgs rejects an invalid --since value", () => {
  assertThrows(() => parseArgs(["--since", "yearly"]));
  assertThrows(() => parseArgs(["--since"]));
});

Deno.test("parseArgs rejects unknown options", () => {
  assertThrows(() => parseArgs(["--bogus"]));
});
