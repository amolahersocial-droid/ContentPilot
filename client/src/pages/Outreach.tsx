import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, Send, TrendingUp, Users, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface OutreachCampaign {
  id: string;
  name: string;
  niche: string;
  tone: string;
  status: "draft" | "active" | "paused" | "completed";
  targetWebsiteCount: number;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  responses: number;
  createdAt: string;
}

interface SmtpCredential {
  id: string;
  provider: "gmail" | "outlook" | "custom";
  email: string;
  isActive: boolean;
  lastUsedAt: string | null;
}

export default function Outreach() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [showSmtpDialog, setShowSmtpDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<OutreachCampaign[]>({
    queryKey: ["/api/outreach/campaigns"],
    enabled: user?.subscriptionPlan === "paid",
  });

  const { data: smtpCredentials = [] } = useQuery<SmtpCredential[]>({
    queryKey: ["/api/outreach/smtp"],
    enabled: user?.subscriptionPlan === "paid",
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/outreach/campaigns", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outreach/campaigns"] });
      setShowCampaignDialog(false);
      toast({
        title: "Campaign created",
        description: "Your outreach campaign has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  const createSmtpMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/outreach/smtp", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outreach/smtp"] });
      setShowSmtpDialog(false);
      toast({
        title: "SMTP credentials saved",
        description: "Your email credentials have been stored securely.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save SMTP credentials",
        variant: "destructive",
      });
    },
  });

  if (user?.subscriptionPlan !== "paid") {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Automated Backlink Outreach</CardTitle>
            <CardDescription>
              This feature is only available for paid subscribers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Upgrade to a paid plan to access AI-powered email outreach, automated contact discovery,
              and comprehensive analytics for your backlink campaigns.
            </p>
            <Button data-testid="button-upgrade">Upgrade Now</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "paused":
        return "bg-yellow-500";
      case "completed":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Backlink Outreach
          </h1>
          <p className="text-muted-foreground">
            Automate your backlink campaigns with AI-powered email outreach
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowSmtpDialog(true)}
            data-testid="button-setup-smtp"
          >
            <Settings className="mr-2 h-4 w-4" />
            SMTP Setup
          </Button>
          <Button onClick={() => setShowCampaignDialog(true)} data-testid="button-create-campaign">
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </div>
      </div>

      {smtpCredentials.length === 0 && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              No SMTP Credentials
            </CardTitle>
            <CardDescription>
              You need to set up SMTP credentials before sending outreach emails.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowSmtpDialog(true)} data-testid="button-setup-smtp-card">
              <Settings className="mr-2 h-4 w-4" />
              Set Up Email Credentials
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-campaigns">
              {campaigns.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-emails-sent">
              {campaigns.reduce((sum, c) => sum + c.emailsSent, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-open-rate">
              {campaigns.reduce((sum, c) => sum + c.emailsSent, 0) > 0
                ? Math.round(
                    (campaigns.reduce((sum, c) => sum + c.emailsOpened, 0) /
                      campaigns.reduce((sum, c) => sum + c.emailsSent, 0)) *
                      100
                  )
                : 0}
              %
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-responses">
              {campaigns.reduce((sum, c) => sum + c.responses, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Campaigns</h2>
        {campaignsLoading ? (
          <div className="text-center py-8">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No campaigns yet</p>
              <p className="text-muted-foreground mb-4">
                Create your first outreach campaign to get started
              </p>
              <Button onClick={() => setShowCampaignDialog(true)} data-testid="button-create-first-campaign">
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((campaign) => (
              <Card
                key={campaign.id}
                className="cursor-pointer hover-elevate"
                onClick={() => setSelectedCampaign(campaign.id)}
                data-testid={`card-campaign-${campaign.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg" data-testid={`text-campaign-name-${campaign.id}`}>
                        {campaign.name}
                      </CardTitle>
                      <CardDescription>{campaign.niche}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(campaign.status)} data-testid={`badge-status-${campaign.id}`}>
                      {campaign.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target:</span>
                      <span className="font-medium">{campaign.targetWebsiteCount} sites</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sent:</span>
                      <span className="font-medium">{campaign.emailsSent} emails</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Opened:</span>
                      <span className="font-medium">{campaign.emailsOpened}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Responses:</span>
                      <span className="font-medium">{campaign.responses}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateCampaignDialog
        open={showCampaignDialog}
        onOpenChange={setShowCampaignDialog}
        onSubmit={(data) => createCampaignMutation.mutate(data)}
        isPending={createCampaignMutation.isPending}
      />

      <SmtpSetupDialog
        open={showSmtpDialog}
        onOpenChange={setShowSmtpDialog}
        onSubmit={(data) => createSmtpMutation.mutate(data)}
        isPending={createSmtpMutation.isPending}
      />
    </div>
  );
}

function CreateCampaignDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    name: "",
    niche: "",
    tone: "professional",
    targetWebsiteCount: 50,
    followUpEnabled: true,
    followUpDelayDays: 3,
    maxFollowUps: 2,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="dialog-create-campaign">
        <DialogHeader>
          <DialogTitle>Create Outreach Campaign</DialogTitle>
          <DialogDescription>
            Set up an automated backlink outreach campaign with AI-generated emails
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="campaign-name">Campaign Name</Label>
            <Input
              id="campaign-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Tech Blog Outreach 2024"
              required
              data-testid="input-campaign-name"
            />
          </div>

          <div>
            <Label htmlFor="niche">Niche/Industry</Label>
            <Input
              id="niche"
              value={formData.niche}
              onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
              placeholder="e.g., Technology, Marketing, Health"
              required
              data-testid="input-niche"
            />
          </div>

          <div>
            <Label htmlFor="tone">Email Tone</Label>
            <Select
              value={formData.tone}
              onValueChange={(value) => setFormData({ ...formData, tone: value })}
            >
              <SelectTrigger id="tone" data-testid="select-tone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="formal">Formal</SelectItem>
                <SelectItem value="persuasive">Persuasive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="target-count">Target Website Count</Label>
            <Input
              id="target-count"
              type="number"
              value={formData.targetWebsiteCount}
              onChange={(e) =>
                setFormData({ ...formData, targetWebsiteCount: parseInt(e.target.value) })
              }
              min="1"
              max="500"
              required
              data-testid="input-target-count"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="follow-up"
              checked={formData.followUpEnabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, followUpEnabled: checked })
              }
              data-testid="switch-follow-up"
            />
            <Label htmlFor="follow-up">Enable automated follow-ups</Label>
          </div>

          {formData.followUpEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="delay">Follow-up Delay (days)</Label>
                <Input
                  id="delay"
                  type="number"
                  value={formData.followUpDelayDays}
                  onChange={(e) =>
                    setFormData({ ...formData, followUpDelayDays: parseInt(e.target.value) })
                  }
                  min="1"
                  max="14"
                  data-testid="input-follow-up-delay"
                />
              </div>
              <div>
                <Label htmlFor="max-follow-ups">Max Follow-ups</Label>
                <Input
                  id="max-follow-ups"
                  type="number"
                  value={formData.maxFollowUps}
                  onChange={(e) =>
                    setFormData({ ...formData, maxFollowUps: parseInt(e.target.value) })
                  }
                  min="0"
                  max="5"
                  data-testid="input-max-follow-ups"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-submit-campaign">
              {isPending ? "Creating..." : "Create Campaign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SmtpSetupDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    provider: "gmail",
    email: "",
    password: "",
    smtpHost: "",
    smtpPort: 587,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-smtp-setup">
        <DialogHeader>
          <DialogTitle>SMTP Credentials Setup</DialogTitle>
          <DialogDescription>
            Configure your email account for sending outreach emails
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="provider">Email Provider</Label>
            <Select
              value={formData.provider}
              onValueChange={(value) => setFormData({ ...formData, provider: value })}
            >
              <SelectTrigger id="provider" data-testid="select-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gmail">Gmail</SelectItem>
                <SelectItem value="outlook">Outlook</SelectItem>
                <SelectItem value="custom">Custom SMTP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your@email.com"
              required
              data-testid="input-email"
            />
          </div>

          <div>
            <Label htmlFor="password">
              {formData.provider === "gmail" ? "App Password" : "Password"}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              required
              data-testid="input-password"
            />
            {formData.provider === "gmail" && (
              <p className="text-xs text-muted-foreground mt-1">
                Use an App Password, not your regular Gmail password
              </p>
            )}
          </div>

          {formData.provider === "custom" && (
            <>
              <div>
                <Label htmlFor="smtp-host">SMTP Host</Label>
                <Input
                  id="smtp-host"
                  value={formData.smtpHost}
                  onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                  placeholder="smtp.example.com"
                  required
                  data-testid="input-smtp-host"
                />
              </div>
              <div>
                <Label htmlFor="smtp-port">SMTP Port</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  value={formData.smtpPort}
                  onChange={(e) =>
                    setFormData({ ...formData, smtpPort: parseInt(e.target.value) })
                  }
                  placeholder="587"
                  required
                  data-testid="input-smtp-port"
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-submit-smtp">
              {isPending ? "Saving..." : "Save Credentials"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
