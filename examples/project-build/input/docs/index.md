---
title: Example Documentation Home
---

# Example Documentation Home

This folder demonstrates the main build benefit: a tree of Markdown files becomes a matching tree
of PDFs with one command.

![Marky sample logo](./assets/logo.svg)

## What the build preserves

- Source files live under `docs/`.
- Generated PDFs land under `output/`.
- Nested paths stay nested, so links and review artifacts remain predictable.

## Build command

```bash
npm run dev -- build --config examples/project-build/input/marky.config.json
```

