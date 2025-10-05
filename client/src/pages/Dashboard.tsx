import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/StatCard";
import { Globe, FileText, Key, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DashboardStats } from "@/lib/types";
import type { Post } from "@shared/schema";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentPosts, isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts/recent"],
  });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's an overview of your SEO content platform.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Sites Connected"
          value={stats?.sitesConnected || 0}
          icon={Globe}
          subtitle="Active integrations"
        />
        <StatCard
          title="Posts Published"
          value={stats?.postsPublished || 0}
          icon={FileText}
          trend={{ value: 12, label: "from last month" }}
        />
        <StatCard
          title="Keywords Tracked"
          value={stats?.keywordsTracked || 0}
          icon={Key}
          subtitle="Active keywords"
        />
        <StatCard
          title="Plan Usage"
          value={`${stats?.planUsage.percentage || 0}%`}
          icon={TrendingUp}
          subtitle={`${stats?.planUsage.used || 0} / ${stats?.planUsage.limit || 0} posts`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Post Limit</CardTitle>
            <CardDescription>
              Your daily content generation usage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Used today</span>
                <span className="font-medium">
                  {stats?.planUsage.used || 0} / {stats?.planUsage.limit || 0}
                </span>
              </div>
              <Progress value={stats?.planUsage.percentage || 0} />
            </div>
            {(stats?.planUsage.percentage || 0) >= 80 && (
              <p className="text-sm text-yellow-600 dark:text-yellow-500">
                You're approaching your daily limit. Consider upgrading for more posts.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest posts and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {postsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded-md animate-pulse" />
                ))}
              </div>
            ) : recentPosts && recentPosts.length > 0 ? (
              <div className="space-y-3">
                {recentPosts.slice(0, 5).map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {post.title}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {post.status}
                      </p>
                    </div>
                    <div className="ml-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent posts</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
