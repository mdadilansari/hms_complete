#!/bin/bash

# HMS Kubernetes Deployment Script

set -e

echo "☸️  HMS Kubernetes Deployment"
echo "============================="

# Check if kubectl is installed
if ! command -v kubectl >/dev/null 2>&1; then
    echo "❌ kubectl is not installed. Please install kubectl first."
    exit 1
fi

# Check if minikube is running
if ! kubectl cluster-info >/dev/null 2>&1; then
    echo "❌ Kubernetes cluster is not accessible. Please start minikube or ensure kubectl is configured."
    echo "💡 To start minikube: minikube start"
    exit 1
fi

echo "✅ Kubernetes cluster is accessible"

# Create namespace
echo "📁 Creating HMS namespace..."
kubectl create namespace hms --dry-run=client -o yaml | kubectl apply -f -

# Set namespace as default for this deployment
kubectl config set-context --current --namespace=hms

# Deploy databases first
echo "💾 Deploying databases..."
kubectl apply -f k8s/patient-db.yaml
kubectl apply -f k8s/doctor-db.yaml
kubectl apply -f k8s/appointment-db.yaml
kubectl apply -f k8s/billing-db.yaml
kubectl apply -f k8s/prescription-db.yaml
kubectl apply -f k8s/payment-db.yaml
kubectl apply -f k8s/notification-db.yaml

echo "⏳ Waiting for databases to be ready..."
kubectl wait --for=condition=ready pod -l app=patient-db --timeout=120s
kubectl wait --for=condition=ready pod -l app=doctor-db --timeout=120s
kubectl wait --for=condition=ready pod -l app=appointment-db --timeout=120s
kubectl wait --for=condition=ready pod -l app=billing-db --timeout=120s
kubectl wait --for=condition=ready pod -l app=prescription-db --timeout=120s
kubectl wait --for=condition=ready pod -l app=payment-db --timeout=120s
kubectl wait --for=condition=ready pod -l app=notification-db --timeout=120s

# Deploy services
echo "🚀 Deploying microservices..."
kubectl apply -f k8s/patient-service.yaml
kubectl apply -f k8s/doctor-service.yaml
kubectl apply -f k8s/appointment-service.yaml
kubectl apply -f k8s/billing-service.yaml
kubectl apply -f k8s/prescription-service.yaml
kubectl apply -f k8s/payment-service.yaml
kubectl apply -f k8s/notification-service.yaml

echo "⏳ Waiting for services to be ready..."
kubectl wait --for=condition=available deployment/patient-service --timeout=180s
kubectl wait --for=condition=available deployment/doctor-service --timeout=180s
kubectl wait --for=condition=available deployment/appointment-service --timeout=180s
kubectl wait --for=condition=available deployment/billing-service --timeout=180s
kubectl wait --for=condition=available deployment/prescription-service --timeout=180s
kubectl wait --for=condition=available deployment/payment-service --timeout=180s
kubectl wait --for=condition=available deployment/notification-service --timeout=180s

# Deploy API Gateway
echo "🌐 Deploying API Gateway..."
kubectl apply -f k8s/api-gateway.yaml
kubectl wait --for=condition=available deployment/api-gateway --timeout=120s

# Deploy monitoring (optional)
echo "📊 Deploying monitoring stack..."
kubectl apply -f k8s/monitoring.yaml

# Get service URLs
echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Service Information:"
echo "======================="

# Get external IP for API Gateway
GATEWAY_IP=$(kubectl get service api-gateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
GATEWAY_PORT=$(kubectl get service api-gateway -o jsonpath='{.spec.ports[0].port}')

if [ "$GATEWAY_IP" = "pending" ] || [ -z "$GATEWAY_IP" ]; then
    # For minikube, use minikube service command
    if command -v minikube >/dev/null 2>&1; then
        echo "🌐 API Gateway URL: $(minikube service api-gateway --url -n hms)"
    else
        echo "🌐 API Gateway: Use 'kubectl port-forward service/api-gateway 3000:80' to access"
    fi
else
    echo "🌐 API Gateway: http://$GATEWAY_IP:$GATEWAY_PORT"
fi

# Show all pods
echo ""
echo "📦 Pod Status:"
kubectl get pods -o wide

echo ""
echo "🔍 Service Status:" 
kubectl get services

echo ""
echo "🔧 Useful Commands:"
echo "==================="
echo "View logs:     kubectl logs -f deployment/patient-service"
echo "Scale service: kubectl scale deployment patient-service --replicas=3"
echo "Port forward:  kubectl port-forward service/api-gateway 3000:80"
echo "Delete all:    kubectl delete namespace hms"
echo ""

# Health checks
echo "🏥 Running health checks..."
sleep 10

if command -v minikube >/dev/null 2>&1; then
    GATEWAY_URL=$(minikube service api-gateway --url -n hms)
    if [ ! -z "$GATEWAY_URL" ]; then
        echo "Testing gateway health: $GATEWAY_URL/health"
        curl -f -s "$GATEWAY_URL/health" >/dev/null && echo "✅ API Gateway is healthy" || echo "❌ API Gateway health check failed"
    fi
fi