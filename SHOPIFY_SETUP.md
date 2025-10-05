# Shopify Embedded App Setup Guide

This guide explains how to set up RankForge as a Shopify embedded app.

## Overview

RankForge can operate in **Shopify Embedded Mode**, where it runs inside the Shopify admin as a seamlessly integrated app. This mode uses:
- **Shopify OAuth** for authentication
- **App Bridge 4.x** for navigation and UI integration
- **Shopify Billing API** for subscription management
- **GDPR webhooks** for compliance

## Prerequisites

1. **Shopify Partner Account**
   - Sign up at https://partners.shopify.com

2. **Development Store** (for testing)
   - Create a development store from your Partner Dashboard

3. **RankForge Application** running locally or deployed

## Step-by-Step Setup

### 1. Create Shopify App

1. **Log in to Partners Dashboard**
   - Go to https://partners.shopify.com
   - Click "Apps" in the left sidebar

2. **Create New App**
   - Click "Create app"
   - Select "Create app manually"
   - App name: `RankForge`
   - Click "Create"

3. **Configure App URLs**
   
   In the "App setup" section:
   
   **For Local Development:**
   - App URL: `http://localhost:5000`
   - Allowed redirection URLs: 
     ```
     http://localhost:5000/api/auth/callback
     http://localhost:5000/auth/callback
     ```
   
   **For Production:**
   - App URL: `https://your-domain.com`
   - Allowed redirection URLs:
     ```
     https://your-domain.com/api/auth/callback
     https://your-domain.com/auth/callback
     ```

### 2. Configure API Access

1. **Set API Scopes**
   
   In "API access" section, request these scopes:
   ```
   read_products
   write_products
   read_content
   write_content
   read_customers
   write_customers
   ```

2. **Copy API Credentials**
   - Client ID (API Key)
   - Client Secret (API Secret)

### 3. Set Up Environment Variables

Add to your `.env` file:

```bash
# Shopify App Configuration
SHOPIFY_API_KEY=your_client_id_here
SHOPIFY_API_SECRET=your_client_secret_here
SHOPIFY_REDIRECT_URI=http://localhost:5000/api/auth/callback

# For production
# SHOPIFY_REDIRECT_URI=https://your-domain.com/api/auth/callback
```

### 4. Configure GDPR Webhooks

Shopify requires GDPR compliance webhooks. These are already implemented in RankForge.

In your Shopify Partner Dashboard, under "Webhooks":

1. **Customer Data Request**
   - Endpoint: `https://your-domain.com/api/webhooks/customers/data_request`

2. **Customer Data Erasure**
   - Endpoint: `https://your-domain.com/api/webhooks/customers/redact`

3. **Shop Data Erasure**
   - Endpoint: `https://your-domain.com/api/webhooks/shop/redact`

> **Note**: For local development, use a tunneling service like ngrok to expose your local server for webhook testing.

### 5. Set Up App Extensions (Optional)

For a more integrated experience, you can set up App Extensions:

1. **Theme App Extension**
   - Allows your app to inject content into Shopify themes
   - Set up in Partner Dashboard under "Extensions"

2. **Admin Link**
   - Creates a link in Shopify admin navigation
   - Auto-configured when app is installed

### 6. Test Installation

1. **Install on Development Store**
   
   In Partner Dashboard:
   - Go to your app
   - Click "Select store"
   - Choose your development store
   - Click "Install app"

2. **Verify Installation**
   
   You should see:
   - OAuth authorization screen
   - Redirect to RankForge dashboard
   - App embedded in Shopify admin

### 7. Local Development with Shopify

#### Using Shopify CLI (Recommended)

1. **Install Shopify CLI**
   ```bash
   npm install -g @shopify/cli @shopify/app
   ```

2. **Start Development Server**
   ```bash
   # In your RankForge directory
   npm run dev
   ```

3. **Access Embedded App**
   - Go to your development store admin
   - Apps → RankForge
   - The app loads in an iframe

#### Using ngrok for Webhooks

1. **Install ngrok**
   ```bash
   npm install -g ngrok
   ```

2. **Start ngrok tunnel**
   ```bash
   ngrok http 5000
   ```

3. **Update Shopify App URLs**
   - Use ngrok URL (e.g., `https://abc123.ngrok.io`)
   - Update App URL and redirect URLs in Partner Dashboard
   - Update `SHOPIFY_REDIRECT_URI` in `.env`

## How Shopify Mode Works

### Authentication Flow

1. **User visits app in Shopify admin**
   - Shopify passes `shop`, `host`, and `embedded=1` parameters

