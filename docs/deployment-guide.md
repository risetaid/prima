# Deployment Guide

## Overview

PRIMA can be deployed to various platforms. This guide covers common deployment strategies.

## Deployment Options

### 1. Vercel (Recommended)

Next.js native deployment with automatic optimizations.

**Setup:**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**Environment Variables:** Configure in Vercel dashboard:

- `DATABASE_URL`
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `ANTHROPIC_API_KEY`
- `REDIS_URL`
- `MINIO_*` variables
- `GOWA_*` variables

### 2. Railway

Easy deployment with integrated database and Redis.

**Setup:**

1. Connect GitHub repository
2. Add PostgreSQL, Redis services
3. Configure environment variables
4. Deploy

### 3. Docker (Self-Hosted)

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# Rebuild the source code
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t prima .
docker run -p 3000:3000 prima
```

### 4. Traditional Server (Node.js)

```bash
# Build the application
npm run build

# Start production server
npm start

# Or with PM2
pm2 start npm --name prima -- start
```

## Environment Configuration

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/prima

# Authentication
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...

# WhatsApp
GOWA_ENDPOINT=https://your-gowa-instance.com
GOWA_BASIC_AUTH_USER=admin
GOWA_BASIC_AUTH_PASSWORD=securepassword
GOWA_WEBHOOK_SECRET=webhook-secret

# AI
ANTHROPIC_API_KEY=sk-ant-api03-...

# Redis
REDIS_URL=redis://host:6379

# Storage
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_PUBLIC_ENDPOINT=https://storage.example.com

# Security
INTERNAL_API_KEY=secure-internal-key
```

### Optional Feature Flags

```bash
# Performance
FEATURE_FLAG_PERF_WHATSAPP_RETRY=true

# Security
FEATURE_FLAG_SECURITY_ATOMIC_IDEMPOTENCY=true
```

## Infrastructure Requirements

### Minimum Requirements

| Resource | Specification |
| -------- | ------------- |
| CPU      | 1 vCPU        |
| Memory   | 1 GB RAM      |
| Storage  | 10 GB SSD     |

### Recommended Requirements

| Resource | Specification |
| -------- | ------------- |
| CPU      | 2 vCPU        |
| Memory   | 2 GB RAM      |
| Storage  | 20 GB SSD     |

### External Services

| Service    | Requirement            |
| ---------- | ---------------------- |
| PostgreSQL | Managed or self-hosted |
| Redis      | Managed or self-hosted |
| MinIO/S3   | Object storage         |
| GOWA       | WhatsApp instance      |

## Database Setup

### Fresh Deployment

```bash
# Generate migrations
pnpm run db:generate

# Push schema
pnpm run db:push

# Run migrations
pnpm run db:migrate

# Setup initial user
pnpm run setup-first-user
```

### Migration Process

1. Make schema changes in `src/db/*`
2. Generate migration: `pnpm run db:generate`
3. Review SQL in `drizzle/migrations/`
4. Apply: `pnpm run db:push` (dev) or `pnpm run db:migrate` (prod)

## WhatsApp (GOWA) Setup

GOWA is a separate service that must be running:

```bash
# Run GOWA instance (see GOWA documentation)
docker run -p 3001:3000 \
  -e SESSION_NAME=prima \
  ghcr.io/奏/dev/go-whatsapp-web-multidevice
```

Configure webhooks in GOWA to point to:

```
https://your-domain.com/api/webhooks/gowa
```

## SSL/TLS

For production, ensure SSL is configured:

1. **Vercel/Railway**: Automatic SSL
2. **Custom Server**: Use nginx or a reverse proxy
3. **GOWA**: Requires valid SSL for WhatsApp

## Monitoring

### Health Checks

- `/api/health` - Basic health check
- `/api/health/ready` - Readiness check

### Logging

Logs are output to stdout. Configure log aggregation for production.

### Performance Monitoring

- Web Vitals tracked via `src/components/performance/web-vitals.tsx`
- Bundle analysis: `pnpm run build:analyze`

## Scaling Considerations

1. **Stateless Design**: Services are stateless, enabling horizontal scaling
2. **Redis**: Shared across instances for caching/rate limiting
3. **Database**: Use connection pooling for high traffic
4. **CDN**: Vercel provides automatic CDN

## Security Checklist

- [ ] Enable HTTPS in production
- [ ] Use strong `INTERNAL_API_KEY`
- [ ] Configure `GOWA_WEBHOOK_SECRET` for signature verification
- [ ] Set up proper CORS if needed
- [ ] Enable rate limiting on sensitive endpoints
- [ ] Use environment variables for all secrets
- [ ] Regular database backups

## Backup Strategy

### Database Backups

```bash
# PostgreSQL backup
pg_dump -U user DATABASE_URL > backup.sql

# Restore
psql -U user -d prima < backup.sql
```

### Redis Backups

Configure Redis persistence in `redis.conf`:

```
save 900 1
save 300 10
save 60 10000
```

## Troubleshooting

### Common Issues

1. **Connection Refused**

   - Check `DATABASE_URL` and `REDIS_URL`
   - Verify network access to services

2. **Authentication Errors**

   - Verify Clerk keys
   - Check middleware configuration

3. **WhatsApp Not Working**

   - Verify GOWA endpoint and credentials
   - Check webhook URL is accessible
   - Review webhook logs

4. **Build Failures**
   - Run `pnpx tsc --noEmit` locally
   - Check for missing dependencies
   - Review TypeScript errors
