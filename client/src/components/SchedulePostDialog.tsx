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
import { Switch } from "@/components/ui/switch";
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

interface SchedulePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: Site;
}

export function SchedulePostDialog({ open, onOpenChange, site }: SchedulePostDialogProps) {
  const { toast } = useToast();
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(site.autoPublishEnabled);
  const [postFrequency, setPostFrequency] = useState<"daily" | "weekly" | "monthly">(site.postFrequency || "daily");
  const [dailyPostTime, setDailyPostTime] = useState(site.dailyPostTime || "09:00");

  const updateScheduleMutation = useMutation({
    mutationFn: async (data: { autoPublishEnabled: boolean; postFrequency: string; dailyPostTime: string }) => {
      const res = await apiRequest("PATCH", `/api/sites/${site.id}`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update schedule");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      toast({
        title: "Schedule updated!",
        description: autoPublishEnabled 
          ? `${postFrequency.charAt(0).toUpperCase() + postFrequency.slice(1)} posts will be published at ${dailyPostTime}`
          : "Auto-publishing disabled",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update schedule",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateScheduleMutation.mutate({
      autoPublishEnabled,
      postFrequency,
      dailyPostTime,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Automated Posts</DialogTitle>
          <DialogDescription>
            Automatically generate and publish content for {site.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="auto-publish">Enable Auto-Publishing</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create and publish posts
              </p>
            </div>
            <Switch
              id="auto-publish"
              checked={autoPublishEnabled}
              onCheckedChange={setAutoPublishEnabled}
              data-testid="switch-auto-publish"
            />
          </div>

          {autoPublishEnabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="post-frequency">Posting Frequency</Label>
                <Select
                  value={postFrequency}
                  onValueChange={(value) => setPostFrequency(value as "daily" | "weekly" | "monthly")}
                >
                  <SelectTrigger id="post-frequency" data-testid="select-frequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly (Every Monday)</SelectItem>
                    <SelectItem value="monthly">Monthly (1st of month)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="post-time">Post Time</Label>
                <Input
                  id="post-time"
                  type="time"
                  value={dailyPostTime}
                  onChange={(e) => setDailyPostTime(e.target.value)}
                  data-testid="input-post-time"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  System will randomly select a keyword and create a post at this time
                </p>
              </div>
            </>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateScheduleMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateScheduleMutation.isPending}
              data-testid="button-save-schedule"
            >
              {updateScheduleMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Schedule
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
