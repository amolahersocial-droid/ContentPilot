import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useMode } from "@/contexts/ModeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Loader2 } from "lucide-react";
import { SiGoogle, SiShopify } from "react-icons/si";

export default function Login() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { isShopifyMode } = useMode();

  // Check for shop parameter immediately on component mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shop = params.get('shop');
    const embedded = params.get('embedded');
    
    // If shop parameter or embedded parameter exists, redirect to Shopify OAuth
    if (shop || (embedded === '1' && window.self !== window.top)) {
      const shopParam = shop || sessionStorage.getItem('shop');
      if (shopParam) {
        window.location.href = `/api/auth/shopify?shop=${shopParam}`;
        return;
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const handleGoogleLogin = () => {
    window.location.href = "/api/login";
  };

  // Show loading state while redirecting to Shopify
  if (isShopifyMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Redirecting to Shopify authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <Crown className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to RankForge</CardTitle>
          <CardDescription>
            Sign in with your Replit account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground text-center">
            Automated SEO content generation and publishing for your sites.
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="button"
            className="w-full gap-2"
            onClick={handleGoogleLogin}
            data-testid="button-replit-login"
          >
            <Crown className="h-4 w-4" />
            Continue with Replit
          </Button>
          <div className="text-xs text-center text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
