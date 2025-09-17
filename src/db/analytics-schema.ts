import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  index,
  jsonb,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";

// ===== ANALYTICS AND PERFORMANCE TRACKING =====

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventType: text("event_type").notNull(), // 'page_view', 'api_call', 'user_action', 'system_event'
    eventName: text("event_name").notNull(), // Specific event name
    userId: uuid("user_id"), // User who triggered the event
    patientId: uuid("patient_id"), // Related patient if applicable
    sessionId: text("session_id").notNull(), // Session identifier
    eventData: jsonb("event_data"), // Additional event data
    metadata: jsonb("metadata"), // Event metadata
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => ({
    eventTypeIdx: index("analytics_events_event_type_idx").on(table.eventType),
    eventNameIdx: index("analytics_events_event_name_idx").on(table.eventName),
    userIdIdx: index("analytics_events_user_id_idx").on(table.userId),
    patientIdIdx: index("analytics_events_patient_id_idx").on(table.patientId),
    sessionIdIdx: index("analytics_events_session_id_idx").on(table.sessionId),
    timestampIdx: index("analytics_events_timestamp_idx").on(table.timestamp),
    // Composite indexes for common queries
    eventTypeTimestampIdx: index("analytics_events_type_timestamp_idx").on(
      table.eventType,
      table.timestamp
    ),
    userSessionIdx: index("analytics_events_user_session_idx").on(
      table.userId,
      table.sessionId
    ),
  })
);

export const performanceMetrics = pgTable(
  "performance_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    metricType: text("metric_type").notNull(), // 'api_response_time', 'db_query_time', 'llm_response_time', 'page_load_time'
    metricName: text("metric_name").notNull(), // Specific metric name
    value: decimal("value", { precision: 10, scale: 2 }).notNull(), // Metric value
    unit: text("unit").notNull(), // 'ms', 'requests', 'bytes', etc.
    tags: jsonb("tags"), // Additional tags for filtering
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
    threshold: decimal("threshold", { precision: 10, scale: 2 }), // Alert threshold
    isAlert: boolean("is_alert").notNull().default(false),
  },
  (table) => ({
    metricTypeIdx: index("performance_metrics_metric_type_idx").on(
      table.metricType
    ),
    metricNameIdx: index("performance_metrics_metric_name_idx").on(
      table.metricName
    ),
    timestampIdx: index("performance_metrics_timestamp_idx").on(table.timestamp),
    isAlertIdx: index("performance_metrics_is_alert_idx").on(table.isAlert),
    // Composite indexes
    typeTimestampIdx: index("performance_metrics_type_timestamp_idx").on(
      table.metricType,
      table.timestamp
    ),
    alertTimestampIdx: index("performance_metrics_alert_timestamp_idx").on(
      table.isAlert,
      table.timestamp
    ),
  })
);

export const cohortAnalysis = pgTable(
  "cohort_analysis",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cohortName: text("cohort_name").notNull(), // 'verification_cohort', 'reminder_cohort', 'engagement_cohort'
    cohortDate: timestamp("cohort_date", { withTimezone: true }).notNull(), // When cohort was defined
    patientCount: integer("patient_count").notNull(), // Number of patients in cohort
    metrics: jsonb("metrics").notNull(), // Cohort metrics over time
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    cohortNameIdx: index("cohort_analysis_cohort_name_idx").on(table.cohortName),
    cohortDateIdx: index("cohort_analysis_cohort_date_idx").on(table.cohortDate),
    isActiveIdx: index("cohort_analysis_is_active_idx").on(table.isActive),
    createdAtIdx: index("cohort_analysis_created_at_idx").on(table.createdAt),
    // Composite indexes
    nameActiveIdx: index("cohort_analysis_name_active_idx").on(
      table.cohortName,
      table.isActive
    ),
    dateActiveIdx: index("cohort_analysis_date_active_idx").on(
      table.cohortDate,
      table.isActive
    ),
  })
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    action: text("action").notNull(), // 'create', 'read', 'update', 'delete'
    resourceType: text("resource_type").notNull(), // 'patient', 'reminder', 'user', 'system'
    resourceId: uuid("resource_id"), // ID of the resource being acted upon
    userId: uuid("user_id").notNull(), // User who performed the action
    patientId: uuid("patient_id"), // Related patient if applicable
    oldValues: jsonb("old_values"), // Previous values before update
    newValues: jsonb("new_values"), // New values after update
    ipAddress: text("ip_address"), // IP address of the user
    userAgent: text("user_agent"), // User agent string
    sessionId: text("session_id"), // Session identifier
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    actionIdx: index("audit_logs_action_idx").on(table.action),
    resourceTypeIdx: index("audit_logs_resource_type_idx").on(table.resourceType),
    resourceIdIdx: index("audit_logs_resource_id_idx").on(table.resourceId),
    userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
    patientIdIdx: index("audit_logs_patient_id_idx").on(table.patientId),
    timestampIdx: index("audit_logs_timestamp_idx").on(table.timestamp),
    // Composite indexes for common queries
    userActionIdx: index("audit_logs_user_action_idx").on(
      table.userId,
      table.action
    ),
    resourceActionIdx: index("audit_logs_resource_action_idx").on(
      table.resourceType,
      table.action
    ),
    userTimestampIdx: index("audit_logs_user_timestamp_idx").on(
      table.userId,
      table.timestamp
    ),
    patientActionIdx: index("audit_logs_patient_action_idx").on(
      table.patientId,
      table.action
    ),
  })
);

