import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ConnectSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectSiteDialog({ open, onOpenChange }: ConnectSiteDialogProps) {
  const { toast } = useToast();
  const [siteType, setSiteType] = useState<"wordpress" | "shopify">("wordpress");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [wpUsername, setWpUsername] = useState("");
  const [wpAppPassword, setWpAppPassword] = useState("");
  const [shopifyAccessToken, setShopifyAccessToken] = useState("");
  const [shopifyApiKey, setShopifyApiKey] = useState("");

  const connectSiteMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/sites", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to connect site");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      toast({
        title: "Site connected!",
        description: "Your site has been connected successfully.",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setName("");
    setUrl("");
    setWpUsername("");
    setWpAppPassword("");
    setShopifyAccessToken("");
    setShopifyApiKey("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const credentials = siteType === "wordpress"
      ? { username: wpUsername, appPassword: wpAppPassword }
      : { accessToken: shopifyAccessToken, apiKey: shopifyApiKey };

    connectSiteMutation.mutate({
      name,
      url,
      type: siteType,
      credentials,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect a Site</DialogTitle>
          <DialogDescription>
            Connect your WordPress or Shopify site to start generating content
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="site-name">Site Name</Label>
            <Input
              id="site-name"
              data-testid="input-site-name"
              placeholder="My Blog"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="site-url">Site URL</Label>
            <Input
              id="site-url"
              data-testid="input-site-url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          <Tabs value={siteType} onValueChange={(v) => setSiteType(v as "wordpress" | "shopify")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="wordpress" data-testid="tab-wordpress">WordPress</TabsTrigger>
              <TabsTrigger value="shopify" data-testid="tab-shopify">Shopify</TabsTrigger>
            </TabsList>

            <TabsContent value="wordpress" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="wp-username">WordPress Username</Label>
                <Input
                  id="wp-username"
                  data-testid="input-wp-username"
                  placeholder="admin"
                  value={wpUsername}
                  onChange={(e) => setWpUsername(e.target.value)}
                  required={siteType === "wordpress"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wp-app-password">Application Password</Label>
                <Input
                  id="wp-app-password"
                  data-testid="input-wp-app-password"
                  type="password"
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={wpAppPassword}
                  onChange={(e) => setWpAppPassword(e.target.value)}
                  required={siteType === "wordpress"}
                />
                <p className="text-xs text-muted-foreground">
                  Generate this in WordPress under Users → Profile → Application Passwords
                </p>
              </div>
            </TabsContent>

            <TabsContent value="shopify" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="shopify-api-key">API Key</Label>
                <Input
                  id="shopify-api-key"
                  data-testid="input-shopify-api-key"
                  placeholder="Your Shopify API key"
                  value={shopifyApiKey}
                  onChange={(e) => setShopifyApiKey(e.target.value)}
                  required={siteType === "shopify"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shopify-access-token">Access Token</Label>
                <Input
                  id="shopify-access-token"
                  data-testid="input-shopify-access-token"
                  type="password"
                  placeholder="Your Shopify access token"
                  value={shopifyAccessToken}
                  onChange={(e) => setShopifyAccessToken(e.target.value)}
                  required={siteType === "shopify"}
                />
                <p className="text-xs text-muted-foreground">
                  Create a private app in Shopify Admin to get these credentials
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={connectSiteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={connectSiteMutation.isPending}
              data-testid="button-connect-submit"
            >
              {connectSiteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Connect Site
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
