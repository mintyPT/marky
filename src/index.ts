import { mkdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import fastGlob from "fast-glob";
import matter from "gray-matter";
import { type Browser, chromium } from "playwright";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export interface RenderMarkdownToPdfOptions {
  outputPath?: string;
  force?: boolean;
  rawHtml?: RawHtmlMode;
  theme?: string;
  css?: string[];
  pdf?: Partial<PdfOptions>;
  network?: NetworkPolicy;
  waitUntil?: PageReadyState;
  waitForFonts?: boolean;
  timeoutMs?: number;
  config?: RenderOptionsInput;
  configPath?: string;
}

export interface RenderMarkdownToPdfResult {
  inputPath: string;
  outputPath: string;
}

export interface BuildMarkdownPdfsOptions {
  cwd?: string;
  config?: MarkyConfig;
  configPath?: string;
  inputs?: string[];
  rootDir?: string;
  outDir?: string;
  concurrency?: number;
  force?: boolean;
  render?: RenderOptionsInput;
}

export interface BuildMarkdownPdfSuccess {
  inputPath: string;
  outputPath: string;
}

export interface BuildMarkdownPdfFailure {
  inputPath: string;
  outputPath?: string;
  error: {
    code: MarkyErrorCode;
    message: string;
  };
}

export interface BuildMarkdownPdfsResult {
  successes: BuildMarkdownPdfSuccess[];
  failures: BuildMarkdownPdfFailure[];
}

export type MarkyErrorCode =
  | "MARKY_BROWSER_MISSING"
  | "MARKY_ASSET_BASE_REQUIRED"
  | "MARKY_ASSET_OUTSIDE_BASE"
  | "MARKY_BUILD_AMBIGUOUS_OUTPUT"
  | "MARKY_CONFIG_INVALID"
  | "MARKY_CONFIG_NOT_FOUND"
  | "MARKY_RENDER_FAILED";

export class MarkyRenderError extends Error {
  readonly code: MarkyErrorCode;
  readonly cause: unknown;

  constructor(code: MarkyErrorCode, message: string, options: { cause?: unknown } = {}) {
    super(message);
    this.name = "MarkyRenderError";
    this.code = code;
    this.cause = options.cause;
  }
}

export interface BuildOptionsInput {
  inputs?: string[];
  rootDir?: string;
  outDir?: string;
  concurrency?: number;
  force?: boolean;
}

export interface MarkyConfig {
  render?: RenderOptionsInput;
  build?: BuildOptionsInput;
}

export interface LoadedMarkyConfig {
  path: string;
  config: MarkyConfig;
}

export interface LoadMarkyConfigOptions {
  configPath?: string;
  cwd?: string;
}

const defaultConfigFilenames = ["marky.config.mjs", "marky.config.js", "marky.config.cjs", "marky.config.json"];

export function defineConfig<const Config extends MarkyConfig>(config: Config): Config {
  return config;
}

export async function loadMarkyConfig(options: LoadMarkyConfigOptions = {}): Promise<LoadedMarkyConfig | undefined> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const configPath = options.configPath ? resolve(cwd, options.configPath) : await findMarkyConfig(cwd);

  if (!configPath) {
    return undefined;
  }

  if (!(await pathExists(configPath))) {
    throw new MarkyRenderError("MARKY_CONFIG_NOT_FOUND", `Marky config file was not found: ${configPath}`);
  }

  try {
    const config = await readConfigFile(configPath);
    return {
      path: configPath,
      config,
    };
  } catch (error) {
    if (error instanceof MarkyRenderError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new MarkyRenderError("MARKY_CONFIG_INVALID", `Could not load Marky config ${configPath}: ${message}`, {
      cause: error,
    });
  }
}

export async function findMarkyConfig(cwd = process.cwd()): Promise<string | undefined> {
  let directory = resolve(cwd);

  while (true) {
    for (const filename of defaultConfigFilenames) {
      const candidate = join(directory, filename);
      if (await pathExists(candidate)) {
        return candidate;
      }
    }

    const parent = dirname(directory);
    if (parent === directory) {
      return undefined;
    }
    directory = parent;
  }
}

async function readConfigFile(configPath: string): Promise<MarkyConfig> {
  const extension = extname(configPath);
  if (extension === ".json") {
    return validateMarkyConfig(JSON.parse(await readFile(configPath, "utf8")), configPath);
  }

  if ([".js", ".mjs", ".cjs"].includes(extension)) {
    const imported = (await import(`${pathToFileURL(configPath).href}?t=${Date.now()}`)) as { default?: unknown };
    return validateMarkyConfig(imported.default, configPath);
  }

  throw new MarkyRenderError("MARKY_CONFIG_INVALID", `Unsupported Marky config extension: ${extension}`);
}

function validateMarkyConfig(value: unknown, configPath: string): MarkyConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new MarkyRenderError("MARKY_CONFIG_INVALID", `Marky config must export an object: ${configPath}`);
  }

  const config = value as MarkyConfig;
  if (config.render !== undefined && (!config.render || typeof config.render !== "object" || Array.isArray(config.render))) {
    throw new MarkyRenderError("MARKY_CONFIG_INVALID", "`render` config must be an object.");
  }
  if (config.build !== undefined && (!config.build || typeof config.build !== "object" || Array.isArray(config.build))) {
    throw new MarkyRenderError("MARKY_CONFIG_INVALID", "`build` config must be an object.");
  }

  return config;
}


