import { describe, expect, it } from "vitest";
import { MarkyRenderError, normalizeRenderError } from "../src/index.js";

describe("normalizeRenderError", () => {
  it("maps missing Playwright browser failures to a stable error code", () => {
    const error = normalizeRenderError(new Error("Executable doesn't exist at /tmp/chromium"));

    expect(error).toBeInstanceOf(MarkyRenderError);
    expect(error.code).toBe("MARKY_BROWSER_MISSING");
    expect(error.message).toContain("npx playwright install chromium");
  });
});
