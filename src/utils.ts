import { Command } from "commander";

export function resolvePropertyId(cmd: Command): string {
  const opts = cmd.optsWithGlobals();
  const pid = cmd.args[0] || opts.property;
  if (!pid) {
    errorJson(
      "Missing PROPERTY_ID. Provide it as an argument, via --property, or set GA_PROPERTY_ID.",
    );
  }
  return String(pid).startsWith("properties/") ? pid : `properties/${pid}`;
}

export function outputJson(data: unknown, format: string): void {
  const indent = format === "json" ? 2 : undefined;
  process.stdout.write(JSON.stringify(data, null, indent) + "\n");
}

export function errorJson(message: string): never {
  process.stderr.write(JSON.stringify({ error: message }) + "\n");
  process.exit(1);
}

export async function run(
  fn: () => Promise<unknown>,
  format: string,
): Promise<void> {
  try {
    const data = await fn();
    outputJson(data, format);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    errorJson(message);
  }
}
