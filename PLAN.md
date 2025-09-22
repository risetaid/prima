# WhatsApp LLM Integration Implementation Plan

## Executive Summary

This document outlines the systematic implementation plan for integrating Anthropic Claude LLM into the PRIMA WhatsApp messaging system. The integration will replace the current keyword-based message processing with intelligent natural language understanding, providing better patient communication and reducing volunteer workload.

## Current State Analysis

### Problems Identified

1. **Missing Production Webhook**: No main production webhook route for WhatsApp messages
2. **Dual Verification Systems**: Conflicting enhanced and simple verification systems
3. **Poor Message Handling**: General messages from patients are ignored (no response)
4. **Rigid Keyword Matching**: Can't handle variations or typos in patient responses
5. **No Context Management**: System can't maintain conversation context
6. **Limited Emergency Detection**: Basic keyword-based emergency detection
7. **No Human Handoff**: Missing volunteer notification system

### Existing Assets

- ✅ Business rule: No reminders until patient is verified (natural phase separation)
- ✅ Database schema for conversation states and message logging
- ✅ WhatsApp service for sending messages via Fonnte
- ✅ Basic verification webhook service (needs integration)
- ✅ Advanced message processor (not integrated)
- ✅ Z.AI subscription ready to use

## Implementation Phases

## Phase 1: Foundation Setup (Week 1)

**Goal**: Establish core infrastructure and remove conflicts

### Step 1.1: Remove Conflicting Systems

- [ ] Archive `enhanced-verification.service.ts` (move to `_archive` folder)
- [ ] Archive `verification-flow.service.ts`
- [ ] Keep only `verification-webhook.service.ts` as the single verification system
- [ ] Clean up unused imports and references

### Step 1.2: Create LLM Service

- [ ] Install Anthropic SDK: `bun add @anthropic-ai/sdk`
- [ ] Create `/src/services/llm/llm.service.ts`
- [ ] Implement basic LLM client with Anthropic Claude configuration
- [ ] Add environment variables for Anthropic API key
- [ ] Create type definitions for LLM responses

### Step 1.3: Create Production Webhook Route

- [ ] Create `/src/app/api/webhook/whatsapp/route.ts`
- [ ] Implement basic webhook handler
- [ ] Add request validation and error handling
- [ ] Connect to existing verification webhook service
- [ ] Add logging for all incoming messages

### Step 1.4: Patient Context Service

- [ ] Create `/src/services/patient/patient-context.service.ts`
- [ ] Implement patient lookup by phone number
- [ ] Add active reminder checking
- [ ] Include conversation history retrieval
- [ ] Cache patient context for performance

## Phase 2: LLM Integration (Week 2)

**Goal**: Replace keyword matching with intelligent message processing

### Step 2.1: System Prompt Engineering

- [ ] Create healthcare-specific system prompts
- [ ] Define response format (JSON structure)
- [ ] Include patient context in prompts
- [ ] Add Indonesian language instructions
- [ ] Implement safety guidelines (no diagnoses, prescriptions)

### Step 2.2: Intent Detection

- [ ] Replace keyword-based detection with LLM
- [ ] Map LLM intents to existing handlers:
  - Verification responses (YA/TIDAK)
  - Medication confirmations (SUDAH/BELUM)
  - Unsubscribe requests (BERHENTI)
  - General inquiries
  - Emergency situations
- [ ] Add confidence scoring
- [ ] Implement fallback for low-confidence responses

### Step 2.3: Response Generation

- [ ] Create natural language responses for each intent
- [ ] Implement personalized messages using patient context
- [ ] Add conversation continuity
- [ ] Handle multi-turn conversations
- [ ] Implement response caching for common queries

### Step 2.4: Conversation State Management

- [ ] Integrate with existing `conversation-state.service.ts`
- [ ] Store LLM conversation history
- [ ] Implement conversation timeout handling
- [ ] Add context switching (verification → reminder → inquiry)
- [ ] Clean up expired conversations

## Phase 3: Safety & Reliability (Week 3)

**Goal**: Ensure system safety and production readiness

### Step 3.1: Human Handoff System

- [ ] Create volunteer notification service
- [ ] Implement escalation rules:
  - Emergency detection → Immediate notification
  - Low confidence → Queue for review
  - Complex inquiries → Scheduled follow-up
- [ ] Add notification channels (WhatsApp, email, dashboard)
- [ ] Create volunteer dashboard for message review

