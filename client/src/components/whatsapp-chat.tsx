import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Send, Plus, Search, MoreVertical, Trash2, Edit2, Check, X, MessageCircle, Maximize2 } from "lucide-react";
import WhatsAppChatFullscreen from "@/components/whatsapp-chat-fullscreen";
import { useAuth } from "@/hooks/useAuth";
import type { Conversation, WhisperMessage } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

export default function WhatsAppChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [selectedConvId, setSelectedConvId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (isFullscreen) {
    return <WhatsAppChatFullscreen onClose={() => setIsFullscreen(false)} />;
  }

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

  // Create group
  const createGroupMutation = useMutation({
    mutationFn: (participantIds: string[]) =>
      apiRequest("POST", "/api/conversations/group", { participantIds, groupName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedUsers([]);
      setGroupName("");
      setIsCreatingGroup(false);
      toast({ title: "Success", description: "Group created" });
    },
  });

  // Create 1-on-1 conversation
  const createConvMutation = useMutation({
    mutationFn: (participantIds: string[]) =>
      apiRequest("POST", "/api/conversations", { participantIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedUsers([]);
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
    if (conv.isGroupChat) return conv.groupName || "Group";
    const otherParticipants = conv.participantIds.filter((id: string) => id !== user?.id);
    if (otherParticipants.length === 1) {
      const otherUser = allUsers.find((u: any) => u.id === otherParticipants[0]);
      return otherUser?.username || "Unknown";
    }
    return "Chat";
  };

  const handleCreateDirect = (userId: string) => {
    createConvMutation.mutate([userId]);
  };

  // Combine conversations and available users
  const availableUsers = allUsers.filter((u: any) => u.id !== user?.id);
  const existingUserIds = new Set(conversations.map(c => {
    if (!c.isGroupChat && c.participantIds.length === 2) {
      return c.participantIds.find(id => id !== user?.id);
    }
    return null;
  }).filter(Boolean));

  const filteredConversations = conversations.filter((conv) => {
    const name = getConversationName(conv);
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredUsers = availableUsers.filter((u: any) => 
    !existingUserIds.has(u.id) && 
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConversation = conversations.find(c => c.id === selectedConvId);

  return (
    <div className="flex h-[600px] bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Sidebar - Conversations List */}
      <div className="w-72 border-r border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Chats</h2>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full"
                onClick={() => setIsFullscreen(true)}
                data-testid="button-fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Dialog open={isCreatingGroup} onOpenChange={setIsCreatingGroup}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="rounded-full" data-testid="button-new-chat">
                    <Plus className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start a Chat</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Select Users</label>
                    <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 mt-2">
                      {/* All Users Option */}
                      <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded font-semibold">
                        <Checkbox
                          checked={selectedUsers.length === availableUsers.length && availableUsers.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUsers(availableUsers.map((u: any) => u.id));
                            } else {
                              setSelectedUsers([]);
                            }
                          }}
                        />
                        <span className="text-sm">All Users ({availableUsers.length})</span>
                      </label>
                      <div className="border-t my-2"></div>
                      {availableUsers.map((u: any) => (
                        <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded">
                          <Checkbox
                            checked={selectedUsers.includes(u.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUsers([...selectedUsers, u.id]);
                              } else {
                                setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                              }
                            }}
                          />
                          <span className="text-sm">{u.username}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {selectedUsers.length > 1 && (
                    <div>
                      <label className="text-sm font-medium">Group Name</label>
                      <Input
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Enter group name"
                        className="mt-1"
                        data-testid="input-group-name"
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        if (selectedUsers.length === 1) {
                          handleCreateDirect(selectedUsers[0]);
                        } else if (selectedUsers.length > 1 && groupName.trim()) {
                          createGroupMutation.mutate(selectedUsers);
                        }
                        setSelectedUsers([]);
                        setGroupName("");
                        setIsCreatingGroup(false);
                      }}
                      disabled={selectedUsers.length === 0 || (selectedUsers.length > 1 && !groupName.trim())}
                      className="flex-1"
                      data-testid="button-start-chat"
                    >
                      Start Chat
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsCreatingGroup(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-chat"
            />
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {/* Recent Conversations */}
            {filteredConversations.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                  Recent
                </div>
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full text-left p-3 rounded-lg transition ${
                      selectedConvId === conv.id
                        ? "bg-blue-100 dark:bg-blue-900"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                    data-testid={`button-conversation-${conv.id}`}
                  >
                    <div className="font-medium text-sm truncate">{getConversationName(conv)}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{conv.lastMessage}</div>
                  </button>
                ))}
              </>
            )}

            {/* All Users Section */}
            {filteredUsers.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mt-4">
                  Users
                </div>
                {filteredUsers.map((u: any) => (
                  <button
                    key={u.id}
                    onClick={() => handleCreateDirect(u.id)}
                    className="w-full text-left p-3 rounded-lg transition hover:bg-slate-100 dark:hover:bg-slate-800"
                    data-testid={`button-user-${u.id}`}
                  >
                    <div className="font-medium text-sm truncate">{u.username}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Start chat</div>
                  </button>
                ))}
              </>
            )}

            {filteredConversations.length === 0 && filteredUsers.length === 0 && (
              <div className="p-4 text-center text-sm text-slate-500">No chats or users found</div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConvId && selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950">
              <div>
                <h3 className="font-bold">{getConversationName(selectedConversation)}</h3>
                {selectedConversation.isGroupChat && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedConversation.participantIds.length} members
                  </p>
                )}
              </div>
              <Button size="icon" variant="ghost">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea ref={scrollRef} className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs p-3 rounded-lg ${
                        msg.senderId === user?.id
                          ? "bg-blue-500 text-white rounded-bl-lg"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-br-lg"
                      }`}
                    >
                      {!msg.isDeleted ? (
                        editingId === msg.id ? (
                          <div className="flex gap-1">
                            <Input
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="text-sm h-8"
                              data-testid={`input-edit-${msg.id}`}
                            />
                            <Button
                              size="sm"
                              onClick={() => editMutation.mutate({ id: msg.id, message: editText })}
                              className="h-8"
                              data-testid={`button-save-${msg.id}`}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            {!selectedConversation.isGroupChat ? null : (
                              <p className="text-xs opacity-70 mb-1">{msg.user?.username}</p>
                            )}
                            <p className="text-sm">{msg.message}</p>
                          </>
                        )
                      ) : (
                        <p className="text-xs italic opacity-50">Message deleted</p>
                      )}
                    </div>

                    {msg.senderId === user?.id && !msg.isDeleted && (
                      <div className="flex gap-1 ml-2 items-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6"
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
                          className="h-6 w-6"
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

            {/* Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type a message..."
                data-testid="input-message"
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || sendMutation.isPending}
                data-testid="button-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>Select a chat to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
