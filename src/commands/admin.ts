import { Command } from "commander";
import { createAdminAlphaClient, createAdminClient } from "../auth.js";
import {
  collectAsync,
  parseJson,
  parsePositiveInt,
  resolveAccountId,
  resolvePropertyId,
  run,
  validateDateRanges,
  validateFilter,
  validateOrderBy,
} from "../utils.js";

export function registerAdminCommands(program: Command): void {
  program
    .command("accounts")
    .description("List account summaries (accounts and their properties)")
    .action(async (_opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      await run(async () => {
        const client = createAdminClient();
        return collectAsync(client.listAccountSummariesAsync());
      }, format);
    });

  program
    .command("property [property_id]")
    .description("Get details about a property")
    .action(async (_propertyId, _opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      const name = resolvePropertyId(cmd);
      await run(async () => {
        const client = createAdminClient();
        const [property] = await client.getProperty({ name });
        return property;
      }, format);
    });

  program
    .command("properties <account_id>")
    .description("List properties for an account")
    .option("--show-deleted", "Include deleted properties")
    .action(async (accountId: string, opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      await run(async () => {
        const client = createAdminClient();
        const account = resolveAccountId(accountId);
        const filter = `parent:${account}`;
        const request: Record<string, unknown> = { filter };
        if (opts.showDeleted) {
          request.showDeleted = true;
        }
        return collectAsync(client.listPropertiesAsync(request));
      }, format);
    });

  program
    .command("data-streams [property_id]")
    .description("List data streams for a property")
    .action(async (_propertyId, _opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      const parent = resolvePropertyId(cmd);
      await run(async () => {
        const client = createAdminClient();
        return collectAsync(client.listDataStreamsAsync({ parent }));
      }, format);
    });

  program
    .command("key-events [property_id]")
    .description("List key events for a property")
    .action(async (_propertyId, _opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      const parent = resolvePropertyId(cmd);
      await run(async () => {
        const client = createAdminClient();
        return collectAsync(client.listKeyEventsAsync({ parent }));
      }, format);
    });

  program
    .command("admin-custom-dimensions [property_id]")
    .description("List custom dimensions for a property (Admin API)")
    .action(async (_propertyId, _opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      const parent = resolvePropertyId(cmd);
      await run(async () => {
        const client = createAdminClient();
        return collectAsync(client.listCustomDimensionsAsync({ parent }));
      }, format);
    });

  program
    .command("admin-custom-metrics [property_id]")
    .description("List custom metrics for a property (Admin API)")
    .action(async (_propertyId, _opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      const parent = resolvePropertyId(cmd);
      await run(async () => {
        const client = createAdminClient();
        return collectAsync(client.listCustomMetricsAsync({ parent }));
      }, format);
    });

  program
    .command("data-retention [property_id]")
    .description("Get data retention settings for a property")
    .action(async (_propertyId, _opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      const property = resolvePropertyId(cmd);
      await run(async () => {
        const client = createAdminClient();
        const [settings] = await client.getDataRetentionSettings({
          name: `${property}/dataRetentionSettings`,
        });
        return settings;
      }, format);
    });

  program
    .command("ads-links [property_id]")
    .description("List Google Ads links for a property")
    .action(async (_propertyId, _opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      const parent = resolvePropertyId(cmd);
      await run(async () => {
        const client = createAdminClient();
        return collectAsync(client.listGoogleAdsLinksAsync({ parent }));
      }, format);
    });

  program
    .command("annotations [property_id]")
    .description("List annotations for a property (alpha API)")
    .action(async (_propertyId, _opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      const parent = resolvePropertyId(cmd);
      await run(async () => {
        const client = createAdminAlphaClient();
        return collectAsync(
          client.listReportingDataAnnotationsAsync({ parent }),
        );
      }, format);
    });

  program
    .command("change-history <account_id>")
    .description("Search change history events for an account")
    .option("--filter-property <id>", "Filter by property ID")
    .option("--earliest-change-time <timestamp>", "Earliest change time (RFC3339)")
    .option("--latest-change-time <timestamp>", "Latest change time (RFC3339)")
    .option("--resource-type <json>", "JSON array of resource types to filter")
    .option("--action <json>", "JSON array of action types to filter")
    .option("--actor-email <email>", "Filter by actor email")
    .action(async (accountId: string, opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      await run(async () => {
        const client = createAdminClient();
        const account = resolveAccountId(accountId);
        const request: Record<string, unknown> = { account };
        if (opts.filterProperty) {
          const pid = String(opts.filterProperty);
          request.property = pid.startsWith("properties/") ? pid : `properties/${pid}`;
        }
        if (opts.earliestChangeTime) {
          const d = new Date(opts.earliestChangeTime);
          request.earliestChangeTime = { seconds: Math.floor(d.getTime() / 1000), nanos: 0 };
        }
        if (opts.latestChangeTime) {
          const d = new Date(opts.latestChangeTime);
          request.latestChangeTime = { seconds: Math.floor(d.getTime() / 1000), nanos: 0 };
        }
        if (opts.resourceType) {
          const rt = parseJson(opts.resourceType);
          if (!Array.isArray(rt)) throw new Error("--resource-type must be a JSON array.");
          request.resourceType = rt;
        }
        if (opts.action) {
          const a = parseJson(opts.action);
          if (!Array.isArray(a)) throw new Error("--action must be a JSON array.");
          request.action = a;
        }
        if (opts.actorEmail) {
          request.actorEmail = [opts.actorEmail];
        }
        return collectAsync(client.searchChangeHistoryEventsAsync(request));
      }, format);
    });

  program
    .command("access-report [property_id]")
    .description("Run an access report for a property")
    .requiredOption("--dimensions <names>", "Comma-separated dimension names")
    .requiredOption("--metrics <names>", "Comma-separated metric names")
    .requiredOption("--date-ranges <json>", "JSON array of date ranges")
    .option("--dimension-filter <json>", "JSON FilterExpression for dimensions")
    .option("--metric-filter <json>", "JSON FilterExpression for metrics")
    .option("--order-by <json>", "JSON array of OrderBy objects")
    .option("--limit <n>", "Max rows to return", parsePositiveInt)
    .option("--offset <n>", "Row offset for pagination", parsePositiveInt)
    .option("--time-zone <tz>", "Time zone (e.g. America/Los_Angeles)")
    .option("--return-entity-quota", "Include entity quota in response")
    .option("--include-all-users", "Include users who have never accessed the API")
    .option("--expand-groups", "Expand group memberships")
    .action(async (_propertyId, opts, cmd: Command) => {
      const format = cmd.optsWithGlobals().format;
      const property = resolvePropertyId(cmd);
      await run(async () => {
        const dateRanges = parseJson(opts.dateRanges);
        validateDateRanges(dateRanges);

        const request: Record<string, unknown> = {
          entity: property,
          dimensions: opts.dimensions
            .split(",")
            .map((s: string) => ({ dimensionName: s.trim() })),
          metrics: opts.metrics
            .split(",")
            .map((s: string) => ({ metricName: s.trim() })),
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
        if (opts.timeZone) request.timeZone = opts.timeZone;
        if (opts.returnEntityQuota) request.returnEntityQuota = true;
        if (opts.includeAllUsers) request.includeAllUsers = true;
        if (opts.expandGroups) request.expandGroups = true;

        const client = createAdminClient();
        const [response] = await client.runAccessReport(request);
        return response;
      }, format);
    });
}
