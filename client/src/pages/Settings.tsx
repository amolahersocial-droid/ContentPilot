import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMode } from "@/contexts/ModeContext";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Crown, LogOut, Shield, Zap, Loader2, Key, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ShopifyBilling } from "@/components/ShopifyBilling";

export default function Settings() {
  const { user, logout } = useAuth();
  const { isShopifyMode } = useMode();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [useOwnKey, setUseOwnKey] = useState(user?.useOwnOpenAiKey || false);
  const [showKey, setShowKey] = useState(false);

  const updateApiKeyMutation = useMutation({
    mutationFn: async (data: { openaiApiKey: string; useOwnOpenAiKey: boolean }) => {
      const res = await apiRequest("PATCH", "/api/users/settings", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update settings");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Settings updated",
        description: "Your OpenAI API key has been saved successfully.",
      });
      setOpenaiApiKey("");
      setShowKey(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isFreeUser = user?.subscriptionPlan === "free";
    
    if (isFreeUser && !openaiApiKey && !user?.openaiApiKey) {
      toast({
        title: "API key required",
        description: "Free plan users must provide an OpenAI API key",
        variant: "destructive",
      });
      return;
    }

    updateApiKeyMutation.mutate({
      openaiApiKey: openaiApiKey || user?.openaiApiKey || "",
      useOwnOpenAiKey: isFreeUser ? true : useOwnKey,
    });
  };

  const handleRemoveKey = () => {
    if (user?.subscriptionPlan === "free") {
      toast({
        title: "Cannot remove key",
        description: "Free plan users must keep an OpenAI API key configured",
        variant: "destructive",
      });
      return;
    }
    
    updateApiKeyMutation.mutate({
      openaiApiKey: "",
      useOwnOpenAiKey: false,
    });
    setOpenaiApiKey("");
    setUseOwnKey(false);
  };

  const createSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscriptions/create", {
        planType: "paid",
        amount: 1999, // ₹19.99 per month
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create subscription");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      // Check if we received a payment link or subscription
      if (data.paymentLinkId || (data.shortUrl && !data.subscriptionId)) {
        // Open payment link in new window
        window.open(data.shortUrl, '_blank');
        toast({
          title: "Payment link opened",
          description: "Complete the payment in the new window to upgrade your plan.",
        });
      } else if (data.subscriptionId) {
        // Initialize Razorpay checkout for subscription
        const options = {
          key: data.keyId,
          subscription_id: data.subscriptionId,
          name: "RankForge",
          description: "Paid Subscription Plan",
          handler: async function (response: any) {
            try {
              const verifyRes = await apiRequest("POST", "/api/subscriptions/verify", {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
              });
              
              if (verifyRes.ok) {
                toast({
                  title: "Subscription activated!",
                  description: "Welcome to the paid plan. Enjoy unlimited features!",
                });
                window.location.reload();
              } else {
                throw new Error("Payment verification failed");
              }
            } catch (error: any) {
              toast({
                title: "Payment verification failed",
                description: error.message,
                variant: "destructive",
              });
            }
          },
          modal: {
            ondismiss: function() {
              toast({
                title: "Payment cancelled",
                description: "You can upgrade anytime from settings.",
              });
            }
          },
          theme: {
            color: "#8b5cf6",
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to initiate payment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You've been successfully logged out.",
      });
      setLocation("/login");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account and subscription
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your profile and subscription details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-muted-foreground">Username</span>
              <span className="text-sm font-semibold">{user?.username}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-muted-foreground">Email</span>
              <span className="text-sm font-semibold">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-muted-foreground">Role</span>
              <Badge
                variant="outline"
                className={user?.role === "admin" ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" : ""}
              >
                {user?.role === "admin" && <Shield className="h-3 w-3 mr-1" />}
                {user?.role}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-muted-foreground">Plan</span>
              <Badge
                variant="outline"
                className={
                  user?.subscriptionPlan === "paid"
                    ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
                    : ""
                }
              >
                {user?.subscriptionPlan === "paid" && <Crown className="h-3 w-3 mr-1" />}
                {user?.subscriptionPlan}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>OpenAI API Configuration</CardTitle>
              <CardDescription>
                {user?.subscriptionPlan === "free" ? (
                  "Free plan users must use their own OpenAI API key"
                ) : (
                  "Optionally use your own OpenAI API key for content generation"
                )}
              </CardDescription>
            </div>
            {user?.openaiApiKey && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Configured
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {user?.subscriptionPlan === "free" && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Free Plan Requirement
                </p>
                <p className="text-sm text-muted-foreground">
                  To use content generation features, you need to provide your own OpenAI API key.
                  Get your API key from{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    OpenAI Platform
                  </a>
                  .
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleApiKeySubmit} className="space-y-4">
            {user?.subscriptionPlan !== "free" && (
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="use-own-key">Use My Own API Key</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable to use your personal OpenAI API key instead of the platform's
                  </p>
                </div>
                <Switch
                  id="use-own-key"
                  checked={useOwnKey}
                  onCheckedChange={setUseOwnKey}
                  data-testid="switch-use-own-key"
                />
              </div>
            )}

            {(useOwnKey || user?.subscriptionPlan === "free") && (
              <div className="space-y-2">
                <Label htmlFor="openai-key">
                  OpenAI API Key {user?.subscriptionPlan === "free" && <span className="text-red-500">*</span>}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="openai-key"
                    type={showKey ? "text" : "password"}
                    placeholder={user?.openaiApiKey ? "••••••••••••••••" : "sk-..."}
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    data-testid="input-openai-key"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowKey(!showKey)}
                    data-testid="button-toggle-key"
                  >
                    {showKey ? "Hide" : "Show"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your API key is encrypted and stored securely. Get one from{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    OpenAI Platform
                  </a>
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={updateApiKeyMutation.isPending}
                data-testid="button-save-settings"
              >
                {updateApiKeyMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Key className="mr-2 h-4 w-4" />
                )}
                {updateApiKeyMutation.isPending ? "Saving..." : "Save API Key"}
              </Button>
              {user?.openaiApiKey && user?.subscriptionPlan !== "free" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoveKey}
                  disabled={updateApiKeyMutation.isPending}
                  data-testid="button-remove-key"
                >
                  Remove Key
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {isShopifyMode ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Subscription Management
            </CardTitle>
            <CardDescription>
              Manage your RankForge subscription through Shopify
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ShopifyBilling />
          </CardContent>
        </Card>
      ) : user?.subscriptionPlan === "free" ? (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Upgrade to Paid Plan
            </CardTitle>
            <CardDescription>
              Unlock unlimited sites, advanced features, and AI image generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-4 text-sm">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Unlimited sites and keywords
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Unlimited daily content generation
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                AI image generation with DALL·E 3
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Advanced SEO validation
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Backlink helper with outreach tracking
              </li>
            </ul>
            <Button 
              className="w-full" 
              data-testid="button-upgrade"
              onClick={() => createSubscriptionMutation.mutate()}
              disabled={createSubscriptionMutation.isPending}
            >
              {createSubscriptionMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Upgrade Now - ₹19.99/month
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Manage your login session</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={isLoggingOut}
            data-testid="button-logout"
          >
            {isLoggingOut ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                Logging out...
              </>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
