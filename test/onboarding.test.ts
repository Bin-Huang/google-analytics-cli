import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { checkCredentialsFile } from "../src/auth.js";
import { explainError, warnIfNoAccounts } from "../src/utils.js";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ga-cli-test-"));
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

function writeTmp(name: string, content: string): string {
  const file = path.join(tmp, name);
  fs.writeFileSync(file, content);
  return file;
}

const oauthClientFile = writeTmp(
  "client_secret.json",
  JSON.stringify({ installed: { client_id: "x.apps.googleusercontent.com", client_secret: "x" } }),
);

// Run the CLI with an empty HOME and no credentials in the environment.
function cli(...args: string[]) {
  const home = fs.mkdtempSync(path.join(tmp, "home-"));
  return spawnSync(process.execPath, ["--import", "tsx", "src/index.ts", ...args], {
    encoding: "utf8",
    timeout: 30_000,
    env: {
      PATH: process.env.PATH,
      HOME: home,
      // Skip the GCE metadata server probe so the no-credentials case is fast.
      METADATA_SERVER_DETECTION: "none",
    },
  });
}

test("checkCredentialsFile rejects OAuth client files", () => {
  assert.throws(() => checkCredentialsFile(oauthClientFile), /OAuth client file, not a service account key/);
  const web = writeTmp("web.json", JSON.stringify({ web: { client_id: "x" } }));
  assert.throws(() => checkCredentialsFile(web), /OAuth client file/);
});

test("checkCredentialsFile rejects invalid JSON and missing files", () => {
  assert.throws(() => checkCredentialsFile(writeTmp("bad.json", "not json")), /is not valid JSON/);
  assert.throws(() => checkCredentialsFile(path.join(tmp, "missing.json")), /Cannot read credentials file/);
});

test("checkCredentialsFile accepts a service account key", () => {
  const key = writeTmp(
    "key.json",
    JSON.stringify({ type: "service_account", client_email: "sa@p.iam.gserviceaccount.com" }),
  );
  assert.doesNotThrow(() => checkCredentialsFile(key));
});

test("explainError explains rejected credentials from gcloud ADC and service account keys", () => {
  const cases = [
    [
      "400 undefined: Getting metadata from plugin failed with error: invalid_grant",
      "400 undefined: Getting metadata from plugin failed with error: invalid_grant. Google rejected the credentials.",
    ],
    [
      "16 UNAUTHENTICATED: Request had invalid authentication credentials. Expected OAuth 2 access token.",
      "16 UNAUTHENTICATED: Request had invalid authentication credentials. Expected OAuth 2 access token. Google rejected the credentials.",
    ],
  ];
  for (const [original, prefix] of cases) {
    const msg = explainError(original);
    assert.ok(msg.startsWith(prefix), msg);
    assert.match(msg, /gcloud auth application-default login/);
    assert.match(msg, /create a new key/);
    assert.match(msg, /#troubleshooting$/);
  }
});

test("explainError rewrites the missing credentials error", () => {
  const msg = explainError(
    "Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.",
  );
  assert.match(msg, /--credentials <path>/);
  assert.match(msg, /GOOGLE_APPLICATION_CREDENTIALS/);
  assert.match(msg, /~\/\.config\/google-analytics-cli\/credentials\.json/);
  assert.match(msg, /#setup/);
  assert.equal(explainError("Permission denied"), "Permission denied");
});

function captureStderr(fn: () => void): string {
  let out = "";
  const original = process.stderr.write;
  process.stderr.write = ((chunk: string) => {
    out += chunk;
    return true;
  }) as typeof process.stderr.write;
  try {
    fn();
  } finally {
    process.stderr.write = original;
  }
  return out;
}

test("warnIfNoAccounts writes a JSON warning only for an empty list", () => {
  const warning = JSON.parse(captureStderr(() => warnIfNoAccounts([])));
  assert.match(warning.warning, /No accounts found/);
  assert.match(warning.warning, /#step-4-grant-access-in-google-analytics/);
  assert.equal(captureStderr(() => warnIfNoAccounts([{ account: "accounts/1" }])), "");
});

test("CLI explains missing credentials", () => {
  const r = cli("accounts");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /No credentials found/);
});

test("CLI fails fast on an OAuth client file", () => {
  const r = cli("accounts", "--credentials", oauthClientFile);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /OAuth client file/);
});

test("CLI rejects a measurement ID", () => {
  const r = cli("property", "G-ABC123XYZ");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /measurement ID, not a property ID/);
});
