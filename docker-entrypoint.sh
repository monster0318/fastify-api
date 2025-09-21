#!/bin/sh
set -e

# Fix permissions for volumes mounted as root
if [ "$(id -u)" = "0" ]; then
    echo "Running as root, fixing permissions..."
    
    # Create data and uploads directories if they don't exist and set permissions
    echo "Creating data and uploads directories with proper permissions..."
    mkdir -p /app/data
    mkdir -p /app/uploads
    chown -R fastify:nodejs /app/data
    chmod -R 755 /app/data
    chown -R fastify:nodejs /app/uploads
    chmod -R 775 /app/uploads
    
    # Run Prisma migrations as root to avoid permissions issues
    echo "Permissions fixed, running migrations as root..."
    npx prisma migrate deploy
    
    # Fix permissions for the database file created by the migration
    if [ -f "/app/data/prod.db" ]; then
        echo "Fixing database file permissions..."
        chown fastify:nodejs /app/data/prod.db
        chmod 664 /app/data/prod.db
    fi

    echo "Migrations complete, switching to fastify user..."
    # Switch to fastify user and execute the rest of the command (start.sh)
    exec su-exec fastify "$@"
else
    # Already running as fastify user, execute the command
    echo "Already running as fastify user"
    exec "$@"
fi
