import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Send, Trash2, Edit2, Check, X } from "lucide-react";
import type { WhisperMessage } from "@shared/schema";

interface ChatWindowProps {
  conversationId: string;
}

export default function ChatWindow({ conversationId }: ChatWindowProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch messages for conversation
  const { data: messages = [] } = useQuery<(WhisperMessage & { user: any })[]>({
    queryKey: [`/api/conversations/${conversationId}/messages`],
    refetchInterval: 1500,
    enabled: !!conversationId,
  });

  // Send message
  const sendMutation = useMutation({
    mutationFn: (msg: string) =>
      apiRequest("POST", `/api/conversations/${conversationId}/messages`, { message: msg }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/messages`] });
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
    },
  });

  // Edit message
  const editMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      apiRequest("PATCH", `/api/whispers/${id}`, { message }),
    onSuccess: () => {
      setEditingId(null);
      setEditText("");
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/messages`] });
    },
  });

  // Delete message
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/whispers/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/messages`] });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim()) return;
    await sendMutation.mutateAsync(message.trim());
  };

  return (
    <Card className="h-96 lg:h-[600px] flex flex-col bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 group ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm break-words ${
                    msg.senderId === user?.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-slate-100 dark:bg-slate-800 text-foreground"
                  }`}
                >
                  {editingId !== msg.id && <p>{msg.message}</p>}
                  {msg.editedAt && <p className="text-xs opacity-75 mt-1">(edited)</p>}

                  {editingId === msg.id && (
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="text-xs h-7"
                      />
                      <Button
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() =>
                          editMutation.mutate({ id: msg.id, message: editText })
                        }
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setEditingId(null);
                          setEditText("");
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {msg.senderId === user?.id && editingId !== msg.id && (
                  <div className="opacity-0 group-hover:opacity-100 transition flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
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
                      className="h-7 w-7 p-0"
                      onClick={() => deleteMutation.mutate(msg.id)}
                      data-testid={`button-delete-${msg.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex gap-2">
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
          className="text-sm"
          disabled={sendMutation.isPending}
          data-testid="input-message"
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!message.trim() || sendMutation.isPending}
          data-testid="button-send"
          className="px-3"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
