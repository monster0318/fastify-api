#!/bin/sh
set -e

# Create writable directories for data and uploads
mkdir -p /tmp/data
mkdir -p /tmp/uploads

# If the database file exists in the read-only build directory, copy it to the writable temp directory
if [ -f "/app/data/prod.db" ]; then
    cp /app/data/prod.db /tmp/data/prod.db
fi

# Set the DATABASE_URL to point to the writable location
export DATABASE_URL="file:/tmp/data/prod.db"

# Set the UPLOADS_DIR environment variable for your application
export UPLOADS_DIR="/tmp/uploads"
# Start the Node.js application
node dist/src/server.js
