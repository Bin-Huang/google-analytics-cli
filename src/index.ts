#!/usr/bin/env node

import { Command } from "commander";
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

  registerAdminCommands(program);
  registerReportingCommands(program);

  await program.parseAsync();
}

main();
