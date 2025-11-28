import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Atom, FlaskConical, Leaf, ClipboardCheck } from "lucide-react";
import type { OmrSheetWithUser } from "@shared/schema";
import { Link } from "wouter";

interface ActivityFeedProps {
  limit?: number;
  showViewAll?: boolean;
}

export default function ActivityFeed({ limit, showViewAll = false }: ActivityFeedProps) {
  const { data: activities, isLoading } = useQuery<OmrSheetWithUser[]>({
    queryKey: ["/api/activity"],
  });

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
            Be the first to submit an OMR sheet!
          </p>
        </CardContent>
      </Card>
    );
  }

  const displayActivities = limit ? activities.slice(0, limit) : activities;

  return (
    <div className="space-y-4">
      {displayActivities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
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

function ActivityCard({ activity }: { activity: OmrSheetWithUser }) {
  const physicsProgress = (activity.physics.questions.filter(q => q.done).length / 8) * 100;
  const chemistryProgress = (activity.chemistry.questions.filter(q => q.done).length / 8) * 100;
  const biologyProgress = (activity.biology.questions.filter(q => q.done).length / 8) * 100;

  const physicsPracticed = activity.physics.questions.filter(q => q.practiced).length;
  const chemistryPracticed = activity.chemistry.questions.filter(q => q.practiced).length;
  const biologyPracticed = activity.biology.questions.filter(q => q.practiced).length;

  const totalDone = 
    activity.physics.questions.filter(q => q.done).length +
    activity.chemistry.questions.filter(q => q.done).length +
    activity.biology.questions.filter(q => q.done).length;

  const totalPracticed = physicsPracticed + chemistryPracticed + biologyPracticed;

  const userName = activity.user?.firstName && activity.user?.lastName
    ? `${activity.user.firstName} ${activity.user.lastName}`
    : activity.user?.firstName || activity.user?.email || "Anonymous";

  const initials = userName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
                <span className="font-semibold text-sm truncate" data-testid={`text-user-${activity.id}`}>
                  {userName}
                </span>
                <span className="text-xs text-muted-foreground">
                  completed OMR sheet
                </span>
              </div>
              
              <p className="text-xs text-muted-foreground mb-3">
                {activity.name} • {formatDistanceToNow(new Date(activity.createdAt!), { addSuffix: true })}
              </p>

              <div className="grid grid-cols-3 gap-3">
                <SubjectProgress 
                  icon={Atom} 
                  label="Physics" 
                  progress={physicsProgress}
                  practiced={physicsPracticed}
                  colorVar="var(--physics)"
                />
                <SubjectProgress 
                  icon={FlaskConical} 
                  label="Chemistry" 
                  progress={chemistryProgress}
                  practiced={chemistryPracticed}
                  colorVar="var(--chemistry)"
                />
                <SubjectProgress 
                  icon={Leaf} 
                  label="Biology" 
                  progress={biologyProgress}
                  practiced={biologyPracticed}
                  colorVar="var(--biology)"
                />
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                {totalDone}/24
              </Badge>
              {totalPracticed > 0 && (
                <Badge 
                  variant="secondary" 
                  className="text-xs whitespace-nowrap"
                  style={{ 
                    backgroundColor: 'hsl(var(--chemistry) / 0.15)',
                    color: 'hsl(var(--chemistry))'
                  }}
                >
                  {totalPracticed}P
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

interface SubjectProgressProps {
  icon: typeof Atom;
  label: string;
  progress: number;
  practiced: number;
  colorVar: string;
}

function SubjectProgress({ icon: Icon, label, progress, practiced, colorVar }: SubjectProgressProps) {
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
}
