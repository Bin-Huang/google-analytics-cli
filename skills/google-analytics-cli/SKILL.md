---
name: google-analytics-cli
description: >
  Google Analytics 4 data analysis and reporting via google-analytics-cli.
  Use when the user wants to check GA4 traffic, run reports with dimensions and metrics,
  monitor realtime users, explore account structure, or analyze user behavior.
  Triggers: "Google Analytics", "GA4", "analytics report", "active users", "page views",
  "traffic source", "sessions", "engagement", "realtime", "bounce rate".
---

# Google Analytics CLI Skill

You have access to `google-analytics-cli`, a CLI for the GA4 Admin API and Data API. Most commands only read data. `audience-export-create` creates an audience export in the property. Use it to run reports, monitor realtime activity, and explore account/property structure.

## Quick start

```bash
# Check if the CLI is available
google-analytics-cli --help

# List accounts and properties
google-analytics-cli accounts
```

If the CLI is not installed, install it:

```bash
npm install -g google-analytics-cli
```

## Authentication

The CLI uses Google service account credentials. Credentials are resolved in this order:

1. `--credentials <path>` flag (per-command)
2. `--profile <name>` flag or `GA_CLI_PROFILE` env var → `~/.config/google-analytics-cli/profiles/<name>.json`
3. `GOOGLE_APPLICATION_CREDENTIALS` env var
4. `~/.config/google-analytics-cli/credentials.json` (auto-detected)
5. gcloud Application Default Credentials

Before running any command, verify credentials by running `google-analytics-cli accounts`. If it fails or prints `[]`, use the setup steps and the troubleshooting table below to tell the user what to do. You cannot do the setup steps for the user. Full guide: https://github.com/Bin-Huang/google-analytics-cli#setup

### Setup (summary)

1. In a Google Cloud project, enable the **Google Analytics Admin API** (used by `accounts` and other admin commands) and the **Google Analytics Data API** (used by `report` and other reporting commands).
2. Create a service account and download a JSON key. If the organization policy `constraints/iam.managed.disableServiceAccountKeyCreation` blocks key creation (the default for organizations created on or after May 3, 2024), the organization admin must override it for the project, or the user must use Application Default Credentials.
3. Place the key: `--credentials <path>`, `GOOGLE_APPLICATION_CREDENTIALS=<path>`, or `~/.config/google-analytics-cli/credentials.json`.
4. In Google Analytics, go to **Admin > Account access management** (or **Property access management**) and add the service account email (`client_email` in the key file). **Viewer** is enough for all commands except `change-history` (needs **Editor** or higher) and `access-report` (needs **Administrator**).
5. Run `google-analytics-cli accounts`. An empty array `[]` means the access from step 4 is not active yet.

Alternative: Application Default Credentials with the user's own Google account. The user creates a **Desktop app** OAuth client and runs `gcloud auth application-default login --client-id-file=<client_secret.json> --scopes=https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/cloud-platform`. `change-history` also needs the `analytics.edit` scope. While the OAuth app uses the **External** audience and is in **Testing** status, the login expires every 7 days.

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `accounts` prints `[]` (stderr has a `warning`) | Credentials work, but no account or property grants them access. | Add the `client_email` in Google Analytics (setup step 4). New grants can take a while to apply. |
| GA shows "Email not found" for a correct `client_email` | Known Google-side delay for new service accounts: several hours to several weeks. | Wait, or use Application Default Credentials. Some users report that the Admin API `accessBindings` method can add the service account. |
| `No credentials found` | No key file and no Application Default Credentials. | Do setup step 3. |
| `... is an OAuth client file, not a service account key` | The file has an `installed` or `web` field. | Use a service account key, or use the file with `gcloud --client-id-file`. |
| 403 with `SERVICE_DISABLED` or "has not been used in project" | The Admin API or Data API is not enabled. The error names the API. | Enable that API in the project (setup step 1). |
| 403 `PERMISSION_DENIED` / "does not have sufficient permissions" | No access to this property, or the role is too low. | Grant access (setup step 4). Check the role for `change-history` and `access-report`. Check that the ID is the numeric property ID. |
| "This app is blocked" during gcloud login | gcloud's own OAuth client cannot request Analytics scopes. | Add `--client-id-file` with the user's own OAuth client. |
| `invalid_grant` after about 7 days | OAuth app with the **External** audience in **Testing** status. | Run the gcloud login again. |

