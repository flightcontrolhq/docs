import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {test} from "node:test";

import {
  checkCanonicalNoindex,
  navigationPagePaths,
  readRepositoryPages,
} from "./check-canonical-noindex.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const canonical = "https://www.ravion.com/docs/concepts/modules";
const alias = {pagePath: "modules/overview", frontmatter: {canonical, noindex: true}};
const target = {pagePath: "concepts/modules", frontmatter: {}};

test("canonical alias with noindex passes", () => {
  assert.deepEqual(checkCanonicalNoindex([alias, target], new Set(["concepts/modules"])), []);
});

test("canonical alias without noindex fails", () => {
  const violations = checkCanonicalNoindex(
    [{...alias, frontmatter: {canonical}}, target],
    new Set(["concepts/modules"]),
  );
  assert.ok(violations.some((violation) => violation.includes("noindex: true")));
});

test("canonical target missing from navigation fails", () => {
  const violations = checkCanonicalNoindex([alias, target], new Set());
  assert.ok(violations.some((violation) => violation.includes("not in docs.json navigation")));
});

test("canonical target with noindex fails", () => {
  const violations = checkCanonicalNoindex(
    [alias, {...target, frontmatter: {noindex: true}}],
    new Set(["concepts/modules"]),
  );
  assert.ok(violations.some((violation) => violation.includes("indexable and visible")));
});

test("real repository content passes", () => {
  const docsConfig = JSON.parse(readFileSync(path.join(root, "docs.json"), "utf8"));
  assert.deepEqual(
    checkCanonicalNoindex(readRepositoryPages(), navigationPagePaths(docsConfig.navigation)),
    [],
  );
});
