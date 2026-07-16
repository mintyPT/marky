#!/usr/bin/env node
import { Command } from "commander";
import {
  type NetworkPolicy,
  type PageReadyState,
  type PdfOptions,
  type RawHtmlMode,
  renderMarkdownToPdf,
} from "../index.js";

const program = new Command();

program.name("marky").description("Render Markdown documents to PDF.").version("0.1.0");

program
  .command("render")
  .argument("<input>", "Markdown file to render")
  .argument("[output]", "PDF path to write")
  .option("-f, --force", "Overwrite an existing output file", false)
  .option("--raw-html <mode>", "Raw HTML policy: sanitize, escape, or allow", parseRawHtmlMode)
  .option("--pdf-format <format>", "PDF page format: A4, Letter, or Legal", parsePdfFormat)
  .option("--pdf-margin <margin>", "PDF margin to apply on every side")
  .option("--landscape", "Render PDF pages in landscape orientation", false)
  .option("--scale <scale>", "PDF render scale from 0.1 to 2", parseScale)
  .option("--no-print-background", "Disable CSS background printing")
  .option("--network <policy>", "Network policy: allow or block", parseNetworkPolicy)
  .option("--wait-until <state>", "Page readiness state: load, domcontentloaded, or networkidle", parseWaitUntil)
  .option("--no-wait-for-fonts", "Do not wait for document fonts before PDF capture")
  .option("--timeout-ms <ms>", "Page readiness timeout in milliseconds", parsePositiveInteger)
  .description("Render one Markdown file to PDF.")
  .action(
    async (
      input: string,
      output: string | undefined,
      options: {
        force: boolean;
        rawHtml?: RawHtmlMode;
        pdfFormat?: PdfOptions["format"];
        pdfMargin?: string;
        landscape: boolean;
        scale?: number;
        printBackground: boolean;
        network?: NetworkPolicy;
        waitUntil?: PageReadyState;
        waitForFonts: boolean;
        timeoutMs?: number;
      },
    ) => {
      const result = await renderMarkdownToPdf(input, {
        outputPath: output,
        force: options.force,
        rawHtml: options.rawHtml,
        pdf: {
          format: options.pdfFormat,
          margin: options.pdfMargin
            ? {
                top: options.pdfMargin,
                right: options.pdfMargin,
                bottom: options.pdfMargin,
                left: options.pdfMargin,
              }
            : undefined,
          landscape: options.landscape || undefined,
          scale: options.scale,
          printBackground: options.printBackground,
        },
        network: options.network,
        waitUntil: options.waitUntil,
        waitForFonts: options.waitForFonts,
        timeoutMs: options.timeoutMs,
      });

      console.log(`Wrote ${result.outputPath}`);
    },
  );

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});

function parseRawHtmlMode(value: string): RawHtmlMode {
  return parseEnum(value, ["sanitize", "escape", "allow"], "raw HTML mode");
}

function parsePdfFormat(value: string): PdfOptions["format"] {
  return parseEnum(value, ["A4", "Letter", "Legal"], "PDF format");
}

function parseNetworkPolicy(value: string): NetworkPolicy {
  return parseEnum(value, ["allow", "block"], "network policy");
}

function parseWaitUntil(value: string): PageReadyState {
  return parseEnum(value, ["load", "domcontentloaded", "networkidle"], "readiness state");
}

function parseScale(value: string): number {
  const scale = Number(value);
  if (!Number.isFinite(scale) || scale < 0.1 || scale > 2) {
    throw new Error("Scale must be a number from 0.1 to 2.");
  }
  return scale;
}

function parsePositiveInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("Timeout must be a positive integer.");
  }
  return parsed;
}

function parseEnum<const Value extends string>(value: string, values: readonly Value[], label: string): Value {
  if (values.includes(value as Value)) {
    return value as Value;
  }

  throw new Error(`Invalid ${label}: ${value}. Expected one of ${values.join(", ")}.`);
}
