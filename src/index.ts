#!/usr/bin/env node

import { Command, CommanderError } from "commander";
import { setCredentialsPath, setProfile, version } from "./auth.js";
import { registerAdminCommands } from "./commands/admin.js";
import { registerProfilesCommands } from "./commands/profiles.js";
import { registerReportingCommands } from "./commands/reporting.js";

async function main() {
  const program = new Command();

  program
    .name("google-analytics-cli")
    .description("Google Analytics CLI & Skills for AI agents")
    .addHelpText("after", "\nDocs: https://github.com/Bin-Huang/google-analytics-cli")
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
    )
    .option(
      "--profile <name>",
      "Named credentials profile under ~/.config/google-analytics-cli/profiles/ (or set GA_PROFILE)",
      process.env.GA_PROFILE,
    );

  program.exitOverride();
  program.configureOutput({
    writeErr: (str) =>
      process.stderr.write(JSON.stringify({ error: str.trim() }) + "\n"),
    writeOut: (str) => process.stdout.write(str),
  });

  program.hook("preAction", (thisCommand) => {
    const { credentials, profile } = thisCommand.optsWithGlobals();
    // GA_PROFILE only sets the default for --profile, so an explicit
    // --credentials flag overrides it. Only the two flags together conflict.
    const profileFromFlag = thisCommand.getOptionValueSource("profile") === "cli";
    if (credentials && profileFromFlag) {
      throw new Error(
        "--credentials and --profile cannot be used together. Use one or the other.",
      );
    }
    if (credentials) {
      setCredentialsPath(credentials);
    } else if (profile) {
      setProfile(profile);
    }
  });

  registerAdminCommands(program);
  registerReportingCommands(program);
  registerProfilesCommands(program);

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
