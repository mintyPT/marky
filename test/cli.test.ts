import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execa } from "execa";
import { afterEach, describe, expect, it } from "vitest";

const workspaces: string[] = [];

async function createWorkspace(): Promise<string> {
  const workspace = await mkdtemp(join(tmpdir(), "marky-cli-"));
  workspaces.push(workspace);
  return workspace;
}

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((workspace) => rm(workspace, { recursive: true, force: true })));
});

describe("cli", () => {
  it("renders a Markdown file to the requested PDF path", async () => {
    const workspace = await createWorkspace();
    const inputPath = join(workspace, "notes.md");
    const outputPath = join(workspace, "out", "notes.pdf");
    await writeFile(inputPath, "# Notes\n\nRendered from the CLI.\n");

    const result = await execa("tsx", ["src/cli/index.ts", "render", inputPath, outputPath]);
    const pdf = await readFile(outputPath);

    expect(result.stdout).toContain(outputPath);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.byteLength).toBeGreaterThan(1_000);
  }, 30_000);

  it("passes the force flag through to the renderer", async () => {
    const workspace = await createWorkspace();
    const inputPath = join(workspace, "notes.md");
    const outputPath = join(workspace, "notes.pdf");
    await writeFile(inputPath, "# Notes\n");
    await writeFile(outputPath, "existing");

    await execa("tsx", ["src/cli/index.ts", "render", inputPath, outputPath, "--force"]);
    const pdf = await readFile(outputPath);

    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  }, 30_000);

  it("accepts stable Playwright rendering controls", async () => {
    const workspace = await createWorkspace();
    const inputPath = join(workspace, "notes.md");
    const outputPath = join(workspace, "notes.pdf");
    await writeFile(inputPath, "# Notes\n");

    await execa("tsx", [
      "src/cli/index.ts",
      "render",
      inputPath,
      outputPath,
      "--pdf-format",
      "Letter",
      "--pdf-margin",
      "8mm",
      "--landscape",
      "--scale",
      "0.9",
      "--no-print-background",
      "--network",
      "block",
      "--wait-until",
      "load",
      "--no-wait-for-fonts",
      "--timeout-ms",
      "30000",
    ]);
    const pdf = await readFile(outputPath);

    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  }, 30_000);
});
