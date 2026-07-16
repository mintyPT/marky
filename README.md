# marky

Render Markdown documents to PDF from TypeScript or the command line.

## Setup

Use Node 20 or newer.

```bash
npm install
npm test
npm run build
```

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

## Library

```ts
import { renderMarkdownDocument, renderMarkdownToPdf } from "marky";

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
```

Markdown rendering supports GitHub-flavored Markdown. Frontmatter `title` and `author` are exposed
as document fields, and other frontmatter keys are preserved on `metadata`.

Raw HTML is sanitized by default. Use `rawHtml: "escape"` to render raw tags as text, or
`rawHtml: "allow"` when the input is trusted.

Supported v1 render options:

- `outputPath`: PDF path to write.
- `force`: overwrite an existing output file.
- `rawHtml`: `sanitize`, `escape`, or `allow`.
- `theme`: built-in theme name.
- `css`: additional CSS file paths.
- `pdf`: PDF options, including `format`, `margin`, `landscape`, `scale`, and `printBackground`.
- `network`: `allow` or `block`.
- `waitUntil`: page readiness state for PDF capture.
- `waitForFonts`: wait for document fonts before PDF capture.
- `timeoutMs`: page readiness timeout in milliseconds.

When config, frontmatter, and explicit options overlap, Marky resolves them as
explicit options over frontmatter, frontmatter over config, and config over defaults.
