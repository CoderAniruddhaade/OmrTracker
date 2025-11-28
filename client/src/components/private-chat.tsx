import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Send, MessageCircle, Trash2, Edit2, Check, X, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Conversation, WhisperMessage } from "@shared/schema";

export default function PrivateChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [selectedConvId, setSelectedConvId] = useState<string>("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showUserSelect, setShowUserSelect] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const { data: conversations = [] } = useQuery<(Conversation & { lastSender?: any; lastMessage?: string })[]>({
    queryKey: ["/api/conversations"],
    refetchInterval: 2000,
  });

  // Fetch messages for selected conversation
  const { data: messages = [] } = useQuery<(WhisperMessage & { user: any })[]>({
    queryKey: selectedConvId ? [`/api/conversations/${selectedConvId}/messages`] : [],
    refetchInterval: selectedConvId ? 2000 : undefined,
  });

  // Fetch all users
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Create conversation
  const createConvMutation = useMutation({
    mutationFn: (participantIds: string[]) =>
      apiRequest("POST", "/api/conversations", { participantIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedUsers([]);
      setShowUserSelect(false);
    },
  });

  // Send message
  const sendMutation = useMutation({
    mutationFn: (msg: string) =>
      apiRequest("POST", `/api/conversations/${selectedConvId}/messages`, { message: msg }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${selectedConvId}/messages`] });
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    },
  });

  // Edit message
  const editMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      apiRequest("PATCH", `/api/whispers/${id}`, { message }),
    onSuccess: () => {
      setEditingId(null);
      setEditText("");
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${selectedConvId}/messages`] });
    },
  });

  // Delete message
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/whispers/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${selectedConvId}/messages`] });
    },
  });

  const handleSend = async () => {
    if (!message.trim() || !selectedConvId) return;
    await sendMutation.mutateAsync(message.trim());
  };

  const getConversationName = (conv: any) => {
    const otherParticipants = conv.participantIds.filter((id: string) => id !== user?.id);
    if (otherParticipants.length === 0) return "Self";
    if (otherParticipants.length === 1) {
      const otherUser = allUsers.find((u: any) => u.id === otherParticipants[0]);
      return otherUser?.username || "Unknown";
    }
    return `Group (${otherParticipants.length + 1})`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Conversations</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowUserSelect(!showUserSelect)}
                data-testid="button-new-conversation"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showUserSelect && (
              <div className="mb-4 p-3 bg-muted rounded-lg space-y-2">
                <select
                  multiple
                  value={selectedUsers}
                  onChange={(e) => setSelectedUsers(Array.from(e.target.selectedOptions, o => o.value))}
                  className="w-full border rounded p-2 text-sm"
                  data-testid="select-users"
                >
                  {allUsers
                    .filter((u: any) => u.id !== user?.id)
                    .map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.username}
                      </option>
                    ))}
                </select>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => createConvMutation.mutate(selectedUsers)}
                    disabled={selectedUsers.length === 0 || createConvMutation.isPending}
                    className="flex-1"
                    data-testid="button-create-conv"
                  >
                    Create
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowUserSelect(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full text-left p-2 rounded text-sm ${
                      selectedConvId === conv.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                    data-testid={`button-conversation-${conv.id}`}
                  >
                    <div className="font-medium truncate">{getConversationName(conv)}</div>
                    <div className="text-xs opacity-70 truncate">{conv.lastMessage}</div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {selectedConvId
                ? conversations.find(c => c.id === selectedConvId)
                  ? getConversationName(conversations.find(c => c.id === selectedConvId))
                  : "Select a conversation"
                : "Select a conversation"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col h-96">
            <ScrollArea ref={scrollRef} className="flex-1 mb-4 pr-4">
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex gap-2">
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-muted-foreground">
                        {msg.user?.username}
                      </div>
                      {editingId === msg.id ? (
                        <div className="flex gap-1 mt-1">
                          <Input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="text-sm"
                            data-testid={`input-edit-${msg.id}`}
                          />
                          <Button
                            size="sm"
                            onClick={() => editMutation.mutate({ id: msg.id, message: editText })}
                            data-testid={`button-save-${msg.id}`}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingId(null)}
                            data-testid={`button-cancel-${msg.id}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="bg-muted p-2 rounded text-sm rounded-lg mt-1">
                          {msg.message}
                        </div>
                      )}
                    </div>
                    {msg.senderId === user?.id && !msg.isDeleted && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(msg.id);
                            setEditText(msg.message);
                          }}
                          data-testid={`button-edit-${msg.id}`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(msg.id)}
                          data-testid={`button-delete-${msg.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type a message..."
                disabled={!selectedConvId}
                data-testid="input-message"
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || !selectedConvId || sendMutation.isPending}
                data-testid="button-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
