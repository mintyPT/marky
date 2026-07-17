---
prefix: MARKY
format_version: 2
groups: [marky-render-slice, marky-document-pipeline, marky-project-build, marky-docs-contract, professional-pdf-theme]
---

## MARKY-001 · Render one Markdown file to PDF end-to-end
type: Task | status: Done | priority: High
blocks: [MARKY-002] | blocked_by: []
tags: [marky-render-slice]

## What & why

Build the first usable vertical slice of Marky: a user can convert one local Markdown document into a PDF from both the library and CLI. This proves the Playwright rendering path, output path handling, default theme shell, and test strategy before adding broader project features.

## Where

Public library entry point, CLI command entry point, Markdown-to-HTML rendering area, Playwright PDF rendering area, package scripts, README usage notes, and tests.

## How

Replace the scaffold greeting behavior with a `renderMarkdownToPdf` workflow and a `marky render <input> [output]` command. Use a simple unified-based Markdown render initially, wrap the content in a default printable HTML shell, launch Chromium through Playwright, and write the PDF to either the explicit output path or the input-adjacent default. `render` should refuse to overwrite existing output unless force is enabled and should create parent directories automatically. Add a real integration test that renders a fixture and verifies the output is a non-empty PDF.

## Acceptance criteria

- [ ] The library exports a documented `renderMarkdownToPdf` function for one Markdown document.
- [ ] The CLI supports `marky render <input> [output]` with input-adjacent PDF output when no output is provided.
- [ ] Single-file render refuses to overwrite existing output by default and supports a force option/flag.
- [ ] Rendering creates parent directories automatically.
- [ ] A Playwright-backed integration test writes a PDF and verifies the file starts with `%PDF` and has non-trivial size.
- [ ] The old greeting demo API/CLI/tests are removed or replaced by the Marky behavior.

### History
- created · 2026-07-16T21:25:56Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T21:41:05Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T21:52:04Z · mauro.goncalo@gmail.com

---

## MARKY-002 · Build the unified Markdown document pipeline
type: Task | status: Done | priority: High
blocks: [MARKY-003] | blocked_by: [MARKY-001]
tags: [marky-document-pipeline]

## What & why

Turn the initial renderer into a real document pipeline based on unified, remark, and rehype. This gives Marky a durable foundation for GitHub-flavored Markdown, frontmatter metadata, raw HTML policy, sanitized output, and future document transforms without exposing plugin internals too early.

## Where

Markdown processing area, normalized document model, HTML shell/theme rendering area, option resolution inputs, and unit tests for rendering behavior.

## How

Introduce a unified processor that parses Markdown, supports GitHub-flavored Markdown, extracts frontmatter, converts to HTML, and handles raw HTML through a configurable policy. The default raw HTML behavior should sanitize rather than blindly allow scripts or unsafe markup. Preserve unknown frontmatter as document metadata for themes or future APIs, while known fields are made available to option resolution. Keep unified plugin hooks internal for v1.

## Acceptance criteria

- [ ] Markdown is rendered through a unified/remark/rehype pipeline rather than ad hoc conversion.
- [ ] GitHub-flavored Markdown features such as tables, task lists, strikethrough, and autolinks are covered by tests.
- [ ] Frontmatter is extracted into known render fields plus preserved arbitrary metadata.
- [ ] Raw HTML behavior supports escape, sanitize, and allow modes, with sanitize as the default.
- [ ] The generated HTML shell includes a built-in default theme and supports print-friendly output.
- [ ] Public APIs do not expose remark/rehype plugin hooks in v1.

### History
- created · 2026-07-16T21:26:20Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T21:53:03Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T21:58:15Z · mauro.goncalo@gmail.com

---

## MARKY-003 · Add option resolution across defaults config frontmatter and explicit inputs
type: Task | status: Done | priority: High
blocks: [MARKY-004] | blocked_by: [MARKY-002]
tags: [marky-document-pipeline]

## What & why

Define one reliable option-resolution model so library calls, CLI flags, frontmatter, config files, and defaults all produce the same render behavior. This prevents each command path from growing separate precedence and path-resolution rules.

## Where

Shared options/types area, CLI option mapping, frontmatter handling, config integration points, render/build orchestration, and tests.

## How

