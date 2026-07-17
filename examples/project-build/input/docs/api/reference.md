---
title: API Reference Snapshot
---

# API Reference Snapshot

Developers can use the same renderer from code.

```ts
import { buildMarkdownPdfs, renderMarkdownToPdf } from "marky";

await renderMarkdownToPdf("docs/index.md");
await buildMarkdownPdfs({ config });
```

The CLI and library share the same option resolution model.

