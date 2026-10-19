import { v1alpha, v1beta } from "@google-analytics/admin";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

export { version };

const CONFIG_DIR = path.join(
  os.homedir(),
  ".config",
  "google-analytics-cli",
);

const DEFAULT_CREDENTIALS_PATH = path.join(CONFIG_DIR, "credentials.json");
const PROFILES_DIR = path.join(CONFIG_DIR, "profiles");

let credentialsPath: string | undefined;
let profileName: string | undefined;

export function setCredentialsPath(p: string): void {
  credentialsPath = p;
}

const PROFILE_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;

export function setProfile(name: string): void {
  profileName = name;
}

function isValidProfileName(name: string): boolean {
  return PROFILE_NAME_PATTERN.test(name) && name !== "." && name !== "..";
}

function validateProfileName(name: string): void {
  if (!isValidProfileName(name)) {
    throw new Error(
      `Invalid profile name "${name}". Profile names may only contain letters, digits, dots, underscores, and dashes.`,
    );
  }
}

export function getProfilePath(name: string): string {
  return path.join(PROFILES_DIR, `${name}.json`);
}

export function listProfiles(): { name: string; path: string }[] {
  if (!fs.existsSync(PROFILES_DIR)) return [];
  return fs
    .readdirSync(PROFILES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({
      name: f.slice(0, -".json".length),
      path: path.join(PROFILES_DIR, f),
    }))
    // Hide files that --profile would reject, e.g. "client a.json"
    .filter((p) => isValidProfileName(p.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getProfilesDir(): string {
  return PROFILES_DIR;
}

export function getDefaultCredentialsPath(): string {
  return DEFAULT_CREDENTIALS_PATH;
}

function resolveKeyFilename(): string | undefined {
  if (credentialsPath) return credentialsPath;
  if (profileName) {
    validateProfileName(profileName);
    const p = getProfilePath(profileName);
    if (!fs.existsSync(p)) {
      throw new Error(
        `Profile "${profileName}" not found at ${p}. Run \`google-analytics-cli profiles\` to list available profiles.`,
      );
    }
    return p;
  }
  if (
    !process.env.GOOGLE_APPLICATION_CREDENTIALS &&
    fs.existsSync(DEFAULT_CREDENTIALS_PATH)
  ) {
    return DEFAULT_CREDENTIALS_PATH;
  }
  return undefined;
}

/**
 * Fail fast on files that are not service account keys. Without this check, an
 * OAuth client file makes the Google client retry for about a minute and then
 * print "key must be a string, a buffer or an object" many times.
 */
export function checkCredentialsFile(file: string): void {
  let raw: string;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Cannot read credentials file ${file}: ${reason}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(
      `Credentials file ${file} is not valid JSON. Use the JSON key file of a service account.`,
    );
  }
  if (json && typeof json === "object" && ("installed" in json || "web" in json)) {
    throw new Error(
      `${file} is an OAuth client file, not a service account key. ` +
        "Create a JSON key under IAM & Admin > Service Accounts > Keys, " +
        "or pass this file to `gcloud auth application-default login --client-id-file` " +
        "(see https://github.com/Bin-Huang/google-analytics-cli#alternative-application-default-credentials).",
    );
  }
}

function getClientOptions() {
  const base = {
    libName: "google-analytics-cli",
    libVersion: version,
  };
  const keyFilename = resolveKeyFilename();
  const file = keyFilename ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (file) checkCredentialsFile(file);
  return keyFilename ? { ...base, keyFilename } : base;
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