export interface RenderedMarkdownDocument {
  html: string;
  title?: string;
  author?: string;
  metadata: Record<string, unknown>;
}

export type RawHtmlMode = "sanitize" | "escape" | "allow";
export type NetworkPolicy = "allow" | "block";
export type PageReadyState = "load" | "domcontentloaded" | "networkidle";

export interface PdfMargin {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

export interface PdfOptions {
  format: "A4" | "Letter" | "Legal";
  margin?: PdfMargin;
  landscape: boolean;
  scale: number;
  printBackground: boolean;
}

export interface RenderOptionsInput {
  outputPath?: string;
  force?: boolean;
  rawHtml?: RawHtmlMode;
  theme?: string;
  css?: string[];
  pdf?: Partial<PdfOptions>;
  network?: NetworkPolicy;
  waitUntil?: PageReadyState;
  waitForFonts?: boolean;
  timeoutMs?: number;
}

export interface ResolveRenderOptionsInput {
  inputPath: string;
  explicit?: RenderOptionsInput;
  frontmatter?: Record<string, unknown>;
  config?: RenderOptionsInput;
  configPath?: string;
}

export interface ResolvedRenderOptions {
  inputPath: string;
  outputPath: string;
  force: boolean;
  rawHtml: RawHtmlMode;
  theme: string;
  css: string[];
  pdf: PdfOptions;
  network: NetworkPolicy;
  waitUntil: PageReadyState;
  waitForFonts: boolean;
  timeoutMs: number;
}

export interface RenderMarkdownDocumentOptions {
  rawHtml?: RawHtmlMode;
  baseUrl?: string;
}

const defaultRenderOptions: Omit<ResolvedRenderOptions, "inputPath" | "outputPath"> = {
  force: false,
  rawHtml: "sanitize",
  theme: "default",
  css: [],
  pdf: {
    format: "A4",
    landscape: false,
    scale: 1,
    printBackground: true,
  },
  network: "allow",
  waitUntil: "load",
  waitForFonts: true,
  timeoutMs: 30_000,
};

export async function renderMarkdownToPdf(
  inputPath: string,
  options: RenderMarkdownToPdfOptions = {},
): Promise<RenderMarkdownToPdfResult> {
  const resolvedInputPath = resolve(inputPath);
  const markdown = await readFile(resolvedInputPath, "utf8");
  const parsed = matter(markdown);
  const resolvedOptions = resolveRenderOptions({
    inputPath: resolvedInputPath,
    explicit: options,
    frontmatter: parsed.data,
    config: options.config,
    configPath: options.configPath,
  });

  if (!resolvedOptions.force && (await pathExists(resolvedOptions.outputPath))) {
    throw new Error(`Refusing to overwrite existing output: ${resolvedOptions.outputPath}`);
  }

  let browser: Browser | undefined;
  try {
    browser = await chromium.launch();
    await renderMarkdownToPdfWithBrowser(browser, markdown, resolvedOptions);
  } catch (error) {
    throw normalizeRenderError(error);
  } finally {
    await browser?.close();
  }

  return {
    inputPath: resolvedInputPath,
    outputPath: resolvedOptions.outputPath,
  };
}

export async function buildMarkdownPdfs(options: BuildMarkdownPdfsOptions = {}): Promise<BuildMarkdownPdfsResult> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const configBase = options.configPath ? dirname(resolve(cwd, options.configPath)) : cwd;
  const buildOptions = mergeBuildOptions(options.config?.build, options);
  const inputs = buildOptions.inputs ?? ["**/*.md"];
  const rootDir = resolvePath(buildOptions.rootDir ?? ".", configBase);
  const outDir = resolvePath(buildOptions.outDir ?? "pdf", configBase);
  const concurrency = Math.max(1, buildOptions.concurrency ?? 1);
  const inputPaths = await fastGlob(inputs, {
    absolute: true,
    cwd: configBase,
    onlyFiles: true,
  });
  const jobs = inputPaths.map((inputPath) => ({
    inputPath,
    outputPath: outputPathForBuildInput(inputPath, rootDir, outDir),
  }));
  const successes: BuildMarkdownPdfSuccess[] = [];
  const failures: BuildMarkdownPdfFailure[] = [];

