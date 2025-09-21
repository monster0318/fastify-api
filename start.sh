#!/bin/sh
set -e

echo "Starting application with migrations..."

# Run migrations as fastify user
echo "Running database migrations..."
npx prisma migrate deploy

echo "Migrations completed, starting server..."
# Start the application
exec node dist/src/server.js
