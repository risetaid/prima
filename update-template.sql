-- Update follow-up reminder template to use general language instead of medication-specific
UPDATE whatsapp_templates
SET template_text = 'Halo {nama}, apakah reminder sebelumnya sudah dipatuhi?',
    updated_at = NOW()
WHERE template_name = 'follow_up_reminder';