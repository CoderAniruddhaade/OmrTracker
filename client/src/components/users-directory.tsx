import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Users, Zap } from "lucide-react";
import type { User } from "@shared/schema";

interface UserWithStats extends User {
  sheetCount: number;
  isOnline: boolean;
}

export default function UsersDirectory() {
  const [, setLocation] = useLocation();
  const { data: allUsers = [], isLoading } = useQuery<UserWithStats[]>({
    queryKey: ["/api/users"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-card rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const onlineUsers = allUsers.filter(u => u.isOnline);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Users className="w-5 h-5" />
        <div>
          <h3 className="font-semibold text-base sm:text-lg">Community</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {allUsers.length} users • {onlineUsers.length} online
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allUsers.map((user) => (
          <Card
            key={user.id}
            className="hover-elevate cursor-pointer transition-all"
            onClick={() => setLocation(`/user/${user.id}`)}
            data-testid={`card-user-${user.id}`}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate" data-testid={`text-username-${user.id}`}>
                    {user.firstName || user.username}
                  </h4>
                  {user.username && (
                    <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                  )}
                </div>
                {user.isOnline && (
                  <Badge variant="default" className="flex-shrink-0 gap-1 bg-green-600 hover:bg-green-700" data-testid={`badge-online-${user.id}`}>
                    <Zap className="w-3 h-3" />
                    <span className="hidden sm:inline">Online</span>
                  </Badge>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Sheets Created:</span>
                  <span className="font-semibold" data-testid={`text-sheetcount-${user.id}`}>{user.sheetCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {allUsers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No users yet</p>
        </div>
      )}
    </div>
  );
}
