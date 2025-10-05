import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type AppMode = "standalone" | "shopify";

interface ModeContextType {
  mode: AppMode;
  shop: string | null;
  isShopifyMode: boolean;
}

const ModeContext = createContext<ModeContextType>({
  mode: "standalone",
  shop: null,
  isShopifyMode: false,
});

// Initialize mode synchronously at module load (before React renders)
function initializeGlobalMode(): { mode: AppMode; shop: string | null } {
  const params = new URLSearchParams(window.location.search);
  const shopParam = params.get("shop");
  const embedded = params.get("embedded");
  const isInIframe = window.self !== window.top;
  
  console.log("[MODE DETECTION] Initializing mode detection", {
    pathname: window.location.pathname,
    hasShopParam: !!shopParam,
    hasEmbedded: !!embedded,
    isInIframe,
    hasSessionShop: !!sessionStorage.getItem("shopify_shop"),
    hasSessionHost: !!sessionStorage.getItem("shopify_host")
  });
  
  if (shopParam || (embedded === "1" && isInIframe)) {
    const shop = shopParam || sessionStorage.getItem("shopify_shop");
    if (shop) {
      sessionStorage.setItem("shopify_shop", shop);
      console.log("[MODE DETECTION] ✅ Shopify mode detected");
      return { mode: "shopify", shop };
    }
  }
  
  // Standalone mode - clear any stale Shopify data
  sessionStorage.removeItem("shopify_shop");
  sessionStorage.removeItem("shopify_host");
  sessionStorage.removeItem("shop");
  
  console.log("[MODE DETECTION] ✅ Standalone mode detected");
  return { mode: "standalone", shop: null };
}

// Export global mode for use in non-React contexts (initialized synchronously)
const initialMode = initializeGlobalMode();
export let globalAppMode: AppMode = initialMode.mode;
export let globalShop: string | null = initialMode.shop;

export function ModeProvider({ children }: { children: ReactNode }) {
  // Use the already-initialized global values
  const [mode, setMode] = useState<AppMode>(globalAppMode);
  const [shop, setShop] = useState<string | null>(globalShop);

  console.log("[MODE PROVIDER] Initial state", { mode, hasShop: !!shop, globalAppMode, hasGlobalShop: !!globalShop });

  useEffect(() => {
    console.log("[MODE PROVIDER] useEffect running - re-detecting mode");
    
    // Re-initialize from URL params (in case of navigation or refresh)
    const currentMode = initializeGlobalMode();
    
    // Update both React state AND global variables
    setMode(currentMode.mode);
    setShop(currentMode.shop);
    globalAppMode = currentMode.mode;
    globalShop = currentMode.shop;
    
    console.log("[MODE PROVIDER] Updated global mode", { 
      mode: currentMode.mode, 
      hasShop: !!currentMode.shop,
      globalAppMode,
      hasGlobalShop: !!globalShop
    });
    
    // Store host parameter if in Shopify mode
    if (currentMode.mode === "shopify") {
      const params = new URLSearchParams(window.location.search);
      const host = params.get("host");
      const hmac = params.get("hmac");
      const idToken = params.get("id_token");
      
      console.log("[MODE PROVIDER] Shopify params", {
        hasShop: !!currentMode.shop,
        hasHost: !!host,
        hasHmac: !!hmac,
        hasIdToken: !!idToken
      });
      
      if (host) {
        sessionStorage.setItem("shopify_host", host);
        console.log("[MODE PROVIDER] ✅ Host saved to sessionStorage");
      }
    }
  }, []);

  return (
    <ModeContext.Provider
      value={{
        mode,
        shop,
        isShopifyMode: mode === "shopify",
      }}
    >
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error("useMode must be used within ModeProvider");
  }
  return context;
}
