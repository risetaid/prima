/**
 * Audit Log Retention Enforcement Script
 *
 * Monthly cron job to enforce 7-year retention policy for audit logs.
 * Partitions audit_logs by month and removes old partitions.
 *
 * Run via: pnpm run scripts/audit-retention.ts
 *
 * This script should be scheduled to run on the 1st of each month.
 */

import "dotenv/config";
import postgres from "postgres";
import { logger } from "@/lib/logger";

// Configuration
const RETENTION_YEARS = 7;
const DRY_RUN = process.env.AUDIT_RETENTION_DRY_RUN !== "false";

const sql = postgres(process.env.DATABASE_URL!, {
  max: 5,
  idle_timeout: 30,
  connect_timeout: 10,
});

/**
 * Main retention enforcement function
 */
async function enforceRetention() {
  logger.info("Starting audit log retention enforcement", {
    operation: "audit_retention",
    retentionYears: RETENTION_YEARS,
    dryRun: DRY_RUN,
  });

  try {
    // 1. Get the cutoff date (7 years ago)
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - RETENTION_YEARS);

    logger.info("Retention cutoff date", {
      cutoff: cutoffDate.toISOString().split("T")[0],
    });

    // 2. Check for partitions older than cutoff
    const cutoffStr = cutoffDate.toISOString().split("T")[0];
    const oldPartitions = await findOldPartitions(cutoffStr);

    if (oldPartitions.length === 0) {
      logger.info("No audit log partitions older than retention period found");
      return;
    }

    logger.info("Found partitions to process", {
      partitions: oldPartitions.map((p) => p.tablename),
    });

    // 3. Process each old partition
    for (const partition of oldPartitions) {
      await processPartition(partition);
    }

    // 4. Create future partitions if needed
    await ensureFuturePartitions();

    logger.info("Audit retention enforcement completed", {
      processedPartitions: oldPartitions.length,
    });
  } catch (error) {
    logger.error("Audit retention enforcement failed", error as Error, {
      operation: "audit_retention",
    });
    throw error;
  } finally {
    await sql.end();
  }
}

/**
 * Find partitions older than the cutoff date
 */
async function findOldPartitions(cutoffStr: string): Promise<{ schemaname: string; tablename: string }[]> {
  // Query to find partitions with data older than cutoff
  const result = await sql`
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE tablename LIKE 'audit_logs_20%'
    AND tablename != 'audit_logs_default'
    AND tablename < 'audit_logs_${cutoffStr.replace(/-/g, "_").slice(0, 7)}'
    ORDER BY tablename
  `;

  return result as unknown as { schemaname: string; tablename: string }[];
}

/**
 * Process a single partition (archive and drop if necessary)
 */
async function processPartition(
  partition: { schemaname: string; tablename: string }
) {
  const fullTableName = `${partition.schemaname}.${partition.tablename}`;

  logger.info("Processing audit log partition", {
    table: fullTableName,
    dryRun: DRY_RUN,
  });

  try {
    // 1. Get row count for logging
    const rowCountResult =
      await sql`SELECT COUNT(*) as count FROM ${sql(
        partition.tablename
      )}`;
    const rowCount = parseInt(rowCountResult[0].count as string, 10);

    logger.info("Partition details", {
      table: fullTableName,
      rowCount,
    });

    if (DRY_RUN) {
      logger.info("[DRY RUN] Would archive and drop partition", {
        table: fullTableName,
        rowCount,
      });
      return;
    }

    // 2. Archive partition to cold storage (S3/MinIO)
    // This is a placeholder - implement actual archival based on storage backend
    await archivePartition(partition.tablename);

    // 3. Drop the partition
    await sql`DROP TABLE IF EXISTS ${sql(partition.tablename)}`;

    logger.info("Successfully processed partition", {
      table: fullTableName,
      rowCount,
    });
  } catch (error) {
    logger.error("Failed to process partition", error as Error, {
      table: fullTableName,
    });
    throw error;
  }
}

/**
 * Archive partition to cold storage
 * Placeholder implementation - customize based on storage backend
 */
async function archivePartition(partitionName: string) {
  // Export partition to CSV and upload to S3/MinIO
  // This is a placeholder - implement actual archival

  logger.info("Archiving partition to cold storage", {
    partition: partitionName,
  });

  // Example implementation would:
  // 1. COPY (SELECT * FROM partition_name) TO '/tmp/audit_export.csv'
  // 2. Upload file to S3 bucket with encryption
  // 3. Store metadata about the archive

  // For now, we just log
  logger.info("Partition archived (placeholder)", {
    partition: partitionName,
  });
}

/**
 * Ensure future partitions exist (up to 2 years ahead)
 */
async function ensureFuturePartitions() {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setFullYear(endDate.getFullYear() + 2);

  const currentDate = new Date(now);
  currentDate.setDate(1); // First of current month

  const partitionsToCreate: string[] = [];
  const iterDate = new Date(currentDate);

  while (iterDate <= endDate) {
    const partitionName = `audit_logs_${iterDate.getFullYear()}_${String(
      iterDate.getMonth() + 1
    ).padStart(2, "0")}`;

    // Check if partition exists
    const exists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = ${partitionName}
      )
    `;

    if (!exists[0].exists) {
      partitionsToCreate.push(partitionName);
    }

    // Move to next month
    iterDate.setMonth(iterDate.getMonth() + 1);
  }

  if (partitionsToCreate.length > 0) {
    logger.info("Creating future partitions", {
      partitions: partitionsToCreate,
    });

    if (!DRY_RUN) {
      for (const partitionName of partitionsToCreate) {
        await createPartition(partitionName);
      }
    }
  }
}

/**
 * Create a new monthly partition
 */
async function createPartition(partitionName: string) {
  // Extract year and month from partition name
  const match = partitionName.match(/audit_logs_(\d{4})_(\d{2})/);
  if (!match) {
    throw new Error(`Invalid partition name: ${partitionName}`);
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  await sql`
    CREATE TABLE IF NOT EXISTS ${sql(
      partitionName
    )} PARTITION OF audit_logs
    FOR VALUES FROM (${startDate.toISOString().split("T")[0]}) TO (${
    endDate.toISOString().split("T")[0]
  })
  `;

  logger.info("Created partition", {
    partition: partitionName,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });
}

/**
 * Create audit log partition function for dynamic partition creation
 * Run once to set up the database function
 */
export async function setupPartitionFunction() {
  logger.info("Setting up audit log partition function");

  await sql`
    CREATE OR REPLACE FUNCTION audit_create_partition()
    RETURNS void AS $$
    DECLARE
      partition_date DATE;
      partition_name TEXT;
    BEGIN
      partition_date := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
      partition_name := 'audit_logs_' || TO_CHAR(partition_date, 'YYYY_MM');

      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs FOR VALUES FROM (%L) TO (%L)',
        partition_name,
        partition_date::text,
        (partition_date + INTERVAL '1 month')::text
      );
    END;
    $$ LANGUAGE plpgsql;
  `;

  logger.info("Partition function created");
}

// Run if executed directly
if (require.main === module) {
  enforceRetention()
    .then(() => {
      logger.info("Retention enforcement completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Retention enforcement failed", error as Error);
      process.exit(1);
    });
}

export { enforceRetention };
