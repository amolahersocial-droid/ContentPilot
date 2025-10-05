import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ModeProvider, useMode } from "@/contexts/ModeContext";
import { ShopifyProvider } from "@/contexts/ShopifyProvider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ShopifyNav } from "@/components/ShopifyNav";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Sites from "@/pages/Sites";
import Keywords from "@/pages/Keywords";
import ContentQueue from "@/pages/ContentQueue";
import Backlinks from "@/pages/Backlinks";
import Outreach from "@/pages/Outreach";
import Settings from "@/pages/Settings";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Support from "@/pages/Support";
import AdminUsers from "@/pages/admin/Users";
import AdminSubscriptions from "@/pages/admin/Subscriptions";
import AdminAnalytics from "@/pages/admin/Analytics";

function ProtectedRoute({ component: Component, adminOnly = false, ...rest }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Redirect to="/dashboard" />;
  }

  return <Component {...rest} />;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isShopifyMode } = useMode();

  if (!user) {
    return <>{children}</>;
  }

  // In Shopify mode, use Shopify navigation only
  if (isShopifyMode) {
    return (
      <>
        <ShopifyNav />
        <div className="flex flex-col h-screen w-full">
          <header className="flex items-center justify-end h-14 px-4 border-b border-border bg-background shrink-0">
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto p-6 bg-background">
            {children}
          </main>
        </div>
      </>
    );
  }

  // Standalone mode uses sidebar
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-background shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { user } = useAuth();
  
  return (
    <Switch>
      <Route path="/login">
        {() => user ? <Redirect to="/dashboard" /> : <Login />}
      </Route>
      <Route path="/register">
        {() => user ? <Redirect to="/dashboard" /> : <Register />}
      </Route>
      <Route path="/dashboard">
        {() => (
          <AppLayout>
            <ProtectedRoute component={Dashboard} />
          </AppLayout>
        )}
      </Route>
      <Route path="/dashboard/sites">
        {() => (
          <AppLayout>
            <ProtectedRoute component={Sites} />
          </AppLayout>
        )}
      </Route>
      <Route path="/dashboard/keywords">
        {() => (
          <AppLayout>
            <ProtectedRoute component={Keywords} />
          </AppLayout>
        )}
      </Route>
      <Route path="/dashboard/content">
        {() => (
          <AppLayout>
            <ProtectedRoute component={ContentQueue} />
          </AppLayout>
        )}
      </Route>
      <Route path="/dashboard/backlinks">
        {() => (
          <AppLayout>
            <ProtectedRoute component={Backlinks} />
          </AppLayout>
        )}
      </Route>
      <Route path="/dashboard/outreach">
        {() => (
          <AppLayout>
            <ProtectedRoute component={Outreach} />
          </AppLayout>
        )}
      </Route>
      <Route path="/dashboard/settings">
        {() => (
          <AppLayout>
            <ProtectedRoute component={Settings} />
          </AppLayout>
        )}
      </Route>
      <Route path="/privacy">
        <Privacy />
      </Route>
      <Route path="/terms">
        <Terms />
      </Route>
      <Route path="/support">
        <Support />
      </Route>
      <Route path="/admin/users">
        {() => (
          <AppLayout>
            <ProtectedRoute component={AdminUsers} adminOnly />
          </AppLayout>
        )}
      </Route>
      <Route path="/admin/subscriptions">
        {() => (
          <AppLayout>
            <ProtectedRoute component={AdminSubscriptions} adminOnly />
          </AppLayout>
        )}
      </Route>
      <Route path="/admin/analytics">
        {() => (
          <AppLayout>
            <ProtectedRoute component={AdminAnalytics} adminOnly />
          </AppLayout>
        )}
      </Route>
      <Route path="/">
        {() => <Redirect to="/dashboard" />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ModeProvider>
        <ShopifyProvider>
          <ThemeProvider>
            <AuthProvider>
              <TooltipProvider>
                <Router />
                <Toaster />
              </TooltipProvider>
            </AuthProvider>
          </ThemeProvider>
        </ShopifyProvider>
      </ModeProvider>
    </QueryClientProvider>
  );
}
