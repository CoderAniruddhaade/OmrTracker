import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Shield, Download, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChaptersConfig {
  physics: string[];
  chemistry: string[];
  biology: string[];
}

interface ModUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  sheets: number;
  isOnline: boolean;
}

interface ChatMsg {
  id: string;
  userId: string;
  message: string;
  createdAt: string;
  user: { firstName: string } | null;
}

export default function Moderator() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [physics, setPhysics] = useState<string[]>([]);
  const [chemistry, setChemistry] = useState<string[]>([]);
  const [biology, setBiology] = useState<string[]>([]);
  const [newPhysics, setNewPhysics] = useState("");
  const [newChemistry, setNewChemistry] = useState("");
  const [newBiology, setNewBiology] = useState("");
  const [importText, setImportText] = useState("");
  const [importSubject, setImportSubject] = useState<"physics" | "chemistry" | "biology">("physics");

  const { data: chapters } = useQuery<ChaptersConfig>({
    queryKey: ["/api/chapters"],
    enabled: isAuthenticated,
  });

  const { data: allUsers = [], refetch: refetchUsers } = useQuery<ModUser[]>({
    queryKey: ["/api/moderator/users", isAuthenticated],
    enabled: false,
    queryFn: async () => {
      const res = await fetch(`/api/moderator/users?password=${encodeURIComponent(password)}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: chats = [], refetch: refetchChats } = useQuery<ChatMsg[]>({
    queryKey: ["/api/moderator/chats", isAuthenticated],
    enabled: false,
    queryFn: async () => {
      const res = await fetch(`/api/moderator/chats?password=${encodeURIComponent(password)}`);
      if (!res.ok) throw new Error("Failed to fetch chats");
      return res.json();
    },
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

  useEffect(() => {
    if (isAuthenticated) {
      refetchUsers();
      refetchChats();
    }
  }, [isAuthenticated, refetchUsers, refetchChats]);

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

  const downloadChatLog = () => {
    const link = document.createElement("a");
    link.href = `/api/moderator/export-chat?password=${encodeURIComponent(password)}`;
    link.download = "chat-log.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkImport = () => {
    console.log("Import button clicked", { importText, importSubject });
    
    if (!importText.trim()) {
      toast({
        title: "Error",
        description: "Please paste chapter names",
        variant: "destructive",
      });
      return;
    }

    const chapters = importText
      .split(/[,\n]/)
      .map((ch) => ch.trim())
      .filter((ch) => ch.length > 0);

    console.log("Parsed chapters:", chapters);

    if (chapters.length === 0) {
      toast({
        title: "Error",
        description: "No valid chapters found",
        variant: "destructive",
      });
      return;
    }

    console.log("Adding to subject:", importSubject);
    
    if (importSubject === "physics") {
      setPhysics((prev) => {
        const updated = [...prev, ...chapters];
        console.log("Updated physics:", updated);
        return updated;
      });
    } else if (importSubject === "chemistry") {
      setChemistry((prev) => {
        const updated = [...prev, ...chapters];
        console.log("Updated chemistry:", updated);
        return updated;
      });
    } else {
      setBiology((prev) => {
        const updated = [...prev, ...chapters];
        console.log("Updated biology:", updated);
        return updated;
      });
    }

    setImportText("");
    toast({
      title: "Success",
      description: `Added ${chapters.length} chapters to ${importSubject}`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Tabs defaultValue="chapters" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chapters">Chapters</TabsTrigger>
            <TabsTrigger value="users">Users ({allUsers.length})</TabsTrigger>
            <TabsTrigger value="chats">Chats ({chats.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="chapters">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Bulk Import from Google Doc
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Paste chapters (one per line or comma-separated)</label>
                  <Textarea
                    placeholder="Paste chapter names here&#10;Example:&#10;Chapter 1&#10;Chapter 2&#10;Chapter 3"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    data-testid="textarea-import-chapters"
                    className="min-h-24"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Subject</label>
                  <div className="flex gap-2 flex-wrap">
                    {(["physics", "chemistry", "biology"] as const).map((subj) => (
                      <Button
                        key={subj}
                        variant={importSubject === subj ? "default" : "outline"}
                        onClick={() => setImportSubject(subj)}
                        data-testid={`button-import-subject-${subj}`}
                        className="capitalize"
                      >
                        {subj}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={handleBulkImport}
                  className="w-full"
                  data-testid="button-bulk-import"
                >
                  Import Chapters
                </Button>
              </CardContent>
            </Card>

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
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>All Users Data</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="gap-2"
                  >
                    {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showPasswords ? "Hide" : "Show"} Passwords
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <div className="space-y-3">
                    {allUsers.map((user) => (
                      <div key={user.id} className="p-4 border rounded-lg space-y-2 hover-elevate">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <p className="font-semibold">{user.firstName} {user.lastName}</p>
                            <p className="text-sm text-muted-foreground">@{user.username}</p>
                          </div>
                          <div className="flex gap-2">
                            {user.isOnline && <Badge variant="secondary">Online</Badge>}
                            <Badge variant="outline">{user.sheets} sheets</Badge>
                          </div>
                        </div>
                        <div className="text-sm space-y-1">
                          <p>Email: {user.email || "N/A"}</p>
                          <p>ID: <code className="text-xs bg-secondary px-2 py-1 rounded">{user.id}</code></p>
                          {showPasswords && (
                            <>
                              <p>Password: <code className="text-xs bg-secondary px-2 py-1 rounded break-all font-mono">{user.plainPassword || "N/A"}</code></p>
                              <p>Hash: <code className="text-xs bg-secondary px-2 py-1 rounded break-all">{user.passwordHash || "N/A"}</code></p>
                            </>
                          )}
                          <p className="text-xs text-muted-foreground">Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chats" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>Chat Messages</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadChatLog}
                    className="gap-2"
                    data-testid="button-download-chat"
                  >
                    <Download className="w-4 h-4" />
                    Download Log
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full h-96">
                  <div className="space-y-4 pr-4">
                    {chats.length === 0 ? (
                      <p className="text-muted-foreground">No messages yet</p>
                    ) : (
                      chats.map((msg) => (
                        <div key={msg.id} className="p-3 border rounded bg-card">
                          <div className="flex justify-between mb-2">
                            <span className="font-semibold">{msg.user?.firstName || "Unknown"}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm break-words">{msg.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
