import {readdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";

const root = process.cwd();
const referenceDir = path.join(root, "cli/reference");
const docsJsonPath = path.join(root, "docs.json");

const pages = readdirSync(referenceDir, {withFileTypes: true})
  .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
  .map((entry) => `cli/reference/${path.basename(entry.name, ".mdx")}`)
  .sort((left, right) => left.localeCompare(right));

if (pages.length === 0) {
  throw new Error("No CLI reference pages found; refusing to clear the docs navigation.");
}

const docsJson = JSON.parse(readFileSync(docsJsonPath, "utf8"));
const tabs = docsJson.navigation?.tabs ?? [];
const cliTab = tabs.find((tab) => tab.tab === "CLI");
const commandReference = cliTab?.groups?.find((group) => group.group === "Command reference");

if (!commandReference) {
  throw new Error('Could not find the CLI "Command reference" group in docs.json.');
}

commandReference.pages = pages;
writeFileSync(docsJsonPath, `${JSON.stringify(docsJson, null, 2)}\n`);
console.log(`updated docs.json with ${pages.length} CLI reference pages`);
