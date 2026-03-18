import { Command } from "commander";
import { createDataClient } from "../auth.js";
import {
  parseJson,
  parsePositiveInt,
  resolvePropertyId,
  run,
  validateDateRanges,
  validateFilter,
  validateOrderBy,
} from "../utils.js";

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
    .command("metadata [property_id]")
    .description("Get full metadata (all dimensions and metrics) for a property")
    .action(async (_propertyId, _opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      const property = resolvePropertyId(cmd);
      await run(async () => {
        const client = createDataClient();
        const [metadata] = await client.getMetadata({
          name: `${property}/metadata`,
        });
        return metadata;
      }, format);
    });

  program
    .command("check-compatibility [property_id]")
    .description("Check compatibility of dimensions and metrics")
    .option("--dimensions <names>", "Comma-separated dimension names")
    .option("--metrics <names>", "Comma-separated metric names")
    .option("--dimension-filter <json>", "JSON FilterExpression for dimensions")
    .option("--metric-filter <json>", "JSON FilterExpression for metrics")
    .action(async (_propertyId, opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      const property = resolvePropertyId(cmd);
      await run(async () => {
        const request: Record<string, unknown> = { property };
        if (opts.dimensions) {
          request.dimensions = opts.dimensions
            .split(",")
            .map((s: string) => ({ name: s.trim() }));
        }
        if (opts.metrics) {
          request.metrics = opts.metrics
            .split(",")
            .map((s: string) => ({ name: s.trim() }));
        }
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
        const client = createDataClient();
        const [response] = await client.checkCompatibility(request);
        return response;
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
    .option("--keep-empty-rows", "Include empty rows in the response")
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
        if (opts.keepEmptyRows) request.keepEmptyRows = true;
        if (opts.returnPropertyQuota) request.returnPropertyQuota = true;

        const client = createDataClient();
        const [response] = await client.runReport(request);
        return response;
      }, format);
    });

  program
    .command("pivot-report [property_id]")
    .description("Run a Google Analytics pivot report")
    .requiredOption("--dimensions <names>", "Comma-separated dimension names")
    .requiredOption("--metrics <names>", "Comma-separated metric names")
    .requiredOption("--date-ranges <json>", "JSON array of date ranges")
    .requiredOption("--pivots <json>", "JSON array of pivot definitions")
    .option("--dimension-filter <json>", "JSON FilterExpression for dimensions")
    .option("--metric-filter <json>", "JSON FilterExpression for metrics")
    .option("--currency-code <code>", "ISO4217 currency code")
    .option("--keep-empty-rows", "Include rows with all zero metric values")
    .option("--return-property-quota", "Include property quota in response")
    .action(async (_propertyId, opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      const property = resolvePropertyId(cmd);
      await run(async () => {
        const dateRanges = parseJson(opts.dateRanges);
        validateDateRanges(dateRanges);
        const pivots = parseJson(opts.pivots);
        if (!Array.isArray(pivots)) {
          throw new Error("--pivots must be a JSON array.");
        }

        const request: Record<string, unknown> = {
          property,
          dimensions: opts.dimensions
            .split(",")
            .map((s: string) => ({ name: s.trim() })),
          metrics: opts.metrics
            .split(",")
            .map((s: string) => ({ name: s.trim() })),
          dateRanges,
          pivots,
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
        if (opts.currencyCode) request.currencyCode = opts.currencyCode;
        if (opts.keepEmptyRows) request.keepEmptyRows = true;
        if (opts.returnPropertyQuota) request.returnPropertyQuota = true;

        const client = createDataClient();
        const [response] = await client.runPivotReport(request);
        return response;
      }, format);
    });

  program
    .command("batch-report [property_id]")
    .description("Run multiple Google Analytics reports in a single batch (max 5)")
    .requiredOption("--requests <json>", "JSON array of report request objects (max 5)")
    .action(async (_propertyId, opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      const property = resolvePropertyId(cmd);
      await run(async () => {
        const requests = parseJson(opts.requests);
        if (!Array.isArray(requests)) {
          throw new Error("--requests must be a JSON array.");
        }
        if (requests.length > 5) {
          throw new Error("--requests must contain at most 5 report objects.");
        }
        const client = createDataClient();
        const [response] = await client.batchRunReports({
          property,
          requests,
        });
        return response;
      }, format);
    });

  program
    .command("audience-export-create [property_id]")
    .description("Create an audience export")
    .requiredOption("--audience <name>", "Audience resource name (e.g. properties/123/audiences/456)")
    .option("--dimensions <names>", "Comma-separated dimension names")
    .action(async (_propertyId, opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      const parent = resolvePropertyId(cmd);
      await run(async () => {
        const audienceExport: Record<string, unknown> = {
          audience: opts.audience,
        };
        if (opts.dimensions) {
          audienceExport.dimensions = opts.dimensions
            .split(",")
            .map((s: string) => ({ dimensionName: s.trim() }));
        }
        const client = createDataClient();
        const [operation] = await client.createAudienceExport({
          parent,
          audienceExport,
        });
        return operation;
      }, format);
    });

  program
    .command("audience-export [property_id] <name>")
    .description("Get an audience export by name")
    .action(async (_propertyId, exportName: string, _opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      await run(async () => {
        const client = createDataClient();
        const [response] = await client.getAudienceExport({ name: exportName });
        return response;
      }, format);
    });

  program
    .command("audience-exports [property_id]")
    .description("List audience exports for a property")
    .action(async (_propertyId, _opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      const parent = resolvePropertyId(cmd);
      await run(async () => {
        const client = createDataClient();
        const [response] = await client.listAudienceExports({ parent });
        return response;
      }, format);
    });

  program
    .command("audience-export-query [property_id] <name>")
    .description("Query rows from an audience export")
    .option("--limit <n>", "Max rows to return", parsePositiveInt)
    .option("--offset <n>", "Row offset for pagination", parsePositiveInt)
    .action(async (_propertyId, exportName: string, opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      await run(async () => {
        const request: Record<string, unknown> = { name: exportName };
        if (opts.limit != null) request.limit = opts.limit;
        if (opts.offset != null) request.offset = opts.offset;
        const client = createDataClient();
        const [response] = await client.queryAudienceExport(request);
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
        if (opts.returnPropertyQuota) request.returnPropertyQuota = true;

        const client = createDataClient();
        const [response] = await client.runRealtimeReport(request);
        return response;
      }, format);
    });
}