If the user manages multiple GA accounts (e.g. several clients or organizations), run `google-analytics-cli profiles` to list available profiles, then pass `--profile <name>` (e.g. `accounts --profile account-a`) to target a specific one. `--credentials` and `--profile` cannot be used together; `--credentials` overrides `GA_CLI_PROFILE`.

## Property ID

Most commands require a GA4 property ID. It can be provided as:

- A positional argument: `google-analytics-cli report 123456789 ...`
- The `--property` flag: `google-analytics-cli report --property 123456789 ...`
- The `GA_PROPERTY_ID` env var: `export GA_PROPERTY_ID=123456789`

Both raw numbers (`123456789`) and prefixed format (`properties/123456789`) are accepted.

To find the property ID, run `google-analytics-cli accounts` and read the `property` field in `propertySummaries`. The property ID is not the `G-XXXXXXXXXX` measurement ID. The CLI rejects values that start with `G-`. Account IDs (for `properties` and `change-history`) are in the `account` field.

## Output format

All commands output pretty-printed JSON by default. Use `--format compact` for single-line JSON.

## Admin commands

```bash
# List all accounts and their properties
google-analytics-cli accounts

# Get details about a specific property
google-analytics-cli property 123456789

# List properties for an account
google-analytics-cli properties 987654321
google-analytics-cli properties 987654321 --show-deleted

# List data streams for a property
google-analytics-cli data-streams 123456789

# List key events (conversions) for a property
google-analytics-cli key-events 123456789

# List custom dimensions for a property (Admin API)
google-analytics-cli admin-custom-dimensions 123456789

# List custom metrics for a property (Admin API)
google-analytics-cli admin-custom-metrics 123456789

# Get data retention settings for a property
google-analytics-cli data-retention 123456789

# List Google Ads links for a property
google-analytics-cli ads-links 123456789

# List annotations for a property (alpha API)
google-analytics-cli annotations 123456789

# Get custom dimensions and metrics for a property (Data API, filters by customDefinition)
google-analytics-cli custom-dims 123456789

# List configured credentials profiles (for users with multiple GA accounts)
google-analytics-cli profiles
```

### Change history

Search change history events for an account. Requires the **Editor** or **Administrator** role (and the `analytics.edit` scope with Application Default Credentials):

```bash
google-analytics-cli change-history 987654321
google-analytics-cli change-history 987654321 --filter-property 123456789
google-analytics-cli change-history 987654321 --earliest-change-time 2026-01-01T00:00:00Z
google-analytics-cli change-history 987654321 --earliest-change-time 2026-01-01T00:00:00Z --latest-change-time 2026-03-01T00:00:00Z
google-analytics-cli change-history 987654321 --actor-email user@example.com
google-analytics-cli change-history 987654321 --resource-type '["PROPERTY","DATA_STREAM"]'
google-analytics-cli change-history 987654321 --action '["CREATED","UPDATED"]'
```

### Access report

Run an access report to see who accessed the property. Requires the **Administrator** role:

```bash
google-analytics-cli access-report 123456789 \
  --dimensions "userEmail,accessedPropertyName" \
  --metrics "dataApiQuotaPropertyTokensConsumed" \
  --date-ranges '[{"startDate": "30daysAgo", "endDate": "yesterday"}]'
```

Options: `--dimension-filter`, `--metric-filter`, `--order-by`, `--limit`, `--offset`, `--time-zone`, `--return-entity-quota`, `--include-all-users`, `--expand-groups`.

Note: Access report uses `dimensionName`/`metricName` (not `name`) internally and `entity` (not `property`). The dimensions `accessMechanism` and `epochTimeMicros` and the metric `accessCount` work only on Google Analytics 360 properties.

## Running reports

The `report` command runs a GA4 Data API report.

