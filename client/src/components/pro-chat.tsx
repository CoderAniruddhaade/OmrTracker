import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Send, Heart, MessageCircle, Trash2, Edit2, Check, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { ChatMessage, WhisperMessage } from "@shared/schema";


export default function Bakchodi() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<string>("");

  // Fetch messages
  const { data: messages = [] } = useQuery<(ChatMessage & { user: any })[]>({
    queryKey: ["/api/chat/messages"],
    refetchInterval: 2000,
  });

  // Fetch whispers
  const { data: whispers = [] } = useQuery<(WhisperMessage & { user: any })[]>({
    queryKey: ["/api/whispers"],
    refetchInterval: 2000,
  });

  // Fetch online users
  const { data: onlineUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/online-users"],
    refetchInterval: 5000,
  });

  // Fetch all users
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Send public message
  const sendMutation = useMutation({
    mutationFn: (msg: string) => apiRequest("POST", "/api/chat/messages", { message: msg }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Send whisper
  const whisperMutation = useMutation({
    mutationFn: (data: { message: string; recipientIds: string[] }) =>
      apiRequest("POST", "/api/whispers", data),
    onSuccess: () => {
      setMessage("");
      setSelectedRecipient("");
      queryClient.invalidateQueries({ queryKey: ["/api/whispers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send whisper",
        variant: "destructive",
      });
    },
  });

  // Edit message
  const editMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      apiRequest("PATCH", `/api/chat/messages/${id}`, { message }),
    onSuccess: () => {
      setEditingId(null);
      setEditText("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    },
  });

  // Delete message
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/chat/messages/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    },
  });

  // Add reaction
  const reactionMutation = useMutation({
    mutationFn: ({ messageId, reaction }: { messageId: string; reaction: string }) =>
      apiRequest("POST", "/api/chat/reactions", { messageId, reaction }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    },
  });

  const handleSend = async () => {
    if (!message.trim()) return;

    if (selectedRecipient) {
      await whisperMutation.mutateAsync({
        message: message.trim(),
        recipientIds: [selectedRecipient],
      });
    } else {
      await sendMutation.mutateAsync(message.trim());
    }
  };

  const handleEdit = async (id: string) => {
    if (!editText.trim()) return;
    await editMutation.mutateAsync({ id, message: editText.trim() });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, whispers]);

  const onlineUserIds = onlineUsers.map((u: any) => u.userId);

  return (
    <Card className="h-96 sm:h-[600px] flex flex-col">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg">Bakchodi</CardTitle>
          <Badge variant="outline" className="text-xs sm:text-sm flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            {onlineUserIds.length} Online
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3 sm:gap-4 p-3 sm:p-6">
        <Tabs defaultValue="public" className="flex flex-col flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="public">General</TabsTrigger>
            <TabsTrigger value="whisper">Bakchodi</TabsTrigger>
          </TabsList>

          <TabsContent value="public" className="flex flex-col flex-1 gap-3">
            <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <p className="text-xs sm:text-sm text-muted-foreground text-center py-8">
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  messages.map((msg: ChatMessage & { user: any }) => (
                    <div key={msg.id} className="text-xs sm:text-sm p-2 rounded hover-elevate">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-primary">
                          {msg.user?.firstName || "User"}
                        </span>
                        {onlineUserIds.includes(msg.userId) && (
                          <Badge variant="secondary" className="h-4 px-1.5 text-xs">
                            Online
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground break-words">{msg.message}</p>
                      {msg.editedAt && <p className="text-xs text-muted-foreground">(edited)</p>}
                      {user?.id === msg.userId && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6"
                            onClick={() => {
                              setEditingId(msg.id);
                              setEditText(msg.message);
                            }}
                            data-testid="button-edit-message"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6"
                            onClick={() => deleteMutation.mutate(msg.id)}
                            data-testid="button-delete-message"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6"
                            onClick={() => reactionMutation.mutate({ messageId: msg.id, reaction: "❤️" })}
                          >
                            <Heart className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {editingId && (
              <div className="flex gap-2">
                <Input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder="Edit message..."
                  className="text-xs sm:text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => handleEdit(editingId)}
                  data-testid="button-confirm-edit"
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setEditText("");
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                data-testid="input-chat-message"
                className="text-xs sm:text-sm"
                disabled={sendMutation.isPending}
              />
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!message.trim() || sendMutation.isPending}
                data-testid="button-send-message"
                className="px-2 sm:px-4"
              >
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="whisper" className="flex flex-col flex-1 gap-3">
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground text-center">
                Use the "Private Chat" tab above to chat with other users
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
