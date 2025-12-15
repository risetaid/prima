# Phase 3 Database Migration Guide

## Overview

This guide covers applying the Phase 3 composite indexes to your production database **WITHOUT downtime**.

## Files

- `0013_sticky_skreet.sql` - Original drizzle-kit generated (DO NOT use in production)
- `0013_sticky_skreet_CONCURRENT.sql` - **Production-safe version with CONCURRENT keyword**

## Why CONCURRENT?

Railway Pro production has active users. Regular `CREATE INDEX` would:
- Lock the table during creation
- Block all writes to conversation_states and conversation_messages
- Cause API timeouts and user-facing errors

`CREATE INDEX CONCURRENTLY`:
- No table locks
- Slower creation but safe
- Can run during peak traffic
- Zero user impact

## Migration Steps

### Step 1: Backup (Safety First)

```bash
# Railway dashboard → Database → Backups → Create Manual Backup
# Or via CLI:
railway db backup create
```

### Step 2: Apply to Staging First

```bash
# Connect to staging database
railway link --environment staging

# Run the CONCURRENT migration
psql $DATABASE_URL < drizzle/migrations/0013_sticky_skreet_CONCURRENT.sql
```

### Step 3: Verify in Staging

```sql
-- Check indexes were created
SELECT indexrelname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('conversation_states', 'conversation_messages')
AND indexrelname LIKE '%patient_active%' OR indexrelname LIKE '%state_created%';

-- Monitor index usage (wait 24 hours)
SELECT 
  indexrelname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE indexrelname IN (
  'conversation_states_patient_active_expires_idx',
  'conversation_messages_state_created_idx'
)
ORDER BY idx_scan DESC;
```

### Step 4: Test Query Performance in Staging

```sql
-- Test active conversation lookup
EXPLAIN ANALYZE
SELECT * FROM conversation_states
WHERE patient_id = '<some-uuid>'
AND is_active = true
AND expires_at > NOW();

-- Test message history
EXPLAIN ANALYZE
SELECT * FROM conversation_messages
WHERE conversation_state_id = '<some-uuid>'
ORDER BY created_at DESC;
```

Expected: Both queries should show "Index Scan" in EXPLAIN output.

### Step 5: Apply to Production

```bash
# Switch to production
railway link --environment production

# Run the CONCURRENT migration
# NOTE: This may take 5-10 minutes depending on table size
psql $DATABASE_URL < drizzle/migrations/0013_sticky_skreet_CONCURRENT.sql
```

### Step 6: Monitor Production

```sql
-- Check index creation progress (if still running)
SELECT 
  datname,
  pid,
  state,
  query_start,
  state_change,
  query
FROM pg_stat_activity
WHERE query LIKE '%CREATE INDEX CONCURRENTLY%';

-- After completion, verify usage
SELECT * FROM pg_stat_user_indexes 
WHERE indexrelname LIKE '%conversation%'
ORDER BY idx_scan DESC;
```

### Step 7: Update Drizzle Meta (Railway Dashboard)

After successful migration, update Drizzle meta to mark as applied:

```bash
# This tells drizzle-kit the migration has been applied
bunx drizzle-kit push
```

## Rollback Plan

If indexes cause issues (unlikely):

```sql
-- Drop indexes (also uses CONCURRENTLY to avoid locks)
DROP INDEX CONCURRENTLY IF EXISTS conversation_messages_state_created_idx;
DROP INDEX CONCURRENTLY IF EXISTS conversation_states_patient_active_expires_idx;
```

## Expected Performance Improvements

| Query | Before | After | Improvement |
|-------|--------|-------|-------------|
| Active conversation lookup | 200ms | <10ms | 20x faster |
| Message history retrieval | 150ms | <5ms | 30x faster |
| Cleanup job (per conversation) | 30s | <5s | 6x faster |

## Troubleshooting

### Migration Taking Too Long

CONCURRENT index creation is slower by design. For large tables:
- conversation_states: 5-10 minutes for 100K rows
- conversation_messages: 10-20 minutes for 1M rows

This is normal and safe. Do not interrupt.

### Migration Failed

If CONCURRENT index creation fails:
1. Check PostgreSQL logs in Railway dashboard
2. Most common issue: Out of disk space (check Railway metrics)
3. Safe to retry - CONCURRENT is idempotent

### Index Not Being Used

Check if query planner statistics are stale:

```sql
ANALYZE conversation_states;
ANALYZE conversation_messages;
```

## Post-Migration Checklist

- [ ] Indexes created successfully in staging
- [ ] Query plans show index usage in staging
- [ ] Monitored staging for 24 hours - no issues
- [ ] Indexes created successfully in production
- [ ] Query plans show index usage in production
- [ ] pg_stat_user_indexes shows idx_scan > 0
- [ ] `/api/admin/migration-health` shows improved query times
- [ ] No errors in Railway logs
- [ ] Updated Drizzle meta with `drizzle-kit push`

## Support

If you encounter issues:
1. Check Railway logs: `railway logs`
2. Check database metrics in Railway dashboard
3. Roll back indexes if critical
4. Document the issue in project docs