  let browser: Browser | undefined;
  try {
    browser = await chromium.launch();
    await runBuildJobs(jobs, concurrency, async (job) => {
      if (job.outputPath instanceof MarkyRenderError) {
        failures.push({
          inputPath: job.inputPath,
          error: { code: job.outputPath.code, message: job.outputPath.message },
        });
        return;
      }

      try {
        const markdown = await readFile(job.inputPath, "utf8");
        const parsed = matter(markdown);
        const resolvedOptions = resolveRenderOptions({
          inputPath: job.inputPath,
          explicit: {
            ...(options.render ?? {}),
            force: buildOptions.force ?? true,
            outputPath: job.outputPath,
          },
          frontmatter: parsed.data,
          config: options.config?.render,
          configPath: options.configPath,
        });
        await renderMarkdownToPdfWithBrowser(browser!, markdown, resolvedOptions);
        successes.push({ inputPath: job.inputPath, outputPath: job.outputPath });
      } catch (error) {
        const normalized = normalizeRenderError(error);
        failures.push({
          inputPath: job.inputPath,
          outputPath: job.outputPath,
          error: { code: normalized.code, message: normalized.message },
        });
      }
    });
  } catch (error) {
    throw normalizeRenderError(error);
  } finally {
    await browser?.close();
  }

  return { successes, failures };
}

