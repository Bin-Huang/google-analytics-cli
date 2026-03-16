#!/usr/bin/env node

import { Command, CommanderError } from "commander";
import { setCredentialsPath, version } from "./auth.js";
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
    )
    .option(
      "--credentials <path>",
      "Path to service account JSON key file",
    );

  program.exitOverride();
  program.configureOutput({
    writeErr: (str) =>
      process.stderr.write(JSON.stringify({ error: str.trim() }) + "\n"),
    writeOut: (str) => process.stdout.write(str),
  });

  program.hook("preAction", (thisCommand) => {
    const { credentials } = thisCommand.optsWithGlobals();
    if (credentials) setCredentialsPath(credentials);
  });

  registerAdminCommands(program);
  registerReportingCommands(program);

  // No args: show help and exit cleanly
  if (process.argv.length <= 2) {
    program.outputHelp();
    process.exit(0);
  }

  try {
    await program.parseAsync();
  } catch (err) {
    if (err instanceof CommanderError) {
      // Commander already wrote to writeErr; just exit with its code
      process.exit(err.exitCode);
    }
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(JSON.stringify({ error: message }) + "\n");
    process.exit(1);
  }
}

main();
