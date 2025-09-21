#!/bin/sh
set -e

echo "Entrypoint script starting..."

# Debug: Show current user and directory contents
echo "Current user: $(id)"
echo "Contents of /app:"
ls -la /app/
echo "Contents of /app/dist:"
ls -la /app/dist/ || echo "dist directory not found"

# Fix permissions for volumes mounted as root
if [ "$(id -u)" = "0" ]; then
    echo "Running as root, fixing permissions..."
    
    # Fix permissions for data directory
    if [ -d "/app/data" ]; then
        chown -R fastify:nodejs /app/data
        echo "Fixed data directory permissions"
    fi
    
    # Fix permissions for uploads directory  
    if [ -d "/app/uploads" ]; then
        chown -R fastify:nodejs /app/uploads
        echo "Fixed uploads directory permissions"
    fi
    
    # Switch to fastify user
    echo "Switching to fastify user..."
    exec su-exec fastify "$@"
else
    # Already running as fastify user
    echo "Already running as fastify user"
    exec "$@"
fi
