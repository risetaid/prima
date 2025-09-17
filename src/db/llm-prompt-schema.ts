/**
 * LLM Prompt Template Schema
 * Defines database tables for storing and managing LLM prompt templates
 */

import { pgTable, text, integer, boolean, jsonb, timestamp, uuid } from 'drizzle-orm/pg-core'

// LLM Prompt Templates table
export const llmPromptTemplates = pgTable('llm_prompt_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
  category: text('category').notNull().default('general'), // verification, medication, emergency, general, response
  systemPrompt: text('system_prompt').notNull(),
  userPromptTemplate: text('user_prompt_template'), // Optional template for user messages
  responseFormat: text('response_format').notNull().default('json').$type<'json' | 'text'>(),
  maxTokens: integer('max_tokens').notNull().default(1000),
  temperature: integer('temperature').notNull().default(70), // Stored as 0-100, divided by 100 for actual value
  variables: jsonb('variables').$type<string[]>(), // Array of variable names used in templates
  isActive: boolean('is_active').notNull().default(true),
  isDefault: boolean('is_default').notNull().default(false),
  version: integer('version').notNull().default(1),
  tags: jsonb('tags').$type<string[]>(),
  metadata: jsonb('metadata'), // Additional configuration
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: text('created_by').references(() => users.id),
  lastUsedAt: timestamp('last_used_at'),
  usageCount: integer('usage_count').notNull().default(0),
})

// LLM Prompt A/B Testing table
export const llmPromptTests = pgTable('llm_prompt_tests', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').notNull(),
  status: text('status').notNull().default('draft').$type<'draft' | 'active' | 'paused' | 'completed'>(),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  targetAudience: jsonb('target_audience'), // Criteria for selecting test participants
  sampleSize: integer('sample_size'),
  trafficSplit: integer('traffic_split').notNull().default(50), // Percentage for variant A
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: text('created_by').references(() => users.id),
})

// LLM Prompt Test Variants table
export const llmPromptTestVariants = pgTable('llm_prompt_test_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  testId: text('test_id').notNull().references(() => llmPromptTests.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  variant: text('variant').notNull().$type<'A' | 'B' | 'C' | 'D'>(),
  promptTemplateId: text('prompt_template_id').notNull().references(() => llmPromptTemplates.id),
  weight: integer('weight').notNull().default(1), // Weight for traffic distribution
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// LLM Prompt Test Results table
export const llmPromptTestResults = pgTable('llm_prompt_test_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  testId: text('test_id').notNull().references(() => llmPromptTests.id, { onDelete: 'cascade' }),
  variantId: text('variant_id').notNull().references(() => llmPromptTestVariants.id, { onDelete: 'cascade' }),
  patientId: text('patient_id').notNull(),
  conversationId: text('conversation_id'),
  request: jsonb('request').notNull(),
  response: jsonb('response').notNull(),
  metrics: jsonb('metrics').notNull(), // Performance metrics (response time, tokens, etc.)
  userFeedback: jsonb('user_feedback'), // Optional feedback data
  timestamp: timestamp('timestamp').notNull().defaultNow(),
})

// LLM Prompt Performance Metrics table
export const llmPromptMetrics = pgTable('llm_prompt_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  promptTemplateId: text('prompt_template_id').notNull().references(() => llmPromptTemplates.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // YYYY-MM-DD format for aggregation
  totalRequests: integer('total_requests').notNull().default(0),
  successfulResponses: integer('successful_responses').notNull().default(0),
  failedResponses: integer('failed_responses').notNull().default(0),
  averageResponseTime: integer('average_response_time'), // in milliseconds
  averageTokensUsed: integer('average_tokens_used'),
  totalTokensUsed: integer('total_tokens_used').notNull().default(0),
  userSatisfaction: integer('user_satisfaction'), // 1-5 scale
  errorRate: integer('error_rate'), // Percentage * 100 (e.g., 5.2% = 520)
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Import users table for foreign key references
import { users } from './core-schema'

// Type exports
export type LlmPromptTemplate = typeof llmPromptTemplates.$inferSelect
export type NewLlmPromptTemplate = typeof llmPromptTemplates.$inferInsert
export type LlmPromptTest = typeof llmPromptTests.$inferSelect
export type NewLlmPromptTest = typeof llmPromptTests.$inferInsert
export type LlmPromptTestVariant = typeof llmPromptTestVariants.$inferSelect
export type NewLlmPromptTestVariant = typeof llmPromptTestVariants.$inferInsert
export type LlmPromptTestResult = typeof llmPromptTestResults.$inferSelect
export type NewLlmPromptTestResult = typeof llmPromptTestResults.$inferInsert
export type LlmPromptMetric = typeof llmPromptMetrics.$inferSelect
export type NewLlmPromptMetric = typeof llmPromptMetrics.$inferInsert