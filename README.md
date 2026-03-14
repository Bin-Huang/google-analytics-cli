# google-analytics-cli

A Google Analytics CLI designed for AI agents. Wraps the GA4 Admin and Data APIs with simple commands that output JSON.

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

## Authentication

The CLI uses [Google Application Default Credentials (ADC)](https://cloud.google.com/docs/authentication/application-default-credentials) with read-only Analytics scope. Two methods are supported:

### Option A: Service Account (recommended for automation)

1. In the [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts), create a Service Account in a project with the Google Analytics Data API and Admin API enabled.
2. Create a JSON key for the Service Account and download it.
3. Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the path of the JSON key file:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

4. In [Google Analytics Admin](https://analytics.google.com/analytics/web/#/a/p/admin), go to **Property Access Management** and add the Service Account email (e.g. `name@project.iam.gserviceaccount.com`) as a **Viewer**.

### Option B: gcloud ADC (for local development)

```bash
gcloud auth application-default login \
  --scopes="https://www.googleapis.com/auth/analytics.readonly"
```

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

## License

Apache-2.0