```bash
google-analytics-cli report <property_id> \
  --dimensions "<comma-separated>" \
  --metrics "<comma-separated>" \
  --date-ranges '<JSON array>' \
  [--dimension-filter '<JSON>'] \
  [--metric-filter '<JSON>'] \
  [--order-by '<JSON array>'] \
  [--limit <n>] \
  [--offset <n>] \
  [--currency-code <ISO4217>] \
  [--keep-empty-rows] \
  [--return-property-quota]
```

Required options: `--dimensions`, `--metrics`, `--date-ranges`.

### Date ranges

The `--date-ranges` option takes a JSON array of date range objects:

```bash
# Relative dates
--date-ranges '[{"startDate": "30daysAgo", "endDate": "yesterday"}]'

# Absolute dates
--date-ranges '[{"startDate": "2026-01-01", "endDate": "2026-01-31"}]'

# Compare two periods
--date-ranges '[{"startDate": "30daysAgo", "endDate": "yesterday", "name": "current"}, {"startDate": "60daysAgo", "endDate": "31daysAgo", "name": "previous"}]'
```

Valid date values:
- Absolute: `YYYY-MM-DD` (e.g. `2026-01-01`)
- Relative: `NdaysAgo` (e.g. `30daysAgo`, `7daysAgo`)
- Special: `yesterday`, `today`
- Up to **4 date ranges** per request

### Dimension filters

The `--dimension-filter` option takes a JSON FilterExpression:

```bash
# Exact match
--dimension-filter '{"filter": {"fieldName": "country", "stringFilter": {"matchType": "EXACT", "value": "United States"}}}'

# Contains
--dimension-filter '{"filter": {"fieldName": "pagePath", "stringFilter": {"matchType": "CONTAINS", "value": "/blog"}}}'

# Regex
--dimension-filter '{"filter": {"fieldName": "pagePath", "stringFilter": {"matchType": "PARTIAL_REGEXP", "value": "^/products/[0-9]+"}}}'

# In list
--dimension-filter '{"filter": {"fieldName": "eventName", "inListFilter": {"values": ["page_view", "scroll", "click"]}}}'

# AND group
--dimension-filter '{"andGroup": {"expressions": [{"filter": {"fieldName": "country", "stringFilter": {"matchType": "EXACT", "value": "United States"}}}, {"filter": {"fieldName": "deviceCategory", "stringFilter": {"matchType": "EXACT", "value": "mobile"}}}]}}'

# OR group
--dimension-filter '{"orGroup": {"expressions": [{"filter": {"fieldName": "country", "stringFilter": {"matchType": "EXACT", "value": "United States"}}}, {"filter": {"fieldName": "country", "stringFilter": {"matchType": "EXACT", "value": "Canada"}}}]}}'

# NOT
--dimension-filter '{"notExpression": {"filter": {"fieldName": "pagePath", "stringFilter": {"matchType": "EXACT", "value": "/"}}}}'
```

StringFilter matchType values: `EXACT`, `BEGINS_WITH`, `ENDS_WITH`, `CONTAINS`, `FULL_REGEXP`, `PARTIAL_REGEXP`.

### Metric filters

The `--metric-filter` option takes the same FilterExpression structure but with numeric filters:

```bash
# Greater than
--metric-filter '{"filter": {"fieldName": "sessions", "numericFilter": {"operation": "GREATER_THAN", "value": {"int64Value": "100"}}}}'

# Between
--metric-filter '{"filter": {"fieldName": "bounceRate", "betweenFilter": {"fromValue": {"doubleValue": 0.5}, "toValue": {"doubleValue": 0.9}}}}'
```

NumericFilter operations: `EQUAL`, `LESS_THAN`, `LESS_THAN_OR_EQUAL`, `GREATER_THAN`, `GREATER_THAN_OR_EQUAL`.

NumericValue: use `{"int64Value": "string"}` for integers or `{"doubleValue": number}` for decimals.

### Ordering

The `--order-by` option takes a JSON array:

```bash
# By metric descending
--order-by '[{"metric": {"metricName": "sessions"}, "desc": true}]'

# By dimension alphabetically
--order-by '[{"dimension": {"dimensionName": "date", "orderType": "ALPHANUMERIC"}}]'

# Multiple sort keys
--order-by '[{"metric": {"metricName": "sessions"}, "desc": true}, {"dimension": {"dimensionName": "country"}}]'
```

