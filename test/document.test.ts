import { describe, expect, it } from "vitest";
import { renderHtmlShell, renderMarkdownDocument } from "../src/index.js";

describe("renderMarkdownDocument", () => {
  it("renders GitHub-flavored Markdown features", async () => {
    const document = await renderMarkdownDocument(`
# Project

| Task | Done |
| --- | --- |
| Ship renderer | yes |

- [x] write tests
- [ ] publish package

~~obsolete~~

Contact https://example.com/docs
`);

    expect(document.html).toContain("<table>");
    expect(document.html).toContain('type="checkbox" checked disabled');
    expect(document.html).toContain("<del>obsolete</del>");
    expect(document.html).toContain('<a href="https://example.com/docs">https://example.com/docs</a>');
  });

  it("extracts known frontmatter fields and preserves arbitrary metadata", async () => {
    const document = await renderMarkdownDocument(`---
title: Quarterly Notes
author: Ada Lovelace
theme: report
draft: true
---

# Body
`);

    expect(document.title).toBe("Quarterly Notes");
    expect(document.author).toBe("Ada Lovelace");
    expect(document.metadata).toEqual({
      theme: "report",
      draft: true,
    });
    expect(document.html).toContain('<h1 id="body">Body</h1>');
    expect(document.html).not.toContain("Quarterly Notes");
  });

  it("exposes authored Markdown heading metadata", async () => {
    const document = await renderMarkdownDocument(`
# Report

## Findings

### Next steps
`);

    expect(document.headings).toEqual([
      { text: "Report", depth: 1, id: "report" },
      { text: "Findings", depth: 2, id: "findings" },
      { text: "Next steps", depth: 3, id: "next-steps" },
    ]);
    expect(document.html).toContain('<h1 id="report">Report</h1>');
  });

  it("generates deterministic slugs for repeated headings", async () => {
    const document = await renderMarkdownDocument(`
## API
## API
## API!
`);

    expect(document.headings.map((heading) => heading.id)).toEqual(["api", "api-2", "api-3"]);
    expect(document.html).toContain('<h2 id="api-2">API</h2>');
  });

  it("sanitizes raw HTML by default", async () => {
    const document = await renderMarkdownDocument("<section><strong>Safe</strong><script>alert('x')</script></section>");

    expect(document.html).toContain("<section><strong>Safe</strong></section>");
    expect(document.html).not.toContain("<script>");
  });

  it("can escape or allow raw HTML", async () => {
    const markdown = "<div><em>Raw</em><script>alert('x')</script></div>";

    const escaped = await renderMarkdownDocument(markdown, { rawHtml: "escape" });
    const allowed = await renderMarkdownDocument(markdown, { rawHtml: "allow" });

    expect(escaped.html).toContain("&#x3C;div>");
    expect(escaped.html).toContain("&#x3C;script>");
    expect(escaped.html).not.toContain("<div>");
    expect(allowed.html).toContain("<script>alert('x')</script>");
  });

  it("wraps documents in the default printable HTML shell", async () => {
    const document = await renderMarkdownDocument(`---
title: Print Me
---

# Body
`);

    const html = renderHtmlShell(document, {
      css: ["/project/theme/print.css"],
      theme: "default",
    });

    expect(html).toContain("<title>Print Me</title>");
    expect(html).toContain('<link rel="stylesheet" href="file:///project/theme/print.css">');
    expect(html).toContain("@page");
    expect(html).toContain("@media print");
    expect(html).toContain('<main><h1 id="body">Body</h1></main>');
  });

  it("keeps unknown themes on the default shell", async () => {
    const document = await renderMarkdownDocument("# Body\n");
    const html = renderHtmlShell(document, {
      css: [],
      theme: "custom-theme",
    });

    expect(html).toContain('<main><h1 id="body">Body</h1></main>');
    expect(html).not.toContain("marky-professional-document");
  });

  it("routes professional theme through the professional shell", async () => {
    const document = await renderMarkdownDocument(`---
title: Professional
---

# Body
`);
    const html = renderHtmlShell(document, {
      css: [],
      theme: "professional",
      cover: {},
      toc: false,
      pagination: {},
      backPage: false,
    });

    expect(html).toContain("<title>Professional</title>");
    expect(html).toContain('class="marky-professional-document"');
    expect(html).toContain("&quot;cover&quot;:true");
    expect(html).toContain("&quot;toc&quot;:false");
    expect(html).toContain('<h1 id="body">Body</h1>');
    expect(document.headings).toEqual([{ text: "Body", depth: 1, id: "body" }]);
  });

  it("renders a professional cover before the body when enabled", async () => {
    const document = await renderMarkdownDocument(`# Body Title

Content
`);
    const html = renderHtmlShell(document, {
      css: [],
      theme: "professional",
      cover: {
        title: "Cover Title",
        subtitle: "Executive report",
        author: "Ada",
        date: "2026-07-17",
        logo: "file:///project/logo.svg",
      },
      toc: false,
      pagination: false,
      backPage: false,
    });

    expect(html.indexOf('<section class="marky-professional-cover"')).toBeLessThan(
      html.indexOf('<main class="marky-professional-document"'),
    );
    expect(html).toContain("Cover Title");
    expect(html).toContain("Executive report");
    expect(html).toContain("Ada · 2026-07-17");
    expect(html).toContain('src="file:///project/logo.svg"');
    expect(html).toContain('<h1 id="body-title">Body Title</h1>');
  });

  it("uses document title then first H1 as professional cover fallbacks", async () => {
    const titledDocument = await renderMarkdownDocument(`---
title: Metadata Title
---

# Body Title
`);
    const headingDocument = await renderMarkdownDocument("# Heading Title\n");

    expect(renderHtmlShell(titledDocument, { css: [], theme: "professional", cover: {}, toc: false, pagination: false, backPage: false })).toContain(
      "Metadata Title",
    );
    expect(renderHtmlShell(headingDocument, { css: [], theme: "professional", cover: {}, toc: false, pagination: false, backPage: false })).toContain(
      "Heading Title",
    );
  });

  it("omits the professional cover when disabled", async () => {
    const document = await renderMarkdownDocument("# Body\n");
    const html = renderHtmlShell(document, {
      css: [],
      theme: "professional",
      cover: false,
      toc: false,
      pagination: false,
      backPage: false,
    });

    expect(html).not.toContain('<section class="marky-professional-cover"');
    expect(html).toContain('<h1 id="body">Body</h1>');
  });

  it("renders a linked professional table of contents after the cover", async () => {
    const document = await renderMarkdownDocument(`
# Report
## Findings
### Detail
#### Too deep
`);
    const html = renderHtmlShell(document, {
      css: [],
      theme: "professional",
      cover: {},
      toc: { title: "Contents", depth: 4 },
      pagination: false,
      backPage: false,
    });

    expect(html.indexOf('<section class="marky-professional-cover"')).toBeLessThan(
      html.indexOf('<nav class="marky-professional-toc"'),
    );
    expect(html.indexOf('<nav class="marky-professional-toc"')).toBeLessThan(
      html.indexOf('<main class="marky-professional-document"'),
    );
    expect(html).toContain('<a href="#report">Report</a>');
    expect(html).toContain('<a href="#findings">Findings</a>');
    expect(html).toContain('<a href="#detail">Detail</a>');
    expect(html).not.toContain('<a href="#too-deep">Too deep</a>');
  });

  it("uses depth 2 by default and omits disabled professional TOC", async () => {
    const document = await renderMarkdownDocument(`
# Report
## Findings
### Detail
`);
    const defaultHtml = renderHtmlShell(document, {
      css: [],
      theme: "professional",
      cover: false,
      toc: {},
      pagination: false,
      backPage: false,
    });
    const disabledHtml = renderHtmlShell(document, {
      css: [],
      theme: "professional",
      cover: false,
      toc: false,
      pagination: false,
      backPage: false,
    });

    expect(defaultHtml).toContain('<a href="#report">Report</a>');
    expect(defaultHtml).toContain('<a href="#findings">Findings</a>');
    expect(defaultHtml).not.toContain('<a href="#detail">Detail</a>');
    expect(disabledHtml).not.toContain('<nav class="marky-professional-toc"');
  });

  it("resolves relative assets from an explicit base URL", async () => {
    const document = await renderMarkdownDocument("[Guide](./guide/index.html)\n\n![Logo](./assets/logo.svg)", {
      baseUrl: "examples/project-build/input/docs",
    });

    expect(document.html).toContain(`href="file://${process.cwd()}/examples/project-build/input/docs/guide/index.html"`);
    expect(document.html).toContain('src="data:image/svg+xml;base64,');
  });

  it("rejects relative assets without a base URL or outside the base", async () => {
    await expect(renderMarkdownDocument("![Logo](./assets/logo.png)")).rejects.toMatchObject({
      code: "MARKY_ASSET_BASE_REQUIRED",
    });
    await expect(renderMarkdownDocument("![Secret](../secret.png)", { baseUrl: "/project/docs" })).rejects.toMatchObject({
      code: "MARKY_ASSET_OUTSIDE_BASE",
    });
  });
});
