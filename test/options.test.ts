import { describe, expect, it } from "vitest";
import { resolveRenderOptions } from "../src/index.js";

describe("resolveRenderOptions", () => {
  it("applies explicit options over frontmatter, config, and defaults", () => {
    const options = resolveRenderOptions({
      inputPath: "/docs/report.md",
      config: {
        theme: "config-theme",
        rawHtml: "sanitize",
        force: false,
        pdf: { format: "Letter", printBackground: false },
      },
      frontmatter: {
        theme: "frontmatter-theme",
        rawHtml: "escape",
        force: false,
        pdf: { format: "Legal" },
      },
      explicit: {
        theme: "explicit-theme",
        rawHtml: "allow",
        force: true,
        pdf: { printBackground: true },
      },
    });

    expect(options.theme).toBe("explicit-theme");
    expect(options.rawHtml).toBe("allow");
    expect(options.force).toBe(true);
    expect(options.pdf).toEqual({
      format: "Legal",
      printBackground: true,
    });
    expect(options.timeoutMs).toBe(30_000);
  });

  it("resolves frontmatter CSS from the markdown file and config CSS from the config file", () => {
    const options = resolveRenderOptions({
      inputPath: "/project/docs/report.md",
      configPath: "/project/marky.config.json",
      config: {
        css: ["./theme/base.css"],
      },
      frontmatter: {
        css: ["./report.css", "/shared/print.css"],
      },
    });

    expect(options.css).toEqual([
      "/project/theme/base.css",
      "/project/docs/report.css",
      "/shared/print.css",
    ]);
  });
});