DimensionOrderBy orderType values: `ALPHANUMERIC`, `CASE_INSENSITIVE_ALPHANUMERIC`, `NUMERIC`.

## Pivot reports

Run a pivot report for cross-tabulation analysis:

```bash
google-analytics-cli pivot-report 123456789 \
  --dimensions "country,browser" \
  --metrics "sessions,activeUsers" \
  --date-ranges '[{"startDate": "30daysAgo", "endDate": "yesterday"}]' \
  --pivots '[{"fieldNames": ["browser"], "limit": 5, "orderBys": [{"metric": {"metricName": "sessions"}, "desc": true}]}]'
```

Options: `--dimension-filter`, `--metric-filter`, `--currency-code`, `--keep-empty-rows`, `--return-property-quota`.

## Batch reports

Run up to 5 reports in a single request:

```bash
google-analytics-cli batch-report 123456789 \
  --requests '[{"dimensions": [{"name": "date"}], "metrics": [{"name": "activeUsers"}], "dateRanges": [{"startDate": "7daysAgo", "endDate": "yesterday"}]}, {"dimensions": [{"name": "country"}], "metrics": [{"name": "sessions"}], "dateRanges": [{"startDate": "7daysAgo", "endDate": "yesterday"}]}]'
```

## Metadata and compatibility

```bash
# Get full metadata (all available dimensions and metrics)
google-analytics-cli metadata 123456789

# Check if dimensions and metrics are compatible
google-analytics-cli check-compatibility 123456789 \
  --dimensions "date,country" \
  --metrics "sessions,activeUsers"
```

Options: `--dimension-filter`, `--metric-filter` (same FilterExpression format as `report`).

## Audience exports

```bash
# Create an audience export
google-analytics-cli audience-export-create 123456789 \
  --audience "properties/123456789/audiences/456" \
  --dimensions "deviceId,userId"

# Get status of an audience export
google-analytics-cli audience-export properties/123456789/audienceExports/789

# List all audience exports
google-analytics-cli audience-exports 123456789

# Query rows from a completed audience export
google-analytics-cli audience-export-query properties/123456789/audienceExports/789 \
  --limit 1000 --offset 0
```

## Realtime reports

The `realtime` command monitors current activity. No date ranges or currency code.

```bash
google-analytics-cli realtime <property_id> \
  --dimensions "<comma-separated>" \
  --metrics "<comma-separated>" \
  [--dimension-filter '<JSON>'] \
  [--metric-filter '<JSON>'] \
  [--order-by '<JSON array>'] \
  [--limit <n>] \
  [--return-property-quota]
```

Realtime reports cover the **last 30 minutes** of activity.

### Realtime dimensions (limited set)

`appVersion`, `audienceId`, `audienceName`, `audienceResourceName`, `city`, `cityId`, `country`, `countryId`, `deviceCategory`, `eventName`, `minutesAgo`, `platform`, `streamId`, `streamName`, `unifiedScreenName`

Note: `minutesAgo` is `"00"` for the current minute, `"01"` for the previous, up to `"29"`.

### Realtime metrics (4 only)

`activeUsers`, `eventCount`, `keyEvents`, `screenPageViews`

## Common dimensions reference

**Traffic source (session-scoped):**
`sessionSource`, `sessionMedium`, `sessionSourceMedium`, `sessionDefaultChannelGroup`, `sessionCampaignName`, `sessionCampaignId`

**Traffic source (first-user acquisition):**
`firstUserSource`, `firstUserMedium`, `firstUserSourceMedium`, `firstUserDefaultChannelGroup`, `firstUserCampaignName`

**Page/Screen:**
`pagePath`, `pageTitle`, `pagePathPlusQueryString`, `landingPage`, `landingPagePlusQueryString`, `hostName`, `fullPageUrl`, `contentGroup`

**Event:**
`eventName`, `isKeyEvent`

**User:**
`newVsReturning`, `userAgeBracket`, `userGender`, `firstSessionDate`

**Geography:**
`country`, `countryId`, `city`, `cityId`, `region`, `continent`, `language`

**Device:**
`deviceCategory`, `browser`, `operatingSystem`, `operatingSystemVersion`, `screenResolution`, `mobileDeviceBranding`, `platform`

