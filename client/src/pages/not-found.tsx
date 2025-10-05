import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
            <Search className="relative h-24 w-24 text-primary/60" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-foreground">404</h1>
          <h2 className="text-2xl font-semibold text-foreground">Page not found</h2>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <Button onClick={() => setLocation("/dashboard")} data-testid="button-home">
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            data-testid="button-back"
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
