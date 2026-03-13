# google-analytics-cli

A Google Analytics CLI designed for AI agents. Wraps the GA4 Admin and Data APIs with simple commands that output JSON.

## Installation

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

Or with [uv](https://github.com/astral-sh/uv):

```bash
uv venv .venv
source .venv/bin/activate
uv pip install -e .
```

## Authentication

The CLI uses Google Application Default Credentials (ADC) with read-only Analytics scope.

```bash
gcloud auth application-default login \
  --scopes="https://www.googleapis.com/auth/analytics.readonly"
```

## Usage

All commands output JSON by default. Use `--format jsonl` for newline-delimited JSON.

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

List annotations (notes) for a property.

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
  --date-ranges '[{"start_date": "30daysAgo", "end_date": "yesterday"}]'

# With filters and ordering
google-analytics-cli report 123456789 \
  --dimensions "eventName" \
  --metrics "eventCount" \
  --date-ranges '[{"start_date": "7daysAgo", "end_date": "today"}]' \
  --dimension-filter '{"filter": {"field_name": "eventName", "string_filter": {"match_type": "BEGINS_WITH", "value": "page"}}}' \
  --order-by '[{"metric": {"metric_name": "eventCount"}, "desc": true}]' \
  --limit 10

# With currency and quota info
google-analytics-cli report 123456789 \
  --dimensions "date" \
  --metrics "totalRevenue" \
  --date-ranges '[{"start_date": "2024-01-01", "end_date": "2024-01-31"}]' \
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
  --order-by '[{"metric": {"metric_name": "activeUsers"}, "desc": true}]' \
  --limit 5
```

## License

Apache-2.0
