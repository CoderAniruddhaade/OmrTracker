import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { ChapterRecommendation } from "@shared/schema";

export default function RecommendChapters() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState<"physics" | "chemistry" | "biology">("physics");
  const [chapterName, setChapterName] = useState("");

  const { data: recommendations, isLoading } = useQuery<ChapterRecommendation[]>({
    queryKey: ["/api/recommendations"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, chapterName }),
      });
      if (!response.ok) throw new Error("Failed to recommend");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Chapter recommended! Waiting for approvals...",
      });
      setChapterName("");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to recommend chapter",
        variant: "destructive",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (recId: string) => {
      const response = await fetch(`/api/recommendations/${recId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to approve");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.status === "approved" ? "Chapter approved and added!" : "Approval recorded",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chapters"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (recId: string) => {
      const response = await fetch(`/api/recommendations/${recId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to reject");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Rejected",
        description: "Chapter recommendation rejected",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
    },
  });

  if (isLoading) return null;

  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <CardTitle className="text-base">Recommend Chapters</CardTitle>
          </div>
          {!showForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(true)}
              data-testid="button-show-recommend-form"
            >
              Suggest Chapter
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showForm && (
          <div className="space-y-3 p-4 bg-muted rounded-md">
            <div>
              <label className="text-sm font-medium">Subject</label>
              <div className="flex gap-2 mt-2">
                {(["physics", "chemistry", "biology"] as const).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={subject === s ? "default" : "outline"}
                    onClick={() => setSubject(s)}
                    data-testid={`button-select-${s}`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Chapter Name</label>
              <Input
                placeholder="e.g., Modern Physics, Organic Chemistry"
                value={chapterName}
                onChange={(e) => setChapterName(e.target.value)}
                data-testid="input-recommend-chapter"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => createMutation.mutate()}
                disabled={!chapterName.trim() || createMutation.isPending}
                data-testid="button-recommend-submit"
              >
                {createMutation.isPending ? "Recommending..." : "Recommend"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setChapterName("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {recommendations && recommendations.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium">
              {recommendations.length} pending recommendation{recommendations.length !== 1 ? "s" : ""}
            </p>
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-3 rounded-md bg-muted/50 border border-border space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{rec.chapterName}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {rec.subject} • Approvals: {rec.approvals?.length || 0}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {rec.status}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => approveMutation.mutate(rec.id)}
                    disabled={approveMutation.isPending}
                    data-testid={`button-approve-${rec.id}`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => rejectMutation.mutate(rec.id)}
                    disabled={rejectMutation.isPending}
                    data-testid={`button-reject-${rec.id}`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            No pending recommendations
          </p>
        )}
      </CardContent>
    </Card>
  );
}