2. **App detects Shopify mode**
   - `ModeContext` checks for shop parameter and iframe status
   - Sets mode to "shopify"

3. **OAuth if not authenticated**
   - If no valid session, redirect to `/api/auth/shopify?shop=...`
   - Shopify OAuth screen appears
   - User authorizes app
   - Redirected back to app with access token

4. **Session established**
   - Shop record created in database
   - User can access all features

### App Bridge Integration

App Bridge 4.x provides:
- **Navigation**: Use Shopify's navigation instead of page reloads
- **UI Components**: Modal, Toast, etc. that match Shopify admin
- **Authentication**: Seamless session management

The app automatically:
- Loads App Bridge CDN script
- Initializes with API key from meta tag
- Uses App Bridge for redirects and navigation

### Billing Integration

RankForge uses Shopify Billing API in embedded mode:

1. **User wants to upgrade**
   - App creates billing plan via Shopify API
   - User sees Shopify's billing confirmation
   - Shopify handles payment

2. **Subscription activation**
   - Webhook confirms activation
   - App updates user's plan in database
   - Features unlocked

## Troubleshooting

### Issue: "App cannot be loaded in an iframe"

**Problem**: CSP or X-Frame-Options blocking

**Solution**:
- Ensure app uses HTTPS in production
- Verify CSP headers allow Shopify domains
- Check that OAuth redirect uses App Bridge

### Issue: "Invalid signature" during OAuth

**Problem**: HMAC validation failing

**Solution**:
- Verify `SHOPIFY_API_SECRET` is correct
- Check that redirect URL matches exactly (including protocol)
- Ensure no URL manipulation between Shopify and your app

### Issue: App Bridge not initializing

**Problem**: Meta tag or CDN script not loading

**Solution**:
- Check browser console for errors
- Verify `shopify-api-key` meta tag exists
- Ensure CDN script loads: `https://cdn.shopify.com/shopifycloud/app-bridge.js`

### Issue: Webhooks not received

**Problem**: Endpoint unreachable or wrong URL

**Solution**:
- For local dev, use ngrok for public URL
- Verify webhook URLs in Partner Dashboard
- Check server logs for incoming requests
- Test webhook with Shopify's webhook tester

### Issue: "Error: CORS policy" 

**Problem**: Cross-origin request blocked

**Solution**:
- Embedded apps don't need CORS (same-origin in iframe)
- If testing standalone, add Shopify domains to CORS whitelist
- Check if mixing HTTP/HTTPS

## Production Deployment Checklist

Before launching your Shopify app:

- [ ] **SSL Certificate** - HTTPS is required for Shopify apps
- [ ] **Production API Keys** - Use live Shopify credentials
- [ ] **Webhook URLs** - Point to production domain
- [ ] **App Store Listing** - Complete all required information
- [ ] **Privacy Policy** - Required for app approval
- [ ] **Data Protection** - GDPR webhooks implemented
- [ ] **Billing Setup** - Configure pricing plans
- [ ] **Error Logging** - Monitor for issues
- [ ] **Performance** - Optimize for embedded iframe
- [ ] **Testing** - Full flow on development store
- [ ] **App Review** - Submit for Shopify approval

## App Review Requirements

To publish on Shopify App Store:

1. **Functionality**
   - App works as described
   - No critical bugs
   - Good user experience

2. **Security**
   - Proper OAuth implementation
   - Secure data handling
   - GDPR compliance

3. **Performance**
   - Fast loading times
   - Responsive design
   - Mobile-friendly (if applicable)

4. **Documentation**
   - Installation guide
   - User documentation
   - Privacy policy

5. **Pricing**
   - Clear pricing structure
   - Free trial (recommended)
   - Transparent billing

## Additional Resources

- **Shopify App Development Docs**: https://shopify.dev/apps
- **App Bridge Documentation**: https://shopify.dev/apps/tools/app-bridge
- **Partner Dashboard**: https://partners.shopify.com
- **Shopify API Reference**: https://shopify.dev/api
- **Built for Shopify Guidelines**: https://shopify.dev/apps/store/requirements

## Support

For Shopify-specific issues:
1. Check Shopify Partner Dashboard for app status
2. Review webhook logs in Partner Dashboard
3. Test on development store first
4. Contact Shopify Partner Support if needed

For RankForge-specific issues:
- See main [README.md](README.md)
- Check [SETUP.md](SETUP.md) for general setup
- Review server logs for errors

---

**Built for Shopify** ✓

This app complies with Shopify's "Built for Shopify" requirements including App Bridge 4.x, GDPR webhooks, and proper authentication flows.
