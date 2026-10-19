# google-analytics-cli

Google Analytics CLI & Skills for AI agents (and humans). Run custom reports with flexible dimensions and date ranges, monitor realtime active users, manage custom metrics from the GA4 API, and more.

**Works with:** OpenClaw, Claude Code, Cursor, Codex, and any agent that can run shell commands.

## Installation

Tell your AI agent (e.g. OpenClaw):

> Install this CLI and skills from https://github.com/Bin-Huang/google-analytics-cli

Or install manually:

```bash
npm install -g google-analytics-cli

# Add skills for AI agents (Claude Code, Cursor, Codex, etc.)
npx skills add Bin-Huang/google-analytics-cli
```

Or run directly: `npx google-analytics-cli --help`

For development:

```bash
pnpm install
pnpm build
```

## How it works

Built on Google's official APIs. Handles service account authentication and request signing. Every command outputs structured JSON to stdout, ready for agents to parse without extra processing.

- **[GA4 Admin API](https://developers.google.com/analytics/devguides/config/admin/v1)** — account/property management, data streams, key events, change history, access reports
- **[GA4 Data API](https://developers.google.com/analytics/devguides/reporting/data/v1)** — standard/pivot/batch reports, realtime, audience exports, metadata

Under the hood it uses the official Node.js client libraries [`@google-analytics/admin`](https://www.npmjs.com/package/@google-analytics/admin) and [`@google-analytics/data`](https://www.npmjs.com/package/@google-analytics/data). All API responses are passed through as JSON — no transformation or aggregation.

## Setup

### Step 1: Choose a project and enable the APIs

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and select a project. If you do not have a project, create one.
2. Enable both APIs in the API Library. The CLI needs both:
   - [Google Analytics Admin API](https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com): used by `accounts`, `property`, `properties`, `change-history`, `access-report`, and other admin commands.
   - [Google Analytics Data API](https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com): used by `report`, `realtime`, `metadata`, audience exports, and other reporting commands.

### Step 2: Create a service account and download a JSON key

1. Go to [IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts) in the same project.
2. Click **Create Service Account**, give it a name (e.g. `analytics-reader`), and click **Done**.
3. Click the new service account and open the **Keys** tab.
4. Click **Add Key > Create new key > JSON**. The browser downloads the key file.

> [!NOTE]
> **Key creation blocked?** Your organization can block service account key creation with the `constraints/iam.managed.disableServiceAccountKeyCreation` policy. Organizations created on or after May 3, 2024 enforce this policy by default. See [Secure-by-default organizations](https://docs.cloud.google.com/resource-manager/docs/secure-by-default-organizations) and [Create and delete service account keys](https://cloud.google.com/iam/docs/keys-create-delete).
>
> To fix this, ask your organization admin to override the policy for this project. Or use [Application Default Credentials](#alternative-application-default-credentials) instead of a key.

### Step 3: Place the credentials file

The CLI looks for credentials in this order and uses the first one it finds:

1. `--credentials <path>` flag
2. `--profile <name>` flag (or `GA_CLI_PROFILE` env var) → `~/.config/google-analytics-cli/profiles/<name>.json` (see [Managing multiple GA accounts](#managing-multiple-ga-accounts))
3. `GOOGLE_APPLICATION_CREDENTIALS` env var
4. `~/.config/google-analytics-cli/credentials.json` (default path)
5. gcloud Application Default Credentials (see [below](#alternative-application-default-credentials))

Choose one of these options:

```bash
# Option A: Default path (recommended)
mkdir -p ~/.config/google-analytics-cli
cp ~/Downloads/your-key-file.json ~/.config/google-analytics-cli/credentials.json

# Option B: Environment variable
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your-key-file.json"

# Option C: Pass per command
google-analytics-cli accounts --credentials /path/to/your-key-file.json
```

`--credentials` and `--profile` cannot be used together; `--credentials` overrides `GA_CLI_PROFILE`.

### Step 4: Grant access in Google Analytics

The service account needs a role on each Google Analytics account or property. You must be an **Administrator** of the account or property to add users to it.

1. Open [Google Analytics](https://analytics.google.com/).
2. Go to **Admin** (gear icon at bottom-left).
3. Under **Account settings**, click **Account access management**. For a single property, use **Property access management** under **Property settings** instead.
4. Click **+** > **Add users**.
5. Enter the service account email. Copy it from the `client_email` field in your key file, e.g. `my-sa@my-project.iam.gserviceaccount.com`.
6. Choose a role:
   - **Viewer** (read-only): enough for all commands except `change-history` and `access-report`.
   - **Editor** or higher: needed for `change-history`.
   - **Administrator**: needed for `access-report`.
7. Click **Add**.

A role at the **Account** level applies to all properties under that account. A role at the **Property** level applies to that property only.

If Google Analytics shows "Email not found" or "This email doesn't match a Google Account", see [Troubleshooting](#troubleshooting).

### Step 5: Verify the setup

```bash
google-analytics-cli accounts
```

The command prints the accounts and properties that the credentials can access. If it prints `[]`, the access from Step 4 is not active yet. The CLI also writes a warning to stderr in this case. See [Troubleshooting](#troubleshooting).

## Alternative: Application Default Credentials

Use this method to sign in with your own Google account instead of a service account. Use it when Google Analytics does not accept the service account email, or when your organization blocks key creation. The CLI then has the same Google Analytics access as your Google account.

Before you start:

- Install the [gcloud CLI](https://cloud.google.com/sdk/docs/install).
- In the project from Step 1, configure the [OAuth consent screen](https://console.cloud.google.com/auth/branding). If you are not in a Google Workspace organization, choose the **External** audience.
- With the **External** audience, add your own Google account as a test user on the [Audience](https://console.cloud.google.com/auth/audience) page.

Steps:

1. Go to [Google Auth Platform > Clients](https://console.cloud.google.com/auth/clients) and click **Create client**.
2. Choose the application type **Desktop app**, then click **Create**.
3. Download the client JSON file, e.g. as `client_secret.json`. This file is not a service account key. Do not pass it to `--credentials`.
4. Sign in with your own OAuth client:

   ```bash
   gcloud auth application-default login \
     --client-id-file=/path/to/client_secret.json \
     --scopes="https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/cloud-platform"
   ```

5. Bill API usage to the project from Step 1:

   ```bash
   gcloud auth application-default set-quota-project YOUR_PROJECT_ID
   ```

6. Run `google-analytics-cli accounts` to verify.

Notes:

- gcloud requires the `cloud-platform` scope. For `change-history`, also add `https://www.googleapis.com/auth/analytics.edit` to `--scopes`.
- Without `--client-id-file`, gcloud uses its own OAuth client. Google usually blocks that client for the Analytics scopes and shows "This app is blocked".
- The CLI uses Application Default Credentials only when it finds no key file (see the order in Step 3). Unset `GOOGLE_APPLICATION_CREDENTIALS` and `GA_CLI_PROFILE`, and remove or rename `~/.config/google-analytics-cli/credentials.json` if it exists.
- While the OAuth app uses the **External** audience and its publishing status is **Testing**, Google expires the refresh token after 7 days ([Google docs](https://developers.google.com/identity/protocols/oauth2)). Run the login command again every 7 days.
- This method is good for local development. For automation, use a service account.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Google Analytics shows "Email not found" when you add the service account | You entered a different value, such as `client_id` or an OAuth client ID. | Enter the `client_email` value from the key file. It ends in `.iam.gserviceaccount.com`. Make sure the service account is enabled in the Cloud Console. |
| Google Analytics shows "Email not found" for the correct `client_email` | This is a known Google-side problem. Google Analytics can reject a new service account for several hours to several weeks ([forum thread](https://discuss.google.dev/t/problem-with-new-service-accounts/362176)). The CLI cannot fix it. | Try again later. To start now, use [Application Default Credentials](#alternative-application-default-credentials). Some users report that the Admin API can add the service account while the UI rejects it. See [Add the service account with the Admin API](#add-the-service-account-with-the-admin-api). |
| `accounts` prints `[]` | The credentials work, but they have no access to any account or property yet. | Do [Step 4](#step-4-grant-access-in-google-analytics). Check that you added the same `client_email` that is in your key file. With Application Default Credentials, check that your Google account has access in Google Analytics. |
| `{"error": "No credentials found. ..."}` | The CLI found no key file and no Application Default Credentials. | Place the key file as described in [Step 3](#step-3-place-the-credentials-file). |
| `... is an OAuth client file, not a service account key` | The credentials file is an OAuth client file. It has an `installed` or `web` field. | Download a service account key from the **Keys** tab ([Step 2](#step-2-create-a-service-account-and-download-a-json-key)). Or use the OAuth client file with `gcloud --client-id-file` ([Application Default Credentials](#alternative-application-default-credentials)). |
| 403 with `SERVICE_DISABLED` or "has not been used in project" | The Admin API or the Data API is not enabled in the project of the credentials (or the quota project for Application Default Credentials). The error message names the API. | Enable the [Admin API](https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com) or the [Data API](https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com) in that project. Wait a few minutes, then try again. |
| 403 "User does not have sufficient permissions for this property" (or `PERMISSION_DENIED`) | The credentials have no access to this property, or their role is too low for the command. | Add the account to the property ([Step 4](#step-4-grant-access-in-google-analytics)). `change-history` needs **Editor** or higher. `access-report` needs **Administrator**. Check that you passed the numeric property ID, not a `G-` measurement ID. |
| Google shows "This app is blocked" during `gcloud auth application-default login` | gcloud's own OAuth client cannot request the Analytics scopes. | Create your own OAuth client and add `--client-id-file` ([Application Default Credentials](#alternative-application-default-credentials)). |
| Application Default Credentials stop working after 7 days (`invalid_grant`) | The OAuth app uses the **External** audience and is in **Testing** status. Google expires its refresh tokens after 7 days. | Run `gcloud auth application-default login` again with the same flags. |

### Add the service account with the Admin API

Some users report that this works when the Google Analytics UI shows "Email not found". This is not an official workaround from Google. You need Application Default Credentials for an account that is an **Administrator** in Google Analytics, signed in with the `https://www.googleapis.com/auth/analytics.manage.users` scope (add it to `--scopes`). The call uses the [accessBindings](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/accounts.accessBindings/create) method of the Admin API v1alpha.

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
  -H "x-goog-user-project: YOUR_PROJECT_ID" \
  -H "Content-Type: application/json" \
  -d '{"user": "my-sa@my-project.iam.gserviceaccount.com", "roles": ["predefinedRoles/viewer"]}' \
  https://analyticsadmin.googleapis.com/v1alpha/accounts/ACCOUNT_ID/accessBindings
```

Replace `ACCOUNT_ID` with the numeric account ID. To grant access to one property only, use `properties/PROPERTY_ID` instead of `accounts/ACCOUNT_ID`.

## Managing multiple GA accounts

A single Service Account can already access multiple GA accounts if you grant it Viewer access in each one. You only need separate profiles when the Service Accounts themselves are different — e.g. different GCP projects, different clients, or permission boundaries you want to keep apart.

Drop each Service Account key into the `profiles/` directory and switch between them with `--profile`:

```bash
mkdir -p ~/.config/google-analytics-cli/profiles
cp ~/Downloads/account-a-key.json ~/.config/google-analytics-cli/profiles/account-a.json
cp ~/Downloads/account-b-key.json ~/.config/google-analytics-cli/profiles/account-b.json

# Use a profile per command
google-analytics-cli accounts --profile account-a

# Or set it for the shell session
export GA_CLI_PROFILE=account-b
google-analytics-cli accounts

# List configured profiles
google-analytics-cli profiles
```

`--credentials` and `--profile` cannot be used together; `--credentials` overrides `GA_CLI_PROFILE`.

## Usage

All commands output pretty-printed JSON by default. Use `--format compact` for compact single-line JSON.

You can pass a property ID as an argument, via `--property`, or set the `GA_PROPERTY_ID` environment variable. Both raw numbers and `properties/` prefixed IDs are accepted (e.g. `123456789` or `properties/123456789`).

```bash
export GA_PROPERTY_ID=123456789
```

To find your property ID, run `google-analytics-cli accounts`. Each entry in `propertySummaries` has a `property` field such as `properties/123456789`. You can also find it in Google Analytics under **Admin > Property settings > Property > Property details**. The property ID is a number. It is not the measurement ID of a web data stream (`G-XXXXXXXXXX`). The CLI rejects values that start with `G-`.

Commands such as `properties` and `change-history` take an account ID instead. The account ID is also a number, e.g. `987654321`. Find it in the `account` field of `accounts` (`accounts/987654321`).

### accounts

List all GA4 accounts and their properties.

```bash
google-analytics-cli accounts
```

### property

Get details about a specific property.

```bash
google-analytics-cli property 123456789
```

### ads-links

List Google Ads links for a property.

```bash
google-analytics-cli ads-links 123456789
```

### annotations

List annotations (notes) for a property. Uses the Admin API v1alpha.

```bash
google-analytics-cli annotations 123456789
```

### properties

List properties for an account.

```bash
google-analytics-cli properties 987654321
google-analytics-cli properties 987654321 --show-deleted
```

### data-streams

List data streams for a property.

```bash
google-analytics-cli data-streams 123456789
```

### key-events

List key events for a property.

```bash
google-analytics-cli key-events 123456789
```

### admin-custom-dimensions

List custom dimensions for a property (Admin API).

```bash
google-analytics-cli admin-custom-dimensions 123456789
```

### admin-custom-metrics

List custom metrics for a property (Admin API).

```bash
google-analytics-cli admin-custom-metrics 123456789
```

### data-retention

Get data retention settings for a property.

```bash
google-analytics-cli data-retention 123456789
```

### change-history

Search change history events for an account. Requires the **Editor** or **Administrator** role on the account. With Application Default Credentials, the login also needs the `https://www.googleapis.com/auth/analytics.edit` scope (see [Application Default Credentials](#alternative-application-default-credentials)).

```bash
google-analytics-cli change-history 987654321
google-analytics-cli change-history 987654321 \
  --earliest-change-time 2025-01-01T00:00:00Z \
  --actor-email user@example.com
```

Options:
- `--filter-property <id>` -- filter by property ID
- `--earliest-change-time <timestamp>` -- earliest change time (RFC3339)
- `--latest-change-time <timestamp>` -- latest change time (RFC3339)
- `--resource-type <json>` -- JSON array of resource types
- `--action <json>` -- JSON array of action types
- `--actor-email <email>` -- filter by actor email

### access-report

Run an access report for a property. Shows who accessed the property's data and how much quota they used. Requires the **Administrator** role.

```bash
google-analytics-cli access-report 123456789 \
  --dimensions "userEmail,accessedPropertyName" \
  --metrics "dataApiQuotaPropertyTokensConsumed" \
  --date-ranges '[{"startDate": "30daysAgo", "endDate": "yesterday"}]'
```

Options:
- `--dimensions <names>` -- comma-separated dimension names (required)
- `--metrics <names>` -- comma-separated metric names (required)
- `--date-ranges <json>` -- JSON array of date ranges (required)
- `--dimension-filter <json>` -- JSON FilterExpression for dimensions
- `--metric-filter <json>` -- JSON FilterExpression for metrics
- `--order-by <json>` -- JSON array of OrderBy objects
- `--limit <n>` -- max rows to return
- `--offset <n>` -- row offset for pagination
- `--time-zone <tz>` -- time zone (e.g. America/Los_Angeles)
- `--return-entity-quota` -- include entity quota in response
- `--include-all-users` -- include users who have never accessed the API
- `--expand-groups` -- expand group memberships

The dimensions `accessMechanism` and `epochTimeMicros` and the metric `accessCount` are available only for Google Analytics 360 properties. See the [Access report schema](https://developers.google.com/analytics/devguides/config/admin/v1/access-api-schema).

### custom-dims

Get custom dimensions and metrics for a property.

```bash
google-analytics-cli custom-dims 123456789
```

### metadata

Get full metadata (all dimensions and metrics) for a property.

```bash
google-analytics-cli metadata 123456789
```

### check-compatibility

Check compatibility of dimensions and metrics before running a report.

```bash
google-analytics-cli check-compatibility 123456789 \
  --dimensions "date,country" \
  --metrics "activeUsers,sessions"
```

Options:
- `--dimensions <names>` -- comma-separated dimension names
- `--metrics <names>` -- comma-separated metric names
- `--dimension-filter <json>` -- JSON FilterExpression for dimensions
- `--metric-filter <json>` -- JSON FilterExpression for metrics

### report

Run a GA4 report with dimensions, metrics, and date ranges.

```bash
# Basic report
google-analytics-cli report 123456789 \
  --dimensions "date,country" \
  --metrics "activeUsers,sessions" \
  --date-ranges '[{"startDate": "30daysAgo", "endDate": "yesterday"}]'

# With filters and ordering
google-analytics-cli report 123456789 \
  --dimensions "eventName" \
  --metrics "eventCount" \
  --date-ranges '[{"startDate": "7daysAgo", "endDate": "today"}]' \
  --dimension-filter '{"filter": {"fieldName": "eventName", "stringFilter": {"matchType": "BEGINS_WITH", "value": "page"}}}' \
  --order-by '[{"metric": {"metricName": "eventCount"}, "desc": true}]' \
  --limit 10

# With currency and quota info
google-analytics-cli report 123456789 \
  --dimensions "date" \
  --metrics "totalRevenue" \
  --date-ranges '[{"startDate": "2024-01-01", "endDate": "2024-01-31"}]' \
  --currency-code USD \
  --return-property-quota
```

### pivot-report

Run a pivot report with cross-tabulated dimensions.

```bash
google-analytics-cli pivot-report 123456789 \
  --dimensions "country,browser" \
  --metrics "sessions" \
  --date-ranges '[{"startDate": "30daysAgo", "endDate": "yesterday"}]' \
  --pivots '[{"fieldNames": ["browser"], "limit": 5}]'
```

Options:
- `--dimensions <names>` -- comma-separated dimension names (required)
- `--metrics <names>` -- comma-separated metric names (required)
- `--date-ranges <json>` -- JSON array of date ranges (required)
- `--pivots <json>` -- JSON array of pivot definitions (required)
- `--dimension-filter <json>` -- JSON FilterExpression for dimensions
- `--metric-filter <json>` -- JSON FilterExpression for metrics
- `--currency-code <code>` -- ISO4217 currency code
- `--keep-empty-rows` -- include rows with all zero metric values
- `--return-property-quota` -- include property quota in response

### batch-report

Run multiple reports in a single batch (max 5).

```bash
google-analytics-cli batch-report 123456789 \
  --requests '[{"dimensions": [{"name": "date"}], "metrics": [{"name": "activeUsers"}], "dateRanges": [{"startDate": "7daysAgo", "endDate": "yesterday"}]}]'
```

### realtime

Run a realtime report (no date ranges or currency code).

```bash
google-analytics-cli realtime 123456789 \
  --dimensions "country" \
  --metrics "activeUsers"

# With ordering and limit
google-analytics-cli realtime 123456789 \
  --dimensions "unifiedScreenName" \
  --metrics "activeUsers" \
  --order-by '[{"metric": {"metricName": "activeUsers"}, "desc": true}]' \
  --limit 5
```

### audience-export-create

Create an audience export.

```bash
google-analytics-cli audience-export-create 123456789 \
  --audience "properties/123456789/audiences/1" \
  --dimensions "deviceId"
```

### audience-exports

List audience exports for a property.

```bash
google-analytics-cli audience-exports 123456789
```

### audience-export

Get an audience export by name.

```bash
google-analytics-cli audience-export properties/123456789/audienceExports/abc123
```

### audience-export-query

Query rows from an audience export.

```bash
google-analytics-cli audience-export-query properties/123456789/audienceExports/abc123
google-analytics-cli audience-export-query properties/123456789/audienceExports/abc123 --limit 100 --offset 0
```

### profiles

List credentials profiles in `~/.config/google-analytics-cli/profiles/` and show whether the default `credentials.json` exists. See [Managing multiple GA accounts](#managing-multiple-ga-accounts).

```bash
google-analytics-cli profiles
```

## Error output

Errors are written to stderr as JSON with an `error` field. For Google API errors, `code` and `details` are included when available:

```json
{"error": "Permission denied", "code": 7}
```

Warnings are written to stderr as JSON with a `warning` field. They do not change stdout or the exit code. For example, `accounts` writes a warning when it finds no accounts.

## Related

- [google-search-console-cli](https://github.com/Bin-Huang/google-search-console-cli) -- Google Search Console CLI & Skills for AI agents (and humans)
- [youtube-analytics-cli](https://github.com/Bin-Huang/youtube-analytics-cli) -- YouTube Analytics CLI & Skills for AI agents (and humans)
- [x-analytics-cli](https://github.com/Bin-Huang/x-analytics-cli) -- X Analytics CLI & Skills for AI agents (and humans)
- [camoufox-cli](https://github.com/Bin-Huang/camoufox-cli) -- Anti-detect browser CLI & Skills for AI agents
- [google-ads-open-cli](https://github.com/Bin-Huang/google-ads-open-cli) -- Google Ads CLI & Skills for AI agents (and humans)
- [meta-ads-open-cli](https://github.com/Bin-Huang/meta-ads-open-cli) -- Meta Ads CLI & Skills for AI agents (and humans)
- [microsoft-ads-cli](https://github.com/Bin-Huang/microsoft-ads-cli) -- Microsoft Ads CLI & Skills for AI agents (and humans)
- [amazon-ads-open-cli](https://github.com/Bin-Huang/amazon-ads-open-cli) -- Amazon Ads CLI & Skills for AI agents (and humans)
- [tiktok-ads-cli](https://github.com/Bin-Huang/tiktok-ads-cli) -- TikTok Ads CLI & Skills for AI agents (and humans)
- [linkedin-ads-cli](https://github.com/Bin-Huang/linkedin-ads-cli) -- LinkedIn Ads CLI & Skills for AI agents (and humans)
- [x-ads-cli](https://github.com/Bin-Huang/x-ads-cli) -- X Ads CLI & Skills for AI agents (and humans)
- [snapchat-ads-cli](https://github.com/Bin-Huang/snapchat-ads-cli) -- Snapchat Ads CLI & Skills for AI agents (and humans)
- [pinterest-ads-cli](https://github.com/Bin-Huang/pinterest-ads-cli) -- Pinterest Ads CLI & Skills for AI agents (and humans)
- [reddit-ads-cli](https://github.com/Bin-Huang/reddit-ads-cli) -- Reddit Ads CLI & Skills for AI agents (and humans)
- [spotify-ads-cli](https://github.com/Bin-Huang/spotify-ads-cli) -- Spotify Ads CLI & Skills for AI agents (and humans)
- [apple-ads-cli](https://github.com/Bin-Huang/apple-ads-cli) -- Apple Ads CLI & Skills for AI agents (and humans)
## License

Apache-2.0
