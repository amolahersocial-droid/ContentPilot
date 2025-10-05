import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pin, Trash2, TrendingUp, TrendingDown, Filter } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Keyword } from "@shared/schema";
import { AddKeywordDialog } from "@/components/AddKeywordDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Keywords() {
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [showHighScoreOnly, setShowHighScoreOnly] = useState(false);

  const { data: allKeywords, isLoading } = useQuery<Keyword[]>({
    queryKey: ["/api/keywords"],
  });

  // Filter keywords by score if enabled
  const keywords = showHighScoreOnly 
    ? allKeywords?.filter(k => k.overallScore && k.overallScore > 70)
    : allKeywords;

  const togglePinMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const res = await apiRequest("PATCH", `/api/keywords/${id}`, { isPinned: !isPinned });
      if (!res.ok) throw new Error("Failed to update keyword");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keywords"] });
    },
  });

  const deleteKeywordMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/keywords/${id}`, {});
      if (!res.ok) throw new Error("Failed to delete keyword");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keywords"] });
      toast({
        title: "Keyword deleted",
        description: "The keyword has been removed.",
      });
    },
  });

  const getScoreBadge = (score: number | null) => {
    if (!score) return null;
    if (score >= 80) return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">Excellent</Badge>;
    if (score >= 60) return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">Good</Badge>;
    if (score >= 40) return <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">Fair</Badge>;
    return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">Low</Badge>;
  };

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
          <h1 className="text-3xl font-bold text-foreground">Keywords</h1>
          <p className="text-muted-foreground mt-2">
            Discover and track SEO keywords for your content
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showHighScoreOnly ? "default" : "outline"}
            onClick={() => setShowHighScoreOnly(!showHighScoreOnly)}
            data-testid="button-filter-score"
          >
            <Filter className="h-4 w-4 mr-2" />
            Score &gt; 70
          </Button>
          <Button onClick={() => setAddDialogOpen(true)} data-testid="button-add-keyword">
            <Plus className="h-4 w-4 mr-2" />
            Add Keyword
          </Button>
        </div>
      </div>

      {!keywords || keywords.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No keywords tracked</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Add keywords to track their performance and generate optimized content
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Keyword
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Keyword</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead className="text-right">Difficulty</TableHead>
                <TableHead className="text-right">Relevance</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keywords.map((keyword) => (
                <TableRow key={keyword.id} data-testid={`keyword-row-${keyword.id}`}>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${keyword.isPinned ? 'text-yellow-500' : 'text-muted-foreground'}`}
                      onClick={() => togglePinMutation.mutate({ id: keyword.id, isPinned: keyword.isPinned })}
                      data-testid={`button-pin-${keyword.id}`}
                    >
                      <Pin className="h-4 w-4" fill={keyword.isPinned ? 'currentColor' : 'none'} />
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{keyword.keyword}</TableCell>
                  <TableCell className="text-right">
                    {keyword.searchVolume ? (
                      <div className="flex items-center justify-end gap-1">
                        <span>{keyword.searchVolume.toLocaleString()}</span>
                        <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {keyword.difficulty ? (
                      <div className="flex items-center justify-end gap-2">
                        <span>{keyword.difficulty}/100</span>
                        {keyword.difficulty > 60 ? (
                          <TrendingUp className="h-3.5 w-3.5 text-red-500" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 text-green-500" />
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {keyword.relevanceScore ? `${keyword.relevanceScore}/100` : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {getScoreBadge(keyword.overallScore)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => deleteKeywordMutation.mutate(keyword.id)}
                      disabled={deleteKeywordMutation.isPending}
                      data-testid={`button-delete-${keyword.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <AddKeywordDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
    </div>
  );
}
