#!/bin/sh
set -e

# Define a writable directory for data and uploads
WRITABLE_DIR="/tmp"

# Create writable directories for data and uploads
mkdir -p "$WRITABLE_DIR/data"
mkdir -p "$WRITABLE_DIR/uploads"

# Set the DATABASE_URL to point to the writable location
export DATABASE_URL="file:$WRITABLE_DIR/data/dev.db"

# Check if the database file exists in the build directory
if [ -f "/prisma/dev.db" ]; then
    echo "Copying existing database file to writable directory..."
    cp "/prisma/dev.db" "$WRITABLE_DIR/data/dev.db"
fi

# Run migrations to handle first-time deployment or schema changes
echo "Running Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

# Set the UPLOADS_DIR environment variable
export UPLOADS_DIR="$WRITABLE_DIR/uploads"

# Start the Node.js application
echo "Starting the application..."
node dist/src/server.js
