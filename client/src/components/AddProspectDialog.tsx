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
import { Textarea } from "@/components/ui/textarea";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AddProspectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProspectDialog({ open, onOpenChange }: AddProspectDialogProps) {
  const { toast } = useToast();
  const [prospectName, setProspectName] = useState("");
  const [prospectUrl, setProspectUrl] = useState("");
  const [prospectEmail, setProspectEmail] = useState("");
  const [notes, setNotes] = useState("");

  const addProspectMutation = useMutation({
    mutationFn: async (data: {
      prospectName: string;
      prospectUrl: string;
      prospectEmail?: string;
      notes?: string;
    }) => {
      const res = await apiRequest("POST", "/api/backlinks", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add prospect");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backlinks"] });
      toast({
        title: "Prospect added!",
        description: "New backlink prospect has been added successfully.",
      });
      setProspectName("");
      setProspectUrl("");
      setProspectEmail("");
      setNotes("");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add prospect",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addProspectMutation.mutate({
      prospectName,
      prospectUrl,
      prospectEmail: prospectEmail || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Backlink Prospect</DialogTitle>
          <DialogDescription>
            Add a new website or contact for backlink outreach
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prospect-name">Prospect Name *</Label>
            <Input
              id="prospect-name"
              placeholder="e.g., Tech Blog XYZ"
              value={prospectName}
              onChange={(e) => setProspectName(e.target.value)}
              data-testid="input-prospect-name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prospect-url">Website URL *</Label>
            <Input
              id="prospect-url"
              type="url"
              placeholder="https://example.com"
              value={prospectUrl}
              onChange={(e) => setProspectUrl(e.target.value)}
              data-testid="input-prospect-url"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prospect-email">Contact Email</Label>
            <Input
              id="prospect-email"
              type="email"
              placeholder="contact@example.com"
              value={prospectEmail}
              onChange={(e) => setProspectEmail(e.target.value)}
              data-testid="input-prospect-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this prospect..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="input-notes"
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={addProspectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addProspectMutation.isPending}
              data-testid="button-submit-prospect"
            >
              {addProspectMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Prospect
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
