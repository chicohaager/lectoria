# 🔧 Lectoria Troubleshooting Guide

## Common Issues and Solutions

### 🚫 Login Failed / Authentication Issues

#### Symptom: "Anmeldung fehlgeschlagen" or login not working

#### Possible Causes & Solutions:

1. **CORS Issues (Development)**
   ```bash
   # Check if running on different port than expected
   # Solution: Set NODE_ENV=development for local testing
   docker run -e NODE_ENV=development -e JWT_SECRET=your-secret lectoria:2.4
   ```

2. **Wrong Credentials**
   ```
   Default credentials: admin / admin123
   ```

3. **Database Not Initialized**
   ```bash
   # Check container logs
   docker logs container-name
   
   # Look for: "✅ Default admin user created"
   ```

4. **JWT Secret Missing**
   ```bash
   # Always set JWT_SECRET
   docker run -e JWT_SECRET=your-secure-secret lectoria:2.4
   ```

#### Quick Fix:
```bash
# Test login via API
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 💾 Database Issues

#### Symptom: "SQLITE_CANTOPEN: unable to open database file"

#### Solution:
```bash
# Ensure data directory has correct permissions
mkdir -p /path/to/data
chmod 755 /path/to/data

# Or use Docker volumes
docker run -v lectoria-data:/app/data lectoria:2.4
```

#### Symptom: Database corruption

#### Solution:
```bash
# Check database integrity
docker exec container-name sqlite3 /app/data/lectoria.db 'PRAGMA integrity_check;'

# Backup and restore
docker exec container-name cp /app/data/lectoria.db /app/data/backup.db
```

### 🐳 Docker Issues

#### Symptom: Container won't start

#### Diagnostics:
```bash
# Check container logs
docker logs container-name

# Check container status
docker ps -a

# Inspect container configuration
docker inspect container-name
```

#### Symptom: Port already in use

#### Solution:
```bash
# Use different port
docker run -p 3001:3000 lectoria:2.4

# Or stop conflicting container
docker stop conflicting-container
```

### 🌐 Network/CORS Issues

#### Symptom: Frontend can't connect to backend

#### Solution for Production:
```bash
# Set FRONTEND_URL for production
docker run -e NODE_ENV=production -e FRONTEND_URL=https://yourdomain.com lectoria:2.4
```

#### Solution for Development:
```bash
# Use development mode (allows all origins)
docker run -e NODE_ENV=development lectoria:2.4
```

### 📁 File Upload Issues

#### Symptom: File upload fails

#### Diagnostics:
```bash
# Check upload directory permissions
docker exec container-name ls -la /app/uploads/

# Check disk space
docker exec container-name df -h
```

#### Solution:
```bash
# Mount uploads directory
docker run -v /host/uploads:/app/uploads lectoria:2.4

# Or create volume
docker volume create lectoria-uploads
docker run -v lectoria-uploads:/app/uploads lectoria:2.4
```

### 🔒 SSL/HTTPS Issues

#### Symptom: Mixed content warnings

#### Solution:
```bash
# Use reverse proxy (nginx example)
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://lectoria:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 🚀 Performance Issues

#### Symptom: Slow response times

#### Diagnostics:
```bash
# Check container resources
docker stats container-name

# Check SQLite performance
docker exec container-name sqlite3 /app/data/lectoria.db 'ANALYZE;'
```

#### Solutions:
```bash
# Increase memory limit
docker run --memory=512m lectoria:2.4

# Optimize SQLite
docker exec container-name sqlite3 /app/data/lectoria.db 'VACUUM;'
```

## Health Check Commands

### Container Health
```bash
# Docker health status
docker inspect container-name --format='{{.State.Health.Status}}'

# Manual health check
curl -f http://localhost:3000/ || exit 1
```

### Database Health
```bash
# Connect to database
docker exec -it container-name sqlite3 /app/data/lectoria.db

# Check tables
.tables

# Check user count
SELECT COUNT(*) FROM users;

# Exit SQLite
.exit
```

### Application Health
```bash
# Check API endpoints
curl http://localhost:3000/api/books
curl http://localhost:3000/api/categories
curl http://localhost:3000/api/users
```

## Log Analysis

### Important Log Messages

**✅ Success Messages:**
- `✅ Connected to SQLite database`
- `✅ Default admin user created`
- `✅ SQLite Database initialisiert`

**⚠️ Warning Messages:**
- `JWT_SECRET is using fallback value` - Set proper JWT_SECRET
- `CORS origin not allowed` - Check NODE_ENV and FRONTEND_URL

**💥 Error Messages:**
- `SQLITE_CANTOPEN` - Permission/path issue
- `EADDRINUSE` - Port already in use
- `Token-Validierung fehlgeschlagen` - JWT/auth issue

### Enable Debug Logging
```bash
# Run with debug logs
docker run -e NODE_ENV=development -e DEBUG=* lectoria:2.4
```

## Recovery Procedures

### Reset Admin Password
```bash
# Connect to database
docker exec -it container-name sqlite3 /app/data/lectoria.db

# Reset admin password (bcrypt hash for 'newpassword')
UPDATE users SET password='$2a$10$...' WHERE username='admin';

# Exit
.exit
```

### Database Recovery
```bash
# Create backup
docker exec container-name cp /app/data/lectoria.db /tmp/backup.db

# Restore from backup  
docker exec container-name cp /tmp/backup.db /app/data/lectoria.db

# Restart container
docker restart container-name
```

### Complete Reset
```bash
# Remove all data (⚠️ DESTRUCTIVE)
docker stop container-name
docker rm container-name
docker volume rm lectoria-data lectoria-uploads

# Start fresh
docker run -d --name lectoria -p 3000:3000 \
  -v lectoria-data:/app/data \
  -v lectoria-uploads:/app/uploads \
  -e JWT_SECRET=your-secret \
  lectoria:2.4
```

## Support Resources

- **GitHub Issues**: https://github.com/chicohaager/lectoria/issues
- **Discussions**: https://github.com/chicohaager/lectoria/discussions
- **Documentation**: Check README.md and DEPLOYMENT.md

## Quick Diagnostic Script

```bash
#!/bin/bash
echo "=== Lectoria Diagnostic ==="
echo "Container Status:"
docker ps | grep lectoria

echo -e "\nLogs (last 20 lines):"
docker logs --tail 20 lectoria

echo -e "\nHealth Check:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/

echo -e "\nDisk Usage:"
docker exec lectoria df -h

echo -e "\nDatabase Files:"
docker exec lectoria ls -la /app/data/
```

Save as `diagnose.sh` and run: `chmod +x diagnose.sh && ./diagnose.sh`