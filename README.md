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

After publishing or linking the package:

```bash
marky render ./notes.md ./notes.pdf
```

## Library

```ts
import { renderMarkdownToPdf } from "marky";

const result = await renderMarkdownToPdf("./notes.md", {
  outputPath: "./notes.pdf",
  force: true,
});

console.log(result.outputPath);
```
