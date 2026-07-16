import { mkdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
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

export interface RenderMarkdownDocumentOptions {
  rawHtml?: RawHtmlMode;
}

export async function renderMarkdownToPdf(
  inputPath: string,
  options: RenderMarkdownToPdfOptions = {},
): Promise<RenderMarkdownToPdfResult> {
  const resolvedInputPath = resolve(inputPath);
  const resolvedOutputPath = resolve(options.outputPath ?? defaultPdfPath(resolvedInputPath));

  if (!options.force && (await pathExists(resolvedOutputPath))) {
    throw new Error(`Refusing to overwrite existing output: ${resolvedOutputPath}`);
  }

  const markdown = await readFile(resolvedInputPath, "utf8");
  const document = await renderMarkdownDocument(markdown, { rawHtml: options.rawHtml });
  const html = renderHtmlShell(document);

  await mkdir(dirname(resolvedOutputPath), { recursive: true });

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.pdf({
      format: "A4",
      path: resolvedOutputPath,
      printBackground: true,
    });
  } finally {
    await browser.close();
  }

  return {
    inputPath: resolvedInputPath,
    outputPath: resolvedOutputPath,
  };
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

export function renderHtmlShell(document: RenderedMarkdownDocument): string {
  const title = document.title ?? "Marky document";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
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
