import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link2, Crown, Plus } from "lucide-react";
import { AddProspectDialog } from "@/components/AddProspectDialog";
import type { Backlink } from "@shared/schema";

export default function Backlinks() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [addProspectOpen, setAddProspectOpen] = useState(false);

  const { data: backlinks, isLoading } = useQuery<Backlink[]>({
    queryKey: ["/api/backlinks"],
    enabled: user?.subscriptionPlan === "paid",
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "prospect":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "contacted":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
      case "responded":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "confirmed":
        return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      default:
        return "";
    }
  };

  if (user?.subscriptionPlan === "free") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Backlink Helper</h1>
          <p className="text-muted-foreground mt-2">
            Semi-automated backlink prospecting and outreach tracking
          </p>
        </div>

        <Card className="border-dashed border-primary/50 bg-primary/5">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Crown className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Upgrade to Access Backlinks</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              The backlink helper feature is available on paid plans only. Upgrade to identify prospects,
              manage outreach, and track backlink confirmations.
            </p>
            <Button data-testid="button-upgrade" onClick={() => setLocation("/dashboard/settings")}>
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Paid Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-foreground">Backlink Helper</h1>
          <p className="text-muted-foreground mt-2">
            Manage backlink prospects and outreach campaigns
          </p>
        </div>
        <Button onClick={() => setAddProspectOpen(true)} data-testid="button-add-prospect-header">
          <Plus className="h-4 w-4 mr-2" />
          Add Prospect
        </Button>
      </div>

      {!backlinks || backlinks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Link2 className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No backlink prospects yet</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Start identifying prospects and managing outreach campaigns
            </p>
            <Button onClick={() => setAddProspectOpen(true)} data-testid="button-add-prospect">
              <Plus className="h-4 w-4 mr-2" />
              Add Prospect
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prospect</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contacted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backlinks.map((backlink) => (
                <TableRow key={backlink.id} data-testid={`backlink-row-${backlink.id}`}>
                  <TableCell className="font-medium">
                    {backlink.prospectName || "Unknown"}
                  </TableCell>
                  <TableCell>
                    <a
                      href={backlink.prospectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      {backlink.prospectUrl.slice(0, 40)}...
                    </a>
                  </TableCell>
                  <TableCell>{backlink.prospectEmail || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(backlink.status)}>
                      {backlink.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {backlink.contactedAt
                      ? new Date(backlink.contactedAt).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" data-testid={`button-view-${backlink.id}`}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <AddProspectDialog
        open={addProspectOpen}
        onOpenChange={setAddProspectOpen}
      />
    </div>
  );
}
