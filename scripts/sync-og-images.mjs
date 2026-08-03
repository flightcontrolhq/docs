// Points every docs page's social-share image at the Ravion OG renderer, so docs
// links unfurl with the same banner style as the marketing site and the blog.
//
// The renderer (`packages/web/server/routes/og/[...path].png.ts` in the
// flightcontrol repo) reads the page's title from its Mintlify Markdown export,
// so only the page path has to be written into the frontmatter here.
//
// Usage:
//   node scripts/sync-og-images.mjs           # write missing/stale tags
//   node scripts/sync-og-images.mjs --check   # fail if any page is out of date
//
// Run it after any script that generates pages (CLI reference, module catalog,
// schema reference), because generated frontmatter does not include these tags.
import {readdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";

const root = process.cwd();
const ogOrigin = "https://www.ravion.com/og/docs";
// Directories that hold reusable MDX includes or drafts rather than pages.
const skippedDirectories = new Set(["node_modules", "snippets", "drafts", ".git", ".github"]);
const tags = ["og:image", "twitter:image"];
const checkOnly = process.argv.includes("--check");

function pageFiles(directory = root) {
  const entries = readdirSync(directory, {withFileTypes: true});
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".") || skippedDirectories.has(entry.name)) continue;
      files.push(...pageFiles(entryPath));
      continue;
    }
    if (!entry.name.endsWith(".mdx") || entry.name.endsWith(".draft.mdx")) continue;
    files.push(entryPath);
  }
  return files;
}

function pagePath(file) {
  return path.relative(root, file).replace(/\.mdx$/, "");
}

/** The frontmatter block's inner lines, or null when a page has no frontmatter. */
function frontmatterLines(source) {
  const lines = source.split("\n");
  if (lines[0] !== "---") return null;
  const end = lines.indexOf("---", 1);
  if (end === -1) return null;
  return {lines, end};
}

function syncedSource(source, file) {
  const block = frontmatterLines(source);
  if (!block) return null;
  const {lines, end} = block;

  const body = lines.slice(1, end).filter((line) => !tags.some((tag) => line.startsWith(`"${tag}"`)));
  for (const tag of tags) {
    body.push(`"${tag}": "${ogOrigin}/${pagePath(file)}.png"`);
  }
  return [lines[0], ...body, ...lines.slice(end)].join("\n");
}

const stale = [];
for (const file of pageFiles()) {
  const source = readFileSync(file, "utf8");
  const synced = syncedSource(source, file);
  if (synced === null) {
    throw new Error(`${path.relative(root, file)} has no frontmatter block to update.`);
  }
  if (synced === source) continue;
  stale.push(path.relative(root, file));
  if (!checkOnly) writeFileSync(file, synced);
}

if (stale.length === 0) {
  console.log("og images: every page is up to date");
} else if (checkOnly) {
  console.error(
    `og images: ${stale.length} page(s) are missing social-share tags. Run \`pnpm sync:og-images\`:\n${stale
      .map((file) => `  ${file}`)
      .join("\n")}`,
  );
  process.exit(1);
} else {
  console.log(`og images: updated ${stale.length} page(s)`);
}
