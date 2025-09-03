# Lectoria Deployment Checklist

## Before Deployment

- [ ] Set secure JWT_SECRET in environment
- [ ] Configure proper FRONTEND_URL for CORS
- [ ] Set up SSL/HTTPS certificate
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Configure log rotation
- [ ] Set proper PUID/PGID for file permissions

## Environment Variables

Required:
- `JWT_SECRET`: Secure random string (min 32 chars)
- `NODE_ENV`: Set to "production"
- `PORT`: Application port (default 3000)

Optional:
- `DB_PATH`: Database location
- `PUID`: User ID for file permissions
- `PGID`: Group ID for file permissions

## Docker Deployment

```bash
# Using docker-compose (recommended)
docker-compose -f docker-compose.zimaos.yml up -d

# Or using docker run
docker run -d \
  --name lectoria \
  -p 3000:3000 \
  -v /path/to/data:/app/data \
  -v /path/to/uploads:/app/uploads \
  -e JWT_SECRET="your-secure-secret" \
  -e PUID=1000 \
  -e PGID=1000 \
  lectoria:production
```

## Post-Deployment

- [ ] Test application access
- [ ] Verify file upload functionality
- [ ] Check database connectivity
- [ ] Monitor logs for errors
- [ ] Set up monitoring/alerts
- [ ] Document admin credentials

## Security Notes

- Default admin credentials: `admin` / `admin123` (CHANGE IMMEDIATELY)
- The script found some hardcoded secrets in documentation files - these are for development only
- JWT_SECRET is auto-generated in Docker containers
- Database uses SQLite with proper indexes for performance