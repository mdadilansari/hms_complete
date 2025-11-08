# 🏥 Hospital Management System - Quick Start Guide

## Overview
A complete microservices-based Hospital Management System with 7 services, database-per-service architecture, and comprehensive monitoring.

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Docker Desktop
- Node.js 18+
- Git

### Option 1: Docker Compose (Recommended for Development)
```bash
# Clone and navigate
git clone <your-repo>
cd assignment-ss

# Install dependencies
npm install

# Generate all services (if not done)
node generate-services.js

# Deploy everything
./deploy.bat    # Windows
./deploy.sh     # Linux/Mac

# Wait 30 seconds, then test
curl http://localhost:3000/health
```

### Option 2: Kubernetes (Minikube)
```bash
# Start minikube
minikube start

# Deploy to Kubernetes
./deploy-k8s.sh

# Access via port forward
kubectl port-forward service/api-gateway 3000:80
```

## 📋 What You Get

### 🏗️ 7 Microservices
1. **Patient Service** (3001) - CRUD, search, PII masking
2. **Doctor Service** (3002) - Doctor management, scheduling
3. **Appointment Service** (3003) - Booking, rescheduling, cancellation
4. **Billing Service** (3004) - Bill generation, tax computation
5. **Prescription Service** (3005) - Prescription management
6. **Payment Service** (3006) - Idempotent payment processing
7. **Notification Service** (3007) - SMS/Email alerts

### 🌐 API Gateway (3000)
- Centralized routing
- Correlation ID propagation
- Rate limiting
- Error handling

### 📊 Monitoring Stack
- **Prometheus** (9090) - Metrics collection
- **Grafana** (3010) - Dashboards (admin/admin)

## 🧪 Testing

### Automated API Testing
```bash
# Run comprehensive test suite
node test-api.js

# Individual service tests
curl http://localhost:3000/v1/patients
curl http://localhost:3000/v1/doctors
curl http://localhost:3000/v1/appointments
```

### Create Sample Data
```bash
# Create a patient
curl -X POST http://localhost:3000/v1/patients \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com", 
    "phone": "1234567890",
    "dob": "1990-01-01"
  }'
```

## 🏗️ Architecture Highlights

### Database-Per-Service ✅
- Each service has its own PostgreSQL database
- No shared tables or cross-DB joins
- Read models for necessary data replication

### Business Rules Implementation ✅
- **Appointments**: Max 2 reschedules, 1-hour cutoff, slot collision prevention
- **Payments**: Idempotent processing via Idempotency-Key header
- **Billing**: Automatic tax calculation (5%), cancellation fee policies
- **Prescriptions**: Requires valid appointment

### Observability ✅
- **Structured JSON logging** with PII masking
- **Correlation ID** propagation across services
- **Prometheus metrics**: 
  - `appointments_created_total`
  - `bill_creation_latency_ms` 
  - `payments_failed_total`
- **Health checks** on all services

### Security ✅
- **Helmet.js** for security headers
- **Rate limiting** (100 req/15min per IP)
- **CORS** configuration
- **PII masking** in logs (email/phone)

## 📊 Monitoring Dashboards

Access Grafana at http://localhost:3010 (admin/admin)

### Key Metrics to Monitor:
- **Service Health**: Up/down status per service
- **Request Rate**: RPS per service
- **Response Times**: p50/p90/p99 latencies
- **Error Rates**: 4xx/5xx errors
- **Business Metrics**: Appointments created, payments processed

## 🔧 Development Commands

```bash
# View all services
docker-compose ps

# View logs
docker-compose logs patient-service
docker-compose logs -f api-gateway

# Restart a service
docker-compose restart appointment-service

# Scale a service
docker-compose up -d --scale patient-service=3

# Stop everything
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

## 🐛 Troubleshooting

### Services Not Starting?
```bash
# Check Docker status
docker ps

# Check logs
docker-compose logs [service-name]

# Restart specific service
docker-compose restart [service-name]
```

### Database Connection Issues?
```bash
# Check database containers
docker-compose ps | grep db

# Reset databases
docker-compose down -v
docker-compose up -d
```

### Port Conflicts?
- Patient Service: 3001
- Doctor Service: 3002  
- Appointment Service: 3003
- Billing Service: 3004
- Prescription Service: 3005
- Payment Service: 3006
- Notification Service: 3007
- API Gateway: 3000
- Prometheus: 9090
- Grafana: 3010

## 📚 API Documentation

Each service exposes OpenAPI 3.0 documentation:
- http://localhost:3001/docs (Patient Service)
- http://localhost:3002/docs (Doctor Service)
- http://localhost:3003/docs (Appointment Service)
- etc.

### Sample Workflows

#### 1. Complete Patient Journey
```bash
# 1. Create patient
POST /v1/patients

# 2. Find available doctor  
GET /v1/doctors?department=Cardiology

# 3. Book appointment
POST /v1/appointments

# 4. Complete appointment → Generate bill
POST /v1/bills

# 5. Process payment
POST /v1/payments

# 6. Create prescription
POST /v1/prescriptions
```

#### 2. Appointment Rescheduling
```bash
# 1. Reschedule (max 2 times)
PUT /v1/appointments/{id}/reschedule

# 2. Cancel appointment  
DELETE /v1/appointments/{id}
```

#### 3. Payment with Idempotency
```bash
# Use same Idempotency-Key for retries
curl -X POST /v1/payments \\
  -H "Idempotency-Key: unique-key-123" \\
  -H "Content-Type: application/json" \\
  -d '{"bill_id": 1, "amount": 150.00, "method": "CARD"}'
```

## 🎯 Assignment Requirements Coverage

✅ **6 Microservices** (Patient, Doctor, Appointment, Billing, Prescription, Payment, Notification)
✅ **Database-per-Service** with ER diagrams and context map  
✅ **Inter-Service Workflows** (Book, Reschedule, Cancel, Complete, Pay)
✅ **Docker Containerization** with health checks
✅ **Kubernetes Deployment** with manifests and monitoring
✅ **Observability** with metrics, logs, and dashboards

## 🏆 Bonus Features

- **API Gateway** with centralized routing
- **Comprehensive test suite** with realistic workflows
- **PII masking** in logs for GDPR compliance
- **Correlation ID** for distributed tracing
- **Idempotent payments** for financial safety
- **Business rule validation** (reschedule limits, cancellation policies)
- **Grafana dashboards** with HMS-specific metrics

## 📞 Support

For issues or questions:
1. Check logs: `docker-compose logs [service-name]`
2. Verify health: `curl http://localhost:3000/health`
3. Review documentation in `/docs` folder
4. Run test suite: `node test-api.js`

---
**🎉 Happy coding! Your HMS is ready for production!**