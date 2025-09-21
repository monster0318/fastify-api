#!/bin/sh
set -e

# Fix permissions for volumes mounted as root
if [ "$(id -u)" = "0" ]; then
    echo "Running as root, fixing permissions..."
    
    # Create data directory if it doesn't exist and set permissions
    echo "Creating data directory with proper permissions..."
    mkdir -p /app/data
    chown fastify:nodejs /app/data
    chmod 755 /app/data
    
    # Fix permissions for data directory
    if [ -d "/app/data" ]; then
        echo "Fixing data directory permissions..."
        chown -R fastify:nodejs /app/data
        chmod -R 755 /app/data
    fi
    
    # Fix permissions for uploads directory  
    if [ -d "/app/uploads" ]; then
        echo "Fixing uploads directory permissions..."
        chown -R fastify:nodejs /app/uploads
        chmod -R 775 /app/uploads
    fi
    
    # Fix permissions for any existing database files
    if [ -f "/app/data/prod.db" ]; then
        echo "Fixing database file permissions..."
        chown fastify:nodejs /app/data/prod.db
        chmod 664 /app/data/prod.db
    fi
    
    echo "Permissions fixed, switching to fastify user..."
    # Switch to fastify user
    exec su-exec fastify "$@"
else
    # Already running as fastify user
    echo "Already running as fastify user"
    exec "$@"
fi
