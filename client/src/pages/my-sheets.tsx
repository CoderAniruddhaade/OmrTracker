import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ClipboardCheck, Atom, FlaskConical, Leaf, Plus, Download, FileText } from "lucide-react";
import { format } from "date-fns";
import type { OmrSheet } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { exportIndividualReportPDF, exportIndividualReportWord } from "@/lib/pdfExport";

export default function MySheets() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const [exportingId, setExportingId] = useState<string | null>(null);

  const { data: sheets, isLoading, error } = useQuery<OmrSheet[]>({
    queryKey: ["/api/my-sheets"],
  });

  const handleExport = async (sheet: OmrSheet, format: "pdf" | "word") => {
    try {
      setExportingId(sheet.id);
      const userName = user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`
        : user?.firstName || user?.email || "User";
      
      if (format === "pdf") {
        await exportIndividualReportPDF(sheet, userName);
      } else {
        await exportIndividualReportWord(sheet, userName);
      }
      
      toast({
        title: "Success",
        description: `${format.toUpperCase()} exported successfully!`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to export ${format.toUpperCase()}`,
        variant: "destructive",
      });
    } finally {
      setExportingId(null);
    }
  };

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
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button onClick={() => setLocation("/")} data-testid="button-new-sheet">
            <Plus className="w-4 h-4 mr-2" />
            New Sheet
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              My NEET Sheets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!sheets || sheets.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No sheets submitted yet</p>
                <Button onClick={() => setLocation("/")} data-testid="button-create-first">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Sheet
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {sheets.map((sheet) => (
                  <SheetCard 
                    key={sheet.id} 
                    sheet={sheet} 
                    onExport={handleExport}
                    isExporting={exportingId === sheet.id}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface SheetCardProps {
  sheet: OmrSheet;
  onExport: (sheet: OmrSheet, format: "pdf" | "word") => Promise<void>;
  isExporting: boolean;
}

function SheetCard({ sheet, onExport, isExporting }: SheetCardProps) {
  const physicsChapters = Object.values(sheet.physics.chapters || {});
  const chemistryChapters = Object.values(sheet.chemistry.chapters || {});
  const biologyChapters = Object.values(sheet.biology.chapters || {});

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

  return (
    <div className="p-4 rounded-md border border-border bg-card/50 hover-elevate">
      <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h3 className="font-semibold mb-1" data-testid={`text-sheet-${sheet.id}`}>
            {sheet.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {format(new Date(sheet.createdAt!), "EEEE, MMMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Badge variant="outline" className="py-1 px-2.5">
            {totalDone}/{totalChapters} Done
          </Badge>
          {totalPracticed > 0 && (
            <Badge 
              variant="secondary"
              className="py-1 px-2.5"
              style={{ 
                backgroundColor: 'hsl(var(--chemistry) / 0.15)',
                color: 'hsl(var(--chemistry))'
              }}
            >
              {totalPracticed} Practiced
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onExport(sheet, "pdf")}
            disabled={isExporting}
            data-testid={`button-export-pdf-${sheet.id}`}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {isExporting ? "..." : "PDF"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onExport(sheet, "word")}
            disabled={isExporting}
            data-testid={`button-export-word-${sheet.id}`}
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            {isExporting ? "..." : "Word"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SubjectProgressCard
          icon={Atom}
          label="Physics"
          done={physicsDone}
          practiced={physicsPracticed}
          progress={physicsProgress}
          colorVar="var(--physics)"
        />
        <SubjectProgressCard
          icon={FlaskConical}
          label="Chemistry"
          done={chemistryDone}
          practiced={chemistryPracticed}
          progress={chemistryProgress}
          colorVar="var(--chemistry)"
        />
        <SubjectProgressCard
          icon={Leaf}
          label="Biology"
          done={biologyDone}
          practiced={biologyPracticed}
          progress={biologyProgress}
          colorVar="var(--biology)"
        />
      </div>
    </div>
  );
}

interface SubjectProgressCardProps {
  icon: typeof Atom;
  label: string;
  done: number;
  practiced: number;
  progress: number;
  colorVar: string;
}

function SubjectProgressCard({ icon: Icon, label, done, practiced, progress, colorVar }: SubjectProgressCardProps) {
  // Get total for this subject based on label
  let total = 8; // Default fallback
  if (label === "Physics") total = 4;
  else if (label === "Chemistry") total = 2;
  else if (label === "Biology") total = 6;

  return (
    <div className="p-3 rounded-md bg-muted/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color: `hsl(${colorVar})` }} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-xs text-muted-foreground">{done}/{total}</span>
      </div>
      <Progress 
        value={progress} 
        className="h-2 mb-1.5"
        style={{ 
          ['--progress-background' as string]: `hsl(${colorVar} / 0.2)`,
          ['--progress-foreground' as string]: `hsl(${colorVar})`,
        }}
      />
      {practiced > 0 && (
        <p className="text-[10px]" style={{ color: 'hsl(var(--chemistry))' }}>
          {practiced} practiced
        </p>
      )}
    </div>
  );
}
