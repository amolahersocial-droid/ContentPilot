import { Request } from "express";

export type AppMode = "shopify" | "standalone";

export function detectAppMode(req: Request): AppMode {
  // Check if request is from Shopify embedded app
  const shop = req.query.shop || req.headers['x-shopify-shop'] || req.query.embedded;
  const hmac = req.query.hmac;
  const shopifyHost = req.query.host;
  
  // If we have Shopify-specific parameters, it's Shopify mode
  if (shop || hmac || shopifyHost) {
    return "shopify";
  }
  
  // Check if session indicates Shopify mode
  if (req.session && (req.session as any).shopifyShop) {
    return "shopify";
  }
  
  // Default to standalone mode
  return "standalone";
}

export function isShopifyMode(req: Request): boolean {
  return detectAppMode(req) === "shopify";
}

export function isStandaloneMode(req: Request): boolean {
  return detectAppMode(req) === "standalone";
}

// Middleware to attach mode to request
export function attachAppMode(req: Request, res: any, next: any) {
  req.appMode = detectAppMode(req);
  next();
}

declare global {
  namespace Express {
    interface Request {
      appMode?: AppMode;
    }
  }
}
