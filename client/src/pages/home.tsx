import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardCheck, Activity, Plus, LogOut, Download, FileText } from "lucide-react";
import OMRSheetForm from "@/components/omr-sheet-form";
import ActivityFeed from "@/components/activity-feed";
import UserStats from "@/components/user-stats";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { exportComparativeReportPDF, exportComparativeReportWord } from "@/lib/pdfExport";
import type { OmrSheetWithUser } from "@shared/schema";

export default function Home() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("new-sheet");
  const [isExporting, setIsExporting] = useState(false);

  const { data: activities } = useQuery<OmrSheetWithUser[]>({
    queryKey: ["/api/activity"],
  });

  const handleExportComparative = async (format: "pdf" | "word") => {
    try {
      if (!activities || activities.length === 0) {
        toast({
          title: "No Data",
          description: "No activity data to export",
          variant: "destructive",
        });
        return;
      }
      setIsExporting(true);
      if (format === "pdf") {
        await exportComparativeReportPDF(activities);
      } else {
        await exportComparativeReportWord(activities);
      }
      toast({
        title: "Success",
        description: `Comparative report exported as ${format.toUpperCase()}!`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg hidden sm:block">OMR Tracker</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" asChild data-testid="button-logout">
              <a href="/api/logout">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <aside className="lg:col-span-1 order-2 lg:order-1">
            <div className="sticky top-24 space-y-6">
              <UserStats user={user} isLoading={isLoading} />
              
              <div className="hidden lg:block">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Recent Activity
                </h3>
                <ScrollArea className="h-[400px]">
                  <ActivityFeed limit={5} showViewAll />
                </ScrollArea>
              </div>
            </div>
          </aside>

          <div className="lg:col-span-2 order-1 lg:order-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="new-sheet" className="flex items-center gap-2" data-testid="tab-new-sheet">
                    <Plus className="w-4 h-4" />
                    New Sheet
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="flex items-center gap-2" data-testid="tab-activity">
                    <Activity className="w-4 h-4" />
                    All Activity
                  </TabsTrigger>
                </TabsList>
                {activeTab === "activity" && (
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExportComparative("pdf")}
                      disabled={isExporting || !activities?.length}
                      data-testid="button-export-comparative-pdf"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      {isExporting ? "..." : "PDF"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExportComparative("word")}
                      disabled={isExporting || !activities?.length}
                      data-testid="button-export-comparative-word"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1.5" />
                      {isExporting ? "..." : "Word"}
                    </Button>
                  </div>
                )}
              </div>

              <TabsContent value="new-sheet" className="mt-0">
                <OMRSheetForm />
              </TabsContent>

              <TabsContent value="activity" className="mt-0">
                <div className="lg:hidden mb-4">
                  <h2 className="text-xl font-semibold mb-2">Activity Feed</h2>
                  <p className="text-sm text-muted-foreground">
                    See what everyone is working on
                  </p>
                </div>
                <ActivityFeed />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