### Step 3.2: Safety Filters

- [ ] Implement content filtering for LLM responses
- [ ] Block medical advice and diagnoses
- [ ] Detect and escalate emergencies
- [ ] Add profanity/inappropriate content filter
- [ ] Log all filtered responses for review

### Step 3.3: Fallback Mechanisms

- [ ] Handle LLM API failures gracefully
- [ ] Implement circuit breaker pattern
- [ ] Create fallback to keyword-based system
- [ ] Add retry logic with exponential backoff
- [ ] Queue messages during outages

### Step 3.4: Cost Management

- [ ] Implement response caching
- [ ] Add token usage tracking
- [ ] Create cost analytics dashboard
- [ ] Set up usage alerts and limits
- [ ] Optimize prompt length

## Phase 4: Testing & Monitoring (Week 4)

**Goal**: Ensure system quality and observability

### Step 4.1: Comprehensive Testing

- [ ] Unit tests for LLM service
- [ ] Integration tests for webhook
- [ ] Test all intent scenarios
- [ ] Test edge cases and error conditions
- [ ] Load testing for concurrent messages

### Step 4.2: Monitoring & Analytics

- [ ] Implement performance monitoring
- [ ] Track response times
- [ ] Monitor LLM accuracy
- [ ] Create analytics dashboard:
  - Message volume by type
  - Intent distribution
  - Confidence scores
  - Human handoff rate
  - Cost per conversation
- [ ] Set up alerting for anomalies

### Step 4.3: Documentation

- [ ] Update API documentation
- [ ] Create volunteer training materials
- [ ] Document prompt engineering decisions
- [ ] Create troubleshooting guide
- [ ] Write deployment procedures

## Phase 5: Deployment & Optimization (Week 5)

**Goal**: Deploy to production and optimize performance

### Step 5.1: Staged Rollout

- [ ] Deploy to staging environment
- [ ] Test with volunteer accounts
- [ ] Gradual rollout to patients:
  - 10% → 25% → 50% → 100%
- [ ] Monitor for issues at each stage
- [ ] Implement feature flags for quick rollback

### Step 5.2: Performance Optimization

- [ ] Optimize database queries
- [ ] Implement connection pooling
- [ ] Add Redis caching for patient context
- [ ] Optimize LLM prompt tokens
- [ ] Implement batch processing where possible

### Step 5.3: Feedback Loop

- [ ] Collect patient feedback
- [ ] Analyze conversation logs
- [ ] Refine prompts based on real usage
- [ ] Update intent detection accuracy
- [ ] Iterate on response quality

## Technical Implementation Details

### File Structure

```
src/
├── services/
│   ├── llm/
│   │   ├── llm.service.ts           # Main LLM service
│   │   ├── llm.types.ts             # Type definitions
│   │   ├── prompts.ts               # System prompts
│   │   └── safety-filter.ts         # Content filtering
│   ├── patient/
│   │   ├── patient-context.service.ts
│   │   └── patient-context.types.ts
│   ├── notification/
│   │   └── volunteer-notification.service.ts
│   └── webhook/
│       ├── webhook-processor.service.ts
│       └── webhook-router.service.ts
├── app/
│   └── api/
│       └── webhook/
│           └── whatsapp/
│               └── route.ts         # Production webhook endpoint
└── lib/
    ├── llm-analytics.ts             # Usage tracking
    └── response-cache.ts            # Caching layer
```

### Environment Variables

```env
# Anthropic Claude Configuration
ANTHROPIC_API_KEY=your-api-key
ANTHROPIC_MODEL=claude-3.5-haiku

# LLM Settings
LLM_MAX_TOKENS=500
LLM_TEMPERATURE=0.7
LLM_TIMEOUT_MS=30000

# Safety Settings
ENABLE_CONTENT_FILTER=true
ENABLE_EMERGENCY_DETECTION=true
MAX_CONVERSATION_LENGTH=20

# Cost Management
MONTHLY_TOKEN_LIMIT=1000000
COST_ALERT_THRESHOLD=100
```

### Database Schema Updates

