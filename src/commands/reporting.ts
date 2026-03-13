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
    .option("--limit <n>", "Max rows to return (<=250000)", parseInt)
    .option("--offset <n>", "Row offset for pagination", parseInt)
    .option("--currency-code <code>", "ISO4217 currency code")
    .option("--return-property-quota", "Include property quota in response")
    .action(async (_propertyId, opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      const property = resolvePropertyId(cmd);
      await run(async () => {
        const request: Record<string, unknown> = {
          property,
          dimensions: opts.dimensions
            .split(",")
            .map((name: string) => ({ name })),
          metrics: opts.metrics.split(",").map((name: string) => ({ name })),
          dateRanges: parseJson(opts.dateRanges),
        };
        if (opts.dimensionFilter)
          request.dimensionFilter = parseJson(opts.dimensionFilter);
        if (opts.metricFilter)
          request.metricFilter = parseJson(opts.metricFilter);
        if (opts.orderBy) request.orderBys = parseJson(opts.orderBy);
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
    .option("--limit <n>", "Max rows to return (<=250000)", parseInt)
    .option("--offset <n>", "Row offset for pagination", parseInt)
    .option("--return-property-quota", "Include property quota in response")
    .action(async (_propertyId, opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      const property = resolvePropertyId(cmd);
      await run(async () => {
        const request: Record<string, unknown> = {
          property,
          dimensions: opts.dimensions
            .split(",")
            .map((name: string) => ({ name })),
          metrics: opts.metrics.split(",").map((name: string) => ({ name })),
        };
        if (opts.dimensionFilter)
          request.dimensionFilter = parseJson(opts.dimensionFilter);
        if (opts.metricFilter)
          request.metricFilter = parseJson(opts.metricFilter);
        if (opts.orderBy) request.orderBys = parseJson(opts.orderBy);
        if (opts.limit != null) request.limit = opts.limit;
        if (opts.offset != null) request.offset = opts.offset;
        if (opts.returnPropertyQuota) request.returnPropertyQuota = true;

        const client = createDataClient();
        const [response] = await client.runRealtimeReport(request);
        return response;
      }, format);
    });
}
