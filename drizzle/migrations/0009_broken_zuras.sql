ALTER TABLE "llm_prompt_metrics" ALTER COLUMN "prompt_template_id" SET DATA TYPE uuid USING (prompt_template_id::uuid);--> statement-breakpoint
ALTER TABLE "llm_prompt_test_results" ALTER COLUMN "test_id" SET DATA TYPE uuid USING (test_id::uuid);--> statement-breakpoint
ALTER TABLE "llm_prompt_test_results" ALTER COLUMN "variant_id" SET DATA TYPE uuid USING (variant_id::uuid);--> statement-breakpoint
ALTER TABLE "llm_prompt_test_variants" ALTER COLUMN "test_id" SET DATA TYPE uuid USING (test_id::uuid);--> statement-breakpoint
ALTER TABLE "llm_prompt_test_variants" ALTER COLUMN "prompt_template_id" SET DATA TYPE uuid USING (prompt_template_id::uuid);--> statement-breakpoint