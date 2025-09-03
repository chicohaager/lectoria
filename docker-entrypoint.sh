#!/bin/sh
set -e

# PUID/PGID Support for ZimaOS and Linux containers
# This script ensures proper file permissions by adjusting user/group IDs

# Default values
DEFAULT_PUID=1001
DEFAULT_PGID=1001

# Get PUID and PGID from environment or use defaults
PUID=${PUID:-$DEFAULT_PUID}
PGID=${PGID:-$DEFAULT_PGID}

echo "🔧 Starting Lectoria with PUID=$PUID and PGID=$PGID"

# JWT_SECRET auto-generation (LinuxServer.io pattern)
JWT_SECRET_FILE="/app/data/.jwt-secret"

if [ -z "$JWT_SECRET" ]; then
    if [ -f "$JWT_SECRET_FILE" ]; then
        echo "📝 Loading existing JWT_SECRET from persistent storage"
        JWT_SECRET=$(cat "$JWT_SECRET_FILE")
    else
        echo "🔐 Generating new JWT_SECRET (first run)"
        # Generate secure 64-character random string
        JWT_SECRET=$(tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 64)
        mkdir -p "$(dirname "$JWT_SECRET_FILE")"
        echo "$JWT_SECRET" > "$JWT_SECRET_FILE"
        chmod 600 "$JWT_SECRET_FILE"
        echo "✅ JWT_SECRET generated and saved to persistent storage"
    fi
    export JWT_SECRET
else
    echo "🔐 Using provided JWT_SECRET from environment"
    # Save provided secret to persistent storage for consistency
    if [ ! -f "$JWT_SECRET_FILE" ]; then
        mkdir -p "$(dirname "$JWT_SECRET_FILE")"
        echo "$JWT_SECRET" > "$JWT_SECRET_FILE"
        chmod 600 "$JWT_SECRET_FILE"
        echo "✅ JWT_SECRET saved to persistent storage"
    fi
fi

# Function to check if user/group exists
user_exists() {
    id "$1" &>/dev/null
}

group_exists() {
    getent group "$1" &>/dev/null
}

# Create or modify group
if ! group_exists "$PGID"; then
    echo "📝 Creating group with GID $PGID"
    addgroup -g "$PGID" -S lectoria-group
else
    EXISTING_GROUP=$(getent group "$PGID" | cut -d: -f1)
    echo "📝 Using existing group: $EXISTING_GROUP (GID $PGID)"
fi

# Create or modify user
if ! user_exists "$PUID"; then
    echo "📝 Creating user with UID $PUID"
    # Remove existing user with same UID if it exists
    if getent passwd "$PUID" >/dev/null 2>&1; then
        EXISTING_USER=$(getent passwd "$PUID" | cut -d: -f1)
        echo "📝 Removing conflicting user: $EXISTING_USER"
        deluser "$EXISTING_USER" 2>/dev/null || true
    fi
    adduser -S -u "$PUID" -G "$(getent group "$PGID" | cut -d: -f1)" -h /app -s /bin/sh lectoria-user 2>/dev/null || {
        echo "📝 User creation failed, using existing user with UID $PUID"
    }
else
    EXISTING_USER=$(getent passwd "$PUID" | cut -d: -f1)
    echo "📝 Using existing user: $EXISTING_USER (UID $PUID)"
    
    # Ensure user is in the correct group
    usermod -g "$PGID" "$EXISTING_USER" 2>/dev/null || true
fi

# Get the actual username and groupname
USERNAME=$(getent passwd "$PUID" | cut -d: -f1)
GROUPNAME=$(getent group "$PGID" | cut -d: -f1)

echo "👤 Running as: $USERNAME:$GROUPNAME ($PUID:$PGID)"

# Ensure directories exist and have correct permissions
echo "📁 Setting up directories and permissions..."

# Create directories if they don't exist
mkdir -p /app/data /app/uploads /app/logs

# Set ownership for data directories
chown -R "$PUID:$PGID" /app/data /app/uploads /app/logs /app/frontend/build 2>/dev/null || true

# Set proper permissions
chmod -R 755 /app/data /app/uploads /app/logs 2>/dev/null || true

# Ensure the application files are readable
chmod -R 755 /app/frontend/build 2>/dev/null || true

echo "✅ User and permissions setup complete"

# Switch to the target user and execute the main command
echo "🚀 Starting Lectoria backend server..."

# Use gosu if available, otherwise use su-exec, fallback to su
# Make sure JWT_SECRET is available to the child process
export JWT_SECRET

if command -v gosu >/dev/null 2>&1; then
    exec gosu "$PUID:$PGID" env JWT_SECRET="$JWT_SECRET" "$@"
elif command -v su-exec >/dev/null 2>&1; then
    exec su-exec "$PUID:$PGID" env JWT_SECRET="$JWT_SECRET" "$@"
else
    exec su -s /bin/sh -c "export JWT_SECRET='$JWT_SECRET' && exec $*" "$USERNAME"
fi