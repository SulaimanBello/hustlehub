# HustleHub Deployment Guide

Complete guide for deploying HustleHub using Docker, both for local development and production environments (including EasyPanel).

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start - Development](#quick-start---development)
- [Production Deployment](#production-deployment)
  - [Local Production Testing](#local-production-testing)
  - [EasyPanel Deployment](#easypanel-deployment)
- [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Docker Commands Reference](#docker-commands-reference)

---

## Prerequisites

### Required Software
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Git**: For cloning the repository

### Optional
- **Node.js 18+**: For local development without Docker
- **PostgreSQL 15+**: For local database without Docker

### System Requirements
- **RAM**: Minimum 4GB (8GB recommended)
- **Disk Space**: At least 10GB free
- **OS**: Linux, macOS, or Windows (with WSL2 recommended)

---

## Quick Start - Development

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/hustlehub.git
cd hustlehub
```

### 2. Start Development Environment

**Linux/macOS:**
```bash
./docker-dev.sh start
```

**Windows:**
```cmd
docker-dev.bat start
```

**Or manually:**
```bash
docker-compose -f docker-compose.dev.yml up
```

This will start:
- PostgreSQL database with PostGIS on port `5432`
- Backend API on port `5000`
- Admin dashboard on port `3001`

### 3. Access Services

- **Backend API**: http://localhost:5000/api/v1
- **API Health**: http://localhost:5000/health
- **Admin Dashboard**: http://localhost:3001
- **Database**: localhost:5432 (user: `hustlehub`, password: `hustlehub_dev_password`)

### 4. Run Database Migrations

**Using helper script:**
```bash
./docker-dev.sh migrate
```

**Or manually:**
```bash
docker-compose -f docker-compose.dev.yml exec backend npm run migrate
```

### 5. View Logs

**All services:**
```bash
./docker-dev.sh logs
```

**Specific service:**
```bash
./docker-dev.sh logs backend
./docker-dev.sh logs admin
./docker-dev.sh logs db
```

### 6. Stop Development Environment

```bash
./docker-dev.sh stop
```

---

## Production Deployment

### Local Production Testing

Before deploying to a production server, test the production Docker setup locally:

#### 1. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` and fill in all required values (see [Environment Variables](#environment-variables))

#### 2. Start Production Services

**Linux/macOS:**
```bash
./docker-prod.sh start
```

**Windows:**
```cmd
docker-prod.bat start
```

**Or manually:**
```bash
docker-compose up -d --build
```

#### 3. Run Migrations

```bash
./docker-prod.sh migrate
```

#### 4. Check Service Health

```bash
./docker-prod.sh status
```

All services should show as "healthy" after startup period.

---

### EasyPanel Deployment

EasyPanel provides easy Docker-based deployments with GitHub integration.

#### Architecture

```
┌─────────────────────────────────────────┐
│           EasyPanel Project             │
│                                         │
│  ┌────────────┐      ┌──────────────┐  │
│  │  Backend   │      │    Admin     │  │
│  │  Service   │      │   Dashboard  │  │
│  │            │      │              │  │
│  │ Port: 5000 │      │  Port: 3001  │  │
│  └─────┬──────┘      └──────────────┘  │
│        │                                │
│        │                                │
│  ┌─────▼──────────────────────┐        │
│  │  Managed PostgreSQL DB     │        │
│  │  (with PostGIS extension)  │        │
│  └────────────────────────────┘        │
└─────────────────────────────────────────┘
```

#### Step 1: Prepare Your Repository

1. **Commit all Docker files to your repository:**
   ```bash
   git add .
   git commit -m "Add Docker deployment configuration"
   git push origin main
   ```

2. **Files that should be in your repo:**
   - `backend/Dockerfile`
   - `admin/Dockerfile`
   - `admin/nginx.conf`
   - `.env.example` (for reference)
   - `docker-compose.yml` (for reference)

#### Step 2: Set Up Database

1. **Create a PostgreSQL database** in EasyPanel
   - Navigate to: **Databases** → **Create Database**
   - Choose: **PostgreSQL 15** or higher
   - Enable **PostGIS** extension:
     ```sql
     CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
     CREATE EXTENSION IF NOT EXISTS "postgis";
     ```

2. **Note the database connection string:**
   ```
   postgresql://username:password@host:port/database
   ```

#### Step 3: Deploy Backend Service

1. **Create a new app** in EasyPanel
   - Name: `hustlehub-backend`
   - Source: **GitHub** (connect your repository)
   - Branch: `main`
   - Build method: **Dockerfile**
   - Dockerfile path: `backend/Dockerfile`

2. **Configure environment variables:**

   Go to **Environment** tab and add:

   ```env
   NODE_ENV=production
   PORT=5000
   API_VERSION=v1

   # Database (from Step 2)
   DATABASE_URL=postgresql://user:pass@host:port/db
   DATABASE_POOL_MIN=2
   DATABASE_POOL_MAX=10

   # JWT (generate with: openssl rand -hex 32)
   JWT_SECRET=your-secure-random-string-here
   JWT_EXPIRES_IN=7d

   # Flutterwave (use LIVE keys for production)
   FLUTTERWAVE_SECRET_KEY=FLWSECK-your-live-secret-key
   FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-your-live-public-key
   FLUTTERWAVE_ENCRYPTION_KEY=your-encryption-key
   FLUTTERWAVE_WEBHOOK_SECRET=your-webhook-secret

   # SMS Provider (choose one)
   SMS_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=your-twilio-sid
   TWILIO_AUTH_TOKEN=your-twilio-token
   TWILIO_PHONE_NUMBER=+1234567890

   # CORS (your actual domains)
   CORS_ORIGIN=https://yourdomain.com,https://admin.yourdomain.com

   # Business settings
   PLATFORM_FEE_PERCENT=15
   DEFAULT_TASK_RADIUS_KM=5
   OTP_EXPIRY_MINUTES=10
   OTP_MAX_ATTEMPTS=3

   # Rate limiting (adjust based on traffic)
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100

   # Logging
   LOG_LEVEL=info
   ```

3. **Configure networking:**
   - **Port**: `5000`
   - **Health check path**: `/health`
   - **Domain**: `api.yourdomain.com` (or use EasyPanel subdomain)

4. **Deploy:**
   - Click **Deploy**
   - Wait for build and health check to pass

5. **Run migrations:**

   After first deployment, open the **Console** and run:
   ```bash
   npm run migrate
   ```

#### Step 4: Deploy Admin Dashboard

1. **Create another app** in EasyPanel
   - Name: `hustlehub-admin`
   - Source: **GitHub** (same repository)
   - Branch: `main`
   - Build method: **Dockerfile**
   - Dockerfile path: `admin/Dockerfile`

2. **Configure environment variables:**

   If you need to change API URL during build, add build args:
   ```env
   VITE_API_URL=/api/v1
   ```

3. **Configure networking:**
   - **Port**: `3001`
   - **Health check path**: `/health`
   - **Domain**: `admin.yourdomain.com`

4. **Configure nginx proxy (if needed):**

   If backend is on a different domain, update `admin/nginx.conf` to proxy API requests:
   ```nginx
   location /api {
       proxy_pass https://api.yourdomain.com;
       # ... proxy headers
   }
   ```

5. **Deploy:**
   - Click **Deploy**

#### Step 5: Verify Deployment

1. **Test backend health:**
   ```bash
   curl https://api.yourdomain.com/health
   ```

2. **Test admin dashboard:**
   - Visit: https://admin.yourdomain.com
   - Login with admin credentials

3. **Check logs** in EasyPanel for any errors

#### Step 6: Set Up Continuous Deployment

EasyPanel automatically redeploys when you push to the configured branch.

**Deployment workflow:**
```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main

# EasyPanel automatically:
# 1. Detects push
# 2. Pulls latest code
# 3. Builds Docker image
# 4. Runs health checks
# 5. Deploys with zero downtime
```

---

## Database Setup

### Running Migrations

Migrations are located in `backend/migrations/` and must be run in order.

**Development:**
```bash
./docker-dev.sh migrate
```

**Production:**
```bash
./docker-prod.sh migrate
```

**EasyPanel:**
```bash
# In the backend service console
npm run migrate
```

### Migration Files

1. `001_enable_extensions.sql` - Enable PostGIS and UUID
2. `002_create_users_table.sql` - User accounts
3. `003_create_otp_table.sql` - OTP verification
4. `004_create_tasks_table.sql` - Task management
5. `005_create_wallets_table.sql` - User wallets
6. `006_create_transactions_table.sql` - Financial transactions
7. `007_create_chat_messages_table.sql` - Chat system
8. `008_add_user_roles.sql` - Admin roles

### Creating Admin User

After migrations, create an admin user:

**Option 1: Via SQL**
```sql
UPDATE users
SET role = 'ADMIN'
WHERE phone_number = '+2348XXXXXXXXX';
```

**Option 2: Automatic (migration creates default)**
- Phone: `+2348000000000`
- Update in migration before running

### Database Backup

**Development:**
```bash
docker-compose -f docker-compose.dev.yml exec db pg_dump \
  -U hustlehub hustlehub_dev > backup.sql
```

**Production:**
```bash
./docker-prod.sh backup
```

**EasyPanel:**
Use EasyPanel's built-in database backup feature

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret for signing JWT tokens | `32+ character random string` |
| `FLUTTERWAVE_SECRET_KEY` | Flutterwave secret key | `FLWSECK-xxx` |
| `FLUTTERWAVE_PUBLIC_KEY` | Flutterwave public key | `FLWPUBK-xxx` |

### SMS Provider Variables (Choose One)

**Twilio:**
```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

**Termii:**
```env
SMS_PROVIDER=termii
TERMII_API_KEY=xxxxx
TERMII_SENDER_ID=HustleHub
```

**Africa's Talking:**
```env
SMS_PROVIDER=africasTalking
AT_API_KEY=xxxxx
AT_USERNAME=sandbox
```

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Backend server port |
| `NODE_ENV` | `development` | Environment mode |
| `CORS_ORIGIN` | `http://localhost:3001` | Allowed CORS origins |
| `PLATFORM_FEE_PERCENT` | `15` | Platform fee percentage |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | API rate limit |

See `.env.example` for complete list.

---

## Troubleshooting

### Common Issues

#### Backend won't start

**Symptom:** Backend container exits immediately

**Solutions:**
1. Check logs: `./docker-dev.sh logs backend`
2. Verify environment variables are set
3. Ensure database is accessible
4. Check migrations have run

#### Database connection failed

**Symptom:** `Database connection failed` error

**Solutions:**
1. Verify `DATABASE_URL` is correct
2. Check database container is running: `docker ps`
3. Test connection manually:
   ```bash
   docker-compose -f docker-compose.dev.yml exec db \
     psql -U hustlehub -d hustlehub_dev -c "SELECT 1"
   ```
4. Ensure PostGIS extensions are installed

#### Health check failing

**Symptom:** Container shows as "unhealthy"

**Solutions:**
1. Check if service is actually responding:
   ```bash
   curl http://localhost:5000/health
   ```
2. Increase health check timeout in `docker-compose.yml`
3. Check logs for startup errors

#### Port already in use

**Symptom:** `Bind for 0.0.0.0:5000 failed: port is already allocated`

**Solutions:**
1. Stop conflicting service: `lsof -ti:5000 | xargs kill -9`
2. Change port in `.env`: `BACKEND_PORT=5001`
3. Use different ports in `docker-compose.dev.yml`

#### Admin dashboard can't reach backend

**Symptom:** API calls fail with CORS or network errors

**Solutions:**
1. Verify backend is running: `curl http://localhost:5000/health`
2. Check `CORS_ORIGIN` includes frontend URL
3. In production, verify nginx proxy configuration
4. Check browser console for specific errors

#### Migration fails

**Symptom:** Migration error when running `npm run migrate`

**Solutions:**
1. Check PostgreSQL extensions are installed:
   ```sql
   SELECT * FROM pg_extension;
   ```
2. Verify database user has CREATE permissions
3. Run migrations one by one to identify problematic migration
4. Check migration files for syntax errors

### EasyPanel Specific Issues

#### Build fails

**Solutions:**
1. Check Dockerfile path is correct
2. Verify all files referenced in Dockerfile exist
3. Check build logs in EasyPanel console
4. Test build locally: `docker build -f backend/Dockerfile backend/`

#### Deployment succeeds but health check fails

**Solutions:**
1. Verify health check path is `/health`
2. Check health check timeout (increase if needed)
3. Review application logs in EasyPanel
4. Test health endpoint manually via EasyPanel console:
   ```bash
   curl http://localhost:5000/health
   ```

#### Database connection issues

**Solutions:**
1. Verify DATABASE_URL format is correct
2. Check database service is running in EasyPanel
3. Ensure database and app are in same project/network
4. Verify database credentials are correct

### Getting Help

If you encounter issues not covered here:

1. **Check logs**: Use helper scripts or `docker logs`
2. **Review documentation**: See `.env.example` and inline comments
3. **Test locally**: Try docker-compose.dev.yml first
4. **Verify configuration**: Double-check all environment variables
5. **Search issues**: Check GitHub issues for similar problems

---

## Docker Commands Reference

### Development Helper Scripts

**Linux/macOS: `./docker-dev.sh [command]`**
**Windows: `docker-dev.bat [command]`**

| Command | Description |
|---------|-------------|
| `start` | Start all services (default) |
| `start-detached` | Start in background |
| `stop` | Stop all services |
| `restart` | Restart all services |
| `logs [service]` | View logs (optional: specific service) |
| `migrate` | Run database migrations |
| `db` | Access PostgreSQL shell |
| `status` | Show service status |
| `clean` | Remove all volumes and data |
| `rebuild` | Rebuild images without cache |

### Production Helper Scripts

**Linux/macOS: `./docker-prod.sh [command]`**
**Windows: `docker-prod.bat [command]`**

| Command | Description |
|---------|-------------|
| `start` | Start all services |
| `stop` | Stop all services |
| `restart` | Restart all services |
| `logs [service]` | View logs |
| `migrate` | Run migrations |
| `status` | Show service status and health |
| `build` | Build production images |
| `backup` | Backup database |

### Manual Docker Compose Commands

```bash
# Development
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml logs -f
docker-compose -f docker-compose.dev.yml ps

# Production
docker-compose up -d
docker-compose down
docker-compose logs -f [service]
docker-compose ps

# Rebuild specific service
docker-compose build backend
docker-compose up -d backend

# Execute command in running container
docker-compose exec backend npm run migrate
docker-compose exec db psql -U hustlehub

# View resource usage
docker stats

# Clean up everything
docker-compose down -v
docker system prune -a
```

---

## Security Best Practices

### For Production

1. **Use strong secrets:**
   ```bash
   # Generate JWT secret
   openssl rand -hex 32
   ```

2. **Rotate credentials regularly:**
   - JWT secrets
   - Database passwords
   - API keys

3. **Enable HTTPS:**
   - Use EasyPanel's SSL/TLS certificates
   - Force HTTPS redirects
   - Set secure CORS origins

4. **Limit rate limiting:**
   - Adjust `RATE_LIMIT_MAX_REQUESTS` based on actual traffic
   - Monitor for abuse

5. **Keep images updated:**
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

6. **Monitor logs:**
   - Set up log aggregation
   - Watch for suspicious activity
   - Track error rates

7. **Database security:**
   - Use managed PostgreSQL in production
   - Enable SSL connections
   - Regular backups

---

## Performance Optimization

### Database

1. **Connection pooling:**
   ```env
   DATABASE_POOL_MIN=2
   DATABASE_POOL_MAX=20
   ```

2. **Indexes:** Already configured in migrations

3. **Query optimization:** Monitor slow queries

### Backend

1. **Resource limits** (docker-compose.yml):
   ```yaml
   services:
     backend:
       deploy:
         resources:
           limits:
             memory: 512M
           reservations:
             memory: 256M
   ```

2. **Horizontal scaling** (EasyPanel supports this)

### Frontend

1. **Nginx caching:** Already configured in `admin/nginx.conf`
2. **Gzip compression:** Enabled
3. **Static asset caching:** 1 year expiry

---

## Monitoring

### Health Checks

All services include health checks:

- **Backend**: `GET /health`
- **Admin**: `GET /health`
- **Database**: `pg_isready`

### Metrics

Monitor these metrics:

- Container status: `docker ps`
- Resource usage: `docker stats`
- Logs: `docker logs`
- API response times
- Database connection pool usage
- Error rates

### Recommended Tools

- **EasyPanel**: Built-in monitoring
- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **Sentry**: Error tracking
- **LogDNA/Papertrail**: Log aggregation

---

## Updating Services

### Rolling Updates

**Development:**
```bash
git pull
./docker-dev.sh rebuild
./docker-dev.sh restart
```

**Production:**
```bash
git pull
./docker-prod.sh build
./docker-prod.sh start
```

**EasyPanel:**
Automatically deploys on git push.

### Zero-Downtime Deployment

EasyPanel handles this automatically with health checks.

For manual deployments:
```bash
# Build new images
docker-compose build

# Start new containers
docker-compose up -d --no-deps --build backend

# Health check automatically routes traffic
```

---

## Additional Resources

- **Docker Documentation**: https://docs.docker.com
- **Docker Compose**: https://docs.docker.com/compose
- **EasyPanel Docs**: https://easypanel.io/docs
- **PostgreSQL**: https://www.postgresql.org/docs
- **Nginx**: https://nginx.org/en/docs

---

**Last Updated**: December 28, 2025
**Version**: 1.0.0
