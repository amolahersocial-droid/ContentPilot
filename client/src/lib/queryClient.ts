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
  console.log("[QUERY CLIENT] addShopifyContext called", {
    path: new URL(url, window.location.origin).pathname,
    globalAppMode,
    hasGlobalShop: !!globalShop,
    willAddShopParam: globalAppMode === "shopify" && !!globalShop
  });
  
  // Only add shop context if we're in Shopify mode
  if (globalAppMode === "shopify" && globalShop) {
    // Add shop as query parameter if not already present
    const urlObj = new URL(url, window.location.origin);
    if (!urlObj.searchParams.has('shop')) {
      urlObj.searchParams.set('shop', globalShop);
      console.log("[QUERY CLIENT] ✅ Added shop parameter");
    } else {
      console.log("[QUERY CLIENT] Shop parameter already present in URL");
    }
    return { url: urlObj.toString(), headers };
  }
  
  console.log("[QUERY CLIENT] Standalone mode - no shop parameter added");
  return { url, headers };
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log("[API REQUEST] Starting request", { 
    method, 
    path: new URL(url, window.location.origin).pathname,
    hasData: !!data 
  });
  
  const { url: finalUrl, headers: shopifyHeaders } = addShopifyContext(url);
  
  const headers = data 
    ? { "Content-Type": "application/json", ...shopifyHeaders } 
    : shopifyHeaders;

  console.log("[API REQUEST] Making fetch", { 
    method, 
    hasHeaders: Object.keys(headers).length > 0
  });

  const res = await fetch(finalUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log("[API REQUEST] Response received", { 
    status: res.status, 
    statusText: res.statusText,
    ok: res.ok 
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
    
    console.log("[QUERY FN] Executing query", { 
      queryKey, 
      on401Behavior: unauthorizedBehavior 
    });
    
    const { url: finalUrl } = addShopifyContext(baseUrl);
    
    console.log("[QUERY FN] Making fetch");
    
    const res = await fetch(finalUrl, {
      credentials: "include",
    });

    console.log("[QUERY FN] Response received", { 
      status: res.status, 
      statusText: res.statusText,
      ok: res.ok 
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log("[QUERY FN] 401 received - returning null (as configured)");
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    console.log("[QUERY FN] ✅ Query successful", { dataType: typeof data });
    return data;
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