async function renderMarkdownToPdfWithBrowser(
  browser: Browser,
  markdown: string,
  resolvedOptions: ResolvedRenderOptions,
): Promise<void> {
  const document = await renderMarkdownDocument(markdown, {
    rawHtml: resolvedOptions.rawHtml,
    baseUrl: dirname(resolvedOptions.inputPath),
  });
  const html = renderHtmlShell(document, resolvedOptions);

  await mkdir(dirname(resolvedOptions.outputPath), { recursive: true });

  const page = await browser.newPage();
  try {
    if (resolvedOptions.network === "block") {
      await page.route(/^https?:\/\//, (route) => route.abort());
    }
    await page.setContent(html, { waitUntil: resolvedOptions.waitUntil, timeout: resolvedOptions.timeoutMs });
    if (resolvedOptions.waitForFonts) {
      await page.evaluate("document.fonts.ready");
    }
    await page.pdf({
      format: resolvedOptions.pdf.format,
      margin: resolvedOptions.pdf.margin,
      landscape: resolvedOptions.pdf.landscape,
      scale: resolvedOptions.pdf.scale,
      path: resolvedOptions.outputPath,
      printBackground: resolvedOptions.pdf.printBackground,
    });
  } finally {
    await page.close();
  }
}

export function normalizeRenderError(error: unknown): MarkyRenderError {
  if (error instanceof MarkyRenderError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  if (/Executable doesn't exist|browser.*install|playwright install/i.test(message)) {
    return new MarkyRenderError(
      "MARKY_BROWSER_MISSING",
      "Chromium is not installed for Playwright. Run `npx playwright install chromium` and try again.",
      { cause: error },
    );
  }

  return new MarkyRenderError("MARKY_RENDER_FAILED", `Failed to render PDF: ${message}`, { cause: error });
}

export function resolveRenderOptions(input: ResolveRenderOptionsInput): ResolvedRenderOptions {
  const inputPath = resolve(input.inputPath);
  const frontmatter = frontmatterToRenderOptions(input.frontmatter ?? {});
  const merged = mergeRenderOptions(input.config, frontmatter, input.explicit);
  const outputPath = resolveOutputPath(input, frontmatter);

  return {
    inputPath,
    outputPath,
    force: merged.force ?? defaultRenderOptions.force,
    rawHtml: merged.rawHtml ?? defaultRenderOptions.rawHtml,
    theme: merged.theme ?? defaultRenderOptions.theme,
    css: [
      ...resolvePaths(input.config?.css ?? [], dirname(resolve(input.configPath ?? inputPath))),
      ...resolvePaths(frontmatter.css ?? [], dirname(inputPath)),
      ...resolvePaths(input.explicit?.css ?? [], process.cwd()),
    ],
    pdf: {
      format: merged.pdf?.format ?? defaultRenderOptions.pdf.format,
      margin: merged.pdf?.margin,
      landscape: merged.pdf?.landscape ?? defaultRenderOptions.pdf.landscape,
      scale: merged.pdf?.scale ?? defaultRenderOptions.pdf.scale,
      printBackground: merged.pdf?.printBackground ?? defaultRenderOptions.pdf.printBackground,
    },
    network: merged.network ?? defaultRenderOptions.network,
    waitUntil: merged.waitUntil ?? defaultRenderOptions.waitUntil,
    waitForFonts: merged.waitForFonts ?? defaultRenderOptions.waitForFonts,
    timeoutMs: merged.timeoutMs ?? defaultRenderOptions.timeoutMs,
  };
}

function resolveOutputPath(input: ResolveRenderOptionsInput, frontmatter: RenderOptionsInput): string {
  const inputPath = resolve(input.inputPath);
  if (input.explicit?.outputPath) {
    return resolvePath(input.explicit.outputPath, process.cwd());
  }
  if (frontmatter.outputPath) {
    return resolvePath(frontmatter.outputPath, dirname(inputPath));
  }
  if (input.config?.outputPath) {
    return resolvePath(input.config.outputPath, dirname(resolve(input.configPath ?? inputPath)));
  }
  return defaultPdfPath(inputPath);
}

function mergeBuildOptions(config: BuildOptionsInput | undefined, explicit: BuildMarkdownPdfsOptions): BuildOptionsInput {
  return {
    ...config,
    inputs: explicit.inputs ?? config?.inputs,
    rootDir: explicit.rootDir ?? config?.rootDir,
    outDir: explicit.outDir ?? config?.outDir,
    concurrency: explicit.concurrency ?? config?.concurrency,
    force: explicit.force ?? config?.force,
  };
}

function outputPathForBuildInput(inputPath: string, rootDir: string, outDir: string): string | MarkyRenderError {
  const relativeInputPath = relative(rootDir, inputPath);
  if (relativeInputPath.startsWith("..") || isAbsolute(relativeInputPath)) {
    return new MarkyRenderError(
      "MARKY_BUILD_AMBIGUOUS_OUTPUT",
      `Cannot map ${inputPath} under output directory because it is outside rootDir ${rootDir}.`,
    );
  }

  const extension = extname(relativeInputPath);
  const outputRelativePath =
    extension.length > 0 ? `${relativeInputPath.slice(0, -extension.length)}.pdf` : `${relativeInputPath}.pdf`;
  return join(outDir, outputRelativePath);
}

async function runBuildJobs<Job>(
  jobs: Job[],
  concurrency: number,
  worker: (job: Job) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < jobs.length) {
      const job = jobs[nextIndex];
      nextIndex += 1;
      await worker(job);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, () => runWorker()));
}

