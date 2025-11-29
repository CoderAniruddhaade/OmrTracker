import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Atom, FlaskConical, Leaf, ClipboardCheck, Circle } from "lucide-react";
import type { OmrSheetWithUser } from "@shared/schema";
import { Link } from "wouter";
import { memo } from "react";

interface OnlineUser {
  userId: string;
  isOnline: boolean;
  lastSeen: string;
}

interface ActivityFeedProps {
  limit?: number;
  showViewAll?: boolean;
}

export default function ActivityFeed({ limit, showViewAll = false }: ActivityFeedProps) {
  const { data: activities, isLoading } = useQuery<OmrSheetWithUser[]>({
    queryKey: ["/api/activity"],
  });

  const { data: onlineUsersData = [] } = useQuery<OnlineUser[]>({
    queryKey: ["/api/online-users"],
    refetchInterval: 500,
    staleTime: 0,
  });

  const OFFLINE_TIMEOUT = 2000;
  const now = new Date().getTime();
  
  const onlineUserMap = new Map(
    onlineUsersData
      .filter(u => {
        const lastSeenTime = new Date(u.lastSeen).getTime();
        return u.isOnline && (now - lastSeenTime) < OFFLINE_TIMEOUT;
      })
      .map(u => [u.userId, true])
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No activity yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Be the first to submit a practice sheet!
          </p>
        </CardContent>
      </Card>
    );
  }

  const displayActivities = limit ? activities.slice(0, limit) : activities;

  return (
    <div className="space-y-4">
      {displayActivities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} onlineUserMap={onlineUserMap} />
      ))}
      
      {showViewAll && activities.length > (limit || 0) && (
        <div className="text-center pt-2">
          <span 
            className="text-sm text-muted-foreground"
          >
            {activities.length} total submissions
          </span>
        </div>
      )}
    </div>
  );
}

interface SubjectProgressProps {
  icon: typeof Atom;
  label: string;
  progress: number;
  practiced: number;
  colorVar: string;
}

const ActivityCard = memo(function ActivityCard({ activity, onlineUserMap }: { activity: OmrSheetWithUser; onlineUserMap: Map<string, boolean> }) {
  const stats = useMemo(() => {
    const physicsChapters = Object.values(activity.physics.chapters || {});
    const chemistryChapters = Object.values(activity.chemistry.chapters || {});
    const biologyChapters = Object.values(activity.biology.chapters || {});

    const physicsDone = physicsChapters.filter(ch => ch.done).length;
    const chemistryDone = chemistryChapters.filter(ch => ch.done).length;
    const biologyDone = biologyChapters.filter(ch => ch.done).length;

    const physicsProgress = physicsChapters.length > 0 ? (physicsDone / physicsChapters.length) * 100 : 0;
    const chemistryProgress = chemistryChapters.length > 0 ? (chemistryDone / chemistryChapters.length) * 100 : 0;
    const biologyProgress = biologyChapters.length > 0 ? (biologyDone / biologyChapters.length) * 100 : 0;

    const physicsPracticed = physicsChapters.filter(ch => ch.practiced).length;
    const chemistryPracticed = chemistryChapters.filter(ch => ch.practiced).length;
    const biologyPracticed = biologyChapters.filter(ch => ch.practiced).length;

    const totalDone = physicsDone + chemistryDone + biologyDone;
    const totalChapters = physicsChapters.length + chemistryChapters.length + biologyChapters.length;
    const totalPracticed = physicsPracticed + chemistryPracticed + biologyPracticed;

    return {
      physicsProgress, chemistryProgress, biologyProgress,
      physicsPracticed, chemistryPracticed, biologyPracticed,
      totalDone, totalChapters, totalPracticed
    };
  }, [activity]);

  const userName = useMemo(() => {
    // If both firstName and lastName are set and not just IDs, use them
    if (activity.user?.firstName && activity.user?.lastName) {
      return `${activity.user.firstName} ${activity.user.lastName}`;
    }
    // If only firstName is set and not just an ID, use it
    if (activity.user?.firstName && activity.user.firstName.length > 8) {
      return activity.user.firstName;
    }
    // Otherwise fall back to username
    return activity.user?.username || activity.user?.email || "Anonymous";
  }, [activity.user]);

  const initials = useMemo(() => userName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2), [userName]);

  return (
    <Link href={`/user/${activity.userId}`} data-testid={`link-activity-${activity.id}`}>
      <Card className="hover-elevate cursor-pointer overflow-visible">
        <CardContent className="py-4">
          <div className="flex items-start gap-4">
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage 
                src={activity.user?.profileImageUrl || undefined} 
                alt={userName}
                className="object-cover"
              />
              <AvatarFallback className="text-sm">{initials}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-sm truncate" data-testid={`text-user-${activity.id}`}>
                    {userName}
                  </span>
                  {onlineUserMap.has(activity.userId) && (
                    <Circle className="w-2 h-2 fill-green-500 text-green-500 flex-shrink-0" data-testid={`badge-online-${activity.userId}`} />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  completed a practice sheet
                </span>
              </div>
              
              <p className="text-xs text-muted-foreground mb-3">
                {activity.name} • {formatDistanceToNow(new Date(activity.createdAt!), { addSuffix: true })}
              </p>

              <div className="grid grid-cols-3 gap-3">
                <SubjectProgress 
                  icon={Atom} 
                  label="Physics" 
                  progress={stats.physicsProgress}
                  practiced={stats.physicsPracticed}
                  colorVar="var(--physics)"
                />
                <SubjectProgress 
                  icon={FlaskConical} 
                  label="Chemistry" 
                  progress={stats.chemistryProgress}
                  practiced={stats.chemistryPracticed}
                  colorVar="var(--chemistry)"
                />
                <SubjectProgress 
                  icon={Leaf} 
                  label="Biology" 
                  progress={stats.biologyProgress}
                  practiced={stats.biologyPracticed}
                  colorVar="var(--biology)"
                />
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                {stats.totalDone}/{stats.totalChapters}
              </Badge>
              {stats.totalPracticed > 0 && (
                <Badge 
                  variant="secondary" 
                  className="text-xs whitespace-nowrap"
                  style={{ 
                    backgroundColor: 'hsl(var(--chemistry) / 0.15)',
                    color: 'hsl(var(--chemistry))'
                  }}
                >
                  {stats.totalPracticed}P
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});

const SubjectProgress = memo(function SubjectProgress({ icon: Icon, label, progress, practiced, colorVar }: SubjectProgressProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Icon className="w-3 h-3" style={{ color: `hsl(${colorVar})` }} />
        <span className="text-[10px] text-muted-foreground truncate">{label}</span>
        {practiced > 0 && (
          <span className="text-[10px] font-medium" style={{ color: 'hsl(var(--chemistry))' }}>
            +{practiced}P
          </span>
        )}
      </div>
      <Progress 
        value={progress} 
        className="h-1.5"
        style={{ 
          ['--progress-background' as string]: `hsl(${colorVar} / 0.2)`,
          ['--progress-foreground' as string]: `hsl(${colorVar})`,
        }}
      />
    </div>
  );
});
