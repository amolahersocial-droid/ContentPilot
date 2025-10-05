import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { sessions, shops } from "@shared/schema";
import { eq } from "drizzle-orm";

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY!;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET!;
const SHOPIFY_SCOPES = "read_products,write_products,read_content,write_content,read_customers,write_customers";
const SHOPIFY_REDIRECT_URI = process.env.SHOPIFY_REDIRECT_URI || "http://localhost:5000/api/auth/callback";
const APP_URL = process.env.APP_URL || "http://localhost:5000";

export interface ShopifyShop {
  id: string;
  shop: string;
  shopName: string | null;
  shopOwner: string | null;
  email: string | null;
  accessToken: string;
  scope: string | null;
  subscriptionPlan: string;
  openaiApiKey: string | null;
  useOwnOpenAiKey: boolean;
  dailyPostsUsed: number;
  lastPostResetDate: Date | null;
  installedAt: Date | null;
  isActive: boolean;
}

// Verify HMAC signature from Shopify
export function verifyHmac(query: any): boolean {
  const { hmac, ...params } = query;
  
  if (!hmac) return false;

  const message = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');

  const generatedHash = crypto
    .createHmac('sha256', SHOPIFY_API_SECRET)
    .update(message)
    .digest('hex');

  // Safely compare - handle mismatched lengths
  try {
    const generatedBuffer = Buffer.from(generatedHash);
    const hmacBuffer = Buffer.from(hmac as string);
    
    // timingSafeEqual requires same length buffers
    if (generatedBuffer.length !== hmacBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(generatedBuffer, hmacBuffer);
  } catch (error) {
    // Handle any buffer creation or comparison errors
    return false;
  }
}

// Generate installation URL
export function getInstallUrl(shop: string, state: string): string {
  const params = new URLSearchParams({
    client_id: SHOPIFY_API_KEY,
    scope: SHOPIFY_SCOPES,
    redirect_uri: SHOPIFY_REDIRECT_URI,
    state,
    'grant_options[]': 'per-user'
  });

  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

// Exchange authorization code for access token
export async function exchangeAccessToken(shop: string, code: string): Promise<{
  access_token: string;
  scope: string;
}> {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange access token');
  }

  return await response.json();
}

// Get shop information
export async function getShopInfo(shop: string, accessToken: string): Promise<{
  name: string;
  email: string;
  shop_owner: string;
}> {
  const response = await fetch(`https://${shop}/admin/api/2025-01/shop.json`, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch shop info');
  }

  const data = await response.json();
  return data.shop;
}

// Middleware to verify Shopify session
export async function requireShopifyAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const shop = req.query.shop || req.headers['x-shopify-shop'];
    
    if (!shop) {
      return res.status(401).json({ message: "Shop parameter required" });
    }

    const [shopRecord] = await db
      .select()
      .from(shops)
      .where(eq(shops.shop, shop as string))
      .limit(1);

    if (!shopRecord || !shopRecord.isActive) {
      return res.status(401).json({ message: "Shop not found or inactive" });
    }

    req.shopify = {
      shop: shopRecord.shop,
      accessToken: shopRecord.accessToken,
      shopId: shopRecord.id,
    };

    next();
  } catch (error: any) {
    return res.status(401).json({ message: "Authentication failed" });
  }
}

// Make GraphQL request to Shopify
export async function shopifyGraphQL(
  shop: string,
  accessToken: string,
  query: string,
  variables?: any
): Promise<any> {
  const response = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Shopify GraphQL request failed: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
}

declare global {
  namespace Express {
    interface Request {
      shopify?: {
        shop: string;
        accessToken: string;
        shopId: string;
      };
    }
  }
}
