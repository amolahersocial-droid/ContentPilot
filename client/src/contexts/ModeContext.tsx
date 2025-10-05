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

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>("standalone");
  const [shop, setShop] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shopParam = params.get("shop");
    const embedded = params.get("embedded");
    
    if (shopParam) {
      setMode("shopify");
      setShop(shopParam);
      sessionStorage.setItem("shop", shopParam);
    } else {
      const storedShop = sessionStorage.getItem("shop");
      if (storedShop) {
        setMode("shopify");
        setShop(storedShop);
      }
    }

    if (embedded === "1" && window.self !== window.top) {
      setMode("shopify");
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
