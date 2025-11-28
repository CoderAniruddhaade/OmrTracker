import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { 
  Plus, Search, MessageSquare, Users, Clock, Zap, X, Check,
  MoreVertical, Pin, Archive, Trash2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { Conversation, WhisperMessage } from "@shared/schema";

interface ChatMenuProps {
  onSelectConversation: (conversationId: string) => void;
  selectedConvId?: string;
}

export default function ChatMenu({ onSelectConversation, selectedConvId }: ChatMenuProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [pinnedConversations, setPinnedConversations] = useState<Set<string>>(new Set());

  // Fetch conversations
  const { data: conversations = [], isLoading: convLoading } = useQuery<
    (Conversation & { lastSender?: any; lastMessage?: string })[]
  >({
    queryKey: ["/api/conversations"],
    refetchInterval: 2000,
  });

  // Fetch all users
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Fetch online users
  const { data: onlineUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/online-users"],
    refetchInterval: 3000,
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
      toast({ title: "Success", description: "Group created successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create group", variant: "destructive" });
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

  // Filter out current user from available users
  const availableUsers = allUsers.filter((u: any) => u.id !== user?.id);
  const onlineUserIds = new Set(onlineUsers.map((u: any) => u.id));

  // Get existing 1-on-1 conversation users
  const existingUserIds = new Set(
    conversations
      .filter(c => !c.isGroupChat && c.participantIds.length === 2)
      .map(c => c.participantIds.find(id => id !== user?.id))
      .filter(Boolean)
  );

  // Filter users for new chat
  const filteredUsersForChat = availableUsers.filter(
    (u: any) =>
      !existingUserIds.has(u.id) &&
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter conversations
  const filteredConversations = conversations
    .filter(conv => {
      const name = getConversationName(conv);
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      // Sort by pinned first, then by last message time
      const aPinned = pinnedConversations.has(a.id) ? 0 : 1;
      const bPinned = pinnedConversations.has(b.id) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
    });

  function getConversationName(conv: any): string {
    if (conv.isGroupChat) return conv.groupName || "Group Chat";
    const otherParticipants = conv.participantIds.filter((id: string) => id !== user?.id);
    if (otherParticipants.length === 1) {
      const otherUser = allUsers.find((u: any) => u.id === otherParticipants[0]);
      return otherUser?.username || "Unknown User";
    }
    return "Chat";
  }

  function getConversationOtherUserId(conv: any): string | null {
    if (conv.isGroupChat) return null;
    return conv.participantIds.find((id: string) => id !== user?.id) || null;
  }

  function handleCreateDirect(userId: string) {
    createConvMutation.mutate([userId]);
  }

  function togglePin(convId: string) {
    const newPinned = new Set(pinnedConversations);
    if (newPinned.has(convId)) {
      newPinned.delete(convId);
    } else {
      newPinned.add(convId);
    }
    setPinnedConversations(newPinned);
  }

  const handleCreateGroup = () => {
    if (selectedUsers.length < 2) {
      toast({ title: "Error", description: "Select at least 2 users for a group", variant: "destructive" });
      return;
    }
    if (!groupName.trim()) {
      toast({ title: "Error", description: "Enter a group name", variant: "destructive" });
      return;
    }
    createGroupMutation.mutate(selectedUsers);
  };

  return (
    <Card className="h-full flex flex-col bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">Chats</h2>
          </div>
          <Dialog open={isCreatingGroup} onOpenChange={setIsCreatingGroup}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="rounded-full hover-elevate" data-testid="button-new-chat">
                <Plus className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Start a New Chat</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Group Mode Toggle */}
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 cursor-pointer flex-1 p-2 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <Checkbox checked={selectedUsers.length > 0} />
                    <span className="text-sm font-medium">Create Group ({selectedUsers.length})</span>
                  </label>
                </div>

                {/* Group Name Input */}
                {selectedUsers.length > 0 && (
                  <Input
                    placeholder="Group name..."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="text-sm"
                  />
                )}

                {/* Users List */}
                <div>
                  <label className="text-sm font-semibold mb-2 block">Select Users</label>
                  <div className="border rounded-lg max-h-64 overflow-y-auto space-y-1 p-2 bg-slate-50 dark:bg-slate-900">
                    {/* All Users Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold">
                      <Checkbox
                        checked={
                          selectedUsers.length === availableUsers.length && availableUsers.length > 0
                        }
                        onCheckedChange={(checked) => {
                          setSelectedUsers(
                            checked ? availableUsers.map((u: any) => u.id) : []
                          );
                        }}
                      />
                      <span className="text-sm">All Users ({availableUsers.length})</span>
                    </label>
                    <div className="border-t my-1" />

                    {/* Individual Users */}
                    {availableUsers.map((u: any) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Checkbox
                          checked={selectedUsers.includes(u.id)}
                          onCheckedChange={(checked) => {
                            setSelectedUsers(
                              checked
                                ? [...selectedUsers, u.id]
                                : selectedUsers.filter(id => id !== u.id)
                            );
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{u.username}</div>
                          <div className="text-xs text-muted-foreground">
                            {onlineUserIds.has(u.id) ? "Online" : "Offline"}
                          </div>
                        </div>
                        {onlineUserIds.has(u.id) && (
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreatingGroup(false);
                      setSelectedUsers([]);
                      setGroupName("");
                    }}
                  >
                    Cancel
                  </Button>
                  {selectedUsers.length > 0 ? (
                    <Button onClick={handleCreateGroup} disabled={createGroupMutation.isPending}>
                      {selectedUsers.length === 1 ? "Start Chat" : "Create Group"}
                    </Button>
                  ) : (
                    <Button disabled>Select Users</Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search chats or users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm bg-slate-100 dark:bg-slate-800 border-0"
            data-testid="input-search-chats"
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {convLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading conversations...
            </div>
          ) : filteredConversations.length === 0 && filteredUsersForChat.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchQuery ? "No chats or users found" : "No chats yet. Click + to start!"}
            </div>
          ) : (
            <>
              {/* Active Conversations */}
              {filteredConversations.map((conv) => {
                const otherUserId = getConversationOtherUserId(conv);
                const isOnline = otherUserId ? onlineUserIds.has(otherUserId) : false;
                const isPinned = pinnedConversations.has(conv.id);

                return (
                  <div
                    key={conv.id}
                    className={`p-3 rounded-lg cursor-pointer transition group hover-elevate ${
                      selectedConvId === conv.id
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                    onClick={() => onSelectConversation(conv.id)}
                    data-testid={`button-conv-${conv.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {conv.isGroupChat ? (
                              <>
                                <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="font-semibold text-sm truncate">
                                  {getConversationName(conv)}
                                </span>
                              </>
                            ) : (
                              <>
                                {isOnline && (
                                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                                )}
                                <span className="font-semibold text-sm truncate">
                                  {getConversationName(conv)}
                                </span>
                              </>
                            )}
                          </div>
                          {isPinned && <Pin className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                        </div>

                        {/* Last Message Preview */}
                        {conv.lastMessage && (
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.lastSender?.id === user?.id ? "You: " : ""}
                            {conv.lastMessage}
                          </p>
                        )}

                        {/* Timestamp */}
                        {conv.lastMessageAt && (
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(conv.lastMessageAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePin(conv.id);
                          }}
                          data-testid={`button-pin-${conv.id}`}
                        >
                          <Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-current" : ""}`} />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Available Users Section */}
              {filteredUsersForChat.length > 0 && (
                <>
                  <div className="px-3 py-2 mt-4 text-xs font-semibold text-muted-foreground uppercase">
                    Start a Chat
                  </div>
                  {filteredUsersForChat.map((u: any) => (
                    <button
                      key={u.id}
                      onClick={() => handleCreateDirect(u.id)}
                      className="w-full text-left p-3 rounded-lg transition hover:bg-slate-100 dark:hover:bg-slate-800"
                      data-testid={`button-user-${u.id}`}
                    >
                      <div className="flex items-center gap-2">
                        {onlineUserIds.has(u.id) && (
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{u.username}</div>
                          <div className="text-xs text-muted-foreground">
                            {onlineUserIds.has(u.id) ? "Online" : "Offline"}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
