import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Eye, Trash2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Post } from "@shared/schema";
import { GenerateContentDialog } from "@/components/GenerateContentDialog";
import { cn } from "@/lib/utils";

export default function ContentQueue() {
  const { toast } = useToast();
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/posts/${id}`, {});
      if (!res.ok) throw new Error("Failed to delete post");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Post deleted",
        description: "The post has been removed from the queue.",
      });
    },
  });

  const publishPostMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/posts/${id}/publish`, {});
      if (!res.ok) throw new Error("Failed to publish post");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Publishing started",
        description: "Your post is being published. This may take a moment.",
      });
    },
  });

  const groupedPosts = {
    draft: posts?.filter((p) => p.status === "draft") || [],
    scheduled: posts?.filter((p) => p.status === "scheduled") || [],
    published: posts?.filter((p) => p.status === "published") || [],
    failed: posts?.filter((p) => p.status === "failed") || [],
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft":
        return <FileText className="h-4 w-4" />;
      case "scheduled":
        return <Clock className="h-4 w-4" />;
      case "published":
        return <CheckCircle2 className="h-4 w-4" />;
      case "failed":
        return <XCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "scheduled":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
      case "published":
        return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
      case "failed":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      default:
        return "";
    }
  };

  const PostCard = ({ post }: { post: Post }) => (
    <Card
      className="hover-elevate"
      data-testid={`post-card-${post.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base line-clamp-2">{post.title}</CardTitle>
          <Badge
            variant="outline"
            className={cn("capitalize shrink-0", getStatusColor(post.status))}
          >
            {getStatusIcon(post.status)}
            <span className="ml-1.5">{post.status}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {post.metaDescription && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {post.metaDescription}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
          {post.scheduledFor && (
            <span>Scheduled: {new Date(post.scheduledFor).toLocaleString()}</span>
          )}
        </div>
        <div className="flex gap-2">
          {post.status === "draft" && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => publishPostMutation.mutate(post.id)}
              disabled={publishPostMutation.isPending}
              data-testid={`button-publish-${post.id}`}
            >
              Publish
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => deletePostMutation.mutate(post.id)}
            disabled={deletePostMutation.isPending}
            data-testid={`button-delete-${post.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

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
          <h1 className="text-3xl font-bold text-foreground">Content Queue</h1>
          <p className="text-muted-foreground mt-2">
            Manage your AI-generated content and publishing schedule
          </p>
        </div>
        <Button onClick={() => setGenerateDialogOpen(true)} data-testid="button-generate-content">
          <Plus className="h-4 w-4 mr-2" />
          Generate Content
        </Button>
      </div>

      {!posts || posts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No content yet</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Generate SEO-optimized content with AI and publish to your connected sites
            </p>
            <Button onClick={() => setGenerateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Generate Your First Post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Draft ({groupedPosts.draft.length})
            </h3>
            {groupedPosts.draft.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Scheduled ({groupedPosts.scheduled.length})
            </h3>
            {groupedPosts.scheduled.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Published ({groupedPosts.published.length})
            </h3>
            {groupedPosts.published.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Failed ({groupedPosts.failed.length})
            </h3>
            {groupedPosts.failed.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      )}

      <GenerateContentDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
      />
    </div>
  );
}
