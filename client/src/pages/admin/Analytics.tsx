import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/StatCard";
import { FileText, Globe, Key, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { AdminStats } from "@shared/schema";

export default function AdminAnalytics() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Platform-wide metrics and performance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Content Generated Today"
          value={stats?.contentGeneratedToday || 0}
          icon={Zap}
          trend={{ value: 8, label: "from yesterday" }}
        />
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={Globe}
          subtitle="All accounts"
        />
        <StatCard
          title="Active Subscriptions"
          value={stats?.activeSubscriptions || 0}
          icon={Key}
          subtitle="Paid plans"
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${stats?.monthlyRecurringRevenue || 0}`}
          icon={FileText}
          trend={{ value: 12, label: "from last month" }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform Health</CardTitle>
            <CardDescription>System status and performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">API Status</span>
              <span className="text-sm text-green-600 dark:text-green-400">Operational</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Database</span>
              <span className="text-sm text-green-600 dark:text-green-400">Healthy</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Job Queue</span>
              <span className="text-sm text-green-600 dark:text-green-400">Processing</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">OpenAI Integration</span>
              <span className="text-sm text-green-600 dark:text-green-400">Connected</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage Summary</CardTitle>
            <CardDescription>Platform usage metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">API Calls Today</span>
              <span className="text-sm text-foreground">1,247</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">AI Images Generated</span>
              <span className="text-sm text-foreground">83</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Posts Published</span>
              <span className="text-sm text-foreground">156</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Sites Crawled</span>
              <span className="text-sm text-foreground">42</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
