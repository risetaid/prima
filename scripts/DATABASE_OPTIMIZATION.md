# Database Index Optimization

This directory contains scripts for optimizing the PRIMA database indexes.

## Quick Start

```bash
cd frontend
bun run db:optimize-indexes
```

## What This Does

The optimization script removes **~80-90 redundant, duplicate, and unused indexes** from your database:

- ✅ Removes single-column indexes covered by composite indexes
- ✅ Removes exact duplicate indexes (3+ indexes on same column)
- ✅ Removes all indexes on empty tables (0 rows)
- ✅ Removes indexes that have never been scanned
- ✅ Vacuums tables with high dead tuple percentage
- ✅ Adds 2 missing useful indexes
- ✅ Updates table statistics

## Expected Results

### Before Optimization
- 150+ total indexes
- 115 unused indexes (never scanned)
- reminders: 25 indexes
- patients: 14 indexes
- users: 14 indexes

### After Optimization
- 50-60 essential indexes
- 0 unused indexes
- reminders: 8-10 indexes
- patients: 4-5 indexes
- users: 4-5 indexes

### Performance Improvements
- **INSERT/UPDATE/DELETE**: 30-50% faster
- **Storage Recovery**: ~1.5-2 MB
- **Query Planning**: Simpler, faster decisions
- **VACUUM Operations**: More efficient

## Tables Affected

| Table | Before | After | Saved |
|-------|--------|-------|-------|
| reminders | 25 indexes | 8-10 indexes | ~500 kB |
| patients | 14 indexes | 4-5 indexes | ~240 kB |
| users | 14 indexes | 4-5 indexes | ~200 kB |
| manual_confirmations | 12 indexes | 1-2 indexes | ~190 kB |
| Empty tables (10) | 60+ indexes | ~10 indexes | ~768 kB |

## Safety

### What's Safe
- ✅ Only drops indexes (never touches data)
- ✅ Uses `DROP INDEX IF EXISTS` (won't fail if missing)
- ✅ Primary keys and unique constraints are preserved
- ✅ Foreign key relationships are maintained

### What to Watch
- ⚠️ `VACUUM FULL` locks tables briefly (users/patients)
- ⚠️ Run during low-traffic period if possible
- ⚠️ Monitor performance after optimization

## Files

- `optimize-database-indexes.ts` - Bun/TypeScript script (recommended)
- `../database-optimization-cleanup.sql` - Raw SQL file (for reference)

## Verification

After running, check the results:

```bash
# Check remaining indexes per table
bun run scripts/check-index-usage.ts

# Or manually via SQL
psql -d prima -c "
SELECT
  tablename,
  COUNT(*) as index_count
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY index_count DESC;
"
```

## When to Run

Run this optimization when:
- ✅ After initial database setup
- ✅ After migrations that add many indexes
- ✅ Database feels slow on writes (INSERT/UPDATE/DELETE)
- ✅ You see "too many indexes" warnings

Don't run this if:
- ❌ Database is under heavy load
- ❌ You recently made schema changes
- ❌ You're uncertain about current performance

## Rollback

If you need to restore indexes, the original SQL for all dropped indexes is in:
`../database-optimization-cleanup.sql`

Look for the commented sections with the index definitions.

## Questions?

See the full analysis report in the root directory:
- Analysis details
- Specific findings per table
- Detailed explanations

## Additional Scripts

```bash
# Apply recommended indexes (add missing ones)
bun run db:apply-indexes

# Check current index usage statistics
bun run scripts/check-index-usage.ts  # if available

# View database in GUI
bun run db:studio
```