```sql
-- Add LLM-specific fields to conversation_messages
ALTER TABLE conversation_messages
ADD COLUMN llm_response_id VARCHAR(255),
ADD COLUMN llm_model VARCHAR(50),
ADD COLUMN llm_tokens_used INTEGER,
ADD COLUMN llm_cost DECIMAL(10, 6),
ADD COLUMN llm_response_time_ms INTEGER;

-- Add volunteer notification table
CREATE TABLE volunteer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  message TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  assigned_volunteer_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP,
  response TEXT
);

-- Add response cache table
CREATE TABLE llm_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_hash VARCHAR(64) NOT NULL,
  patient_context_hash VARCHAR(64) NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  UNIQUE(message_hash, patient_context_hash)
);
```

## Risk Mitigation

### Technical Risks

| Risk                     | Mitigation                                 |
| ------------------------ | ------------------------------------------ |
| LLM API downtime         | Fallback to keyword-based system           |
| High costs               | Response caching, token limits, monitoring |
| Slow response times      | Async processing, timeout handling         |
| Incorrect medical advice | Content filtering, clear disclaimers       |
| Data privacy             | No PII in prompts, secure API calls        |

### Operational Risks

| Risk                  | Mitigation                              |
| --------------------- | --------------------------------------- |
| Volunteer overload    | Smart escalation rules, priority queues |
| Patient confusion     | Clear onboarding, help commands         |
| System abuse          | Rate limiting, spam detection           |
| Regulatory compliance | Medical disclaimer, audit logs          |

## Success Metrics

### Technical Metrics

- Response time < 3 seconds (p95)
- System uptime > 99.9%
- LLM accuracy > 85% for intent detection
- Cost per conversation < $0.02

### Business Metrics

- Patient satisfaction score > 4.5/5
- Volunteer workload reduction > 60%
- Message response rate > 95%
- Emergency detection accuracy > 95%

## Rollback Plan

### Quick Rollback (< 5 minutes)

1. Disable feature flag for LLM processing
2. Route all messages to keyword-based system
3. Notify volunteers of increased workload
4. Investigate and fix issues

### Full Rollback (< 30 minutes)

1. Restore previous webhook handler
2. Disable LLM service
3. Clear response cache
4. Revert database schema changes
5. Deploy previous version

## Timeline Summary

| Week | Phase       | Key Deliverables                                    |
| ---- | ----------- | --------------------------------------------------- |
| 1    | Foundation  | Remove conflicts, setup LLM service, create webhook |
| 2    | Integration | Implement LLM processing, intent detection          |
| 3    | Safety      | Human handoff, safety filters, fallbacks            |
| 4    | Testing     | Comprehensive testing, monitoring, documentation    |
| 5    | Deployment  | Staged rollout, optimization, feedback loop         |

## Next Steps

1. **Immediate Actions**:

   - Get Anthropic API credentials
   - Set up development environment
   - Create project branch for LLM integration

2. **Team Preparation**:

   - Brief volunteers on upcoming changes
   - Prepare training materials
   - Set up monitoring dashboards

3. **Communication**:
   - Inform patients about improvements
   - Create help documentation
   - Prepare rollout announcements

## Appendix

### A. Sample LLM Prompts

```
[System Prompt for Verification]
You are helping a patient verify their WhatsApp number for PRIMA healthcare reminders.
Patient: {patient_name}
Current Status: {verification_status}
Expected Response: YA/TIDAK for verification

[System Prompt for Medication Confirmation]
You are checking if a patient has taken their medication.
Patient: {patient_name}
Medication Schedule: {schedule_time}
Expected Response: SUDAH/BELUM for confirmation
```

### B. Sample Conversations

```
Patient: "Halo dok"
LLM: "Halo! Saya asisten PRIMA. Ada yang bisa saya bantu hari ini?"

Patient: "Saya lupa minum obat tadi"
LLM: "Tidak apa-apa, yang penting segera diminum ya. Apakah Anda bisa minum obatnya sekarang?"

Patient: "BERHENTI"
LLM: "Baik, kami akan menghentikan semua pengingat. Terima kasih telah menggunakan layanan PRIMA. Semoga sehat selalu! 🙏"
```

### C. Cost Estimation

```
Assumptions:
- 1000 patients
- 5 messages/patient/day
- 100 tokens/message average
- $0.002 per 1K tokens

Daily cost: 1000 × 5 × 100 × $0.002 / 1000 = $1.00
Monthly cost: $30.00
Annual cost: $365.00
```

---

_Document Version: 1.0_
_Last Updated: [Current Date]_
_Author: OpenCode Assistant_
