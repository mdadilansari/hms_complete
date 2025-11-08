# HMS Architecture Documentation

## Overview
The Hospital Management System (HMS) is built using a microservices architecture with database-per-service pattern. Each service has its own database and communicates through well-defined APIs.

## Architecture Principles

### Database-Per-Service
- **Patient Service**: Owns patient data (patients table)
- **Doctor Service**: Owns doctor data (doctors, schedules, availability tables)
- **Appointment Service**: Owns appointment data + read models for patient/doctor info
- **Billing Service**: Owns billing data (bills, line_items tables)
- **Prescription Service**: Owns prescription data
- **Payment Service**: Owns payment and refund data
- **Notification Service**: Owns notification data and templates

### Data Consistency Patterns
1. **Read Models**: Services replicate only the data they need for reads
2. **Event-Driven Updates**: Services publish events when data changes
3. **API Composition**: Real-time data fetched via API calls when needed
4. **Eventually Consistent**: Accept that some data may be slightly stale

## Service ER Diagrams

### Patient Service
```
┌─────────────────┐
│     PATIENTS    │
├─────────────────┤
│ patient_id (PK) │
│ name            │
│ email (UNIQUE)  │
│ phone           │
│ dob             │
│ created_at      │
│ updated_at      │
│ is_active       │
└─────────────────┘
```

### Doctor Service
```
┌─────────────────┐     ┌──────────────────┐
│     DOCTORS     │     │ DOCTOR_SCHEDULES │
├─────────────────┤     ├──────────────────┤
│ doctor_id (PK)  │────►│ schedule_id (PK) │
│ name            │     │ doctor_id (FK)   │
│ email (UNIQUE)  │     │ day_of_week      │
│ phone           │     │ start_time       │
│ department      │     │ end_time         │
│ specialization  │     │ slot_duration    │
│ created_at      │     │ is_active        │
│ updated_at      │     │ created_at       │
│ is_active       │     └──────────────────┘
│ max_daily_appts │             │
└─────────────────┘             │
                                │
         ┌──────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ AVAILABILITY_OVERRIDES  │
├─────────────────────────┤
│ override_id (PK)        │
│ doctor_id (FK)          │
│ date                    │
│ start_time              │
│ end_time                │
│ is_available            │
│ reason                  │
│ created_at              │
└─────────────────────────┘
```

### Appointment Service
```
┌─────────────────┐     ┌────────────────────────┐
│   APPOINTMENTS  │     │ APPOINTMENT_PATIENT_   │
├─────────────────┤     │       CACHE            │
│appointment_id(PK│     ├────────────────────────┤
│ patient_id      │     │ patient_id (PK)        │
│ doctor_id       │     │ name                   │
│ department      │     │ email                  │
│ slot_start      │     │ phone                  │
│ slot_end        │     │ updated_at             │
│ status          │     └────────────────────────┘
│ created_at      │
│ updated_at      │     ┌────────────────────────┐
│reschedule_count │     │ APPOINTMENT_DOCTOR_    │
│ notes           │     │       CACHE            │
│ version         │     ├────────────────────────┤
└─────────────────┘     │ doctor_id (PK)         │
                        │ name                   │
                        │ department             │
                        │ specialization         │
                        │ updated_at             │
                        └────────────────────────┘
```

### Billing Service
```
┌─────────────────┐     ┌──────────────────┐
│      BILLS      │     │ BILL_LINE_ITEMS  │
├─────────────────┤     ├──────────────────┤
│ bill_id (PK)    │────►│ line_item_id(PK) │
│ patient_id      │     │ bill_id (FK)     │
│ appointment_id  │     │ description      │
│ amount          │     │ quantity         │
│ tax_amount      │     │ unit_price       │
│ total_amount    │     │ line_total       │
│ status          │     │ created_at       │
│ created_at      │     └──────────────────┘
│ updated_at      │
│ due_date        │
│ notes           │
└─────────────────┘
```

