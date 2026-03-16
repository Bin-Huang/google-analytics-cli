# google-analytics-cli

A Google Analytics CLI designed for AI agents. Wraps the official GA4 Admin and Data APIs with simple, agent-friendly commands.

**Works with:** OpenClaw, Claude Code, Cursor, Codex, and any agent that can run shell commands.

## Installation

```bash
npm install -g google-analytics-cli
```

Or run directly with npx:

```bash
npx google-analytics-cli --help
```

For development:

```bash
pnpm install
pnpm build
```

## How it works

This CLI is a thin wrapper around Google's official APIs:

- **[GA4 Admin API](https://developers.google.com/analytics/devguides/config/admin/v1)** — account/property management (`accounts`, `property`, `ads-links`, `annotations`, `custom-dims`)
- **[GA4 Data API](https://developers.google.com/analytics/devguides/reporting/data/v1)** — analytics reporting (`report`, `realtime`)

Under the hood it uses the official Node.js client libraries [`@google-analytics/admin`](https://www.npmjs.com/package/@google-analytics/admin) and [`@google-analytics/data`](https://www.npmjs.com/package/@google-analytics/data). All API responses are passed through as JSON — no transformation or aggregation.

## Setup

### Step 1: Enable the Google Analytics APIs

Go to the Google Cloud Console and enable both APIs for your project:

- [Enable GA4 Data API](https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com)
- [Enable GA4 Admin API](https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com)

If you don't have a project yet, create one first.

### Step 2: Create a Service Account

1. Go to [IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts) in the same project.
2. Click **Create Service Account**, give it a name (e.g. `analytics-reader`), and click **Done**.
3. Click on the newly created Service Account, go to the **Keys** tab.
4. Click **Add Key > Create new key > JSON**, and download the key file.

### Step 3: Place the credentials file

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

Credentials are resolved in this order:
1. `--credentials <path>` flag
2. `GOOGLE_APPLICATION_CREDENTIALS` env var
3. `~/.config/google-analytics-cli/credentials.json` (auto-detected)
4. gcloud Application Default Credentials

### Step 4: Grant access in Google Analytics

1. Open [Google Analytics](https://analytics.google.com/).
2. Go to **Admin** (gear icon at bottom-left).
3. Under **Account** or **Property**, click **Access Management**.
4. Click **+** > **Add users**.
5. Enter the Service Account email (find it in your key file's `client_email` field, e.g. `my-sa@my-project.iam.gserviceaccount.com`).
6. Assign the **Viewer** role (read-only access to all properties under the account).
7. Click **Add**.

Adding at the **Account** level grants access to all properties under that account. You can also add at the **Property** level for more granular control.

### Alternative: gcloud ADC (for local development)

If you prefer not to use a Service Account, you can authenticate with your own Google account:

```bash
gcloud auth application-default login \
  --scopes="https://www.googleapis.com/auth/analytics.readonly"
```

This uses your personal Google account's Analytics access. Good for local development, not recommended for automation.

## Usage

All commands output pretty-printed JSON by default. Use `--format compact` for compact single-line JSON.

You can pass a property ID as an argument, via `--property`, or set the `GA_PROPERTY_ID` environment variable. Both raw numbers and `properties/` prefixed IDs are accepted (e.g. `123456789` or `properties/123456789`).

```bash
export GA_PROPERTY_ID=123456789
```

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

### custom-dims

Get custom dimensions and metrics for a property.

```bash
google-analytics-cli custom-dims 123456789
```

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

## Error output

Errors are written to stderr as JSON with an `error` field. For Google API errors, `code` and `details` are included when available:

```json
{"error": "Permission denied", "code": 7}
```

## Related

- [google-search-console-cli](https://github.com/Bin-Huang/google-search-console-cli) — Google Search Console CLI for AI agents

## License

Apache-2.0
