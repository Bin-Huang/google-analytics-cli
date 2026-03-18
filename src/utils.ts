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

export function resolveAccountId(id: string): string {
  return id.startsWith("accounts/") ? id : `accounts/${id}`;
}

export function outputJson(data: unknown, format: string): void {
  const indent = format === "json" ? 2 : undefined;
  process.stdout.write(JSON.stringify(data ?? null, null, indent) + "\n");
}

interface ApiError extends Error {
  code?: number | string;
  details?: string;
  statusDetails?: unknown;
}

export function errorJson(message: string, err?: unknown): never {
  const output: Record<string, unknown> = { error: message };
  if (err && typeof err === "object") {
    const apiErr = err as ApiError;
    if (apiErr.code != null) output.code = apiErr.code;
    if (apiErr.details) output.details = apiErr.details;
  }
  process.stderr.write(JSON.stringify(output) + "\n");
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
    errorJson(message, err);
  }
}

export async function collectAsync<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterable) {
    items.push(item);
  }
  return items;
}

export function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Invalid JSON: ${value}`);
  }
}

export function parsePositiveInt(value: string): number {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 0) {
    throw new Error(`Expected a non-negative integer, got: ${value}`);
  }
  return n;
}

export function validateDateRanges(value: unknown): void {
  if (!Array.isArray(value)) {
    throw new Error("--date-ranges must be a JSON array.");
  }
}

export function validateOrderBy(value: unknown): void {
  if (!Array.isArray(value)) {
    throw new Error("--order-by must be a JSON array.");
  }
}

export function validateFilter(value: unknown, name: string): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be a JSON object.`);
  }
}
