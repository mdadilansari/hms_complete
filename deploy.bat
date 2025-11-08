@echo off
REM HMS Deployment Script for Windows

echo 🏥 Hospital Management System - Deployment Script
echo =================================================

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose first.
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed

REM Generate services if not exists
echo 🏗️ Generating microservices...
if not exist "services\appointment-service" (
    echo 📦 Running service generator...
    node generate-services.js
) else (
    echo 📦 Services already exist, skipping generation
)

REM Build Docker images
echo 🐳 Building Docker images...

set services=patient-service doctor-service appointment-service billing-service prescription-service payment-service notification-service api-gateway

for %%s in (%services%) do (
    if exist "services\%%s" (
        echo 🔨 Building %%s...
        docker build -t "hms/%%s:latest" "services\%%s"
        if errorlevel 1 (
            echo ❌ Failed to build %%s
            pause
            exit /b 1
        )
    ) else (
        echo ⚠️ Warning: %%s directory not found
    )
)

echo ✅ All Docker images built successfully

REM Start services
echo 🚀 Starting HMS services...
docker-compose down --remove-orphans
docker-compose up -d

echo ⏳ Waiting for services to be ready...
timeout /t 30 /nobreak

REM Health checks
echo 🏥 Running health checks...

set services_ports=patient-service:3001 doctor-service:3002 appointment-service:3003 billing-service:3004 prescription-service:3005 payment-service:3006 notification-service:3007 api-gateway:3000

for %%sp in (%services_ports%) do (
    for /f "tokens=1,2 delims=:" %%a in ("%%sp") do (
        echo 🔍 Checking %%a on port %%b...
        curl -f -s "http://localhost:%%b/health" >nul 2>&1
        if errorlevel 1 (
            echo ❌ %%a is not responding
        ) else (
            echo ✅ %%a is healthy
        )
    )
)

REM Display information
echo.
echo 📋 HMS Services Status
echo ======================
echo 🌐 API Gateway: http://localhost:3000
echo 📚 API Documentation: http://localhost:3000/docs
echo.
echo Individual Services:
echo 👤 Patient Service: http://localhost:3001 ^(docs: /docs^)
echo 👨‍⚕️ Doctor Service: http://localhost:3002 ^(docs: /docs^)
echo 📅 Appointment Service: http://localhost:3003 ^(docs: /docs^)
echo 💰 Billing Service: http://localhost:3004 ^(docs: /docs^)
echo 💊 Prescription Service: http://localhost:3005 ^(docs: /docs^)
echo 💳 Payment Service: http://localhost:3006 ^(docs: /docs^)
echo 📢 Notification Service: http://localhost:3007 ^(docs: /docs^)
echo.
echo 📊 Monitoring:
echo 🔍 Prometheus: http://localhost:9090
echo 📈 Grafana: http://localhost:3010 ^(admin/admin^)
echo.

echo 🧪 Testing API Gateway...
curl -s "http://localhost:3000/health"

echo.
echo ✅ Deployment completed successfully!
echo.
echo 🔧 Useful commands:
echo    View logs: docker-compose logs [service-name]
echo    Stop all: docker-compose down
echo    Restart: docker-compose restart [service-name]
echo.

pause