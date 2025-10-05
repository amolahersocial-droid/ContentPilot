import { ReactNode, useEffect, useState } from "react";
import { useMode } from "./ModeContext";

declare global {
  interface Window {
    shopify?: any;
    AppBridge?: any;
  }
}

export function ShopifyProvider({ children }: { children: ReactNode }) {
  const { isShopifyMode, shop } = useMode();
  const [appBridgeReady, setAppBridgeReady] = useState(false);

  console.log("[SHOPIFY PROVIDER] Initializing", { isShopifyMode, hasShop: !!shop });

  useEffect(() => {
    async function initializeShopifyAppBridge() {
      console.log("[SHOPIFY PROVIDER] useEffect - checking if Shopify mode", { isShopifyMode });
      
      if (!isShopifyMode) {
        console.log("[SHOPIFY PROVIDER] Not in Shopify mode - skipping App Bridge init");
        return;
      }

      console.log("[SHOPIFY PROVIDER] ✅ Shopify mode detected - initializing App Bridge");

      try {
        // Get configuration from backend
        console.log("[SHOPIFY PROVIDER] Fetching Shopify config from /api/shopify/config");
        const response = await fetch("/api/shopify/config");
        const data = await response.json();
        console.log("[SHOPIFY PROVIDER] Config received", { 
          hasApiKey: !!data.apiKey
        });
        
        // Get shop and host from URL params (Shopify passes these)
        const params = new URLSearchParams(window.location.search);
        let host = params.get('host');
        const shopParam = params.get('shop');
        
        console.log("[SHOPIFY PROVIDER] URL params", {
          hasHost: !!host,
          hasShop: !!shopParam,
          hasHmac: !!params.get('hmac'),
          hasIdToken: !!params.get('id_token'),
          hasEmbedded: !!params.get('embedded')
        });
        
        // Persist host and shop in sessionStorage for subsequent navigations
        if (host) {
          sessionStorage.setItem('shopify_host', host);
          console.log("[SHOPIFY PROVIDER] ✅ Host saved to sessionStorage");
        } else {
          host = sessionStorage.getItem('shopify_host');
          console.log("[SHOPIFY PROVIDER] Retrieved host from sessionStorage", { 
            hasHost: !!host
          });
        }

        if (shopParam) {
          sessionStorage.setItem('shopify_shop', shopParam);
          console.log("[SHOPIFY PROVIDER] ✅ Shop saved to sessionStorage");
        }
        
        if (!host) {
          console.warn('[SHOPIFY PROVIDER] ⚠️ No host parameter found - app may not be embedded');
          return;
        }

        console.log("[SHOPIFY PROVIDER] ✅ Host confirmed");

        // Add meta tag for Shopify API key (required for App Bridge 4.x)
        const existingMeta = document.querySelector('meta[name="shopify-api-key"]');
        if (!existingMeta && data.apiKey) {
          console.log("[SHOPIFY PROVIDER] Adding shopify-api-key meta tag");
          const meta = document.createElement("meta");
          meta.name = "shopify-api-key";
          meta.content = data.apiKey;
          document.head.appendChild(meta);
          console.log("[SHOPIFY PROVIDER] ✅ Meta tag added");
        } else if (existingMeta) {
          console.log("[SHOPIFY PROVIDER] shopify-api-key meta tag already exists");
        }

        // Load App Bridge CDN script if not already loaded
        const initializeAppBridge = () => {
          console.log("[SHOPIFY PROVIDER] initializeAppBridge called");
          
          if (window.shopify) {
            console.log('[SHOPIFY PROVIDER] ✅ App Bridge already initialized');
            setAppBridgeReady(true);
            return;
          }

          console.log("[SHOPIFY PROVIDER] Waiting for App Bridge to initialize...");

          // App Bridge 4.x auto-initializes from the CDN
          // The CDN script exposes window.shopify automatically
          const checkAndInit = () => {
            if ((window as any).shopify) {
              console.log('[SHOPIFY PROVIDER] ✅ App Bridge initialized from CDN');
              // App Bridge 4.x is automatically initialized via meta tags
              // No need to call createApp - the CDN handles it
              setAppBridgeReady(true);
            } else {
              console.log("[SHOPIFY PROVIDER] App Bridge not ready yet - retrying in 1s");
              // Retry in case script is still loading
              setTimeout(() => {
                if ((window as any).shopify) {
                  console.log('[SHOPIFY PROVIDER] ✅ App Bridge initialized (delayed)');
                  setAppBridgeReady(true);
                } else {
                  console.warn('[SHOPIFY PROVIDER] ⚠️ App Bridge failed to initialize after timeout');
                }
              }, 1000);
            }
          };
          
          checkAndInit();
        };

        const existingScript = document.querySelector('script[src*="app-bridge.js"]');
        if (!existingScript) {
          console.log("[SHOPIFY PROVIDER] Loading App Bridge CDN script...");
          const script = document.createElement("script");
          script.src = "https://cdn.shopify.com/shopifycloud/app-bridge.js";
          script.async = true;
          
          // Wait for script to load
          script.onload = () => {
            console.log('[SHOPIFY PROVIDER] ✅ App Bridge CDN script loaded');
            initializeAppBridge();
          };
          
          script.onerror = () => {
            console.error('[SHOPIFY PROVIDER] ❌ Failed to load App Bridge CDN');
          };
          
          document.head.appendChild(script);
        } else {
          console.log("[SHOPIFY PROVIDER] App Bridge CDN script already exists");
          initializeAppBridge();
        }
      } catch (error) {
        console.error("[Shopify] Failed to initialize App Bridge:", error);
      }
    }

    initializeShopifyAppBridge();
  }, [isShopifyMode]);

  return <>{children}</>;
}
