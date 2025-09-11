# PRIMA Compliance Calculation Documentation

## Overview

The PRIMA system implements a comprehensive compliance tracking system for medication adherence in cancer patients. This document details the business logic, calculation methods, and data flow for compliance metrics.

## Core Concepts

### Compliance Rate
The compliance rate represents the percentage of successfully delivered medication reminders that were confirmed by healthcare volunteers.

```
Compliance Rate = (Confirmed Reminders / Delivered Reminders) × 100
```

### Key Metrics

- **Delivered Reminders**: WhatsApp messages successfully sent to patients
- **Confirmed Reminders**: Reminders acknowledged by volunteers through manual confirmation
- **Pending Confirmations**: Delivered reminders awaiting confirmation
- **Total Reminders**: All reminder attempts (successful + failed deliveries)

## Data Flow Architecture

### 1. Reminder Creation Flow
```
Patient Medication → Reminder Schedule → WhatsApp API → Delivery Status
```

### 2. Confirmation Flow
```
Delivered Reminder → Volunteer Action → Manual Confirmation → Compliance Update
```

### 3. Compliance Calculation Flow
```
Raw Data → Compliance Service → Caching Layer → API Response
```

## Database Schema Relationships

### Core Tables
- `reminder_logs`: Tracks all WhatsApp message deliveries
- `manual_confirmations`: Records volunteer confirmations
- `reminder_schedules`: Defines medication reminder schedules
- `patients`: Patient demographic and contact information

### Key Relationships
```
reminder_logs → reminder_schedules (many-to-one)
reminder_logs → patients (many-to-one)
manual_confirmations → reminder_logs (one-to-one)
manual_confirmations → patients (many-to-one)
```

## Calculation Methods

### Basic Compliance Calculation

```typescript
interface ComplianceData {
  deliveredCount: number    // Successfully delivered reminders
  confirmedCount: number    // Confirmed by volunteers
  complianceRate: number    // Percentage (0-100)
  lastCalculated: Date      // Calculation timestamp
}
```

#### SQL Query Pattern
```sql
-- Delivered reminders count
SELECT COUNT(*) as delivered_count
FROM reminder_logs
WHERE patient_id = $1
  AND status = 'DELIVERED'

-- Confirmed reminders count
SELECT COUNT(*) as confirmed_count
FROM manual_confirmations
WHERE patient_id = $1
```

#### Calculation Logic
```typescript
const complianceRate = deliveredCount > 0
  ? Math.round((confirmedCount / deliveredCount) * 100)
  : 0
```

### Advanced Compliance Statistics

```typescript
interface ComplianceStats {
  totalReminders: number        // All reminder attempts
  deliveredReminders: number    // Successfully delivered
  confirmedReminders: number    // Confirmed by volunteers
  pendingConfirmations: number  // Awaiting confirmation
  complianceRate: number        // Success percentage
  averageResponseTime?: number  // Time to confirmation
}
```

#### Pending Confirmations Query
```sql
SELECT COUNT(*) as pending_count
FROM reminder_logs rl
LEFT JOIN manual_confirmations mc ON mc.reminder_log_id = rl.id
WHERE rl.patient_id = $1
  AND rl.status = 'DELIVERED'
  AND mc.id IS NULL
```

#### Response Time Calculation
```sql
SELECT AVG(EXTRACT(EPOCH FROM (mc.confirmed_at - rl.sent_at))) as avg_response_time
FROM reminder_logs rl
INNER JOIN manual_confirmations mc ON mc.reminder_log_id = rl.id
WHERE rl.patient_id = $1
```

## Caching Strategy

### Cache Keys
- `reminderStats:{patientId}`: Individual patient compliance data
- `patient:{patientId}`: Complete patient data with compliance
- TTL: 2 minutes for stats, 30 seconds for patient data

### Cache Invalidation Triggers
- New reminder delivery
- Manual confirmation added
- Patient data updates
- Reminder schedule changes

## Performance Optimizations

### Database Indexes
```sql
-- Critical indexes for compliance queries
CREATE INDEX idx_reminder_logs_patient_status ON reminder_logs(patient_id, status);
CREATE INDEX idx_reminder_logs_sent_at ON reminder_logs(sent_at);
CREATE INDEX idx_manual_confirmations_patient ON manual_confirmations(patient_id);
CREATE INDEX idx_manual_confirmations_confirmed_at ON manual_confirmations(confirmed_at);
```

### Query Optimization
- Parallel execution of delivered/confirmed count queries
- Efficient bulk operations for multiple patients
- Strategic use of composite indexes
- Proper query result limiting for large datasets

## Business Rules

### Compliance Rate Interpretation
- **90-100%**: Excellent compliance
- **75-89%**: Good compliance
- **50-74%**: Moderate compliance
- **0-49%**: Poor compliance

### Edge Cases Handling
- **Zero delivered reminders**: Compliance rate = 0%
- **Database errors**: Graceful fallback with error logging
- **Missing confirmations**: Proper null handling
- **Time zone considerations**: All calculations in WIB (UTC+7)

## Error Handling

### Calculation Errors
- Database connection failures → Return cached data or default values
- Invalid patient IDs → Proper validation and error responses
- Query timeouts → Fallback to simplified calculations

### Logging Strategy
- Performance metrics for all calculations
- Error details with context information
- Slow query detection and alerting
- Compliance trend analysis for monitoring

## API Integration

### Patient Detail Endpoint
```
GET /api/patients/{id}
Response includes:
- Basic patient information
- Current compliance rate
- Recent manual confirmations (last 10)
- Recent reminder logs (last 10)
- Medication list
```

### Compliance Stats Endpoint
```
GET /api/patients/{id}/reminders/stats
Response includes:
- Detailed compliance metrics
- Response time analytics
- Trend data for specified period
```

## Monitoring & Analytics

### Key Performance Indicators
- Average compliance rate across all patients
- Response time distribution
- Failed delivery rates
- System performance metrics

### Alerting Thresholds
- Compliance rate drops below 50%
- Response time exceeds 24 hours
- Failed delivery rate above 10%
- System performance degradation

## Future Enhancements

### Planned Features
- Real-time compliance dashboards
- Predictive analytics for compliance trends
- Automated alerts for low compliance
- Integration with external health systems
- Advanced reporting and analytics

### Scalability Considerations
- Database partitioning for large datasets
- Redis cluster for high-availability caching
- Background job processing for heavy calculations
- API rate limiting for system protection

## Testing Strategy

### Unit Tests
- Compliance calculation accuracy
- Edge case handling
- Error scenario management
- Cache invalidation logic

### Integration Tests
- End-to-end compliance workflows
- Database query performance
- API response validation
- Caching behavior verification

### Performance Tests
- Large dataset handling
- Concurrent user scenarios
- System load testing
- Database query optimization validation

---

*This document serves as the authoritative source for compliance calculation logic in the PRIMA system. All changes to compliance calculations should be reflected in this documentation.*