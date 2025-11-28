import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface ChaptersConfig {
  physics: string[];
  chemistry: string[];
  biology: string[];
}

export default function Moderator() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [physics, setPhysics] = useState<string[]>([]);
  const [chemistry, setChemistry] = useState<string[]>([]);
  const [biology, setBiology] = useState<string[]>([]);
  const [newPhysics, setNewPhysics] = useState("");
  const [newChemistry, setNewChemistry] = useState("");
  const [newBiology, setNewBiology] = useState("");

  const { data: chapters } = useQuery<ChaptersConfig>({
    queryKey: ["/api/chapters"],
    enabled: isAuthenticated,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/moderator/chapters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          physics,
          chemistry,
          biology,
        }),
      });
      if (!response.ok) throw new Error("Failed to update");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Chapters updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chapters"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update chapters",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (isAuthenticated && chapters) {
      setPhysics(chapters.physics);
      setChemistry(chapters.chemistry);
      setBiology(chapters.biology);
    }
  }, [isAuthenticated, chapters]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "Sanskruti") {
      setIsAuthenticated(true);
      toast({
        title: "Success",
        description: "Moderator authenticated!",
      });
    } else {
      toast({
        title: "Error",
        description: "Invalid password",
        variant: "destructive",
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <CardTitle>Moderator Panel</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Input
                    type="password"
                    placeholder="Enter moderator password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-testid="input-mod-password"
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" data-testid="button-mod-login">
                  Authenticate
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const addChapter = (subject: "physics" | "chemistry" | "biology", name: string) => {
    if (!name.trim()) return;
    if (subject === "physics") {
      setPhysics([...physics, name]);
      setNewPhysics("");
    } else if (subject === "chemistry") {
      setChemistry([...chemistry, name]);
      setNewChemistry("");
    } else {
      setBiology([...biology, name]);
      setNewBiology("");
    }
  };

  const removeChapter = (subject: "physics" | "chemistry" | "biology", index: number) => {
    if (subject === "physics") {
      setPhysics(physics.filter((_, i) => i !== index));
    } else if (subject === "chemistry") {
      setChemistry(chemistry.filter((_, i) => i !== index));
    } else {
      setBiology(biology.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Edit Chapters (Weekly)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Physics */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg" style={{ color: "hsl(215 75% 50%)" }}>
                Physics Chapters
              </h3>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Add new chapter"
                  value={newPhysics}
                  onChange={(e) => setNewPhysics(e.target.value)}
                  data-testid="input-physics-chapter"
                />
                <Button
                  onClick={() => addChapter("physics", newPhysics)}
                  data-testid="button-add-physics"
                >
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {physics.map((ch, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-secondary rounded">
                    <span>{ch}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChapter("physics", i)}
                      data-testid={`button-remove-physics-${i}`}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Chemistry */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg" style={{ color: "hsl(150 60% 40%)" }}>
                Chemistry Chapters
              </h3>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Add new chapter"
                  value={newChemistry}
                  onChange={(e) => setNewChemistry(e.target.value)}
                  data-testid="input-chemistry-chapter"
                />
                <Button
                  onClick={() => addChapter("chemistry", newChemistry)}
                  data-testid="button-add-chemistry"
                >
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {chemistry.map((ch, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-secondary rounded">
                    <span>{ch}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChapter("chemistry", i)}
                      data-testid={`button-remove-chemistry-${i}`}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Biology */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg" style={{ color: "hsl(30 70% 48%)" }}>
                Biology Chapters
              </h3>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Add new chapter"
                  value={newBiology}
                  onChange={(e) => setNewBiology(e.target.value)}
                  data-testid="input-biology-chapter"
                />
                <Button
                  onClick={() => addChapter("biology", newBiology)}
                  data-testid="button-add-biology"
                >
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {biology.map((ch, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-secondary rounded">
                    <span>{ch}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChapter("biology", i)}
                      data-testid={`button-remove-biology-${i}`}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="w-full"
              data-testid="button-save-chapters"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
