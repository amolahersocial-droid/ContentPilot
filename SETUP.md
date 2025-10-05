# RankForge - Detailed Setup Guide

This guide provides step-by-step instructions for setting up RankForge from scratch.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Database Setup](#database-setup)
3. [Environment Configuration](#environment-configuration)
4. [API Keys Setup](#api-keys-setup)
5. [First Run](#first-run)
6. [Troubleshooting](#troubleshooting)

## System Requirements

### Required Software

- **Node.js**: Version 18 or higher
  - Check version: `node --version`
  - Download: https://nodejs.org

- **npm**: Comes with Node.js
  - Check version: `npm --version`

- **PostgreSQL**: Version 14 or higher
  - Local installation OR cloud database (Neon, Supabase, etc.)

### Recommended Tools

- **Git**: For version control
- **VS Code**: Code editor with TypeScript support
- **Postman**: API testing (optional)

## Database Setup

### Option 1: Cloud Database (Recommended for Beginners)

#### Using Neon (Recommended)

1. **Create Account**
   - Go to https://neon.tech
   - Sign up for free account

2. **Create Project**
   - Click "Create Project"
   - Choose region closest to you
   - Name: `rankforge`

3. **Get Connection String**
   - Copy the connection string
   - Format: `postgresql://user:password@host/dbname?sslmode=require`
   - Save for later use in `.env` file

#### Using Supabase

1. **Create Account**
   - Go to https://supabase.com
   - Sign up for free account

2. **Create Project**
   - Click "New Project"
   - Set project name: `rankforge`
   - Set strong database password

3. **Get Connection String**
   - Go to Settings → Database
   - Copy "Connection string" under "Connection pooling"
   - Replace `[YOUR-PASSWORD]` with your actual password

### Option 2: Local PostgreSQL

#### Installation

**macOS** (using Homebrew):
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows**:
- Download from https://www.postgresql.org/download/windows/
- Run installer and follow instructions

#### Create Database

1. **Access PostgreSQL**:
   ```bash
   # macOS/Linux
   psql postgres
   
   # Windows
   psql -U postgres
   ```

2. **Create Database**:
   ```sql
   CREATE DATABASE rankforge;
   CREATE USER rankforge_user WITH ENCRYPTED PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE rankforge TO rankforge_user;
   ```

3. **Connection String**:
   ```
   DATABASE_URL=postgresql://rankforge_user:your_secure_password@localhost:5432/rankforge
   ```

### Verify Database Connection

```bash
# Test connection
psql "postgresql://rankforge_user:your_secure_password@localhost:5432/rankforge"

# You should see:
# rankforge=>
```

## Environment Configuration

### 1. Create Environment File

Create a `.env` file in the project root:

```bash
touch .env
```

### 2. Add Environment Variables

Copy this template and fill in your values:

```bash
# ==================================
# DATABASE
# ==================================
DATABASE_URL=postgresql://user:password@host:port/database

# ==================================
# SESSION & SECURITY
# ==================================
# Generate a random secret: openssl rand -base64 32
SESSION_SECRET=your-super-secret-session-key-minimum-32-characters

# ==================================
# AI SERVICES
# ==================================
# Required: OpenAI API Key
OPENAI_API_KEY=sk-proj-...

# ==================================
# PAYMENT GATEWAY (Standalone Mode)
# ==================================
# Required for subscription payments
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...

# Optional: Default subscription plan ID
RAZORPAY_PLAN_ID=plan_...

# ==================================
# SHOPIFY INTEGRATION (Embedded Mode)
# ==================================
# Required only if using as Shopify app
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
SHOPIFY_REDIRECT_URI=http://localhost:5000/api/auth/callback

# ==================================
# EMAIL SERVICES (Optional)
# ==================================
# For transactional emails
SENDGRID_API_KEY=SG...
FROM_EMAIL=noreply@rankforge.app

# ==================================
# APPLICATION SETTINGS
# ==================================
APP_URL=http://localhost:5000
NODE_ENV=development
```

## API Keys Setup

### 1. OpenAI API Key (Required)

**Purpose**: Content generation with GPT-4o and image generation with DALL·E 3

**Steps**:
1. Go to https://platform.openai.com
2. Sign up or log in
3. Navigate to API Keys section: https://platform.openai.com/api-keys
4. Click "Create new secret key"
5. Name it: `RankForge`
6. Copy the key (starts with `sk-proj-...`)
7. Add to `.env`: `OPENAI_API_KEY=sk-proj-...`

**Important**: 
- Keep this key secret
- Add billing method at https://platform.openai.com/account/billing
- Monitor usage at https://platform.openai.com/usage

### 2. Razorpay Keys (For Standalone Mode)

**Purpose**: Subscription payments in standalone mode

**Steps**:
1. Go to https://razorpay.com
2. Sign up for account
3. Go to Dashboard: https://dashboard.razorpay.com
4. Navigate to Settings → API Keys
5. Generate Test Keys first
6. Copy:
   - Key ID (starts with `rzp_test_...`)
   - Key Secret
7. Add to `.env`:
   ```
   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=...
   ```

**For Production**:
- Complete KYC verification
- Generate Live Keys
- Replace test keys with live keys

### 3. Shopify App Keys (For Embedded Mode)

**Purpose**: Run as Shopify embedded app

**Steps**:
1. Go to https://partners.shopify.com
2. Create Partner account
3. Apps → Create App → Create app manually
4. Fill in:
   - App name: `RankForge`
   - App URL: `http://localhost:5000` (development)
   - Allowed redirection URL: `http://localhost:5000/api/auth/callback`
5. Copy:
   - API Key
   - API Secret
6. Add to `.env`:
   ```
   SHOPIFY_API_KEY=...
   SHOPIFY_API_SECRET=...
   ```

### 4. SendGrid API Key (Optional)

**Purpose**: Send transactional emails

**Steps**:
1. Go to https://sendgrid.com
2. Sign up for free account (100 emails/day free)
3. Settings → API Keys
4. Create API Key with Full Access
5. Add to `.env`:
   ```
   SENDGRID_API_KEY=SG...
   FROM_EMAIL=noreply@yourdomain.com
   ```

## First Run

### 1. Install Dependencies

```bash
npm install
```

### 2. Initialize Database Schema

This creates all required tables:

```bash
npm run db:push
```

**Expected Output**:
```
✓ Pushed schema to database
```

**If you see errors**, check:
- Database connection string is correct
- Database is running and accessible
- User has necessary permissions

### 3. Start Development Server

```bash
npm run dev
```

**Expected Output**:
```
🚀 Starting RankForge...
🔄 Starting background job worker...
✅ Background job worker started
🎉 RankForge is ready!
[express] serving on port 5000
```

### 4. Access Application

Open browser and navigate to:
```
http://localhost:5000
```

You should see the login page.

### 5. Create First User Account

1. Click "Create Account"
2. Fill in:
   - Username: `admin`
   - Email: `admin@example.com`
   - Password: (minimum 6 characters)
3. Click "Create Account"
4. You'll be redirected to dashboard

## Production Deployment

### 1. Build Application

```bash
npm run build
```

### 2. Update Environment Variables

```bash
# Change to production
NODE_ENV=production

# Use production database
DATABASE_URL=postgresql://prod_user:password@prod-host:5432/rankforge

# Use production API keys
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...

# Set production URL
APP_URL=https://yourdomain.com
```

### 3. Start Production Server

```bash
npm start
```

### 4. Set Up Process Manager

Use PM2 to keep server running:

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start npm --name "rankforge" -- start

# Save PM2 configuration
pm2 save

# Setup auto-restart on boot
pm2 startup
```

## Troubleshooting

### Database Connection Issues

**Problem**: `Error connecting to database`

**Solutions**:
1. Verify `DATABASE_URL` format:
   ```
   postgresql://username:password@host:port/database
   ```
2. Check database is running:
   ```bash
   psql $DATABASE_URL
   ```
3. Verify network access (if cloud database)
4. Check firewall settings

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::5000`

**Solutions**:
1. Find process using port:
   ```bash
   # macOS/Linux
   lsof -i :5000
   
   # Windows
   netstat -ano | findstr :5000
   ```
2. Kill process or use different port:
   ```bash
   # In .env or when starting
   PORT=3000 npm run dev
   ```

### Schema Push Fails

**Problem**: `Error pushing schema to database`

**Solutions**:
1. Ensure database is empty or use:
   ```bash
   npm run db:push --force
   ```
2. Check database user has CREATE TABLE permissions
3. Manually drop all tables and retry

### OpenAI API Errors

**Problem**: `Error: Invalid API key`

**Solutions**:
1. Verify API key is correct
2. Check OpenAI account has billing enabled
3. Ensure key has not been revoked
4. Test key at https://platform.openai.com/playground

### Session/Authentication Issues

**Problem**: Login not working or session expires immediately

**Solutions**:
1. Verify `SESSION_SECRET` is set in `.env`
2. Clear browser cookies
3. Check server logs for errors
4. Ensure `express-session` is properly configured

### Build Errors

**Problem**: TypeScript compilation errors

**Solutions**:
1. Clear cache:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
2. Check TypeScript version:
   ```bash
   npm list typescript
   ```
3. Run type checking:
   ```bash
   npm run check
   ```

## Database Management

### View Tables

```bash
psql $DATABASE_URL

# List tables
\dt

# View table structure
\d users
\d posts
\d sites
```

### Backup Database

```bash
# Create backup
pg_dump $DATABASE_URL > backup.sql

# Restore backup
psql $DATABASE_URL < backup.sql
```

### Reset Database

```bash
# Drop all tables and recreate
psql $DATABASE_URL << EOF
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;
EOF

# Push schema again
npm run db:push
```

## Security Checklist

Before deploying to production:

- [ ] Change `SESSION_SECRET` to strong random value
- [ ] Use production API keys (not test keys)
- [ ] Enable HTTPS/SSL
- [ ] Set `NODE_ENV=production`
- [ ] Use strong database password
- [ ] Enable database SSL connection
- [ ] Set up firewall rules
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging
- [ ] Regular database backups
- [ ] Keep dependencies updated

## Next Steps

1. **Configure WordPress/Shopify sites** in dashboard
2. **Set up keywords** for content generation
3. **Test content generation** with free tier
4. **Configure payment plans** (if using subscriptions)
5. **Set up email outreach** (if using backlink features)

---

For additional help, refer to [README.md](README.md) or open an issue on GitHub.