function mergeRenderOptions(...inputs: Array<RenderOptionsInput | undefined>): RenderOptionsInput {
  return inputs.reduce<RenderOptionsInput>((merged, next) => {
    if (!next) {
      return merged;
    }

    return {
      ...merged,
      ...next,
      pdf: {
        ...merged.pdf,
        ...next.pdf,
      },
    };
  }, {});
}

function frontmatterToRenderOptions(frontmatter: Record<string, unknown>): RenderOptionsInput {
  return omitUndefined({
    outputPath: readString(frontmatter.outputPath),
    force: readBoolean(frontmatter.force),
    rawHtml: readEnum(frontmatter.rawHtml, ["sanitize", "escape", "allow"]),
    theme: readString(frontmatter.theme),
    css: readStringArray(frontmatter.css),
    pdf: readPdfOptions(frontmatter.pdf),
    network: readEnum(frontmatter.network, ["allow", "block"]),
    waitUntil: readEnum(frontmatter.waitUntil, ["load", "domcontentloaded", "networkidle"]),
    waitForFonts: readBoolean(frontmatter.waitForFonts),
    timeoutMs: readNumber(frontmatter.timeoutMs),
  });
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function readStringArray(value: unknown): string[] | undefined {
  if (typeof value === "string") {
    return [value];
  }

  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter((item): item is string => typeof item === "string");
}

function readEnum<const Value extends string>(value: unknown, values: readonly Value[]): Value | undefined {
  return typeof value === "string" && values.includes(value as Value) ? (value as Value) : undefined;
}

function readPdfOptions(value: unknown): Partial<PdfOptions> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const pdf = value as Record<string, unknown>;
  return omitUndefined({
    format: readEnum(pdf.format, ["A4", "Letter", "Legal"]),
    margin: readPdfMargin(pdf.margin),
    landscape: readBoolean(pdf.landscape),
    scale: readNumber(pdf.scale),
    printBackground: readBoolean(pdf.printBackground),
  });
}

function readPdfMargin(value: unknown): PdfMargin | undefined {
  if (typeof value === "string") {
    return {
      top: value,
      right: value,
      bottom: value,
      left: value,
    };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const margin = value as Record<string, unknown>;
  return {
    top: readString(margin.top),
    right: readString(margin.right),
    bottom: readString(margin.bottom),
    left: readString(margin.left),
  };
}

function omitUndefined<Value extends Record<string, unknown>>(value: Value): Value {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Value;
}

function resolvePaths(paths: string[], basePath: string): string[] {
  return paths.map((path) => resolvePath(path, basePath));
}

function resolvePath(path: string, basePath: string): string {
  return isAbsolute(path) ? path : resolve(basePath, path);
}

export async function renderMarkdownDocument(
  markdown: string,
  options: RenderMarkdownDocumentOptions = {},
): Promise<RenderedMarkdownDocument> {
  const parsed = matter(markdown);
  const rawHtml = options.rawHtml ?? "sanitize";
  const file = await buildMarkdownProcessor(rawHtml).process(prepareMarkdownContent(parsed.content, rawHtml));
  const { title, author, metadata } = normalizeFrontmatter(parsed.data);

  return {
    html: resolveDocumentAssetUrls(String(file), options.baseUrl),
    title,
    author,
    metadata,
  };
}

function buildMarkdownProcessor(rawHtml: RawHtmlMode) {
  const processor = unified().use(remarkParse).use(remarkGfm);

  if (rawHtml === "escape") {
    return processor.use(remarkRehype).use(rehypeStringify);
  }

  processor.use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw);

  if (rawHtml === "sanitize") {
    processor.use(rehypeSanitize);
  }

  return processor.use(rehypeStringify);
}

