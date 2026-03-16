#!/usr/bin/env node

import { Command, CommanderError } from "commander";
import { version } from "./auth.js";
import { registerAdminCommands } from "./commands/admin.js";
import { registerReportingCommands } from "./commands/reporting.js";

async function main() {
  const program = new Command();

  program
    .name("google-analytics-cli")
    .description("Google Analytics CLI for AI agents")
    .version(version)
    .option(
      "--format <format>",
      "Output format",
      (value: string) => {
        if (!["json", "compact"].includes(value)) {
          throw new Error("Format must be 'json' or 'compact'.");
        }
        return value;
      },
      "json",
    )
    .option(
      "--property <id>",
      "GA4 property ID (or set GA_PROPERTY_ID)",
      process.env.GA_PROPERTY_ID,
    );

  program.exitOverride();
  program.configureOutput({
    writeErr: (str) =>
      process.stderr.write(JSON.stringify({ error: str.trim() }) + "\n"),
    writeOut: (str) => process.stdout.write(str),
  });

  registerAdminCommands(program);
  registerReportingCommands(program);

  try {
    await program.parseAsync();
  } catch (err) {
    if (err instanceof CommanderError && err.exitCode === 0) {
      process.exit(0);
    }
    const code = err instanceof CommanderError ? err.exitCode : 1;
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(JSON.stringify({ error: message }) + "\n");
    process.exit(code);
  }
}

main();
