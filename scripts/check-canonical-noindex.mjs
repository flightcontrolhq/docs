import {readdirSync, readFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsOrigin = "https://www.ravion.com/docs";
const skippedDirectories = new Set(["node_modules", "snippets", "drafts", ".git", ".github"]);

export function frontmatter(source) {
  const lines = source.split("\n");
  if (lines[0] !== "---") return null;
  const end = lines.indexOf("---", 1);
  if (end === -1) return null;

  const values = {};
  for (const line of lines.slice(1, end)) {
    const match = line.match(/^([^:#]+):\s*(.*)$/);
    if (!match) continue;

    const key = match[1].trim().replace(/^["']|["']$/g, "");
    const rawValue = match[2].trim();
    const value =
      rawValue === "true"
        ? true
        : rawValue === "false"
          ? false
          : rawValue.replace(/^["']|["']$/g, "");
    values[key] = value;
  }
  return values;
}

export function pageFiles(directory = root) {
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

export function navigationPagePaths(navigation) {
  const pages = new Set();

  function visit(value, insidePages = false) {
    if (typeof value === "string") {
      if (insidePages) pages.add(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item, insidePages);
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      visit(child, key === "pages");
    }
  }

  visit(navigation);
  return pages;
}

export function checkCanonicalNoindex(pages, navigationPages) {
  const pageByPath = new Map(pages.map((page) => [page.pagePath, page]));
  const violations = [];

  for (const page of pages) {
    const canonical = page.frontmatter.canonical;
    if (canonical === undefined) continue;
    if (typeof canonical !== "string") {
      violations.push(`${page.pagePath}: canonical must be an absolute https://www.ravion.com/docs/... URL`);
      continue;
    }

    let canonicalUrl;
    try {
      canonicalUrl = new URL(canonical);
    } catch {
      canonicalUrl = null;
    }
    if (
      !canonicalUrl ||
      canonicalUrl.protocol !== "https:" ||
      canonicalUrl.origin !== "https://www.ravion.com" ||
      !canonicalUrl.pathname.startsWith("/docs/") ||
      canonicalUrl.pathname === "/docs/"
    ) {
      violations.push(`${page.pagePath}: canonical must be an absolute https://www.ravion.com/docs/... URL`);
      continue;
    }

    const canonicalPath = canonicalUrl.pathname.slice("/docs/".length);
    if (canonicalPath === page.pagePath) continue;

    if (page.frontmatter.noindex !== true) {
      violations.push(`${page.pagePath}: canonical alias must set noindex: true`);
    }

    const target = pageByPath.get(canonicalPath);
    if (!target) {
      violations.push(`${page.pagePath}: canonical target ${canonicalPath} does not resolve to an MDX page`);
      continue;
    }
    if (!navigationPages.has(canonicalPath)) {
      violations.push(`${page.pagePath}: canonical target ${canonicalPath} is not in docs.json navigation`);
    }
    if (target.frontmatter.noindex === true || target.frontmatter.hidden === true) {
      violations.push(`${page.pagePath}: canonical target ${canonicalPath} must be indexable and visible`);
    }
  }

  return violations;
}

export function readRepositoryPages() {
  return pageFiles().map((file) => ({
    pagePath: pagePath(file),
    frontmatter: frontmatter(readFileSync(file, "utf8")) ?? {},
  }));
}

function main() {
  const pages = readRepositoryPages();
  const docsConfig = JSON.parse(readFileSync(path.join(root, "docs.json"), "utf8"));
  const violations = checkCanonicalNoindex(pages, navigationPagePaths(docsConfig.navigation));
  if (violations.length > 0) {
    console.error(`canonical/noindex check failed:\n${violations.map((violation) => `  ${violation}`).join("\n")}`);
    process.exit(1);
  }
  console.log("canonical/noindex: every canonical alias is valid, indexable, and navigated");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
