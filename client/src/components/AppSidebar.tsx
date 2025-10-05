import {
  Home,
  Globe,
  Key,
  FileText,
  Link2,
  Settings,
  Users,
  DollarSign,
  BarChart3,
  Crown,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const userMenuItems = [
    {
      title: "Overview",
      url: "/dashboard",
      icon: Home,
    },
    {
      title: "Sites",
      url: "/dashboard/sites",
      icon: Globe,
    },
    {
      title: "Keywords",
      url: "/dashboard/keywords",
      icon: Key,
    },
    {
      title: "Content Queue",
      url: "/dashboard/content",
      icon: FileText,
    },
    {
      title: "Backlinks",
      url: "/dashboard/backlinks",
      icon: Link2,
      badge: user?.subscriptionPlan === "paid" ? null : "Paid",
    },
  ];

  const adminMenuItems = [
    {
      title: "Users",
      url: "/admin/users",
      icon: Users,
    },
    {
      title: "Subscriptions",
      url: "/admin/subscriptions",
      icon: DollarSign,
    },
    {
      title: "Analytics",
      url: "/admin/analytics",
      icon: BarChart3,
    },
  ];

  const isActive = (url: string) => location === url;

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Crown className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">
              SEO Content
            </span>
            <span className="text-xs text-muted-foreground">SaaS Platform</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {userMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    data-active={isActive(item.url)}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge
                          variant="outline"
                          className="ml-auto text-xs no-default-hover-elevate no-default-active-elevate"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user?.role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      data-active={isActive(item.url)}
                      data-testid={`link-admin-${item.title.toLowerCase()}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  data-active={isActive("/dashboard/settings")}
                  data-testid="link-settings"
                >
                  <Link href="/dashboard/settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {user?.username?.slice(0, 2).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.username || "User"}
            </span>
            <span className="text-xs text-muted-foreground capitalize">
              {user?.subscriptionPlan || "free"} plan
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
