---
title: Market Readiness Report
author: Marky Consulting
theme: professional
cover:
  subtitle: Launch assessment for a new documentation product
  date: July 2026
  logo: ./assets/marky-consulting.svg
toc:
  title: Contents
  depth: 3
pagination: true
backPage:
  title: Ready for review
  text: This report was generated from Markdown with Marky's professional PDF theme.
  website: https://example.com
  email: reports@example.com
  logo: ./assets/marky-consulting.svg
---

# Market Readiness Report

Marky turns Markdown source material into reviewable PDF reports with a reproducible command-line workflow.

## Executive Summary

The professional theme adds structured report sections around normal Markdown content while keeping the source file readable in code review.

| Capability | Result |
| --- | --- |
| Cover page | Generated from document metadata |
| Contents | Built from authored headings |
| Pagination | Added through Chromium PDF footers |
| Back page | Uses plain-text contact details |

## Launch Notes

- Keep source documents in the repository.
- Configure defaults in frontmatter or `marky.config.json`.
- Disable individual generated sections with `false`.

### Risk Register

> The v1 table of contents intentionally omits page numbers because stable page-number extraction is deferred.

```ts
await renderMarkdownToPdf("report.md", {
  theme: "professional",
  force: true,
});
```

## Recommendation

Use the professional theme for polished reports that still need a small, auditable Markdown source.
