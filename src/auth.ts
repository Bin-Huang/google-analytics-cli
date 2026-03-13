import { v1alpha, v1beta } from "@google-analytics/admin";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

const USER_AGENT = "google-analytics-cli/1.0.0";

const clientOptions = {
  "x-goog-api-client": USER_AGENT,
  scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
};

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
