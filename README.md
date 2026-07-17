# marky

Render Markdown documents to PDF from TypeScript or the command line.

## What Marky Shows

The checked-in examples under [`examples/`](examples/) show the practical results of using the CLI:

- [`examples/single-file/input/meeting-notes.md`](examples/single-file/input/meeting-notes.md)
  becomes [`examples/single-file/output/meeting-notes.pdf`](examples/single-file/output/meeting-notes.pdf)
  with one `render` command.
- [`examples/project-build/input/docs/`](examples/project-build/input/docs/) becomes a matching PDF
  tree under [`examples/project-build/output/`](examples/project-build/output/) with one `build`
  command.
- [`examples/safety/input/safety-demo.md`](examples/safety/input/safety-demo.md) becomes
  [`examples/safety/output/safety-demo.pdf`](examples/safety/output/safety-demo.pdf), demonstrating
  sanitized raw HTML and blocked network rendering.
- [`examples/professional/input/professional-report.md`](examples/professional/input/professional-report.md)
  becomes [`examples/professional/output/professional-report.pdf`](examples/professional/output/professional-report.pdf),
  demonstrating the professional theme with a cover, contents, pagination, and back page.

Regenerate those outputs with:

```bash
npm run dev -- render examples/single-file/input/meeting-notes.md examples/single-file/output/meeting-notes.pdf --force
npm run dev -- build --config examples/project-build/input/marky.config.json
npm run dev -- render examples/safety/input/safety-demo.md examples/safety/output/safety-demo.pdf --force --network block
npm run dev -- render examples/professional/input/professional-report.md examples/professional/output/professional-report.pdf --force
```

The useful before/after is visible in the folders: Markdown inputs stay easy to review, while the
outputs are shareable PDFs with preserved project structure, GFM tables/task lists, frontmatter
metadata, local assets, and reproducible rendering controls.

## Setup

Use Node 20 or newer.

```bash
npm install
npm test
npx playwright install chromium
npm run test:integration
npm run build
```

`npm test` runs the fast unit suite. `npm run test:integration` launches Chromium and writes real
PDFs through the library and CLI. If Chromium is missing, Marky reports `MARKY_BROWSER_MISSING`; run
`npx playwright install chromium` and retry.

## CLI

Render to an input-adjacent PDF:

```bash
npm run dev -- render ./notes.md
```

Render to a specific path:

```bash
npm run dev -- render ./notes.md ./dist/notes.pdf
```

Existing output files are protected by default. Pass `--force` to overwrite one:

```bash
npm run dev -- render ./notes.md ./dist/notes.pdf --force
```

Marky discovers `marky.config.mjs`, `marky.config.js`, `marky.config.cjs`, or
`marky.config.json` from the current directory upward. Pass `--config` to use an explicit file:

```bash
npm run dev -- render ./notes.md --config ./marky.config.json
```

Core PDF controls are exposed as stable flags:

```bash
npm run dev -- render ./notes.md ./dist/notes.pdf \
  --pdf-format Letter \
  --pdf-margin 8mm \
  --landscape \
  --scale 0.9 \
  --network block \
  --wait-until load \
  --timeout-ms 30000
```

After publishing or linking the package:

```bash
marky render ./notes.md ./notes.pdf
```

Build every configured Markdown input:

```bash
npm run dev -- build --config ./marky.config.json
```

`build` discovers configured `inputs`, writes PDFs under `outDir`, preserves paths relative to
`rootDir`, and exits non-zero if any file fails.

Use `npm run pack:verify` before publishing to confirm the package contains the CLI, library build,
type declarations, README, and license.

## Library

```ts
import { buildMarkdownPdfs, renderMarkdownDocument, renderMarkdownToPdf } from "marky";

const result = await renderMarkdownToPdf("./notes.md", {
  outputPath: "./notes.pdf",
  force: true,
  rawHtml: "sanitize",
});

console.log(result.outputPath);

const document = await renderMarkdownDocument(`---
title: Notes
---

