#!/bin/bash
# Deploy chinese-divination to production via docker compose
set -e
cd "$(dirname "$0")"

echo "📦 Pulling latest image..."
docker compose pull

echo "🔄 Restarting container..."
docker compose up -d

echo "⏳ Waiting for startup..."
sleep 5
docker compose logs --tail 10

echo "✅ Deployed!"