Create a central resolver for render options and build options. Use the precedence `explicit API/CLI options > frontmatter > config > defaults`. Include known fields for theme, CSS overrides, PDF options, raw HTML mode, network policy, page readiness, timeout, output behavior, and force behavior. Resolve frontmatter-relative file paths from the Markdown file and config-relative paths from the config file location. Return normalized options that downstream renderers can consume without reinterpreting source-specific inputs.

## Acceptance criteria

- [ ] A central resolver applies explicit options, frontmatter, config, and defaults with the agreed precedence.
- [ ] CSS and asset-related paths from frontmatter resolve relative to the Markdown file.
- [ ] CSS and project paths from config resolve relative to the config file location.
- [ ] Render and build code consume normalized options instead of duplicating merge logic.
- [ ] Unit tests cover precedence conflicts and path resolution cases.
- [ ] The public option types document the supported v1 fields.

### History
- created · 2026-07-16T21:26:40Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T21:58:39Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T22:02:35Z · mauro.goncalo@gmail.com

---

## MARKY-004 · Add Playwright rendering controls
type: Task | status: Done | priority: Medium
blocks: [MARKY-005] | blocked_by: [MARKY-003]
tags: [marky-document-pipeline]

## What & why

Expose the Playwright controls that are genuinely part of PDF rendering while keeping browser lifecycle and low-level hooks mostly internal. Users need predictable control over page format, margins, network behavior, readiness timing, and missing-browser errors without Marky becoming a generic Playwright wrapper.

## Where

Playwright rendering area, option types and resolver, CLI flags, error model, and integration tests.

## How

Add a `pdf` option object that maps to stable Playwright PDF concerns such as format, margins, landscape, scale, and print background. Add page readiness options with a default of load plus font readiness and a timeout. Add network policy handling with allow by default and block support for deterministic builds. Catch missing Chromium/browser-install failures and surface a clear remediation message. Keep full Playwright hooks and user-provided browser/page support out of v1 public API.

## Acceptance criteria

- [ ] API/config/CLI can set core PDF options including format, margins, landscape, scale, and print background.
- [ ] Rendering waits using a configurable readiness strategy and timeout, defaulting to load plus font readiness.
- [ ] Network access is allowed by default and can be blocked for rendering.
- [ ] Missing Chromium or Playwright browser installation failures produce a stable error code and actionable message.
- [ ] Tests cover option mapping and network/readiness behavior where practical.
- [ ] Public API does not expose arbitrary Playwright hooks in v1.

### History
- created · 2026-07-16T21:26:41Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T22:03:08Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T22:09:42Z · mauro.goncalo@gmail.com

---

## MARKY-005 · Add optional project config loading
type: Task | status: Done | priority: High
blocks: [MARKY-006] | blocked_by: [MARKY-004]
tags: [marky-project-build]

## What & why

Let projects define reusable Marky defaults without forcing every render or build invocation to repeat the same flags. Config is optional in v1, but it is part of the planned workflow for project builds and should integrate with the same option resolver as frontmatter and explicit inputs.

## Where

Config discovery/loading area, public library exports, option resolver, CLI config flag handling, and tests.

## How

Support optional config files in JavaScript/ESM and JSON formats, with a search path that prefers explicit `--config` when provided. Export `defineConfig` as a typed identity helper for authoring config. Config should support shared render defaults plus build-specific fields such as input globs, root directory, output directory, concurrency, and force behavior. Path values from config resolve relative to the config file location. TypeScript config loading can be deferred unless there is already a clean project-supported loader.

## Acceptance criteria

- [ ] The library exports `defineConfig`.
- [ ] The CLI can load an explicit config path and discover supported default config filenames.
- [ ] JavaScript/ESM and JSON config formats are supported in v1.
- [ ] Config values participate in the central option resolver below frontmatter and explicit options.
- [ ] Config-relative paths are normalized consistently.
- [ ] Missing, malformed, or invalid config files produce stable error codes and useful messages.

### History
- created · 2026-07-16T21:27:06Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T22:10:17Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T22:15:16Z · mauro.goncalo@gmail.com

---

## MARKY-006 · Add build command and batch library API
type: Task | status: Done | priority: High
blocks: [MARKY-007] | blocked_by: [MARKY-005]
tags: [marky-project-build]

## What & why

