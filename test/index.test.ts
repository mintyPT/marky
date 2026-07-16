import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { renderMarkdownToPdf } from "../src/index.js";

const workspaces: string[] = [];

async function createWorkspace(): Promise<string> {
  const workspace = await mkdtemp(join(tmpdir(), "marky-"));
  workspaces.push(workspace);
  return workspace;
}

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((workspace) => rm(workspace, { recursive: true, force: true })));
});

describe("renderMarkdownToPdf", () => {
  it("renders one Markdown file to a non-empty PDF", async () => {
    const workspace = await createWorkspace();
    const inputPath = join(workspace, "notes.md");
    const outputPath = join(workspace, "out", "notes.pdf");
    await writeFile(inputPath, "# Notes\n\nThis is rendered by Marky.\n");

    const result = await renderMarkdownToPdf(inputPath, { outputPath });
    const pdf = await readFile(outputPath);

    expect(result.outputPath).toBe(outputPath);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.byteLength).toBeGreaterThan(1_000);
  });

  it("defaults the output path next to the input document", async () => {
    const workspace = await createWorkspace();
    const inputPath = join(workspace, "notes.md");
    const expectedOutputPath = join(workspace, "notes.pdf");
    await writeFile(inputPath, "# Notes\n");

    const result = await renderMarkdownToPdf(inputPath);
    const pdf = await readFile(expectedOutputPath);

    expect(result.outputPath).toBe(expectedOutputPath);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("refuses to overwrite an existing output unless forced", async () => {
    const workspace = await createWorkspace();
    const inputPath = join(workspace, "notes.md");
    const outputPath = join(workspace, "notes.pdf");
    await writeFile(inputPath, "# Notes\n");
    await writeFile(outputPath, "existing");

    await expect(renderMarkdownToPdf(inputPath, { outputPath })).rejects.toThrow("Refusing to overwrite");

    await renderMarkdownToPdf(inputPath, { outputPath, force: true });
    const pdf = await readFile(outputPath);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("uses normalized render options from frontmatter config and explicit inputs", async () => {
    const workspace = await createWorkspace();
    const inputPath = join(workspace, "notes.md");
    const outputPath = join(workspace, "notes.pdf");
    await writeFile(
      inputPath,
      `---
rawHtml: allow
pdf:
  format: Letter
---

<script>window.markyUnsafe = true</script>
# Notes
`,
    );
    await writeFile(outputPath, "existing");

    const result = await renderMarkdownToPdf(inputPath, {
      outputPath,
      force: true,
      rawHtml: "sanitize",
      config: {
        force: false,
        pdf: { format: "A4" },
      },
    });
    const pdf = await readFile(outputPath);

    expect(result.outputPath).toBe(outputPath);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  }, 30_000);
});
