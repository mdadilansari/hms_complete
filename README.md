# Hospital Management System - Microservices Architecture

A comprehensive microservices-based Hospital Management System built with Node.js, featuring database-per-service architecture and complete containerization.

## Architecture Overview

### Microservices
1. **Patient Service** - CRUD for patients, search, PII masking
2. **Doctor & Scheduling Service** - Doctor management, department filtering, slot availability
3. **Appointment Service** - Booking, rescheduling, cancellation with constraints
4. **Billing Service** - Bill generation, tax computation, cancellation handling
5. **Prescription Service** - Prescription management (requires appointment)
6. **Payment Service** - Payment processing with idempotency
7. **Notification Service** - SMS/Email reminders and alerts

### Database Per Service
- Each service has its own database (PostgreSQL)
- No shared tables or cross-DB joins
- Replicated read models where needed
- Event-driven communication between services

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Minikube (for Kubernetes deployment)

### Local Development
```bash
# Clone and setup
git clone <repository>
cd assignment-ss

# Start all services with Docker Compose
docker-compose up -d

# Check health
docker ps
curl http://localhost:3001/health  # Patient Service
curl http://localhost:3002/health  # Doctor Service
# ... etc
```

### API Documentation
- All services expose OpenAPI 3.0 documentation at `/docs`
- API versioning: `/v1/`
- Standard error schema with correlationId

### Monitoring
- Structured JSON logging with correlation IDs
- PII masking (email, phone)
- Metrics: appointments_created_total, bill_creation_latency_ms, payments_failed_total
- Health endpoints for all services

## Project Structure
```
├── services/
│   ├── patient-service/
│   ├── doctor-service/
│   ├── appointment-service/
│   ├── billing-service/
│   ├── prescription-service/
│   ├── payment-service/
│   └── notification-service/
├── docker-compose.yml
├── k8s/
└── docs/
```

## Business Rules
- Max 2 reschedules per appointment
- Cannot reschedule within 1 hour of slot start
- Max 1 active appointment per patient per time slot
- No prescription without appointment
- Idempotent payment processing
- RBAC with roles: reception, doctor, billing, admin