Add the project-level batch workflow that mirrors the single-document render API: users can render many Markdown files from config using both CLI and library entry points. This makes Marky useful for documentation trees, not just one-off conversions.

## Where

Public library entry point, CLI command entry point, config model, input discovery, output mapping, Playwright browser/session management, and build result reporting.

## How

Export `buildMarkdownPdfs` and add `marky build`. Discover inputs from configured globs, infer or use `rootDir`, write PDFs under `outDir`, and preserve relative paths from root to output. Reuse one browser for a build and render sequentially by default with configurable concurrency. Build should continue across per-file failures, return a summary of successes and failures, and make the CLI exit non-zero if any file failed. Build overwrites outputs by default because the output directory is generated.

## Acceptance criteria

- [ ] The library exports `buildMarkdownPdfs` with a structured build result.
- [ ] The CLI supports `marky build` with optional config path and concurrency flags.
- [ ] Build discovers Markdown inputs from configured globs.
- [ ] Output PDFs preserve paths relative to `rootDir` under `outDir`.
- [ ] Ambiguous root/output mapping fails with a stable error instead of flattening unpredictably.
- [ ] Build reuses one browser, defaults to sequential rendering, supports configured concurrency, and exits non-zero on any failed file.

### History
- created · 2026-07-16T21:27:06Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T22:15:40Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T22:22:28Z · mauro.goncalo@gmail.com

---

## MARKY-007 · Harden local asset and output path handling
type: Task | status: Done | priority: Medium
blocks: [MARKY-008] | blocked_by: [MARKY-006]
tags: [marky-project-build]

## What & why

Make document-local assets and generated output paths predictable and safe across file input, raw Markdown string input, single render, and project build. This prevents missing images/styles, accidental writes, and ambiguous batch output layouts.

## Where

Source normalization, asset path resolution, HTML generation, Playwright request handling, output path derivation, build mapping, and tests.

## How

For file input, resolve relative Markdown assets from the Markdown file directory. For string input, require `baseUrl` when relative assets are expected. Constrain local asset resolution around the document base rather than allowing arbitrary filesystem paths through generated markup. Allow remote assets by default unless network is blocked. For single render, derive input-adjacent output when omitted and refuse overwrite unless forced. For build, preserve paths under `rootDir` into `outDir`, create parent directories automatically, and overwrite by default.

## Acceptance criteria

- [ ] File inputs resolve relative images, links, and CSS from the Markdown file directory.
- [ ] Raw Markdown string inputs support relative assets only when a base URL/directory is supplied.
- [ ] Local file access is constrained to the intended document base where Marky controls generated asset references.
- [ ] Remote HTTP/HTTPS assets work when network is allowed and are blocked when network is disabled.
- [ ] Single render and build follow their distinct overwrite defaults.
- [ ] Tests cover adjacent output derivation, root-relative build mapping, parent directory creation, and ambiguous mapping errors.

### History
- created · 2026-07-16T21:27:06Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T22:23:01Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T22:25:52Z · mauro.goncalo@gmail.com

---

## MARKY-008 · Document and verify the public lib CLI contract
type: Task | status: Done | priority: Medium
blocks: [] | blocked_by: [MARKY-007]
tags: [marky-docs-contract]

## What & why

Lock down the user-facing contract after the render, document pipeline, and project build features exist. The README and scripts should teach the supported workflows clearly and verify that the package can be used as both a library and CLI.

## Where

README, package scripts, package exports/bin metadata, CLI help text, public type declarations, tests, and package verification script.

## How

Update documentation to cover `marky render`, `marky build`, `renderMarkdownToPdf`, `buildMarkdownPdfs`, `defineConfig`, config examples, frontmatter precedence, browser installation guidance, and network/raw HTML caveats. Keep default tests fast and create or document a separate Playwright integration test script. Verify packaging includes the CLI, library types, built assets, README, and license.

## Acceptance criteria

- [ ] README documents the v1 CLI workflows with realistic examples.
- [ ] README documents the v1 library APIs and config examples.
- [ ] Browser installation and missing-browser remediation are documented.
- [ ] Raw HTML and network defaults are documented with security/reproducibility notes.
- [ ] `npm test` remains the fast default suite and a separate integration test script exercises real PDF generation.
- [ ] Package verification confirms the published package contains the expected CLI, library exports, types, README, and license.

