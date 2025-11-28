import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheck, TrendingUp, BookOpen, Target } from "lucide-react";
import type { User, OmrSheet } from "@shared/schema";
import { Link } from "wouter";

interface UserStatsProps {
  user?: User;
  isLoading?: boolean;
}

export default function UserStats({ user, isLoading }: UserStatsProps) {
  const { data: sheets } = useQuery<OmrSheet[]>({
    queryKey: ["/api/my-sheets"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) return null;

  const userName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.firstName || user.email || "User";

  const initials = userName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const totalSheets = sheets?.length || 0;
  
  const totalDone = !sheets ? 0 : sheets.reduce((acc, sheet) => {
    const physicsDone = Object.values(sheet?.physics?.chapters || {}).filter(ch => ch?.done).length;
    const chemistryDone = Object.values(sheet?.chemistry?.chapters || {}).filter(ch => ch?.done).length;
    const biologyDone = Object.values(sheet?.biology?.chapters || {}).filter(ch => ch?.done).length;
    return acc + physicsDone + chemistryDone + biologyDone;
  }, 0);

  const totalPracticed = !sheets ? 0 : sheets.reduce((acc, sheet) => {
    const physicsPracticed = Object.values(sheet?.physics?.chapters || {}).filter(ch => ch?.practiced).length;
    const chemistryPracticed = Object.values(sheet?.chemistry?.chapters || {}).filter(ch => ch?.practiced).length;
    const biologyPracticed = Object.values(sheet?.biology?.chapters || {}).filter(ch => ch?.practiced).length;
    return acc + physicsPracticed + chemistryPracticed + biologyPracticed;
  }, 0);

  const totalChapters = !sheets ? 0 : sheets.reduce((acc, sheet) => {
    const physicsCount = Object.keys(sheet?.physics?.chapters || {}).length;
    const chemistryCount = Object.keys(sheet?.chemistry?.chapters || {}).length;
    const biologyCount = Object.keys(sheet?.biology?.chapters || {}).length;
    return acc + physicsCount + chemistryCount + biologyCount;
  }, 0);

  const avgCompletion = totalChapters > 0 
    ? Math.round((totalDone / totalChapters) * 100) 
    : 0;

  const practiceRate = totalDone > 0
    ? Math.round((totalPracticed / totalDone) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-4">
          <Avatar className="w-14 h-14">
            <AvatarImage 
              src={user.profileImageUrl || undefined} 
              alt={userName}
              className="object-cover"
            />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg" data-testid="text-current-user-name">{userName}</CardTitle>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={ClipboardCheck}
            label="Total Sheets"
            value={totalSheets.toString()}
          />
          <StatCard
            icon={Target}
            label="Avg Completion"
            value={`${avgCompletion}%`}
          />
          <StatCard
            icon={TrendingUp}
            label="Questions Done"
            value={totalDone.toString()}
          />
          <StatCard
            icon={BookOpen}
            label="Practice Rate"
            value={`${practiceRate}%`}
          />
        </div>

        <Link 
          href="/my-sheets" 
          className="block text-center text-sm text-primary hover:underline pt-2"
          data-testid="link-view-my-sheets"
        >
          View All My Sheets
        </Link>
      </CardContent>
    </Card>
  );
}

interface StatCardProps {
  icon: typeof ClipboardCheck;
  label: string;
  value: string;
}

function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div className="p-3 rounded-md bg-muted/50">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
