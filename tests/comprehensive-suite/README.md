# Comprehensive Test Suite

## Overview

This directory contains a comprehensive testing suite for the PRIMA system with **user-friendly reports** designed for non-technical users.

## Features

✅ **Comprehensive Coverage:**

- 🔐 Authentication (Login, Security, Session Management)
- ⏰ Reminder System (Creation, Scheduling, Sending)
- 💬 WhatsApp Integration (Messages, Webhooks, AI Processing)
- 📺 Content Management (Videos, Articles/Berita)
- 🔥 Load Testing (10, 25, 50, 100 concurrent users)
- 📊 Response Time Analysis

✅ **User-Friendly Reports:**

- Beautiful HTML reports with charts and graphs
- Plain text summaries in Indonesian
- JSON data for programmatic access
- Color-coded results (✅ success, ⚠️ warning, ❌ error)
- Non-technical error messages
- Actionable recommendations

## Quick Start

### Run All Tests

```bash
bun run test:comprehensive
```

### Run Specific Category

```bash
# Authentication tests only
bun run test:comprehensive -- --category auth

# Load tests only
bun run test:comprehensive -- --category load

# WhatsApp tests only
bun run test:comprehensive -- --category whatsapp
```

## Available Categories

1. **auth** - Authentication & Security

   - User login/signup
   - Session management
   - Access control
   - SQL injection prevention
   - XSS prevention
   - Rate limiting

2. **reminder** - Reminder System

   - Create/update/delete reminders
   - Daily/weekly/monthly schedules
   - Instant send
   - Scheduled execution
   - Content attachments

3. **whatsapp** - WhatsApp Integration

   - Send messages
   - Receive webhooks
   - Confirmation processing
   - AI intent detection
   - Phone number formatting
   - Duplicate message handling

4. **content** - Video & Berita

   - List/create/update/delete videos
   - List/create/update/delete articles
   - YouTube sync
   - Search & filtering
   - Pagination

5. **load** - Load & Performance
   - 10 concurrent users
   - 25 concurrent users
   - 50 concurrent users
   - 100 users stress test
   - Response time analysis
   - Performance metrics (P50, P95, P99)

## Output Files

After running tests, check the `test-results/` directory:

- **`test-report-{timestamp}.html`** 📄

  - Open in browser for beautiful visual report
  - Perfect for sharing with non-technical stakeholders
  - Interactive, collapsible sections
  - Color-coded status indicators

- **`test-report-{timestamp}.txt`** 📝

  - Plain text summary in Indonesian
  - Easy to read in any text editor
  - Includes recommendations

- **`test-report-{timestamp}.json`** 📊
  - Raw data for developers
  - Can be used for automation
  - Contains full test details

## Understanding Reports

### Status Indicators

- ✅ **Green/Checkmark** - Test passed successfully
- ⚠️ **Yellow/Warning** - Test passed with warnings or partial success
- ❌ **Red/X** - Test failed

### Performance Metrics

- **Success Rate** - Percentage of successful requests
- **Avg Response Time** - Average time for server to respond
- **P50 (Median)** - 50% of requests were faster than this
- **P95** - 95% of requests were faster than this (used for SLA)
- **P99** - 99% of requests were faster than this (worst-case)

### Load Test Expectations

- **10 Users**: Should have >98% success rate, <500ms response
- **25 Users**: Should have >95% success rate, <1000ms response
- **50 Users**: Should have >90% success rate, <2000ms response
- **100 Users (Stress)**: Expected to have some failures, testing limits

## Configuration

### Environment Variables

Make sure these are set in your `.env.local`:

```env
# Required for full test coverage
WAHA_ENDPOINT=http://your-waha-instance:3000
WAHA_API_KEY=your_api_key
WAHA_SESSION=default
WEBHOOK_TOKEN=your_webhook_token

# Optional
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Test Timeout

Tests have a 30-second timeout by default. For slower systems:

```typescript
// Modify in runner.ts if needed
testTimeout: 30000; // milliseconds
```

## Troubleshooting

### Common Issues

**"ECONNREFUSED"**

- Server not running
- Start dev server: `bun run dev`

**"Rate limit exceeded"**

- Expected behavior for rate limiting tests
- Wait a few minutes between test runs

**"Authentication failed"**

- Tests expect endpoints to be protected
- 401/403 responses are normal for unauthed tests

**"WhatsApp tests failing"**

- WAHA service might not be configured
- Tests will skip gracefully if service unavailable

### Need Help?

1. Check the HTML report for detailed error messages
2. Review the console output during test run
3. Check server logs: `bun run dev` output
4. Verify environment variables are set correctly

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Run Comprehensive Tests
  run: bun run test:comprehensive

- name: Upload Test Reports
  uses: actions/upload-artifact@v3
  with:
    name: test-reports
    path: test-results/
```

## Development

### Adding New Tests

1. Create a new test file in `comprehensive-suite/`
2. Follow the pattern in existing test files
3. Use `TestUtils.runTest()` for consistent error handling
4. Add to main runner in `runner.ts`

### Test Structure

```typescript
private async testMyFeature() {
  const result = await TestUtils.runTest(
    'Feature Name',
    'category',
    async () => {
      // Test logic here
      if (condition) {
        throw new Error('Descriptive error message');
      }
    }
  );
  this.testResults.push(result);
}
```

## Performance Benchmarks

### Expected Response Times

- Health check: <100ms
- Dashboard stats: <500ms
- Patient list: <1000ms
- Complex queries: <2000ms

### Load Test Targets

- **Light Load (10 users)**: 99% success
- **Medium Load (25 users)**: 95% success
- **Heavy Load (50 users)**: 90% success
- **Stress (100 users)**: 80%+ success acceptable

## License

Part of PRIMA healthcare system.
