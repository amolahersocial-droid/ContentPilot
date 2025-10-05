import { createContext, useContext, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useMode } from "@/contexts/ModeContext";
import { useShopify } from "@/contexts/ShopifyProvider";
import type { User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { isShopifyMode, shop } = useMode();
  const { redirectToAuth } = useShopify();

  console.log("[AUTH PROVIDER] Initializing AuthProvider");

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  console.log("[AUTH PROVIDER] Auth state", { 
    hasUser: !!user, 
    isLoading 
  });

  // Handle authentication redirects
  useEffect(() => {
    if (!user && !isLoading) {
      if (isShopifyMode && shop) {
        // Shopify mode: redirect to Shopify OAuth
        console.log("[AUTH PROVIDER] Redirecting to Shopify OAuth", { hasShop: !!shop });
        redirectToAuth(shop);
      } else if (!isShopifyMode && window.location.pathname !== '/') {
        // Standalone mode: redirect to login page if not already there
        console.log("[AUTH PROVIDER] Unauthenticated in standalone mode - redirecting to login");
        window.location.href = '/';
      }
    }
  }, [isShopifyMode, user, isLoading, shop, redirectToAuth]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/logout", {});
      if (!res.ok) throw new Error("Logout failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.clear();
      window.location.href = "/";
    },
  });

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