### Payment Service
```
┌─────────────────┐     ┌──────────────────┐
│    PAYMENTS     │     │     REFUNDS      │
├─────────────────┤     ├──────────────────┤
│ payment_id (PK) │────►│ refund_id (PK)   │
│ bill_id         │     │ payment_id (FK)  │
│ amount          │     │ amount           │
│ method          │     │ reason           │
│ reference       │     │ status           │
│ status          │     │ processed_at     │
│ paid_at         │     │ created_at       │
│ created_at      │     └──────────────────┘
│idempotency_key  │
│gateway_response │
│ notes           │
└─────────────────┘
```

### Prescription Service
```
┌─────────────────┐
│  PRESCRIPTIONS  │
├─────────────────┤
│prescription_id  │
│ appointment_id  │
│ patient_id      │
│ doctor_id       │
│ medication      │
│ dosage          │
│ days            │
│ instructions    │
│ issued_at       │
│ created_at      │
│ updated_at      │
│ is_active       │
└─────────────────┘
```

### Notification Service
```
┌─────────────────┐     ┌─────────────────────┐
│  NOTIFICATIONS  │     │ NOTIFICATION_       │
├─────────────────┤     │    TEMPLATES        │
│notification_id  │     ├─────────────────────┤
│ recipient_type  │     │ template_id (PK)    │
│ recipient_id    │     │ name (UNIQUE)       │
│ channel         │     │ channel             │
│ template_name   │─────┤ subject_template    │
│ subject         │     │ body_template       │
│ message         │     │ is_active           │
│ status          │     │ created_at          │
│ scheduled_at    │     └─────────────────────┘
│ sent_at         │
│ created_at      │
│ metadata        │
│ retry_count     │
└─────────────────┘
```

## Data Flow Context Map

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Patient Service │    │ Doctor Service  │    │Appointment Svc  │
│                 │    │                 │    │                 │
│ - patients      │    │ - doctors       │    │ - appointments  │
│                 │    │ - schedules     │    │ - patient_cache │
│                 │    │ - availability  │    │ - doctor_cache  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway                              │
│               (Correlation ID, Routing)                     │
└─────────────────────────────────────────────────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Billing Service │    │Payment Service  │    │Prescription Svc │
│                 │    │                 │    │                 │
│ - bills         │    │ - payments      │    │ - prescriptions │
│ - line_items    │    │ - refunds       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────┐
                    │Notification Svc │
                    │                 │
                    │ - notifications │
                    │ - templates     │
                    └─────────────────┘
```

## Business Rules Implementation

### Appointment Booking Rules
1. **Patient Validation**: Check patient exists and is active via Patient Service API
2. **Doctor Validation**: Check doctor exists, is active, and matches department via Doctor Service
3. **Slot Validation**: Check availability and prevent overlaps
4. **Lead Time**: Ensure booking is at least 2 hours in future
5. **Concurrency**: Use optimistic locking (version field) to prevent double booking

### Reschedule Rules
- Max 2 reschedules per appointment (tracked in reschedule_count)
- Cannot reschedule within 1 hour of slot start
- Check new slot availability before updating

### Cancellation Rules
- Release held slot immediately
- Notify Billing Service to apply cancellation policy:
  - >2h before: Full refund
  - ≤2h before: 50% fee
  - No-show: 100% consultation fee

### Payment Rules
- Idempotency via idempotency_key to prevent double charging
- Status transitions: PENDING → COMPLETED/FAILED
- Automatic bill status update when payment completes

## Security & Observability

### PII Masking
- Email: `john.doe@example.com` → `jo****@example.com`
- Phone: `1234567890` → `******7890`

### Correlation Tracking
- Each request gets a correlation ID
- Passed through all service calls
- Used for distributed tracing

### Metrics
- `appointments_created_total`: Counter for new appointments
- `bill_creation_latency_ms`: Histogram for bill generation time
- `payments_failed_total`: Counter for failed payments
- Standard HTTP metrics (request rate, duration, error rate)

### Health Checks
- `/health` endpoint on every service
- Database connectivity check
- Kubernetes readiness/liveness probes

## Deployment Architecture

### Docker Compose (Development)
- All services + databases in containers
- Service discovery via container names
- Volume persistence for databases
- Prometheus + Grafana for monitoring

### Kubernetes (Production)
- Separate deployments per service
- StatefulSets for databases
- ConfigMaps for configuration
- Secrets for credentials
- Ingress for external access
- HorizontalPodAutoscaler for scaling