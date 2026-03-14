import { v1alpha, v1beta } from "@google-analytics/admin";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const clientOptions = {
  libName: "google-analytics-cli",
  libVersion: version,
};

export { version };

export function createAdminClient(): InstanceType<
  typeof v1beta.AnalyticsAdminServiceClient
> {
  return new v1beta.AnalyticsAdminServiceClient(clientOptions);
}

export function createAdminAlphaClient(): InstanceType<
  typeof v1alpha.AnalyticsAdminServiceClient
> {
  return new v1alpha.AnalyticsAdminServiceClient(clientOptions);
}

export function createDataClient(): InstanceType<typeof BetaAnalyticsDataClient> {
  return new BetaAnalyticsDataClient(clientOptions);
}