### History
- created · 2026-07-16T21:27:15Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-16T22:26:21Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-16T22:28:44Z · mauro.goncalo@gmail.com

---

## MARKY-009 · Add typed professional PDF feature option shapes
type: Task | status: Done | priority: Medium
blocks: [MARKY-010, MARKY-011, MARKY-014] | blocked_by: []
tags: [professional-pdf-theme]

## What & why

Add the public option surface for Marky's first professional PDF feature layer. Users need stable, typed ways to request cover pages, table of contents, pagination, and back pages from API calls, config files, and frontmatter without exposing visual styling internals.

## Where

Render option types, config/frontmatter option parsing, and public TypeScript exports.

## How

Introduce typed option shapes for cover, TOC, pagination, and back page. Each feature should accept false, true, or an object at the input boundary. Keep detailed theme styling knobs out of the public API.

## Acceptance criteria

- [ ] Public render options can express cover, toc, pagination, and backPage.
- [ ] Each feature input accepts false, true, or a typed object.
- [ ] Existing render, build, and config option shapes remain backward compatible.
- [ ] No visual styling controls are exposed as public API in this slice.

### History
- created · 2026-07-17T13:24:09Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-17T13:25:57Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-17T13:27:33Z · mauro.goncalo@gmail.com

---

## MARKY-010 · Normalize professional PDF feature defaults
type: Task | status: Done | priority: Medium
blocks: [MARKY-012, MARKY-013, MARKY-018, MARKY-022] | blocked_by: [MARKY-009]
tags: [professional-pdf-theme]

## What & why

Normalize raw professional PDF feature inputs into a boring resolved shape that rendering code can consume without reinterpreting precedence or boolean semantics. Choosing theme: professional should produce a complete professional document by default, while explicit false should disable individual features.

## Where

Render option resolution, frontmatter conversion, config merging, and resolved render option types.

## How

Resolve input precedence using the existing order: explicit options over frontmatter, frontmatter over config, config over defaults. For theme: professional, enable missing cover, toc, pagination, and backPage features by default. Normalize true into default option objects and false into disabled features.

## Acceptance criteria

- [ ] Resolved options contain normalized feature values, not raw unknown inputs.
- [ ] theme: professional enables cover, toc, pagination, and backPage by default.
- [ ] Explicit false disables a professional default at any supported input layer.
- [ ] Existing default and unknown themes preserve current behavior unless features are explicitly configured.

### History
- created · 2026-07-17T13:24:09Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-17T13:27:42Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-17T13:29:00Z · mauro.goncalo@gmail.com

---

## MARKY-011 · Resolve cover and back-page logo paths
type: Task | status: Done | priority: Medium
blocks: [MARKY-017, MARKY-022] | blocked_by: [MARKY-009]
tags: [professional-pdf-theme]

## What & why

Cover and back pages need optional logos that behave consistently with the rest of Marky's local asset model. Users should not have to learn a second path-resolution rule for professional PDF metadata.

## Where

Feature option resolution, asset URL handling, and professional shell rendering support.

## How

Resolve logo paths according to their source: frontmatter relative to the Markdown file, config relative to the config file, and explicit API options relative to the current working directory. Local image logos should render safely in Chromium using the existing local asset/data URL approach.

## Acceptance criteria

- [ ] Frontmatter logo paths resolve from the Markdown file directory.
- [ ] Config logo paths resolve from the config file directory.
- [ ] Explicit API logo paths resolve from cwd.
- [ ] Local logo assets are safe to load in the generated PDF HTML.
- [ ] Existing local asset boundary checks are respected.

### History
- created · 2026-07-17T13:24:09Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-17T13:29:18Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-17T13:32:12Z · mauro.goncalo@gmail.com

---

## MARKY-012 · Add professional theme shell routing
type: Task | status: Done | priority: Medium
blocks: [MARKY-013, MARKY-016, MARKY-017, MARKY-019] | blocked_by: [MARKY-010]
tags: [professional-pdf-theme]

## What & why

Marky currently accepts a theme option, but the built-in shell does not change behavior by theme. Add the routing needed for theme: professional while preserving the default theme and the current tolerance for unknown theme names.

## Where

HTML shell rendering and render-to-PDF flow.

## How

Keep the current default shell unchanged. Route theme: professional through a new professional shell path that can render generated document sections around the main Markdown HTML. Unknown theme names should continue to use current default-shell behavior plus user CSS.

