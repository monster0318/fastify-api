#!/bin/sh
set -e

# Fix permissions for volumes mounted as root
if [ "$(id -u)" = "0" ]; then
    # Fix permissions for data directory
    if [ -d "/app/data" ]; then
        chown -R fastify:nodejs /app/data
    fi
    
    # Fix permissions for uploads directory  
    if [ -d "/app/uploads" ]; then
        chown -R fastify:nodejs /app/uploads
    fi
    
    # Fix permissions for any existing database files
    if [ -f "/app/data/prod.db" ]; then
        chown fastify:nodejs /app/data/prod.db
    fi
    
    # Ensure the data directory is writable
    chmod 755 /app/data
    
    # Switch to fastify user
    exec su-exec fastify "$@"
else
    # Already running as fastify user
    exec "$@"
fi
