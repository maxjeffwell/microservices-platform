#!/bin/bash
set -e

echo "====================================="
echo "Starting Microservices Platform"
echo "====================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

echo "🐳 Starting Docker containers..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

echo ""
echo "====================================="
echo "✅ Platform Started!"
echo "====================================="
echo ""
echo "Services:"
echo "- PostgreSQL:      http://localhost:5432"
echo "- MongoDB:         http://localhost:27017"
echo "- Redis:           http://localhost:6379"
echo "- RabbitMQ:        http://localhost:15672 (admin UI)"
echo "- MinIO:           http://localhost:9001 (console)"
echo "- Elasticsearch:   http://localhost:9200"
echo "- InfluxDB:        http://localhost:8086"
echo ""
echo "Platform Services (when implemented):"
echo "- Auth Service:    http://localhost:3001"
echo "- User Service:    http://localhost:3002"
echo "- Notification:    http://localhost:3003"
echo "- Media Service:   http://localhost:3004"
echo ""
echo "Run 'docker-compose logs -f' to view logs"
echo "Run 'docker-compose ps' to check service status"
echo ""