## Acceptance criteria

- [ ] theme: default output remains unchanged for existing tests.
- [ ] Unknown theme names remain accepted.
- [ ] theme: professional uses a separate professional shell path.
- [ ] The professional shell can receive normalized feature options and document structure.

### History
- created · 2026-07-17T13:24:09Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-17T13:32:25Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-17T13:33:31Z · mauro.goncalo@gmail.com

---

## MARKY-013 · Render a structured professional cover page
type: Task | status: Backlog | priority: Medium
blocks: [MARKY-020, MARKY-021, MARKY-023] | blocked_by: [MARKY-010, MARKY-012]
tags: [professional-pdf-theme]

## What & why

Professional PDFs need a polished first page that uses document metadata without requiring custom HTML or manual layout work.

## Where

Professional HTML shell, professional CSS, and document metadata handling.

## How

Render a generated cover page when the cover feature is enabled. Support structured plain-text fields: title, subtitle, author, date, and logo. Choose the cover title using cover.title, then document title, then first H1, then Untitled. Do not remove the first H1 from the Markdown body.

## Acceptance criteria

- [ ] Enabled cover renders before the main document content.
- [ ] Cover supports title, subtitle, author, date, and logo.
- [ ] Cover title fallback order is implemented as specified.
- [ ] The first H1 remains in the body content.
- [ ] Disabled cover renders no cover page.

### History
- created · 2026-07-17T13:24:09Z · mauro.goncalo@gmail.com

---

## MARKY-014 · Extract heading metadata for professional document structure
type: Task | status: Done | priority: Medium
blocks: [MARKY-015, MARKY-016] | blocked_by: [MARKY-009]
tags: [professional-pdf-theme]

## What & why

The professional TOC and cover fallback need structured knowledge of the Markdown headings. That data should come from the Markdown rendering pipeline, not generated pages or brittle HTML string parsing.

## Where

Markdown document rendering and rendered document model.

## How

Collect headings from the main Markdown content during document rendering. Include heading text, depth, and an eventual ID field. Ignore generated cover, TOC, and back-page headings because they are not part of the authored document body.

## Acceptance criteria

- [ ] Rendered documents expose main Markdown heading metadata.
- [ ] Heading metadata includes text and depth.
- [ ] Generated professional sections are not included in heading metadata.
- [ ] Existing document rendering behavior remains backward compatible.

### History
- created · 2026-07-17T13:24:09Z · mauro.goncalo@gmail.com
- Backlog → Claimed · 2026-07-17T13:33:46Z · mauro.goncalo@gmail.com
- Claimed → Done · 2026-07-17T13:34:57Z · mauro.goncalo@gmail.com

---

## MARKY-015 · Add rehype heading slugs for professional TOC links
type: Task | status: Backlog | priority: Medium
blocks: [MARKY-016] | blocked_by: [MARKY-014]
tags: [professional-pdf-theme]

## What & why

TOC entries should link to stable heading targets in the generated PDF HTML. Heading IDs need to be generated inside the unified/rehype pipeline rather than by regex after rendering.

## Where

Markdown processor setup and rendered document model.

## How

Add a rehype-based slugging step, either using a small dependency or a focused local rehype plugin. Ensure rendered headings have stable IDs and that heading metadata carries the same IDs used in the HTML.

## Acceptance criteria

- [ ] Rendered heading elements receive stable IDs.
- [ ] Heading metadata includes the matching ID.
- [ ] Slug generation is deterministic for repeated renders.
- [ ] Implementation uses the unified/rehype pipeline, not regex HTML rewriting.

### History
- created · 2026-07-17T13:24:09Z · mauro.goncalo@gmail.com

---

## MARKY-016 · Render a linked professional table of contents
type: Task | status: Backlog | priority: Medium
blocks: [MARKY-020, MARKY-021, MARKY-023] | blocked_by: [MARKY-012, MARKY-014, MARKY-015]
tags: [professional-pdf-theme]

## What & why

Professional PDFs need a generated contents page that helps readers navigate the document without requiring authors to hand-maintain a list of headings.

## Where

Professional shell rendering, heading metadata, and professional CSS.

## How

