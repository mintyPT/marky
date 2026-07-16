import { mkdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { chromium } from "playwright";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export interface RenderMarkdownToPdfOptions {
  outputPath?: string;
  force?: boolean;
}

export interface RenderMarkdownToPdfResult {
  inputPath: string;
  outputPath: string;
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
  const content = await renderMarkdownToHtml(markdown);
  const html = renderHtmlShell(content);

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

async function renderMarkdownToHtml(markdown: string): Promise<string> {
  const file = await unified().use(remarkParse).use(remarkRehype).use(rehypeStringify).process(markdown);
  return String(file);
}

function renderHtmlShell(content: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Marky document</title>
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
  <main>${content}</main>
</body>
</html>`;
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
