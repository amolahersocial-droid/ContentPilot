import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Globe, ExternalLink, RefreshCw, Trash2, Sparkles, Calendar } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMode } from "@/contexts/ModeContext";
import type { Site } from "@shared/schema";
import { ConnectSiteDialog } from "@/components/ConnectSiteDialog";
import { SchedulePostDialog } from "@/components/SchedulePostDialog";

export default function Sites() {
  const { toast } = useToast();
  const { isShopifyMode } = useMode();
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  const { data: sites, isLoading } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const deleteSiteMutation = useMutation({
    mutationFn: async (siteId: string) => {
      const res = await apiRequest("DELETE", `/api/sites/${siteId}`, {});
      if (!res.ok) throw new Error("Failed to delete site");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      toast({
        title: "Site deleted",
        description: "The site has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete site",
        variant: "destructive",
      });
    },
  });

  const crawlSiteMutation = useMutation({
    mutationFn: async (siteId: string) => {
      const res = await apiRequest("POST", `/api/sites/${siteId}/crawl`, {});
      if (!res.ok) throw new Error("Failed to start crawl");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Crawl started",
        description: "Site crawl has been initiated. This may take a few minutes.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
    },
  });

  const autoGenerateKeywordsMutation = useMutation({
    mutationFn: async (siteId: string) => {
      const res = await apiRequest("POST", `/api/keywords/auto-generate/${siteId}`, {});
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to generate keywords");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Keywords generated!",
        description: `Created ${data.keywords.length} keywords from crawled data.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/keywords"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate keywords",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isShopifyMode ? "Blog Content" : "Connected Sites"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isShopifyMode 
              ? "Manage your Shopify blog content" 
              : "Manage your WordPress and Shopify integrations"}
          </p>
        </div>
        <Button
          onClick={() => setConnectDialogOpen(true)}
          data-testid="button-connect-site"
        >
          <Plus className="h-4 w-4 mr-2" />
          Connect Site
        </Button>
      </div>

      {!sites || sites.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No sites connected</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              {isShopifyMode 
                ? "Start generating SEO-optimized blog content for your Shopify store" 
                : "Connect your WordPress or Shopify site to start generating SEO-optimized content"}
            </p>
            <Button onClick={() => setConnectDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Connect Your First Site
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <Card key={site.id} className="hover-elevate" data-testid={`site-card-${site.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{site.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="capitalize">
                        {site.type}
                      </Badge>
                      {site.isActive ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20">
                          Inactive
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground truncate"
                  >
                    {site.url}
                  </a>
                </div>
                {site.lastCrawledAt && (
                  <p className="text-xs text-muted-foreground">
                    Last crawled: {new Date(site.lastCrawledAt).toLocaleDateString()}
                  </p>
                )}
                <div className="flex gap-2">
                  {site.crawlData && (site.crawlData as any).pages ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => autoGenerateKeywordsMutation.mutate(site.id)}
                      disabled={autoGenerateKeywordsMutation.isPending}
                      data-testid={`button-auto-keywords-${site.id}`}
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Auto-Keywords
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedSite(site);
                      setScheduleDialogOpen(true);
                    }}
                    data-testid={`button-schedule-${site.id}`}
                  >
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    {site.autoPublishEnabled ? `${site.dailyPostTime}` : "Schedule"}
                  </Button>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => crawlSiteMutation.mutate(site.id)}
                    disabled={crawlSiteMutation.isPending}
                    data-testid={`button-crawl-${site.id}`}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${crawlSiteMutation.isPending ? 'animate-spin' : ''}`} />
                    Crawl
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteSiteMutation.mutate(site.id)}
                    disabled={deleteSiteMutation.isPending}
                    data-testid={`button-delete-${site.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConnectSiteDialog
        open={connectDialogOpen}
        onOpenChange={setConnectDialogOpen}
      />

      {selectedSite && (
        <SchedulePostDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          site={selectedSite}
        />
      )}
    </div>
  );
}
