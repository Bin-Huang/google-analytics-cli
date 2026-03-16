import { v1alpha, v1beta } from "@google-analytics/admin";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

export { version };

const DEFAULT_CREDENTIALS_PATH = path.join(
  os.homedir(),
  ".config",
  "google-analytics-cli",
  "credentials.json",
);

let credentialsPath: string | undefined;

export function setCredentialsPath(p: string): void {
  credentialsPath = p;
}

function getClientOptions() {
  const base = {
    libName: "google-analytics-cli",
    libVersion: version,
  };
  if (credentialsPath) {
    return { ...base, keyFilename: credentialsPath };
  }
  if (
    !process.env.GOOGLE_APPLICATION_CREDENTIALS &&
    fs.existsSync(DEFAULT_CREDENTIALS_PATH)
  ) {
    return { ...base, keyFilename: DEFAULT_CREDENTIALS_PATH };
  }
  return base;
}

export function createAdminClient(): InstanceType<
  typeof v1beta.AnalyticsAdminServiceClient
> {
  return new v1beta.AnalyticsAdminServiceClient(getClientOptions());
}

export function createAdminAlphaClient(): InstanceType<
  typeof v1alpha.AnalyticsAdminServiceClient
> {
  return new v1alpha.AnalyticsAdminServiceClient(getClientOptions());
}

export function createDataClient(): InstanceType<typeof BetaAnalyticsDataClient> {
  return new BetaAnalyticsDataClient(getClientOptions());
}
