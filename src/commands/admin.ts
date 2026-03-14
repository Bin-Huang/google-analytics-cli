import { Command } from "commander";
import { createAdminAlphaClient, createAdminClient } from "../auth.js";
import { resolvePropertyId, run } from "../utils.js";

async function collectAsync<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterable) {
    items.push(item);
  }
  return items;
}

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
}
