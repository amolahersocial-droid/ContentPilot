import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";
import type { Site, Keyword } from "@shared/schema";

interface GenerateContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateContentDialog({ open, onOpenChange }: GenerateContentDialogProps) {
  const { toast } = useToast();
  const [siteId, setSiteId] = useState("");
  const [keywordId, setKeywordId] = useState("");
  const [generateImages, setGenerateImages] = useState(true);

  const { data: sites } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const { data: keywords } = useQuery<Keyword[]>({
    queryKey: ["/api/keywords"],
  });

  const generateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/posts/generate", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to generate content");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Content generation started!",
        description: "Your content is being generated. Refresh the page to see updates.",
      });
      onOpenChange(false);
      setSiteId("");
      setKeywordId("");
      
      // Poll for job completion
      if (data.jobId) {
        const pollInterval = setInterval(async () => {
          try {
            const jobRes = await apiRequest("GET", `/api/jobs/${data.jobId}`, {});
            if (jobRes.ok) {
              const jobData = await jobRes.json();
              if (jobData.state === "completed" || jobData.state === "failed") {
                clearInterval(pollInterval);
                queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
                if (jobData.state === "completed") {
                  toast({
                    title: "Content generated!",
                    description: "Your SEO-optimized content is ready.",
                  });
                } else {
                  toast({
                    title: "Generation failed",
                    description: jobData.error || "Content generation encountered an error.",
                    variant: "destructive",
                  });
                }
              }
            }
          } catch (error) {
            clearInterval(pollInterval);
          }
        }, 3000); // Poll every 3 seconds
        
        // Clear interval after 5 minutes max
        setTimeout(() => clearInterval(pollInterval), 300000);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !keywordId) {
      toast({
        title: "Missing information",
        description: "Please select both a site and a keyword",
        variant: "destructive",
      });
      return;
    }

    generateMutation.mutate({
      siteId,
      keywordId,
      generateImages,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate SEO Content
          </DialogTitle>
          <DialogDescription>
            Use AI to create optimized content for your selected keyword
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="site">Target Site</Label>
            <Select value={siteId} onValueChange={setSiteId} required>
              <SelectTrigger data-testid="select-site">
                <SelectValue placeholder="Select a site" />
              </SelectTrigger>
              <SelectContent>
                {sites?.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keyword">Keyword</Label>
            <Select value={keywordId} onValueChange={setKeywordId} required>
              <SelectTrigger data-testid="select-keyword">
                <SelectValue placeholder="Select a keyword" />
              </SelectTrigger>
              <SelectContent>
                {keywords?.map((keyword) => (
                  <SelectItem key={keyword.id} value={keyword.id}>
                    {keyword.keyword}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="generate-images" className="cursor-pointer">
                Generate AI Images
              </Label>
              <p className="text-xs text-muted-foreground">
                Create hero and inline images with DALL·E 3 (Paid plan only)
              </p>
            </div>
            <Switch
              id="generate-images"
              checked={generateImages}
              onCheckedChange={setGenerateImages}
              data-testid="switch-generate-images"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={generateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={generateMutation.isPending}
              data-testid="button-generate-submit"
            >
              {generateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Generate Content
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
