import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/StatCard";
import { DollarSign, Users, TrendingUp, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AdminStats, User } from "@shared/schema";

export default function AdminSubscriptions() {
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const paidUsers = users?.filter((u) => u.subscriptionPlan === "paid") || [];

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
        <h1 className="text-3xl font-bold text-foreground">Subscriptions</h1>
        <p className="text-muted-foreground mt-2">
          Track subscription revenue and active plans
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Monthly Revenue"
          value={`$${stats?.monthlyRecurringRevenue || 0}`}
          icon={DollarSign}
          trend={{ value: 15, label: "from last month" }}
        />
        <StatCard
          title="Active Subscriptions"
          value={stats?.activeSubscriptions || 0}
          icon={Users}
          subtitle="Paid plans"
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats?.activeSubscriptions && stats?.totalUsers ? Math.round((stats.activeSubscriptions / stats.totalUsers) * 100) : 0}%`}
          icon={TrendingUp}
          subtitle="Free to Paid"
        />
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={CreditCard}
          subtitle="All plans"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paid Subscribers</CardTitle>
          <CardDescription>
            Users with active paid subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted rounded-md animate-pulse" />
              ))}
            </div>
          ) : paidUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Subscription ID</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paidUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {user.razorpaySubscriptionId?.slice(0, 20)}...
                    </TableCell>
                    <TableCell>
                      {user.subscriptionExpiresAt
                        ? new Date(user.subscriptionExpiresAt).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                        Active
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No paid subscribers yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