function prepareMarkdownContent(markdown: string, rawHtml: RawHtmlMode): string {
  if (rawHtml !== "escape") {
    return markdown;
  }

  return markdown.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function normalizeFrontmatter(data: Record<string, unknown>): Pick<RenderedMarkdownDocument, "title" | "author" | "metadata"> {
  const metadata = { ...data };
  const title = typeof metadata.title === "string" ? metadata.title : undefined;
  const author = typeof metadata.author === "string" ? metadata.author : undefined;
  delete metadata.title;
  delete metadata.author;

  return { title, author, metadata };
}

function resolveDocumentAssetUrls(html: string, baseUrl: string | undefined): string {
  return html.replace(/\b(src|href)="([^"]+)"/g, (_match, attribute: string, value: string) => {
    if (!isRelativeAssetUrl(value)) {
      return `${attribute}="${value}"`;
    }

    if (!baseUrl) {
      throw new MarkyRenderError(
        "MARKY_ASSET_BASE_REQUIRED",
        `Relative asset ${value} requires a document base URL or directory.`,
      );
    }

    const resolved = resolveAssetUrl(value, baseUrl);
    return `${attribute}="${escapeHtml(resolved)}"`;
  });
}

function isRelativeAssetUrl(value: string): boolean {
  return !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value);
}

function resolveAssetUrl(value: string, baseUrl: string): string {
  const base = toBaseUrl(baseUrl);
  const resolved = new URL(value, base);

  if (base.protocol === "file:" && resolved.protocol === "file:") {
    const basePath = fileURLToPath(base);
    const resolvedPath = fileURLToPath(resolved);
    const relativePath = relative(basePath, resolvedPath);
    if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
      throw new MarkyRenderError(
        "MARKY_ASSET_OUTSIDE_BASE",
        `Local asset ${value} resolves outside the document base ${basePath}.`,
      );
    }
  }

  return resolved.href;
}

function toBaseUrl(baseUrl: string): URL {
  if (/^[a-z][a-z0-9+.-]*:/i.test(baseUrl)) {
    const url = new URL(baseUrl);
    if (!url.href.endsWith("/")) {
      return new URL(`${url.href}/`);
    }
    return url;
  }

  return pathToFileURL(`${resolve(baseUrl)}/`);
}

export function renderHtmlShell(document: RenderedMarkdownDocument, options: Pick<ResolvedRenderOptions, "css" | "theme"> = defaultRenderOptions): string {
  const title = document.title ?? "Marky document";
  const stylesheets = options.css
    .map((cssPath) => `  <link rel="stylesheet" href="${escapeHtml(pathToFileURL(cssPath).href)}">`)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
${stylesheets}
  <style>
    :root {
      color: #1f2933;
      background: #ffffff;
      font-family: ui-serif, Georgia, "Times New Roman", serif;
      line-height: 1.55;
    }

    body {
      margin: 0;
      padding: 48px;
    }

    main {
      max-width: 760px;
      margin: 0 auto;
    }

    h1,
    h2,
    h3 {
      color: #101828;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.2;
    }

    code,
    pre {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    }

    pre {
      overflow-wrap: break-word;
      white-space: pre-wrap;
    }

    @page {
      margin: 18mm;
    }

    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <main>${document.html}</main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function defaultPdfPath(inputPath: string): string {
  const extension = extname(inputPath);
  return extension.length > 0 ? `${inputPath.slice(0, -extension.length)}.pdf` : `${inputPath}.pdf`;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}