# Hello
`);

console.log(document.title);
console.log(document.html);

const build = await buildMarkdownPdfs({
  config: {
    build: {
      inputs: ["docs/**/*.md"],
      rootDir: "docs",
      outDir: "pdf",
    },
  },
});

console.log(build.successes.length, build.failures.length);
```

Config files can be JSON or JavaScript/ESM:

```js
import { defineConfig } from "marky";

export default defineConfig({
  render: {
    theme: "docs",
    css: ["./theme/print.css"],
    rawHtml: "sanitize",
  },
  build: {
    inputs: ["docs/**/*.md"],
    rootDir: "docs",
    outDir: "pdf",
    concurrency: 1,
  },
});
```

Markdown rendering supports GitHub-flavored Markdown. Frontmatter `title` and `author` are exposed
as document fields, and other frontmatter keys are preserved on `metadata`.

Raw HTML is sanitized by default. Use `rawHtml: "escape"` to render raw tags as text, or
`rawHtml: "allow"` when the input is trusted.

For file renders, relative Markdown assets such as images, links, and CSS resolve from the Markdown
file directory. For raw Markdown strings, pass a document `baseUrl` when relative assets are used.
Local relative assets are constrained to that base. Remote assets load when `network` is `allow` and
are blocked when `network` is `block`.

The default render policy allows network access because many documents reference remote images,
fonts, or styles. Use `network: "block"` for deterministic local builds.

## Professional Theme

Set `theme: "professional"` to render a report-style PDF shell. It enables a generated cover page,
table of contents, pagination footer, and back page by default. Set any generated feature to `false`
to disable it.

Frontmatter example:

```md
---
title: Market Readiness Report
author: Marky Consulting
theme: professional
cover:
  subtitle: Launch assessment
  date: July 2026
  logo: ./assets/logo.svg
toc:
  title: Contents
  depth: 3
pagination: true
backPage:
  title: Ready for review
  text: Generated from Markdown with Marky.
  website: https://example.com
  email: reports@example.com
  logo: ./assets/logo.svg
---
```

Config example:

```json
{
  "render": {
    "theme": "professional",
    "cover": { "subtitle": "Quarterly report", "logo": "./assets/logo.svg" },
    "toc": { "depth": 3 },
    "pagination": true,
    "backPage": { "title": "Contact", "email": "reports@example.com" }
  }
}
```

API example:

```ts
await renderMarkdownToPdf("./report.md", {
  theme: "professional",
  cover: { title: "Board Report" },
  toc: { depth: 2 },
  pagination: true,
  backPage: false,
  force: true,
});
```

Professional feature paths follow the same source rule as other Marky inputs: frontmatter logo paths
resolve from the Markdown file, config logo paths resolve from the config file, and explicit API logo
paths resolve from the current working directory.

Professional v1 does not include a glossary, raw HTML templates for generated pages, or TOC page
numbers. The table of contents links to headings but deliberately does not promise page numbers.

Supported v1 render options:

- `outputPath`: PDF path to write.
- `force`: overwrite an existing output file.
- `rawHtml`: `sanitize`, `escape`, or `allow`.
- `theme`: built-in theme name.
- `css`: additional CSS file paths.
- `pdf`: PDF options, including `format`, `margin`, `landscape`, `scale`, and `printBackground`.
- `cover`: professional cover page options, `true`, or `false`.
- `toc`: professional table of contents options, `true`, or `false`.
- `pagination`: professional pagination footer options, `true`, or `false`.
- `backPage`: professional back-page options, `true`, or `false`.
- `network`: `allow` or `block`.
- `waitUntil`: page readiness state for PDF capture.
- `waitForFonts`: wait for document fonts before PDF capture.
- `timeoutMs`: page readiness timeout in milliseconds.

When config, frontmatter, and explicit options overlap, Marky resolves them as
explicit options over frontmatter, frontmatter over config, and config over defaults.