Render a TOC after the cover when enabled. Generate entries from main Markdown headings only. Default title is Contents. Default depth is 2 and maximum supported depth is 3. Entries link to heading IDs. Do not include page numbers in v1.

## Acceptance criteria

- [ ] Enabled TOC renders after the cover and before main content.
- [ ] TOC entries are generated from main Markdown headings only.
- [ ] Default depth is 2 and configured depth is capped at 3.
- [ ] TOC entries link to rendered heading IDs.
- [ ] TOC page numbers are not promised or rendered in v1.

### History
- created · 2026-07-17T13:24:09Z · mauro.goncalo@gmail.com

---

## MARKY-017 · Render a structured professional back page
type: Task | status: Backlog | priority: Medium
blocks: [MARKY-020, MARKY-021, MARKY-023] | blocked_by: [MARKY-011, MARKY-012]
tags: [professional-pdf-theme]

## What & why

Professional PDFs benefit from a simple closing page for contact details or a final note. The first version should provide a consistent generated back page without becoming a custom templating system.

## Where

Professional shell rendering, professional CSS, and logo asset handling.

## How

Render a final page when backPage is enabled. Support structured plain-text fields: title, text, website, email, and logo. Do not support Markdown, raw HTML, or external partial files in v1.

## Acceptance criteria

- [ ] Enabled backPage renders after main content.
- [ ] Back page supports title, text, website, email, and logo.
- [ ] Back page fields are treated as plain text.
- [ ] Disabled backPage renders no generated closing page.

### History
- created · 2026-07-17T13:24:09Z · mauro.goncalo@gmail.com

---

## MARKY-018 · Add Playwright pagination footer support
type: Task | status: Backlog | priority: Medium
blocks: [MARKY-020, MARKY-021, MARKY-024] | blocked_by: [MARKY-010]
tags: [professional-pdf-theme]

## What & why

Professional PDFs need visible page numbers and a basic footer. Chromium print CSS is not reliable enough for this in v1, so Marky should use Playwright's PDF header/footer support.

## Where

Resolved PDF options and Playwright page.pdf invocation.

## How

When pagination is enabled, call Playwright PDF generation with displayHeaderFooter and templates that show the document title plus the current page number. Keep numbering global and simple. Do not require body-only page numbering or accurate TOC page numbers.

## Acceptance criteria

- [ ] Pagination maps to Playwright PDF header/footer options.
- [ ] Footer includes document title and page number.
- [ ] Pagination can be disabled.
- [ ] Existing non-professional PDF generation remains unchanged unless pagination is enabled.
- [ ] Body-starts-at-page-1 is not required for v1.

### History
- created · 2026-07-17T13:24:09Z · mauro.goncalo@gmail.com

---

## MARKY-019 · Style professional PDF body content
type: Task | status: Backlog | priority: Medium
blocks: [MARKY-020, MARKY-021, MARKY-023] | blocked_by: [MARKY-012]
tags: [professional-pdf-theme]

## What & why

The professional theme should make ordinary Markdown content look like a clean consultancy-style report, not just add generated bookend pages.

## Where

Professional CSS and professional shell markup.

## How

Add restrained report styling for typography, headings, paragraphs, links, lists, blockquotes, tables, code blocks, horizontal rules, images, and page breaks. Keep the default theme unchanged and avoid exposing styling knobs in public options.

## Acceptance criteria

- [ ] Professional body content has distinct report-style typography and spacing.
- [ ] Tables and code blocks are readable in PDF output.
- [ ] Links, lists, blockquotes, and images have professional defaults.
- [ ] Default theme styling remains unchanged.

### History
- created · 2026-07-17T13:24:09Z · mauro.goncalo@gmail.com

---

## MARKY-020 · Document professional PDF usage
type: Task | status: Backlog | priority: Medium
blocks: [] | blocked_by: [MARKY-013, MARKY-016, MARKY-017, MARKY-018, MARKY-019]
tags: [professional-pdf-theme]

## What & why

Users need to know how to enable the professional theme, configure document features, disable defaults, and understand what is deliberately not included in v1.

## Where

README and any existing usage documentation.

## How

Document theme: professional for CLI, config, frontmatter, and API usage. Include examples for cover, TOC, pagination, and backPage. Explain false disables feature defaults. Note that glossary and accurate TOC page numbers are deferred.

## Acceptance criteria