**Time:**
`date`, `dateHour`, `day`, `dayOfWeek`, `dayOfWeekName`, `hour`, `month`, `week`, `year`, `yearMonth`, `nthDay`

**Ecommerce:**
`transactionId`, `itemName`, `itemId`, `itemCategory`, `itemBrand`, `itemVariant`, `orderCoupon`

**Google Ads:**
`sessionGoogleAdsCampaignName`, `sessionGoogleAdsAdGroupName`, `sessionGoogleAdsKeyword`, `sessionGoogleAdsAdNetworkType`, `googleAdsAccountName`

**Audience:**
`audienceId`, `audienceName`

**Custom dimensions:**
`customEvent:parameter_name` (event-scoped), `customUser:parameter_name` (user-scoped), `customItem:parameter_name` (item-scoped)

## Common metrics reference

**User:**
`activeUsers`, `newUsers`, `totalUsers`

**Session:**
`sessions`, `sessionsPerUser`, `averageSessionDuration`, `bounceRate`

**Engagement:**
`engagedSessions`, `engagementRate`, `screenPageViews`, `screenPageViewsPerSession`, `screenPageViewsPerUser`, `userEngagementDuration`

**Event:**
`eventCount`, `eventCountPerUser`, `eventValue`, `eventsPerSession`

**Key events (conversions):**
`keyEvents`, `sessionKeyEventRate`, `userKeyEventRate`

**Ecommerce/Revenue:**
`ecommercePurchases`, `purchaseRevenue`, `totalRevenue`, `transactions`, `averagePurchaseRevenue`, `averageRevenuePerUser`, `itemRevenue`, `addToCarts`, `checkouts`, `cartToViewRate`

**Advertising:**
`advertiserAdClicks`, `advertiserAdCost`, `advertiserAdCostPerClick`, `advertiserAdImpressions`, `returnOnAdSpend`

**Custom metrics:**
`customEvent:parameter_name` (sum), `averageCustomEvent:parameter_name` (average), `countCustomEvent:parameter_name` (count)

## Report examples

**Traffic overview (last 30 days):**
```bash
google-analytics-cli report 123456789 \
  --dimensions "sessionDefaultChannelGroup" \
  --metrics "sessions,activeUsers,engagementRate,keyEvents,totalRevenue" \
  --date-ranges '[{"startDate": "30daysAgo", "endDate": "yesterday"}]' \
  --order-by '[{"metric": {"metricName": "sessions"}, "desc": true}]'
```

**Top pages by views:**
```bash
google-analytics-cli report 123456789 \
  --dimensions "pagePath" \
  --metrics "screenPageViews,activeUsers,averageSessionDuration,bounceRate" \
  --date-ranges '[{"startDate": "30daysAgo", "endDate": "yesterday"}]' \
  --order-by '[{"metric": {"metricName": "screenPageViews"}, "desc": true}]' \
  --limit 20
```

**Daily trend:**
```bash
google-analytics-cli report 123456789 \
  --dimensions "date" \
  --metrics "activeUsers,sessions,screenPageViews,keyEvents" \
  --date-ranges '[{"startDate": "30daysAgo", "endDate": "yesterday"}]' \
  --order-by '[{"dimension": {"dimensionName": "date"}}]'
```

**Traffic source breakdown:**
```bash
google-analytics-cli report 123456789 \
  --dimensions "sessionSource,sessionMedium" \
  --metrics "sessions,activeUsers,engagementRate,bounceRate,keyEvents" \
  --date-ranges '[{"startDate": "7daysAgo", "endDate": "yesterday"}]' \
  --order-by '[{"metric": {"metricName": "sessions"}, "desc": true}]' \
  --limit 20
```

**Landing page performance:**
```bash
google-analytics-cli report 123456789 \
  --dimensions "landingPage" \
  --metrics "sessions,activeUsers,bounceRate,keyEvents,averageSessionDuration" \
  --date-ranges '[{"startDate": "30daysAgo", "endDate": "yesterday"}]' \
  --order-by '[{"metric": {"metricName": "sessions"}, "desc": true}]' \
  --limit 20
```

