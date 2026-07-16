import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildMarkdownPdfs } from "../src/index.js";

const workspaces: string[] = [];

async function createWorkspace(): Promise<string> {
  const workspace = await mkdtemp(join(tmpdir(), "marky-build-"));
  workspaces.push(workspace);
  return workspace;
}

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((workspace) => rm(workspace, { recursive: true, force: true })));
});

describe("buildMarkdownPdfs", () => {
  it("discovers Markdown inputs and preserves paths under the output directory", async () => {
    const workspace = await createWorkspace();
    await mkdir(join(workspace, "docs", "guide"), { recursive: true });
    await writeFile(join(workspace, "docs", "index.md"), "# Home\n");
    await writeFile(join(workspace, "docs", "guide", "intro.md"), "# Intro\n");

    const result = await buildMarkdownPdfs({
      cwd: workspace,
      config: {
        build: {
          inputs: ["docs/**/*.md"],
          rootDir: "docs",
          outDir: "pdf",
        },
      },
    });

    expect(result.failures).toEqual([]);
    expect(result.successes.map((success) => success.outputPath).sort()).toEqual([
      join(workspace, "pdf", "guide", "intro.pdf"),
      join(workspace, "pdf", "index.pdf"),
    ]);
    await expect(readFile(join(workspace, "pdf", "index.pdf"))).resolves.toSatisfy((pdf: Buffer) => {
      return pdf.subarray(0, 4).toString() === "%PDF" && pdf.byteLength > 1_000;
    });
  }, 45_000);

  it("reports ambiguous output mapping as a structured failure", async () => {
    const workspace = await createWorkspace();
    await mkdir(join(workspace, "docs"), { recursive: true });
    await writeFile(join(workspace, "docs", "index.md"), "# Home\n");

    const result = await buildMarkdownPdfs({
      cwd: workspace,
      inputs: ["docs/**/*.md"],
      rootDir: "other",
      outDir: "pdf",
    });

    expect(result.successes).toEqual([]);
    expect(result.failures).toEqual([
      expect.objectContaining({
        inputPath: join(workspace, "docs", "index.md"),
        error: expect.objectContaining({ code: "MARKY_BUILD_AMBIGUOUS_OUTPUT" }),
      }),
    ]);
  }, 30_000);
});
