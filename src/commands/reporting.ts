import { Command } from "commander";
import { createDataClient } from "../auth.js";
import { resolvePropertyId, run } from "../utils.js";

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Invalid JSON: ${value}`);
  }
}

function parsePositiveInt(value: string): number {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 0) {
    throw new Error(`Expected a non-negative integer, got: ${value}`);
  }
  return n;
}

function validateDateRanges(value: unknown): void {
  if (!Array.isArray(value)) {
    throw new Error("--date-ranges must be a JSON array.");
  }
}

function validateOrderBy(value: unknown): void {
  if (!Array.isArray(value)) {
    throw new Error("--order-by must be a JSON array.");
  }
}

function validateFilter(value: unknown, name: string): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be a JSON object.`);
  }
}

export function registerReportingCommands(program: Command): void {
  program
    .command("custom-dims [property_id]")
    .description("Get custom dimensions and metrics for a property")
    .action(async (_propertyId, _opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      const property = resolvePropertyId(cmd);
      await run(async () => {
        const client = createDataClient();
        const [metadata] = await client.getMetadata({
          name: `${property}/metadata`,
        });
        return {
          custom_dimensions: (metadata.dimensions ?? []).filter(
            (d) => d.customDefinition,
          ),
          custom_metrics: (metadata.metrics ?? []).filter(
            (m) => m.customDefinition,
          ),
        };
      }, format);
    });

  program
    .command("report [property_id]")
    .description("Run a Google Analytics report")
    .requiredOption("--dimensions <names>", "Comma-separated dimension names")
    .requiredOption("--metrics <names>", "Comma-separated metric names")
    .requiredOption("--date-ranges <json>", "JSON array of date ranges")
    .option("--dimension-filter <json>", "JSON FilterExpression for dimensions")
    .option("--metric-filter <json>", "JSON FilterExpression for metrics")
    .option("--order-by <json>", "JSON array of OrderBy objects")
    .option("--limit <n>", "Max rows to return (<=250000)", parsePositiveInt)
    .option("--offset <n>", "Row offset for pagination", parsePositiveInt)
    .option("--currency-code <code>", "ISO4217 currency code")
    .option("--return-property-quota", "Include property quota in response")
    .action(async (_propertyId, opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      const property = resolvePropertyId(cmd);
      await run(async () => {
        const dateRanges = parseJson(opts.dateRanges);
        validateDateRanges(dateRanges);

        const request: Record<string, unknown> = {
          property,
          dimensions: opts.dimensions
            .split(",")
            .map((s: string) => ({ name: s.trim() })),
          metrics: opts.metrics
            .split(",")
            .map((s: string) => ({ name: s.trim() })),
          dateRanges,
        };
        if (opts.dimensionFilter) {
          const f = parseJson(opts.dimensionFilter);
          validateFilter(f, "--dimension-filter");
          request.dimensionFilter = f;
        }
        if (opts.metricFilter) {
          const f = parseJson(opts.metricFilter);
          validateFilter(f, "--metric-filter");
          request.metricFilter = f;
        }
        if (opts.orderBy) {
          const o = parseJson(opts.orderBy);
          validateOrderBy(o);
          request.orderBys = o;
        }
        if (opts.limit != null) request.limit = opts.limit;
        if (opts.offset != null) request.offset = opts.offset;
        if (opts.currencyCode) request.currencyCode = opts.currencyCode;
        if (opts.returnPropertyQuota) request.returnPropertyQuota = true;

        const client = createDataClient();
        const [response] = await client.runReport(request);
        return response;
      }, format);
    });

  program
    .command("realtime [property_id]")
    .description("Run a Google Analytics realtime report")
    .requiredOption("--dimensions <names>", "Comma-separated dimension names")
    .requiredOption("--metrics <names>", "Comma-separated metric names")
    .option("--dimension-filter <json>", "JSON FilterExpression for dimensions")
    .option("--metric-filter <json>", "JSON FilterExpression for metrics")
    .option("--order-by <json>", "JSON array of OrderBy objects")
    .option("--limit <n>", "Max rows to return (<=250000)", parsePositiveInt)
    .option("--offset <n>", "Row offset for pagination", parsePositiveInt)
    .option("--return-property-quota", "Include property quota in response")
    .action(async (_propertyId, opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      const property = resolvePropertyId(cmd);
      await run(async () => {
        const request: Record<string, unknown> = {
          property,
          dimensions: opts.dimensions
            .split(",")
            .map((s: string) => ({ name: s.trim() })),
          metrics: opts.metrics
            .split(",")
            .map((s: string) => ({ name: s.trim() })),
        };
        if (opts.dimensionFilter) {
          const f = parseJson(opts.dimensionFilter);
          validateFilter(f, "--dimension-filter");
          request.dimensionFilter = f;
        }
        if (opts.metricFilter) {
          const f = parseJson(opts.metricFilter);
          validateFilter(f, "--metric-filter");
          request.metricFilter = f;
        }
        if (opts.orderBy) {
          const o = parseJson(opts.orderBy);
          validateOrderBy(o);
          request.orderBys = o;
        }
        if (opts.limit != null) request.limit = opts.limit;
        if (opts.offset != null) request.offset = opts.offset;
        if (opts.returnPropertyQuota) request.returnPropertyQuota = true;

        const client = createDataClient();
        const [response] = await client.runRealtimeReport(request);
        return response;
      }, format);
    });
}
