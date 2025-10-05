import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Crown, LogOut, Shield, Zap } from "lucide-react";
import { useLocation } from "wouter";

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

      {user?.subscriptionPlan === "free" && (
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
            <Button className="w-full" data-testid="button-upgrade">
              Upgrade Now
            </Button>
          </CardContent>
        </Card>
      )}

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
