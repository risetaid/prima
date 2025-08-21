# 🚀 PRIMA Production Deployment Guide

## Pre-deployment Checklist

### 1. Build Verification
```bash
cd prima-system
bun install
bun run build
bun run lint
```

### 2. Database Setup
```bash
# Ensure production database is migrated
npx prisma migrate deploy
npx prisma generate
```

### 3. Vercel Dashboard Setup

**Environment Variables to Add:**

**Database:**
- `DATABASE_URL` = Your Neon PostgreSQL URL

**Clerk Authentication:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = pk_test_...
- `CLERK_SECRET_KEY` = sk_test_...  
- `CLERK_WEBHOOK_SECRET` = whsec_...

**Twilio WhatsApp:**
- `TWILIO_ACCOUNT_SID` = AC...
- `TWILIO_AUTH_TOKEN` = Your auth token
- `TWILIO_PHONE_NUMBER` = +14155238886

**Cron Security:**
- `CRON_SECRET` = Generate random string for security

**App URL:**
- `NEXTJS_URL` = https://your-app-name.vercel.app

### 4. Deploy Command
```bash
# Option 1: Via Vercel CLI
vercel --prod

# Option 2: Push to main branch (if GitHub connected)
git add .
git commit -m "Production deployment ready"
git push origin main
```

### 5. Post-deployment Testing

**Test these endpoints:**
- https://your-app.vercel.app/ (Landing page)
- https://your-app.vercel.app/dashboard (Dashboard)
- https://your-app.vercel.app/api/cron/send-reminders (Cron job)

**Test cron job manually:**
```bash
curl -X GET "https://your-app.vercel.app/api/cron/send-reminders" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 6. Demo Preparation

**Create test data:**
1. Add test patient via dashboard
2. Create reminder for near-future time (e.g., 5 minutes from now)  
3. Show cron job running automatically
4. Demonstrate WhatsApp message received

**Demo Flow:**
1. Login with Gmail → Dashboard
2. Add new patient → Show patient list
3. Create medication reminder → Show scheduled
4. Wait for cron / trigger manually → Show WhatsApp received
5. Show reminder logs and statistics

## Troubleshooting

**Common Issues:**

1. **Build fails:** Check TypeScript errors with `bun run lint`
2. **Database connection:** Verify DATABASE_URL in Vercel settings
3. **Cron not running:** Check Vercel Functions logs
4. **WhatsApp not sending:** Verify Twilio credentials

**Monitoring:**
- Vercel Functions dashboard for cron job logs
- Sentry for error monitoring
- Database logs in Neon dashboard