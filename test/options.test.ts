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
        pdf: { format: "Letter", printBackground: false, scale: 0.9 },
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
        pdf: {
          printBackground: true,
          landscape: true,
          margin: { top: "12mm", right: "10mm", bottom: "12mm", left: "10mm" },
        },
      },
    });

    expect(options.theme).toBe("explicit-theme");
    expect(options.rawHtml).toBe("allow");
    expect(options.force).toBe(true);
    expect(options.pdf).toEqual({
      format: "Legal",
      landscape: true,
      margin: { top: "12mm", right: "10mm", bottom: "12mm", left: "10mm" },
      printBackground: true,
      scale: 0.9,
    });
    expect(options.network).toBe("allow");
    expect(options.waitUntil).toBe("load");
    expect(options.waitForFonts).toBe(true);
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

  it("resolves config output paths relative to the config file", () => {
    const options = resolveRenderOptions({
      inputPath: "/project/docs/report.md",
      configPath: "/project/config/marky.config.json",
      config: {
        outputPath: "./pdf/report.pdf",
      },
    });

    expect(options.outputPath).toBe("/project/config/pdf/report.pdf");
  });

  it("does not let absent frontmatter keys erase config values", () => {
    const options = resolveRenderOptions({
      inputPath: "/project/docs/report.md",
      config: {
        rawHtml: "allow",
        network: "block",
        waitUntil: "networkidle",
        waitForFonts: false,
      },
      frontmatter: {},
    });

    expect(options.rawHtml).toBe("allow");
    expect(options.network).toBe("block");
    expect(options.waitUntil).toBe("networkidle");
    expect(options.waitForFonts).toBe(false);
  });

  it("accepts professional feature inputs from public options and frontmatter", () => {
    const options = resolveRenderOptions({
      inputPath: "/project/docs/report.md",
      config: {
        cover: true,
        toc: { title: "Config contents", depth: 3 },
        pagination: false,
        backPage: { title: "Config back", logo: "./config-logo.svg" },
      },
      frontmatter: {
        cover: {
          title: "Frontmatter title",
          subtitle: "Frontmatter subtitle",
          unknown: "ignored",
        },
        toc: false,
        pagination: { title: "Frontmatter pages" },
        backPage: true,
      },
      explicit: {
        cover: false,
        backPage: {
          title: "Explicit back",
          text: "Thanks for reading.",
          website: "https://example.com",
          email: "hello@example.com",
          logo: "./explicit-logo.svg",
        },
      },
    });

    expect(options.cover).toBe(false);
    expect(options.toc).toBe(false);
    expect(options.pagination).toEqual({ title: "Frontmatter pages" });
    expect(options.backPage).toEqual({
      title: "Explicit back",
      text: "Thanks for reading.",
      website: "https://example.com",
      email: "hello@example.com",
      logo: "./explicit-logo.svg",
    });
  });
});
