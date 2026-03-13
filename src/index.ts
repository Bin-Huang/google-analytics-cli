#!/usr/bin/env node

import { Command } from "commander";

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

program.parse();
