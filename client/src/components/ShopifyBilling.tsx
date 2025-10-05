import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Crown, Check, Loader2, ExternalLink } from "lucide-react";

interface ShopifySubscription {
  id: string;
  status: string;
  planName: string;
  price: number;
  billingInterval: string;
  currentPeriodEnd?: string;
}

export function ShopifyBilling() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { data: subscription, isLoading } = useQuery<ShopifySubscription | null>({
    queryKey: ["/api/shopify/billing/subscription"],
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async (planName: string) => {
      setLoading(true);
      const res = await apiRequest("POST", "/api/shopify/billing/create", { planName });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create subscription");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.confirmationUrl) {
        // Redirect to Shopify billing page
        window.top!.location.href = data.confirmationUrl;
      }
    },
    onError: (error: any) => {
      setLoading(false);
      toast({
        title: "Subscription failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/shopify/billing/cancel", {});
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to cancel subscription");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopify/billing/subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Subscription cancelled",
        description: "Your subscription has been cancelled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const plans = [
    {
      name: "starter",
      displayName: "Starter",
      price: 19.99,
      interval: "monthly",
      features: [
        "Up to 10 blog posts per month",
        "AI content generation",
        "Basic SEO optimization",
        "Shopify blog publishing",
      ],
    },
    {
      name: "professional",
      displayName: "Professional",
      price: 49.99,
      interval: "monthly",
      features: [
        "Up to 50 blog posts per month",
        "AI content generation",
        "Advanced SEO optimization",
        "Internal linking",
        "Image generation",
        "Priority support",
      ],
      recommended: true,
    },
    {
      name: "business",
      displayName: "Business",
      price: 99.99,
      interval: "monthly",
      features: [
        "Unlimited blog posts",
        "AI content generation",
        "Advanced SEO optimization",
        "Internal linking",
        "Image generation",
        "Automated scheduling",
        "Dedicated support",
      ],
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {subscription && subscription.status === "active" ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Active Subscription
                </CardTitle>
                <CardDescription className="mt-2">
                  {subscription.planName} Plan - ${subscription.price}/{subscription.billingInterval}
                </CardDescription>
              </div>
              <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription.currentPeriodEnd && (
              <p className="text-sm text-muted-foreground">
                Next billing date: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
            <Button
              variant="outline"
              onClick={() => cancelSubscriptionMutation.mutate()}
              disabled={cancelSubscriptionMutation.isPending}
              data-testid="button-cancel-subscription"
            >
              {cancelSubscriptionMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Cancel Subscription
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Choose Your Plan</h3>
            <p className="text-muted-foreground">
              Select the perfect plan for your content needs
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <Card 
                key={plan.name}
                className={plan.recommended ? "border-primary shadow-lg" : ""}
              >
                {plan.recommended && (
                  <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium rounded-t-lg">
                    Recommended
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.displayName}</CardTitle>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/{plan.interval}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.recommended ? "default" : "outline"}
                    onClick={() => createSubscriptionMutation.mutate(plan.name)}
                    disabled={loading || createSubscriptionMutation.isPending}
                    data-testid={`button-subscribe-${plan.name}`}
                  >
                    {(loading || createSubscriptionMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Subscribe
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <ExternalLink className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Billing is managed securely through Shopify. All charges will appear on your Shopify invoice.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
