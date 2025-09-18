# Followup Automation System

A Redis-based automated followup system for medication reminders in the PRIMA healthcare platform.

## Overview

The followup automation system automatically schedules and sends followup messages to patients after medication reminders are sent but not confirmed. It uses Redis for temporary storage and integrates with the existing WhatsApp messaging system.

## Features

- **Automated Scheduling**: Automatically schedules followups (15 minutes, 2 hours, 24 hours) when medication reminders are sent
- **Redis Storage**: Uses Redis sorted sets for scheduling and hash maps for followup data
- **WhatsApp Integration**: Sends followup messages via the existing WhatsApp service
- **Response Processing**: Handles patient responses with intelligent analysis
- **Emergency Detection**: Detects emergency keywords and escalates appropriately
- **Queue Management**: Processes pending followups via cron jobs
- **Error Handling**: Comprehensive error handling and retry logic

## Architecture

### Components

1. **FollowupService** (`src/services/reminder/followup.service.ts`)
   - Main service for followup operations
   - Handles scheduling, processing, and response analysis

2. **FollowupQueueService** (`src/services/reminder/followup-queue.service.ts`)
   - Redis-based queue management
   - Handles job scheduling and processing

3. **Followup Types** (`src/services/reminder/followup.types.ts`)
   - TypeScript type definitions

4. **Cron Integration** (`src/app/api/cron/route.ts`)
   - Processes pending followups periodically

5. **Webhook Integration** (`src/app/api/webhooks/fonnte/incoming/route.ts`)
   - Processes patient responses to followups

## How It Works

### 1. Reminder Sent → Followups Scheduled

When a medication reminder is successfully sent via `ReminderService.sendReminder()`:

```typescript
// Automatic followup scheduling
if (result.success && this.isMedicationReminder(message)) {
  await this.followupService.scheduleMedicationFollowups({
    patientId: patient.id,
    reminderId: scheduleId,
    phoneNumber: patient.phoneNumber,
    patientName: patient.name,
    medicationName: medicationName,
  });
}
```

### 2. Followup Schedule

Three followups are automatically scheduled:
- **15 minutes**: "Have you taken your medication?"
- **2 hours**: "How are you doing? Have you taken your medication?"
- **24 hours**: "Reminder check - have you been taking your medication regularly?"

### 3. Cron Job Processing

A cron job runs periodically to process due followups:

```bash
# Process reminders and followups
GET /api/cron
Authorization: Bearer <CRON_SECRET>
```

### 4. Patient Response Handling

When patients respond, the system:
- Analyzes the response for confirmation/emergency keywords
- Updates followup status
- Sends appropriate acknowledgment
- Escalates emergencies if detected

## Redis Data Structure

### Followup Data (Hash)
```
Key: followup:data:{followupId}
Fields:
- id, patientId, reminderId, phoneNumber, patientName
- followupType, stage, status, retryCount, maxRetries
- scheduledAt, sentAt, respondedAt, createdAt, updatedAt
- response, error, messageId
```

### Scheduling Queue (Sorted Set)
```
Key: followup:schedule
Score: scheduledAt.getTime()
Member: followupId
```

### Patient Index (Hash)
```
Key: followup:patient:{patientId}
Fields: {followupId: scheduledAt}
```

## API Usage

### Schedule Followups

```typescript
import { FollowupService } from '@/services/reminder/followup.service';

const followupService = new FollowupService();
const followupIds = await followupService.scheduleMedicationFollowups({
  patientId: 'patient-123',
  reminderId: 'reminder-456',
  phoneNumber: '+6281234567890',
  patientName: 'John Doe',
  medicationName: 'Paracetamol 500mg',
});
```

### Process Pending Followups

```typescript
const results = await followupService.processPendingFollowups();
// Returns array of FollowupProcessingResult
```

### Handle Patient Response

```typescript
const result = await followupService.processFollowupResponse(
  'patient-123',
  '+6281234567890',
  'SUDAH saya minum obatnya'
);
// Returns { processed, emergencyDetected, response, escalated }
```

### Get Statistics

```typescript
const stats = await followupService.getFollowupStats('patient-123');
// Returns FollowupStats with counts by status
```

## Response Analysis

The system analyzes patient responses using keyword detection:

### Confirmation Keywords
- `sudah`, `selesai`, `ya`, `yes`, `done`, `ok`, `baik`

### Emergency Keywords
- `darurat`, `sakit`, `mual`, `muntah`, `alergi`, `gawat`, `bantuan`, `tolong`

### Escalation Keywords
- `bantuan`, `relawan`, `dokter`, `rumah sakit`

## Configuration

### Environment Variables
- `REDIS_URL`: Redis connection URL
- `CRON_SECRET`: Secret for cron job authentication

### Timing Configuration
- **15-minute followup**: 15 minutes after reminder
- **2-hour followup**: 2 hours after reminder
- **24-hour followup**: 24 hours after reminder
- **TTL**: 7 days for followup data
- **Max age**: 30 days before cleanup

## Testing

Run the test script to verify the system:

```bash
cd /home/davidyusaku/Portfolio/prima
bun run tsx scripts/test-followup-system.ts
```

The test covers:
- Scheduling followups
- Queue statistics
- Processing followups
- Response handling
- Statistics retrieval
- Cleanup operations

## Monitoring

### Logs
The system logs all operations with structured logging:
- Followup scheduling
- Message sending
- Response processing
- Errors and retries

### Redis Keys to Monitor
- `followup:schedule` - Pending followups queue
- `followup:processing` - Currently processing jobs
- `followup:completed` - Successfully completed followups
- `followup:failed` - Failed followups

## Error Handling

- **Retry Logic**: Failed followups are retried with exponential backoff
- **Circuit Breaker**: Prevents cascading failures
- **Graceful Degradation**: System continues if Redis is unavailable
- **Emergency Escalation**: Critical responses are flagged for human intervention

## Security

- All followup data is temporary (7-day TTL)
- Patient data is handled securely
- WhatsApp integration uses existing authentication
- Cron jobs require secret token authentication

## Future Enhancements

- Machine learning for better response analysis
- Custom followup schedules per patient
- Integration with patient history
- Advanced escalation workflows
- Analytics dashboard for followup effectiveness