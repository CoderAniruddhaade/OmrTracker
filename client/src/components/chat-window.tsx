import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Users } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessage, User } from "@shared/schema";

interface ChatMessageWithUser extends ChatMessage {
  user: User;
}

export default function ChatWindow() {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  const { data: messages = [] } = useQuery<ChatMessageWithUser[]>({
    queryKey: ["/api/chat/messages"],
    refetchInterval: 2000,
  });

  const { data: onlineData = [] } = useQuery<any[]>({
    queryKey: ["/api/online-users"],
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (Array.isArray(onlineData) && onlineData.length > 0) {
      setOnlineUsers(onlineData.map((u) => u.userId));
    }
  }, [onlineData]);

  const sendMutation = useMutation({
    mutationFn: async (msg: string) => {
      return apiRequest("POST", "/api/chat/messages", { message: msg });
    },
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

  const handleSend = async () => {
    if (message.trim()) {
      await sendMutation.mutateAsync(message.trim());
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card className="h-96 sm:h-[500px] flex flex-col">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg">Chat & Achievements</CardTitle>
          <Badge variant="outline" className="text-xs sm:text-sm flex items-center gap-1">
            <Users className="w-3 h-3" />
            {onlineUsers.length}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3 sm:gap-4 p-3 sm:p-6">
        <ScrollArea className="flex-1 pr-4 sm:pr-6" ref={scrollRef}>
          <div className="space-y-2 sm:space-y-3">
            {messages.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground text-center py-8">
                No messages yet. Start the conversation!
              </p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="text-xs sm:text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-primary">{msg.user?.firstName || "User"}</span>
                    {onlineUsers.includes(msg.userId) && (
                      <Badge variant="secondary" className="h-4 px-1.5 text-xs">
                        Online
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground break-words">{msg.message}</p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

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
      </CardContent>
    </Card>
  );
}
