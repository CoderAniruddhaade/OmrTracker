import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ClipboardCheck, Atom, FlaskConical, Leaf, Calendar, Target, BookOpen, TrendingUp } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { User, OmrSheetWithUser } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface UserProfileProps {
  userId: string;
}

export default function UserProfile({ userId }: UserProfileProps) {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: profileData, isLoading, error } = useQuery<{ user: User; sheets: OmrSheetWithUser[] }>({
    queryKey: ["/api/users", userId],
    enabled: !!userId,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Skeleton className="h-8 w-32 mb-6" />
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center gap-4 mb-6">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Button variant="ghost" onClick={() => setLocation("/")} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">User not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { user, sheets } = profileData;

  const userName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.firstName || user.email || "User";

  const initials = userName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const totalSheets = sheets.length;
  
  const totalDone = sheets.reduce((acc, sheet) => {
    const phDone = Object.values(sheet.physics.chapters || {}).filter(q => q.done).length;
    const chDone = Object.values(sheet.chemistry.chapters || {}).filter(q => q.done).length;
    const biDone = Object.values(sheet.biology.chapters || {}).filter(q => q.done).length;
    return acc + phDone + chDone + biDone;
  }, 0);

  const totalPracticed = sheets.reduce((acc, sheet) => {
    const phPr = Object.values(sheet.physics.chapters || {}).filter(q => q.practiced).length;
    const chPr = Object.values(sheet.chemistry.chapters || {}).filter(q => q.practiced).length;
    const biPr = Object.values(sheet.biology.chapters || {}).filter(q => q.practiced).length;
    return acc + phPr + chPr + biPr;
  }, 0);

  const avgCompletion = totalSheets > 0 
    ? Math.round((totalDone / (totalSheets * 24)) * 100) 
    : 0;

  const practiceRate = totalDone > 0
    ? Math.round((totalPracticed / totalDone) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/")} 
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="mb-6">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <Avatar className="w-20 h-20">
                <AvatarImage 
                  src={user.profileImageUrl || undefined} 
                  alt={userName}
                  className="object-cover"
                />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold mb-1" data-testid="text-profile-name">
                  {userName}
                </h1>
                <p className="text-muted-foreground mb-4">{user.email}</p>
                
                <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                  <Badge variant="outline" className="py-1.5 px-3">
                    <ClipboardCheck className="w-4 h-4 mr-1.5" />
                    {totalSheets} Sheets
                  </Badge>
                  <Badge variant="outline" className="py-1.5 px-3">
                    <Target className="w-4 h-4 mr-1.5" />
                    {avgCompletion}% Avg Completion
                  </Badge>
                  <Badge 
                    variant="secondary" 
                    className="py-1.5 px-3"
                    style={{ 
                      backgroundColor: 'hsl(var(--chemistry) / 0.15)',
                      color: 'hsl(var(--chemistry))'
                    }}
                  >
                    <BookOpen className="w-4 h-4 mr-1.5" />
                    {practiceRate}% Practice Rate
                  </Badge>
                </div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold">{totalDone}</div>
                <div className="text-sm text-muted-foreground">Total Questions Done</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <SubjectStats 
            sheets={sheets} 
            subject="physics" 
            icon={Atom}
            colorVar="var(--physics)"
            label="Physics"
          />
          <SubjectStats 
            sheets={sheets} 
            subject="chemistry" 
            icon={FlaskConical}
            colorVar="var(--chemistry)"
            label="Chemistry"
          />
          <SubjectStats 
            sheets={sheets} 
            subject="biology" 
            icon={Leaf}
            colorVar="var(--biology)"
            label="Biology"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Activity History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sheets.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No sheets submitted yet
              </p>
            ) : (
              <div className="space-y-4">
                {sheets.map((sheet) => (
                  <SheetHistoryItem key={sheet.id} sheet={sheet} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface SubjectStatsProps {
  sheets: OmrSheetWithUser[];
  subject: "physics" | "chemistry" | "biology";
  icon: typeof Atom;
  colorVar: string;
  label: string;
}

function SubjectStats({ sheets, subject, icon: Icon, colorVar, label }: SubjectStatsProps) {
  const totalDone = sheets.reduce((acc, sheet) => {
    const chapters = Object.values(sheet[subject].chapters || {});
    return acc + chapters.filter(ch => ch.done).length;
  }, 0);
  const totalPracticed = sheets.reduce((acc, sheet) => {
    const chapters = Object.values(sheet[subject].chapters || {});
    return acc + chapters.filter(ch => ch.practiced).length;
  }, 0);
  const totalChapters = sheets.reduce((acc, sheet) => {
    const chapters = Object.values(sheet[subject].chapters || {});
    return acc + chapters.length;
  }, 0);
  const maxPossible = totalChapters;
  const completion = maxPossible > 0 ? Math.round((totalDone / maxPossible) * 100) : 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-4">
          <div 
            className="w-10 h-10 rounded-md flex items-center justify-center"
            style={{ backgroundColor: `hsl(${colorVar})` }}
          >
            <Icon className="w-5 h-5" style={{ color: `hsl(${colorVar.replace(/\d+%$/, '98%')})` }} />
          </div>
          <div>
            <h3 className="font-semibold">{label}</h3>
            <p className="text-xs text-muted-foreground">{totalDone}/{maxPossible} done</p>
          </div>
        </div>
        
        <Progress 
          value={completion} 
          className="h-2 mb-3"
          style={{ 
            ['--progress-background' as string]: `hsl(${colorVar} / 0.2)`,
            ['--progress-foreground' as string]: `hsl(${colorVar})`,
          }}
        />
        
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{completion}% Complete</span>
          <span style={{ color: 'hsl(var(--chemistry))' }}>{totalPracticed} Practiced</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SheetHistoryItem({ sheet }: { sheet: OmrSheetWithUser }) {
  const physicsChapters = Object.values(sheet.physics.chapters || {});
  const chemistryChapters = Object.values(sheet.chemistry.chapters || {});
  const biologyChapters = Object.values(sheet.biology.chapters || {});

  const physicsProgress = physicsChapters.length > 0 ? (physicsChapters.filter(q => q.done).length / physicsChapters.length) * 100 : 0;
  const chemistryProgress = chemistryChapters.length > 0 ? (chemistryChapters.filter(q => q.done).length / chemistryChapters.length) * 100 : 0;
  const biologyProgress = biologyChapters.length > 0 ? (biologyChapters.filter(q => q.done).length / biologyChapters.length) * 100 : 0;

  const totalDone = 
    physicsChapters.filter(q => q.done).length +
    chemistryChapters.filter(q => q.done).length +
    biologyChapters.filter(q => q.done).length;

  const totalPracticed = 
    physicsChapters.filter(q => q.practiced).length +
    chemistryChapters.filter(q => q.practiced).length +
    biologyChapters.filter(q => q.practiced).length;

  const totalChapters = physicsChapters.length + chemistryChapters.length + biologyChapters.length;

  return (
    <div className="p-4 rounded-md border border-border bg-card/50">
      <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
        <div>
          <h4 className="font-medium" data-testid={`text-sheet-name-${sheet.id}`}>{sheet.name}</h4>
          <p className="text-xs text-muted-foreground">
            {format(new Date(sheet.createdAt!), "PPP 'at' p")}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">{totalDone}/{totalChapters}</Badge>
          {totalPracticed > 0 && (
            <Badge 
              variant="secondary"
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

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Atom className="w-3 h-3" style={{ color: 'hsl(var(--physics))' }} />
            <span className="text-[10px] text-muted-foreground">Physics</span>
          </div>
          <Progress 
            value={physicsProgress} 
            className="h-1.5"
            style={{ 
              ['--progress-background' as string]: 'hsl(var(--physics) / 0.2)',
              ['--progress-foreground' as string]: 'hsl(var(--physics))',
            }}
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <FlaskConical className="w-3 h-3" style={{ color: 'hsl(var(--chemistry))' }} />
            <span className="text-[10px] text-muted-foreground">Chemistry</span>
          </div>
          <Progress 
            value={chemistryProgress} 
            className="h-1.5"
            style={{ 
              ['--progress-background' as string]: 'hsl(var(--chemistry) / 0.2)',
              ['--progress-foreground' as string]: 'hsl(var(--chemistry))',
            }}
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Leaf className="w-3 h-3" style={{ color: 'hsl(var(--biology))' }} />
            <span className="text-[10px] text-muted-foreground">Biology</span>
          </div>
          <Progress 
            value={biologyProgress} 
            className="h-1.5"
            style={{ 
              ['--progress-background' as string]: 'hsl(var(--biology) / 0.2)',
              ['--progress-foreground' as string]: 'hsl(var(--biology))',
            }}
          />
        </div>
      </div>
    </div>
  );
}
