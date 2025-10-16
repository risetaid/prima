## ADDED Requirements

### Requirement: Fonnte Webhook Authentication
The system SHALL verify webhook requests are authorized before processing.

#### Scenario: Valid webhook token is accepted
- **WHEN** POST /api/webhooks/fonnte/incoming is called with valid token
- **THEN** request is authenticated and processed

#### Scenario: Invalid webhook token is rejected
- **WHEN** POST /api/webhooks/fonnte/incoming is called with invalid/missing token
- **THEN** response returns HTTP 401 with authentication error

### Requirement: Incoming Message Processing
The system SHALL process incoming WhatsApp messages from patients with proper message handling.

#### Scenario: Message from unknown phone is ignored
- **WHEN** incoming message is from phone number not in system
- **THEN** response returns ok:true with ignored:true, no patient match

#### Scenario: Verification response is processed for PENDING patient
- **WHEN** PENDING patient sends verification response message
- **THEN** system processes response and updates verification status

#### Scenario: Confirmation response is processed for VERIFIED patient
- **WHEN** VERIFIED patient sends reminder confirmation message
- **THEN** system records confirmation and updates reminder status

#### Scenario: Message validation normalizes different payload formats
- **WHEN** webhook payload uses different field names (sender/phone/from, message/text/body, id/message_id/msgId)
- **THEN** system normalizes fields and processes correctly

### Requirement: Webhook Idempotency
The system SHALL prevent duplicate processing of the same webhook event.

#### Scenario: Duplicate message is detected and ignored
- **WHEN** same webhook payload received twice with same ID
- **THEN** first request processes, second request returns duplicate:true

#### Scenario: Idempotency key prevents duplicate responses
- **WHEN** webhook is received after system restart
- **THEN** duplicate detection still works via message_id + timestamp + sender

### Requirement: Message Status Update Handling
The system SHALL track message delivery status from Fonnte.

#### Scenario: Message status update to SENT
- **WHEN** webhook with status:sent is received
- **THEN** reminder status is updated to SENT

#### Scenario: Message status update to DELIVERED
- **WHEN** webhook with status:delivered is received
- **THEN** reminder status is updated to DELIVERED

#### Scenario: Message status update to FAILED
- **WHEN** webhook with status:failed is received with reason
- **THEN** reminder status is updated to FAILED with reason logged

#### Scenario: Unknown status is ignored gracefully
- **WHEN** webhook contains unmapped status value
- **THEN** response returns ok:true with ignored:true

### Requirement: Rate Limiting for Patient Responses
The system SHALL enforce rate limits on patient message submissions.

#### Scenario: Patient response rate limit is enforced
- **WHEN** patient sends more messages than rate limit allows
- **THEN** additional messages are rate limited and not processed

#### Scenario: Rate limit check uses patient ID
- **WHEN** two different patients send messages simultaneously
- **THEN** each patient's rate limit is checked independently

### Requirement: Priority-based Message Handling
The system SHALL prioritize message handling based on patient verification status.

#### Scenario: Verification takes priority for PENDING patients
- **WHEN** PENDING patient sends message
- **THEN** message is processed as verification response first

#### Scenario: Confirmation takes priority for VERIFIED patients
- **WHEN** VERIFIED patient sends message
- **THEN** message is processed as reminder confirmation first

### Requirement: Webhook Error Handling
The system SHALL handle webhook processing errors gracefully.

#### Scenario: Invalid JSON payload is rejected
- **WHEN** webhook contains malformed JSON
- **THEN** response returns HTTP 400 with validation error

#### Scenario: Missing required fields are reported
- **WHEN** webhook payload missing required sender field
- **THEN** response returns validation error with field details

#### Scenario: Processing error is logged
- **WHEN** error occurs during message processing
- **THEN** error is logged with context and response indicates processing attempted

### Requirement: Webhook Health Check
The system SHALL provide health check support for webhook endpoint.

#### Scenario: GET request returns health status
- **WHEN** GET /api/webhooks/fonnte/incoming is called
- **THEN** response returns ok:true with route name and mode
