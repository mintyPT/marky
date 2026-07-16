import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { defineConfig, loadMarkyConfig } from "../src/index.js";

const workspaces: string[] = [];

async function createWorkspace(): Promise<string> {
  const workspace = await mkdtemp(join(tmpdir(), "marky-config-"));
  workspaces.push(workspace);
  return workspace;
}

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((workspace) => rm(workspace, { recursive: true, force: true })));
});

describe("config", () => {
  it("exports defineConfig as a typed identity helper", () => {
    const config = {
      render: { theme: "docs" },
      build: { inputs: ["docs/**/*.md"], rootDir: "docs", outDir: "pdf", concurrency: 2 },
    };

    expect(defineConfig(config)).toBe(config);
  });

  it("loads explicit JSON and JavaScript config files", async () => {
    const workspace = await createWorkspace();
    const jsonPath = join(workspace, "marky.config.json");
    const jsPath = join(workspace, "marky.config.mjs");
    await writeFile(jsonPath, JSON.stringify({ render: { rawHtml: "escape" } }));
    await writeFile(jsPath, "export default { render: { rawHtml: 'allow' } };\n");

    await expect(loadMarkyConfig({ configPath: jsonPath })).resolves.toMatchObject({
      path: jsonPath,
      config: { render: { rawHtml: "escape" } },
    });
    await expect(loadMarkyConfig({ configPath: jsPath })).resolves.toMatchObject({
      path: jsPath,
      config: { render: { rawHtml: "allow" } },
    });
  });

  it("discovers default config filenames from the current directory", async () => {
    const workspace = await createWorkspace();
    const nested = join(workspace, "docs", "guide");
    await mkdir(nested, { recursive: true });
    const configPath = join(workspace, "marky.config.json");
    await writeFile(configPath, JSON.stringify({ render: { theme: "manual" } }));

    await expect(loadMarkyConfig({ cwd: nested })).resolves.toMatchObject({
      path: configPath,
      config: { render: { theme: "manual" } },
    });
  });

  it("reports stable config errors", async () => {
    const workspace = await createWorkspace();
    const configPath = join(workspace, "marky.config.json");
    await writeFile(configPath, "{ nope");

    await expect(loadMarkyConfig({ configPath: join(workspace, "missing.json") })).rejects.toMatchObject({
      code: "MARKY_CONFIG_NOT_FOUND",
    });
    await expect(loadMarkyConfig({ configPath })).rejects.toMatchObject({
      code: "MARKY_CONFIG_INVALID",
    });
  });
});
