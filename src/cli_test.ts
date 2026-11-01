import { expect, test } from "bun:test";
import { parseArgs } from "./cli.ts";

test("parseArgs defaults to daily", () => {
  expect(parseArgs([])).toEqual({ help: false, since: "daily", json: false });
});

test("parseArgs --json", () => {
  expect(parseArgs(["--json"]).json).toEqual(true);
  expect(parseArgs([]).json).toEqual(false);
  expect(parseArgs(["--json", "--weekly"])).toEqual({
    help: false,
    since: "weekly",
    json: true,
  });
});

test("parseArgs --weekly / --monthly shortcuts", () => {
  expect(parseArgs(["--weekly"]).since).toEqual("weekly");
  expect(parseArgs(["--monthly"]).since).toEqual("monthly");
});

test("parseArgs --since accepts both value and = forms", () => {
  expect(parseArgs(["--since", "weekly"]).since).toEqual("weekly");
  expect(parseArgs(["--since=monthly"]).since).toEqual("monthly");
});

test("parseArgs -h / --help wins", () => {
  expect(parseArgs(["-h"]).help).toEqual(true);
  expect(parseArgs(["--help", "--bogus"]).help).toEqual(true);
});

test("parseArgs rejects an invalid --since value", () => {
  expect(() => parseArgs(["--since", "yearly"])).toThrow();
  expect(() => parseArgs(["--since"])).toThrow();
});

test("parseArgs rejects unknown options", () => {
  expect(() => parseArgs(["--bogus"])).toThrow();
});
