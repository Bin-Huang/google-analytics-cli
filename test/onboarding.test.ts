import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { checkCredentialsFile } from "../src/auth.js";
import { explainError } from "../src/utils.js";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ga-cli-test-"));

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
