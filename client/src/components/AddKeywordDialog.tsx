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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { Site } from "@shared/schema";

interface AddKeywordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddKeywordDialog({ open, onOpenChange }: AddKeywordDialogProps) {
  const { toast } = useToast();
  const [keyword, setKeyword] = useState("");
  const [siteId, setSiteId] = useState("");

  const { data: sites } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const addKeywordMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/keywords", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add keyword");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keywords"] });
      toast({
        title: "Keyword added!",
        description: "The keyword has been added successfully.",
      });
      onOpenChange(false);
      setKeyword("");
      setSiteId("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add keyword",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addKeywordMutation.mutate({
      keyword,
      siteId: siteId || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Keyword</DialogTitle>
          <DialogDescription>
            Add a new keyword to track and generate content for
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keyword">Keyword</Label>
            <Input
              id="keyword"
              data-testid="input-keyword"
              placeholder="e.g., best SEO tools 2025"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="site">Associated Site (Optional)</Label>
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger data-testid="select-site">
                <SelectValue placeholder="Select a site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {sites?.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={addKeywordMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addKeywordMutation.isPending}
              data-testid="button-add-submit"
            >
              {addKeywordMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Keyword
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