export const dataAccessLogs = pgTable(
  "data_access_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(), // User accessing the data
    patientId: uuid("patient_id").notNull(), // Patient whose data was accessed
    accessType: text("access_type").notNull(), // 'read', 'export', 'bulk_access'
    resourceType: text("resource_type").notNull(), // 'medical_records', 'reminders', 'conversations'
    resourceId: uuid("resource_id"), // Specific resource accessed
    accessReason: text("access_reason"), // Reason for access
    ipAddress: text("ip_address"), // IP address of the user
    userAgent: text("user_agent"), // User agent string
    sessionId: text("session_id"), // Session identifier
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index("data_access_logs_user_id_idx").on(table.userId),
    patientIdIdx: index("data_access_logs_patient_id_idx").on(table.patientId),
    accessTypeIdx: index("data_access_logs_access_type_idx").on(table.accessType),
    resourceTypeIdx: index("data_access_logs_resource_type_idx").on(
      table.resourceType
    ),
    timestampIdx: index("data_access_logs_timestamp_idx").on(table.timestamp),
    // Composite indexes for security monitoring
    userPatientIdx: index("data_access_logs_user_patient_idx").on(
      table.userId,
      table.patientId
    ),
    patientTimestampIdx: index("data_access_logs_patient_timestamp_idx").on(
      table.patientId,
      table.timestamp
    ),
    userTimestampIdx: index("data_access_logs_user_timestamp_idx").on(
      table.userId,
      table.timestamp
    ),
    accessTypeTimestampIdx: index("data_access_logs_access_type_timestamp_idx").on(
      table.accessType,
      table.timestamp
    ),
  })
);

export const systemHealthMetrics = pgTable(
  "system_health_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    metricName: text("metric_name").notNull(), // 'cpu_usage', 'memory_usage', 'disk_usage', 'database_connections'
    value: decimal("value", { precision: 10, scale: 2 }).notNull(), // Metric value
    threshold: decimal("threshold", { precision: 10, scale: 2 }), // Warning threshold
    criticalThreshold: decimal("critical_threshold", { precision: 10, scale: 2 }), // Critical threshold
    status: text("status").notNull().default("healthy"), // 'healthy', 'warning', 'critical'
    metadata: jsonb("metadata"), // Additional metadata
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    metricNameIdx: index("system_health_metrics_metric_name_idx").on(
      table.metricName
    ),
    statusIdx: index("system_health_metrics_status_idx").on(table.status),
    timestampIdx: index("system_health_metrics_timestamp_idx").on(table.timestamp),
    // Composite indexes
    nameTimestampIdx: index("system_health_metrics_name_timestamp_idx").on(
      table.metricName,
      table.timestamp
    ),
    statusTimestampIdx: index("system_health_metrics_status_timestamp_idx").on(
      table.status,
      table.timestamp
    ),
  })
);

// ===== TYPE EXPORTS =====

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;

export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type NewPerformanceMetric = typeof performanceMetrics.$inferInsert;

export type CohortAnalysis = typeof cohortAnalysis.$inferSelect;
export type NewCohortAnalysis = typeof cohortAnalysis.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type DataAccessLog = typeof dataAccessLogs.$inferSelect;
export type NewDataAccessLog = typeof dataAccessLogs.$inferInsert;

export type SystemHealthMetric = typeof systemHealthMetrics.$inferSelect;
export type NewSystemHealthMetric = typeof systemHealthMetrics.$inferInsert;