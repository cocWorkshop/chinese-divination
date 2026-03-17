#!/bin/bash
set -e
cd "$(dirname "$0")/.."
echo "==> Creating database..."
bash scripts/setup-db.sh
echo "==> Building Docker image..."
docker-compose build --no-cache
echo "==> Starting container..."
docker-compose up -d
echo "==> Done! App at http://localhost:8094"
docker ps | grep chinese-divination