**Device breakdown:**
```bash
google-analytics-cli report 123456789 \
  --dimensions "deviceCategory" \
  --metrics "activeUsers,sessions,engagementRate,bounceRate,screenPageViews" \
  --date-ranges '[{"startDate": "30daysAgo", "endDate": "yesterday"}]'
```

**Geography:**
```bash
google-analytics-cli report 123456789 \
  --dimensions "country" \
  --metrics "activeUsers,sessions,engagementRate,keyEvents" \
  --date-ranges '[{"startDate": "30daysAgo", "endDate": "yesterday"}]' \
  --order-by '[{"metric": {"metricName": "activeUsers"}, "desc": true}]' \
  --limit 20
```

**Event analysis:**
```bash
google-analytics-cli report 123456789 \
  --dimensions "eventName" \
  --metrics "eventCount,eventCountPerUser,eventValue" \
  --date-ranges '[{"startDate": "7daysAgo", "endDate": "yesterday"}]' \
  --order-by '[{"metric": {"metricName": "eventCount"}, "desc": true}]' \
  --limit 20
```

**Period comparison:**
```bash
google-analytics-cli report 123456789 \
  --dimensions "sessionDefaultChannelGroup" \
  --metrics "sessions,activeUsers,keyEvents" \
  --date-ranges '[{"startDate": "30daysAgo", "endDate": "yesterday", "name": "current"}, {"startDate": "60daysAgo", "endDate": "31daysAgo", "name": "previous"}]' \
  --order-by '[{"metric": {"metricName": "sessions"}, "desc": true}]'
```

**Ecommerce performance:**
```bash
google-analytics-cli report 123456789 \
  --dimensions "itemName" \
  --metrics "itemRevenue,itemsPurchased,addToCarts,cartToViewRate" \
  --date-ranges '[{"startDate": "30daysAgo", "endDate": "yesterday"}]' \
  --order-by '[{"metric": {"metricName": "itemRevenue"}, "desc": true}]' \
  --limit 20
```

**New vs returning users:**
```bash
google-analytics-cli report 123456789 \
  --dimensions "newVsReturning" \
  --metrics "activeUsers,sessions,engagementRate,screenPageViews,keyEvents" \
  --date-ranges '[{"startDate": "30daysAgo", "endDate": "yesterday"}]'
```

**User acquisition (first-touch):**
```bash
google-analytics-cli report 123456789 \
  --dimensions "firstUserDefaultChannelGroup" \
  --metrics "newUsers,activeUsers,sessions,keyEvents,totalRevenue" \
  --date-ranges '[{"startDate": "30daysAgo", "endDate": "yesterday"}]' \
  --order-by '[{"metric": {"metricName": "newUsers"}, "desc": true}]'
```

**Campaign (UTM) performance:**
```bash
google-analytics-cli report 123456789 \
  --dimensions "sessionCampaignName,sessionSourceMedium" \
  --metrics "sessions,activeUsers,engagementRate,keyEvents,totalRevenue" \
  --date-ranges '[{"startDate": "30daysAgo", "endDate": "yesterday"}]' \
  --order-by '[{"metric": {"metricName": "sessions"}, "desc": true}]' \
  --limit 20
```

**Google Ads campaign performance:**
```bash
google-analytics-cli report 123456789 \
  --dimensions "sessionGoogleAdsCampaignName" \
  --metrics "sessions,keyEvents,advertiserAdCost,advertiserAdClicks,returnOnAdSpend" \
  --date-ranges '[{"startDate": "30daysAgo", "endDate": "yesterday"}]' \
  --order-by '[{"metric": {"metricName": "advertiserAdCost"}, "desc": true}]'
```

**Filtered report (blog pages only, US mobile users):**
```bash
google-analytics-cli report 123456789 \
  --dimensions "pagePath" \
  --metrics "screenPageViews,activeUsers,engagementRate" \
  --date-ranges '[{"startDate": "30daysAgo", "endDate": "yesterday"}]' \
  --dimension-filter '{"andGroup": {"expressions": [{"filter": {"fieldName": "pagePath", "stringFilter": {"matchType": "BEGINS_WITH", "value": "/blog"}}}, {"filter": {"fieldName": "country", "stringFilter": {"matchType": "EXACT", "value": "United States"}}}, {"filter": {"fieldName": "deviceCategory", "stringFilter": {"matchType": "EXACT", "value": "mobile"}}}]}}' \
  --order-by '[{"metric": {"metricName": "screenPageViews"}, "desc": true}]' \
  --limit 20
```

