# RankForge: Shopify + Standalone Hybrid App Migration Plan

## Overview
Transform the app into "RankForge" - a dual-mode application that works both as:
1. **Standalone Mode**: Independent login, WordPress content management (existing flow)
2. **Shopify Mode**: Embedded Shopify app, Built for Shopify compliant, Shopify-only features

---

## ✅ COMPLETED

### Foundation
- ✅ Mode detection system (`server/mode-detector.ts`)
- ✅ Shopify OAuth implementation (`server/shopify-auth.ts`)
- ✅ SendGrid email service (`server/services/sendgrid-email.ts`)
- ✅ Database schema for Shopify shops
- ✅ Started renaming to "RankForge"

---

## 🚧 TODO - CRITICAL PATH

### Phase 1: Authentication System (PRIORITY)

**1.1 Hybrid Auth Routes**
```typescript
// server/routes.ts - Add these routes

// Shopify OAuth flow
app.get("/api/auth/shopify", async (req, res) => {
  const { shop } = req.query;
  const state = crypto.randomBytes(16).toString('hex');
  // Store state in session
  const installUrl = getInstallUrl(shop, state);
  res.redirect(installUrl);
});

app.get("/api/auth/shopify/callback", async (req, res) => {
  // 1. Verify HMAC
  // 2. Exchange code for access token
  // 3. Get shop info
  // 4. Store in database
  // 5. Redirect to app with embedded param
});

// Keep existing standalone auth routes
// /api/login (Google SSO for standalone)
// /api/logout
// /api/auth/user
```

**1.2 Middleware Updates**
```typescript
// Update requireAuth middleware to support both modes
export function requireAuth(req, res, next) {
  if (isShopifyMode(req)) {
    return requireShopifyAuth(req, res, next);
  } else {
    return requireStandaloneAuth(req, res, next);
  }
}
```

---

### Phase 2: Frontend - App Bridge & Conditional UI

**2.1 Install Dependencies**
```bash
npm install @shopify/app-bridge @shopify/app-bridge-react
```

**2.2 Create Shopify Provider**
```tsx
// client/src/providers/ShopifyProvider.tsx
import { Provider } from '@shopify/app-bridge-react';

export function ShopifyProvider({ children }) {
  const config = {
    apiKey: import.meta.env.VITE_SHOPIFY_API_KEY,
    host: new URLSearchParams(location.search).get("host"),
    forceRedirect: true
  };
  
  return <Provider config={config}>{children}</Provider>;
}
```

**2.3 Conditional App Wrapper**
```tsx
// client/src/App.tsx
export default function App() {
  const isShopify = new URLSearchParams(location.search).has("shop");
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {isShopify ? (
          <ShopifyProvider>
            <ShopifyApp />
          </ShopifyProvider>
        ) : (
          <StandaloneApp />
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
```

**2.4 Shopify-Specific UI**
```tsx
// client/src/ShopifyApp.tsx
// - Use App Bridge components
// - Hide WordPress site management
// - Only show Shopify blog post creation
// - Use TitleBar, Navigation from App Bridge
```

---

### Phase 3: Email Service Migration

**3.1 Environment Variables Needed**
```bash
# .env
SENDGRID_API_KEY=SG.xxxx
FROM_EMAIL=noreply@rankforge.app
```

**3.2 Replace Email Services**
- Update `server/services/smtp.ts` to use SendGrid by default
- Keep Gmail OAuth as fallback for standalone WordPress users
- Shopify mode MUST use SendGrid only

---

### Phase 4: Shopify Webhooks

**4.1 Required Webhooks**
```typescript
// server/webhooks.ts

// App uninstalled
app.post("/api/webhooks/app/uninstalled", async (req, res) => {
  // Verify webhook HMAC
  // Mark shop as uninstalled
  // Clean up data (GDPR)
});

// Shop update
app.post("/api/webhooks/shop/update", async (req, res) => {
  // Update shop information
});

// GDPR webhooks
app.post("/api/webhooks/customers/data_request", async (req, res) => {
  // Return customer data
});

app.post("/api/webhooks/customers/redact", async (req, res) => {
  // Delete customer data
});

app.post("/api/webhooks/shop/redact", async (req, res) => {
  // Delete shop data
});
```

---

### Phase 5: Built for Shopify Compliance

**5.1 Performance Requirements**
- LCP < 2.5s
- CLS < 0.1
- INP < 200ms
- Implement Web Vitals tracking

**5.2 Embedded App Requirements**
- All primary workflows in Shopify admin
- No external redirects for core features
- Seamless sign-up (no extra login)
- Settings accessible within Shopify

**5.3 Navigation**
- Use App Bridge Navigation
- Add to Shopify nav menu

---

## 📁 File Structure

```
server/
├── shopify-auth.ts          ✅ DONE
├── mode-detector.ts          ✅ DONE
├── webhooks.ts              ❌ TODO
├── services/
│   ├── sendgrid-email.ts    ✅ DONE
│   └── shopify-api.ts       ❌ TODO
client/src/
├── ShopifyApp.tsx           ❌ TODO
├── StandaloneApp.tsx        ❌ TODO
├── providers/
│   └── ShopifyProvider.tsx  ❌ TODO
```

---

## 🔑 Environment Variables Required

```bash
# Shopify (get from Partner Dashboard)
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_secret
SHOPIFY_SCOPES=read_products,write_products,read_content,write_content
SHOPIFY_REDIRECT_URI=https://your-domain.com/api/auth/shopify/callback

# SendGrid
SENDGRID_API_KEY=SG.xxxx
FROM_EMAIL=noreply@rankforge.app

# App
APP_URL=https://your-domain.com
NODE_ENV=production

# Keep existing for standalone mode
OPENAI_API_KEY=sk-xxx
DATABASE_URL=postgres://...
SESSION_SECRET=xxx
```

---

## 🧪 Testing Strategy

### Standalone Mode Testing
1. Access app directly (no Shopify params)
2. Login with Google SSO
3. Connect WordPress site
4. Generate and publish content to WordPress
5. Verify all existing features work

### Shopify Mode Testing
1. Install app from Shopify admin
2. Verify OAuth flow
3. Check embedded app loads correctly
4. Generate content for Shopify blog
5. Verify WordPress options are hidden
6. Test App Bridge navigation

---

## ⚠️ Critical Notes

1. **Database Migration**: New `shops` table created, need to run migrations
2. **Breaking Changes**: Auth system completely changed for Shopify mode
3. **Dual Maintenance**: Must test both modes on every change
4. **SEO Impact**: Renaming from "SEO Content SaaS" to "RankForge"

---

## 📋 Next Immediate Steps

1. Ask user for Shopify Partner Dashboard credentials
2. Get SendGrid API key
3. Implement auth routes (Phase 1.1)
4. Create Shopify UI wrapper (Phase 2)
5. Test both modes
6. Deploy and submit for Shopify review

---

## 🎯 Success Criteria

- ✅ Works independently (standalone login)
- ✅ Works as Shopify embedded app
- ✅ WordPress flow unchanged in standalone mode
- ✅ No WordPress options visible in Shopify mode
- ✅ Passes Built for Shopify requirements
- ✅ All existing features work in standalone mode
- ✅ SendGrid emails working
- ✅ Webhooks handling app lifecycle

---

**Estimated Work**: 2-3 full development days for complete implementation
**Risk Level**: HIGH (major architectural change)
**Recommendation**: Implement in phases, test thoroughly at each step
