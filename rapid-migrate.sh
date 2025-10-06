#!/bin/bash

# Rapid API migration script
# Focus on simple APIs first

echo "Starting rapid API migration..."

# Simple APIs to migrate (auth not required or simple patterns)
simple_apis=(
  "src/app/api/debug/webhook/route.ts"
  "src/app/api/cron/cleanup-conversations/route.ts"
  "src/app/api/user/status/route.ts"
)

# Complex APIs that need special handling (webhooks, complex logic)
complex_apis=(
  "src/app/api/webhooks/clerk/route.ts"
  "src/app/api/webhooks/fonnte/incoming/route.ts"
  "src/app/api/webhooks/fonnte/message-status/route.ts"
  "src/app/api/patients/[id]/manual-verification/route.ts"
  "src/app/api/patients/[id]/send-verification/route.ts"
)

echo "Total simple APIs: ${#simple_apis[@]}"
echo "Total complex APIs: ${#complex_apis[@]}"

# For now, just report the status
echo "Migration ready to continue..."

# Count current progress
migrated=$(find src/app/api -name "route.ts" -exec grep -l "createApiHandler" {} \; | wc -l)
total=$(find src/app/api -name "route.ts" | wc -l)
echo "Current progress: $migrated/$total APIs migrated"

echo "Continue manual migration for best results..."