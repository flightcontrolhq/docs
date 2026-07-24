# Ravion Docs

This is the Mintlify documentation site for Ravion.

## AI-assisted writing

Set up your AI coding tool to work with Mintlify:

```bash
npx skills add https://mintlify.com/docs
```

This command installs Mintlify's documentation skill for your configured AI tools like Claude Code, Cursor, Windsurf, and others. The skill includes component reference, writing standards, and workflow guidance.

See the [AI tools guides](/ai-tools) for tool-specific setup.

## Development

Install dependencies:

```bash
npm install
```

Run the local preview:

```bash
npm run dev
```

View your local preview at `http://localhost:3000`.

## Regenerating reference docs

The schema and CLI reference pages are generated from the `flightcontrol` repo and committed into this repo. The commands below assume `ravion-docs` and `flightcontrol` are sibling directories.

### Schema docs (pipeline, module, project config)

```bash
# 1. Generate human-friendly Markdown from the OpenAPI specs
cd ../flightcontrol/packages/schemas
make generate-schema-ref-docs

# 2. Copy the generated files into this repo as snippets
cd -
pnpm sync:schema-reference
```

`make generate-schema-ref-docs` regenerates the OpenAPI specs first and writes `schema_reference/docs/{pipeline,module,project-config}.md`. `pnpm sync:schema-reference` copies them into `snippets/schema-reference/` (consumed by the config file pages).

### CLI docs

```bash
cd ../flightcontrol/packages/cli
make docs
```

This builds the live CLI command tree and writes the pages directly into `cli/reference/` plus `cli/overview.mdx` in this repo. If the repos are not siblings, pass the path explicitly: `make docs DOCS_CLI_OUT=/abs/path/to/ravion-docs/cli/reference`.

Update the generated CLI page list in `docs.json` so added or removed commands appear correctly in the sidebar:

```bash
pnpm sync:cli-reference
```

### Validate and publish

```bash
pnpm validate
pnpm exec mint broken-links
git add -A && git commit -m "Regenerate reference docs" && git push
```

## Publishing changes

Install our GitHub app from your [dashboard](https://dashboard.mintlify.com/settings/organization/github-app) to propagate changes from your repo to your deployment. Changes are deployed to production automatically after pushing to the default branch.

## Need help?

### Troubleshooting

- If your dev environment isn't running: Run `mint update` to ensure you have the most recent version of the CLI.
- If a page loads as a 404: Make sure you are running in a folder with a valid `docs.json`.

### Resources
- [Mintlify documentation](https://mintlify.com/docs)
