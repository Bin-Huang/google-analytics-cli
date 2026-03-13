#!/usr/bin/env node

import { Command } from "commander";
import { registerAdminCommands } from "./commands/admin.js";
import { registerReportingCommands } from "./commands/reporting.js";

const program = new Command();

program
  .name("google-analytics-cli")
  .description("Google Analytics CLI for AI agents")
  .version("1.0.0")
  .option("--format <format>", "Output format (json or jsonl)", "json")
  .option(
    "--property <id>",
    "GA4 property ID (or set GA_PROPERTY_ID)",
    process.env.GA_PROPERTY_ID,
  );

registerAdminCommands(program);
registerReportingCommands(program);

program.parse();
