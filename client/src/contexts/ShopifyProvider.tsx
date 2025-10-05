import { ReactNode, useEffect } from "react";
import { useMode } from "./ModeContext";

export function ShopifyProvider({ children }: { children: ReactNode }) {
  const { isShopifyMode } = useMode();

  useEffect(() => {
    async function loadShopifyAppBridge() {
      if (!isShopifyMode) return;

      try {
        const response = await fetch("/api/shopify/config");
        const data = await response.json();
        
        // Add meta tag for Shopify API key
        const existingMeta = document.querySelector('meta[name="shopify-api-key"]');
        if (!existingMeta) {
          const meta = document.createElement("meta");
          meta.name = "shopify-api-key";
          meta.content = data.apiKey;
          document.head.appendChild(meta);
        }

        // Load App Bridge script if not already loaded
        if (!document.querySelector('script[src*="app-bridge.js"]')) {
          const script = document.createElement("script");
          script.src = "https://cdn.shopify.com/shopifycloud/app-bridge.js";
          script.async = true;
          document.head.appendChild(script);
        }
      } catch (error) {
        console.error("Failed to load Shopify App Bridge:", error);
      }
    }

    loadShopifyAppBridge();
  }, [isShopifyMode]);

  return <>{children}</>;
}
