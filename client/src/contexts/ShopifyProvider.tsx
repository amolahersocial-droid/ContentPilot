import { ReactNode, useEffect, useState } from "react";
import { useMode } from "./ModeContext";

declare global {
  interface Window {
    shopify?: any;
    AppBridge?: any;
  }
}

export function ShopifyProvider({ children }: { children: ReactNode }) {
  const { isShopifyMode } = useMode();
  const [appBridgeReady, setAppBridgeReady] = useState(false);

  useEffect(() => {
    async function initializeShopifyAppBridge() {
      if (!isShopifyMode) return;

      try {
        // Get configuration from backend
        const response = await fetch("/api/shopify/config");
        const data = await response.json();
        
        // Get shop and host from URL params (Shopify passes these)
        const params = new URLSearchParams(window.location.search);
        let host = params.get('host');
        const shop = params.get('shop');
        
        // Persist host and shop in sessionStorage for subsequent navigations
        if (host) {
          sessionStorage.setItem('shopify_host', host);
        } else {
          host = sessionStorage.getItem('shopify_host');
        }

        if (shop) {
          sessionStorage.setItem('shopify_shop', shop);
        }
        
        if (!host) {
          console.warn('[Shopify] No host parameter found - app may not be embedded');
          return;
        }

        // Add meta tag for Shopify API key (required for App Bridge 4.x)
        const existingMeta = document.querySelector('meta[name="shopify-api-key"]');
        if (!existingMeta && data.apiKey) {
          const meta = document.createElement("meta");
          meta.name = "shopify-api-key";
          meta.content = data.apiKey;
          document.head.appendChild(meta);
        }

        // Load App Bridge CDN script if not already loaded
        const initializeAppBridge = () => {
          if (window.shopify) {
            console.log('[Shopify] App Bridge already initialized');
            setAppBridgeReady(true);
            return;
          }

          // App Bridge 4.x auto-initializes from the CDN
          // The CDN script exposes window.shopify automatically
          const checkAndInit = () => {
            if ((window as any).shopify) {
              console.log('[Shopify] App Bridge initialized from CDN');
              // App Bridge 4.x is automatically initialized via meta tags
              // No need to call createApp - the CDN handles it
              setAppBridgeReady(true);
            } else {
              // Retry in case script is still loading
              setTimeout(() => {
                if ((window as any).shopify) {
                  console.log('[Shopify] App Bridge initialized (delayed)');
                  setAppBridgeReady(true);
                } else {
                  console.warn('[Shopify] App Bridge failed to initialize after timeout');
                }
              }, 1000);
            }
          };
          
          checkAndInit();
        };

        if (!document.querySelector('script[src*="app-bridge.js"]')) {
          const script = document.createElement("script");
          script.src = "https://cdn.shopify.com/shopifycloud/app-bridge.js";
          script.async = true;
          
          // Wait for script to load
          script.onload = () => {
            console.log('[Shopify] App Bridge CDN loaded');
            initializeAppBridge();
          };
          
          script.onerror = () => {
            console.error('[Shopify] Failed to load App Bridge CDN');
          };
          
          document.head.appendChild(script);
        } else {
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
