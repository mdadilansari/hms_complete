#!/bin/bash

# HMS Deployment and Testing Script

set -e

echo "🏥 Hospital Management System - Deployment Script"
echo "================================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists docker; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command_exists docker-compose; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Generate all services if not exists
echo "🏗️  Generating microservices..."
if [ ! -d "services/appointment-service" ]; then
    echo "📦 Running service generator..."
    node generate-services.js
else
    echo "📦 Services already exist, skipping generation"
fi

# Build all Docker images
echo "🐳 Building Docker images..."

services=("patient-service" "doctor-service" "appointment-service" "billing-service" "prescription-service" "payment-service" "notification-service" "api-gateway")

for service in "${services[@]}"; do
    if [ -d "services/$service" ]; then
        echo "🔨 Building $service..."
        docker build -t "hms/$service:latest" "services/$service" || {
            echo "❌ Failed to build $service"
            exit 1
        }
    else
        echo "⚠️  Warning: $service directory not found"
    fi
done

echo "✅ All Docker images built successfully"

# Start services with Docker Compose
echo "🚀 Starting HMS services..."
docker-compose down --remove-orphans
docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 30

# Health checks
echo "🏥 Running health checks..."

services_ports=(
    "patient-service:3001"
    "doctor-service:3002" 
    "appointment-service:3003"
    "billing-service:3004"
    "prescription-service:3005"
    "payment-service:3006"
    "notification-service:3007"
    "api-gateway:3000"
)

all_healthy=true

for service_port in "${services_ports[@]}"; do
    service=$(echo $service_port | cut -d: -f1)
    port=$(echo $service_port | cut -d: -f2)
    
    echo "🔍 Checking $service on port $port..."
    
    if curl -f -s "http://localhost:$port/health" >/dev/null; then
        echo "✅ $service is healthy"
    else
        echo "❌ $service is not responding"
        all_healthy=false
    fi
done

if [ "$all_healthy" = true ]; then
    echo "🎉 All services are healthy!"
else
    echo "⚠️  Some services are not healthy. Check the logs with: docker-compose logs [service-name]"
fi

# Display service information
echo ""
echo "📋 HMS Services Status"
echo "======================"
echo "🌐 API Gateway: http://localhost:3000"
echo "📚 API Documentation: http://localhost:3000/docs"
echo ""
echo "Individual Services:"
echo "👤 Patient Service: http://localhost:3001 (docs: /docs)"
echo "👨‍⚕️ Doctor Service: http://localhost:3002 (docs: /docs)"
echo "📅 Appointment Service: http://localhost:3003 (docs: /docs)"
echo "💰 Billing Service: http://localhost:3004 (docs: /docs)"
echo "💊 Prescription Service: http://localhost:3005 (docs: /docs)"
echo "💳 Payment Service: http://localhost:3006 (docs: /docs)"
echo "📢 Notification Service: http://localhost:3007 (docs: /docs)"
echo ""
echo "📊 Monitoring:"
echo "🔍 Prometheus: http://localhost:9090"
echo "📈 Grafana: http://localhost:3010 (admin/admin)"
echo ""

# Sample API calls
echo "🧪 Running sample API tests..."

echo "📤 Testing API Gateway health..."
curl -s "http://localhost:3000/health" | jq '.' || echo "Failed to get gateway health"

echo ""
echo "📤 Testing patient creation..."
curl -s -X POST "http://localhost:3000/v1/patients" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe", 
    "email": "john.doe@example.com", 
    "phone": "1234567890", 
    "dob": "1990-01-01"
  }' | jq '.' || echo "Failed to create patient"

echo ""
echo "📤 Testing patient list..."
curl -s "http://localhost:3000/v1/patients" | jq '.' || echo "Failed to get patients"

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🔧 Useful commands:"
echo "   View logs: docker-compose logs [service-name]"
echo "   Stop all: docker-compose down"
echo "   Restart: docker-compose restart [service-name]"
echo "   Scale service: docker-compose up -d --scale patient-service=3"
echo ""
echo "📖 For Kubernetes deployment, run:"
echo "   kubectl apply -f k8s/"
echo ""