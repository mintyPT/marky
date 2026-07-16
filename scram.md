---
prefix: MARKY
format_version: 2
groups: [marky-render-slice, marky-document-pipeline, marky-project-build, marky-docs-contract]
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
type: Task | status: Backlog | priority: High
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

---

## MARKY-003 · Add option resolution across defaults config frontmatter and explicit inputs
type: Task | status: Backlog | priority: High
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

---

## MARKY-004 · Add Playwright rendering controls
type: Task | status: Backlog | priority: Medium
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

---

## MARKY-005 · Add optional project config loading
type: Task | status: Backlog | priority: High
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

---

## MARKY-006 · Add build command and batch library API
type: Task | status: Backlog | priority: High
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

---

## MARKY-007 · Harden local asset and output path handling
type: Task | status: Backlog | priority: Medium
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

---

## MARKY-008 · Document and verify the public lib CLI contract
type: Task | status: Backlog | priority: Medium
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