- [ ] README documents theme: professional.
- [ ] Docs show frontmatter and config examples for professional features.
- [ ] Docs show how to disable individual professional defaults.
- [ ] Docs state that glossary is not part of v1.
- [ ] Docs do not imply TOC page numbers are supported in v1.

### History
- created · 2026-07-17T13:24:09Z · mauro.goncalo@gmail.com

---

## MARKY-021 · Add a focused professional PDF example
type: Task | status: Backlog | priority: Medium
blocks: [MARKY-024] | blocked_by: [MARKY-013, MARKY-016, MARKY-017, MARKY-018, MARKY-019]
tags: [professional-pdf-theme]

## What & why

This is a visual feature, so users and reviewers need a concrete checked-in example that demonstrates the intended result and can be regenerated.

## Where

Examples directory, sample Markdown/config/assets, and generated example output.

## How

Add a focused professional example showing theme: professional with cover, TOC, pagination, and backPage. Include any small local logo asset needed for the example. Generate the output PDF using the normal CLI path.

## Acceptance criteria

- [ ] examples includes a focused professional input document.
- [ ] The example demonstrates cover, TOC, pagination, and backPage.
- [ ] The example includes a generated PDF output.
- [ ] README points to the professional example.
- [ ] Existing examples remain available for the default/basic path.

### History
- created · 2026-07-17T13:24:09Z · mauro.goncalo@gmail.com

---

## MARKY-022 · Add unit tests for professional feature resolution
type: Task | status: Backlog | priority: Medium
blocks: [] | blocked_by: [MARKY-010, MARKY-011]
tags: [professional-pdf-theme]

## What & why

The new feature layer has precedence and defaulting rules that must stay stable. Unit tests should lock down those rules before visual rendering details evolve.

## Where

Option resolution tests and related unit test fixtures.

## How

Add focused unit coverage for professional feature inputs, true/false/object normalization, source precedence, theme defaults, disable semantics, and logo path resolution.

## Acceptance criteria

- [ ] Tests cover theme: professional default-enabling v1 features.
- [ ] Tests cover explicit false disabling each feature.
- [ ] Tests cover true and object normalization.
- [ ] Tests cover config/frontmatter/API precedence.
- [ ] Tests cover logo path resolution from supported sources.

### History
- created · 2026-07-17T13:24:09Z · mauro.goncalo@gmail.com

---

## MARKY-023 · Add unit tests for professional HTML output
type: Task | status: Backlog | priority: Medium
blocks: [] | blocked_by: [MARKY-013, MARKY-016, MARKY-017, MARKY-019]
tags: [professional-pdf-theme]

## What & why

Professional shell rendering should be covered without relying on brittle full PDF or visual snapshots. Unit tests can verify the key generated structure and links directly in HTML.

## Where

Document rendering tests and professional shell unit tests.

## How

Add tests that render professional HTML and assert cover markup, TOC links, body content preservation, back page output, and professional CSS markers. Avoid full HTML snapshots.

## Acceptance criteria

- [ ] Tests assert cover output when enabled.
- [ ] Tests assert TOC entries link to heading IDs.
- [ ] Tests assert the first H1 remains in body content.
- [ ] Tests assert back page output when enabled.
- [ ] Tests verify disabled features are omitted.
- [ ] Tests avoid brittle full-document snapshots.

### History
- created · 2026-07-17T13:24:09Z · mauro.goncalo@gmail.com

---

## MARKY-024 · Add professional PDF integration test
type: Task | status: Backlog | priority: Medium
blocks: [] | blocked_by: [MARKY-018, MARKY-021]
tags: [professional-pdf-theme]

## What & why

The professional feature set must be proven through the real Playwright PDF path, not just unit-level HTML rendering.

## Where

Integration test suite and professional example fixture.

## How

Render the professional example to a real PDF with the existing integration test approach. Verify that the output starts with %PDF and has non-trivial size. Do not add visual/PDF snapshot comparison in v1.

## Acceptance criteria

- [ ] Integration test renders a professional PDF through the real CLI or library path.
- [ ] Test verifies %PDF header and non-trivial file size.
- [ ] Test uses the professional example or an equivalent focused fixture.
- [ ] No visual snapshot comparison is added.

### History
- created · 2026-07-17T13:24:10Z · mauro.goncalo@gmail.com
