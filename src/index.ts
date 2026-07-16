import { mkdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import { chromium } from "playwright";
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
  timeoutMs?: number;
  config?: RenderOptionsInput;
  configPath?: string;
}

export interface RenderMarkdownToPdfResult {
  inputPath: string;
  outputPath: string;
}

export interface RenderedMarkdownDocument {
  html: string;
  title?: string;
  author?: string;
  metadata: Record<string, unknown>;
}

export type RawHtmlMode = "sanitize" | "escape" | "allow";
export type NetworkPolicy = "offline" | "allow";
export type PageReadyState = "load" | "domcontentloaded" | "networkidle";

export interface PdfOptions {
  format: "A4" | "Letter" | "Legal";
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
  timeoutMs: number;
}

export interface RenderMarkdownDocumentOptions {
  rawHtml?: RawHtmlMode;
}

const defaultRenderOptions: Omit<ResolvedRenderOptions, "inputPath" | "outputPath"> = {
  force: false,
  rawHtml: "sanitize",
  theme: "default",
  css: [],
  pdf: {
    format: "A4",
    printBackground: true,
  },
  network: "offline",
  waitUntil: "networkidle",
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

  const document = await renderMarkdownDocument(markdown, { rawHtml: resolvedOptions.rawHtml });
  const html = renderHtmlShell(document, resolvedOptions);

  await mkdir(dirname(resolvedOptions.outputPath), { recursive: true });

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    if (resolvedOptions.network === "offline") {
      await page.route(/^https?:\/\//, (route) => route.abort());
    }
    await page.setContent(html, { waitUntil: resolvedOptions.waitUntil, timeout: resolvedOptions.timeoutMs });
    await page.pdf({
      format: resolvedOptions.pdf.format,
      path: resolvedOptions.outputPath,
      printBackground: resolvedOptions.pdf.printBackground,
    });
  } finally {
    await browser.close();
  }

  return {
    inputPath: resolvedInputPath,
    outputPath: resolvedOptions.outputPath,
  };
}

export function resolveRenderOptions(input: ResolveRenderOptionsInput): ResolvedRenderOptions {
  const inputPath = resolve(input.inputPath);
  const frontmatter = frontmatterToRenderOptions(input.frontmatter ?? {});
  const merged = mergeRenderOptions(input.config, frontmatter, input.explicit);
  const outputPath = resolvePath(merged.outputPath ?? defaultPdfPath(inputPath), process.cwd());

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
      printBackground: merged.pdf?.printBackground ?? defaultRenderOptions.pdf.printBackground,
    },
    network: merged.network ?? defaultRenderOptions.network,
    waitUntil: merged.waitUntil ?? defaultRenderOptions.waitUntil,
    timeoutMs: merged.timeoutMs ?? defaultRenderOptions.timeoutMs,
  };
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
  return {
    outputPath: readString(frontmatter.outputPath),
    force: readBoolean(frontmatter.force),
    rawHtml: readEnum(frontmatter.rawHtml, ["sanitize", "escape", "allow"]),
    theme: readString(frontmatter.theme),
    css: readStringArray(frontmatter.css),
    pdf: readPdfOptions(frontmatter.pdf),
    network: readEnum(frontmatter.network, ["offline", "allow"]),
    waitUntil: readEnum(frontmatter.waitUntil, ["load", "domcontentloaded", "networkidle"]),
    timeoutMs: readNumber(frontmatter.timeoutMs),
  };
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
  return {
    format: readEnum(pdf.format, ["A4", "Letter", "Legal"]),
    printBackground: readBoolean(pdf.printBackground),
  };
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
    html: String(file),
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