**Realtime -- active users by country:**
```bash
google-analytics-cli realtime 123456789 \
  --dimensions "country" \
  --metrics "activeUsers" \
  --order-by '[{"metric": {"metricName": "activeUsers"}, "desc": true}]'
```

**Realtime -- active pages:**
```bash
google-analytics-cli realtime 123456789 \
  --dimensions "unifiedScreenName" \
  --metrics "activeUsers,screenPageViews" \
  --order-by '[{"metric": {"metricName": "activeUsers"}, "desc": true}]' \
  --limit 10
```

## Important rules

1. **Dimension/metric compatibility.** Not all dimensions and metrics can be used together. If you get a compatibility error, reduce the number of dimensions or try different combinations. Use the `check-compatibility` command to test before running a report, or use `metadata` to see all available dimensions and metrics.

2. **Max 9 dimensions** per report request.

3. **Max 4 date ranges** per report request.

4. **Max 250,000 rows** per response. Use `--offset` and `--limit` for pagination.

5. **Realtime is limited.** Only 15 dimensions and 4 metrics. No date ranges, no currency code, no offset. Covers the last 30 minutes.

6. **Thresholded dimensions.** `userAgeBracket`, `userGender`, and `audienceId`/`audienceName` may return thresholded (sampled) data for privacy when row counts are too low.

7. **Quota.** Use `--return-property-quota` to check current quota status. Standard properties get 200,000 tokens/day.

8. **Filter scope.** `--dimension-filter` only accepts dimension field names. `--metric-filter` only accepts metric field names. They are applied independently by the API.

9. **Batch reports.** Max 5 report objects per batch request.

10. **Audience exports.** Creating an export returns a long-running operation. Poll with `audience-export` until state is `ACTIVE`, then query rows with `audience-export-query`.

## Workflow guidance

### Quick overview

1. Run `google-analytics-cli accounts` to find properties
2. Run a traffic overview report with `sessionDefaultChannelGroup` and key metrics
3. Present trends with daily date dimension

### Deep analysis

1. Start broad: traffic channels and top-level metrics
2. Drill down: specific pages, events, or sources that underperform
3. Compare periods to identify trends
4. Check device and geography breakdowns for segment-specific issues
5. Use `--dimension-filter` to isolate specific segments

### Property exploration

1. Run `google-analytics-cli properties <account_id>` to see all properties
2. Run `google-analytics-cli data-streams <property_id>` to see data streams
3. Run `google-analytics-cli key-events <property_id>` to see configured conversions
4. Run `google-analytics-cli metadata <property_id>` for all available dimensions and metrics
5. Run `google-analytics-cli check-compatibility <property_id>` before complex reports

### Error handling

- **Empty `accounts` (`[]`)** -- the credentials work, but no account or property grants them access. See the troubleshooting table in Authentication.
- **403 `SERVICE_DISABLED` / "has not been used in project"** -- the Admin API or Data API is not enabled in the Google Cloud project
- **403 permission denied** -- the credentials have no access to the property, or the role is too low (`change-history` needs Editor, `access-report` needs Administrator)
- **Incompatible dimensions/metrics** -- use `check-compatibility` to test, reduce dimensions or try different combinations
- **Empty results** -- check property ID, date range, and whether data exists for those dimensions
- **Quota exceeded** -- use `--return-property-quota` to check usage; reduce request frequency or complexity

## API documentation references

- [google-analytics-cli documentation](https://github.com/Bin-Huang/google-analytics-cli)
- [GA4 Data API overview](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [Dimensions and metrics reference](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema)
- [Realtime API schema](https://developers.google.com/analytics/devguides/reporting/data/v1/realtime-api-schema)
- [FilterExpression reference](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/FilterExpression)
- [OrderBy reference](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/OrderBy)
- [Quotas and limits](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas)
- [GA4 Admin API](https://developers.google.com/analytics/devguides/config/admin/v1)
