import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { globalAppMode, globalShop } from "@/contexts/ModeContext";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Helper to add Shopify context to requests (only when in Shopify mode)
function addShopifyContext(url: string, headers: Record<string, string> = {}): { url: string, headers: Record<string, string> } {
  // Only add shop context if we're in Shopify mode
  if (globalAppMode === "shopify" && globalShop) {
    // Add shop as query parameter if not already present
    const urlObj = new URL(url, window.location.origin);
    if (!urlObj.searchParams.has('shop')) {
      urlObj.searchParams.set('shop', globalShop);
    }
    return { url: urlObj.toString(), headers };
  }
  
  return { url, headers };
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const { url: finalUrl, headers: shopifyHeaders } = addShopifyContext(url);
  
  const headers = data 
    ? { "Content-Type": "application/json", ...shopifyHeaders } 
    : shopifyHeaders;

  const res = await fetch(finalUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = queryKey.join("/") as string;
    const { url: finalUrl } = addShopifyContext(baseUrl);
    
    const res = await fetch(finalUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
