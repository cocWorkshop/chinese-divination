#!/bin/bash
PGPASSWORD=postgres psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE divination_db;" 2>/dev/null && echo "DB created" || echo "DB may already exist"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/divination_db" npx prisma migrate deploy
