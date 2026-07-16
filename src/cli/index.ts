#!/usr/bin/env node
import { Command } from "commander";
import { renderMarkdownToPdf } from "../index.js";

const program = new Command();

program.name("marky").description("Render Markdown documents to PDF.").version("0.1.0");

program
  .command("render")
  .argument("<input>", "Markdown file to render")
  .argument("[output]", "PDF path to write")
  .option("-f, --force", "Overwrite an existing output file", false)
  .description("Render one Markdown file to PDF.")
  .action(async (input: string, output: string | undefined, options: { force: boolean }) => {
    const result = await renderMarkdownToPdf(input, {
      outputPath: output,
      force: options.force,
    });

    console.log(`Wrote ${result.outputPath}`);
  });

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
