-- CreateIndex
CREATE INDEX "manual_confirmations_patient_id_idx" ON "public"."manual_confirmations"("patient_id");

-- CreateIndex
CREATE INDEX "manual_confirmations_volunteer_id_idx" ON "public"."manual_confirmations"("volunteer_id");

-- CreateIndex
CREATE INDEX "manual_confirmations_reminder_schedule_id_idx" ON "public"."manual_confirmations"("reminder_schedule_id");

-- CreateIndex
CREATE INDEX "manual_confirmations_reminder_log_id_idx" ON "public"."manual_confirmations"("reminder_log_id");

-- CreateIndex
CREATE INDEX "manual_confirmations_visit_date_idx" ON "public"."manual_confirmations"("visit_date");

-- CreateIndex
CREATE INDEX "manual_confirmations_patient_id_visit_date_idx" ON "public"."manual_confirmations"("patient_id", "visit_date");

-- CreateIndex
CREATE INDEX "patients_is_active_idx" ON "public"."patients"("is_active");

-- CreateIndex
CREATE INDEX "patients_assigned_volunteer_id_idx" ON "public"."patients"("assigned_volunteer_id");

-- CreateIndex
CREATE INDEX "patients_assigned_volunteer_id_is_active_idx" ON "public"."patients"("assigned_volunteer_id", "is_active");

-- CreateIndex
CREATE INDEX "patients_phone_number_idx" ON "public"."patients"("phone_number");

-- CreateIndex
CREATE INDEX "patients_created_at_idx" ON "public"."patients"("created_at");

-- CreateIndex
CREATE INDEX "reminder_logs_patient_id_idx" ON "public"."reminder_logs"("patient_id");

-- CreateIndex
CREATE INDEX "reminder_logs_reminder_schedule_id_idx" ON "public"."reminder_logs"("reminder_schedule_id");

-- CreateIndex
CREATE INDEX "reminder_logs_status_idx" ON "public"."reminder_logs"("status");

-- CreateIndex
CREATE INDEX "reminder_logs_sent_at_idx" ON "public"."reminder_logs"("sent_at");

-- CreateIndex
CREATE INDEX "reminder_logs_patient_id_status_idx" ON "public"."reminder_logs"("patient_id", "status");

-- CreateIndex
CREATE INDEX "reminder_schedules_patient_id_idx" ON "public"."reminder_schedules"("patient_id");

-- CreateIndex
CREATE INDEX "reminder_schedules_is_active_idx" ON "public"."reminder_schedules"("is_active");

-- CreateIndex
CREATE INDEX "reminder_schedules_patient_id_is_active_idx" ON "public"."reminder_schedules"("patient_id", "is_active");

-- CreateIndex
CREATE INDEX "reminder_schedules_start_date_idx" ON "public"."reminder_schedules"("start_date");

-- CreateIndex
CREATE INDEX "reminder_schedules_end_date_idx" ON "public"."reminder_schedules"("end_date");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "public"."users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "public"."users"("is_active");

-- CreateIndex
CREATE INDEX "users_is_approved_idx" ON "public"."users"("is_approved");

-- CreateIndex
CREATE INDEX "users_role_is_active_is_approved_idx" ON "public"."users"("role", "is_active", "is_approved");
