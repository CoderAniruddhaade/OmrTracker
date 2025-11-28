import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardCheck, Activity, Plus, LogOut, Download, FileText, Users, Settings, MessageCircle } from "lucide-react";
import { Link } from "wouter";
import OMRSheetForm from "@/components/omr-sheet-form";
import ActivityFeed from "@/components/activity-feed";
import UserStats from "@/components/user-stats";
import Bakchodi from "@/components/pro-chat";
import PrivateChat from "@/components/private-chat";
import UsersDirectory from "@/components/users-directory";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { exportComparativeReportPDF, exportComparativeReportWord } from "@/lib/pdfExport";
import type { OmrSheetWithUser } from "@shared/schema";

export default function Home() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("new-sheet");
  const [isExporting, setIsExporting] = useState(false);

  // Set online status
  useEffect(() => {
    const setOnline = async () => {
      try {
        await apiRequest("POST", "/api/presence/true", {});
      } catch (e) {
        console.error("Failed to set online status");
      }
    };
    
    setOnline();
    
    const interval = setInterval(setOnline, 30000);
    
    return () => {
      clearInterval(interval);
      apiRequest("POST", "/api/presence/false", {}).catch(() => {});
    };
  }, []);

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
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-base sm:text-lg hidden sm:block">OMR Tracker</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />
            <Link to="/settings">
              <Button size="sm" variant="outline" data-testid="button-settings" className="text-xs sm:text-sm">
                <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            </Link>
            <Button size="sm" variant="outline" onClick={() => {
              localStorage.removeItem("omr_auth");
              window.location.href = "/";
            }} data-testid="button-logout" className="text-xs sm:text-sm">
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-6 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          <aside className="lg:col-span-1 order-2 lg:order-1">
            <div className="sticky top-20 sm:top-24 space-y-4 sm:space-y-6">
              <UserStats user={user} isLoading={isLoading} />
              
              <div className="hidden lg:block">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm sm:text-base">
                  <Activity className="w-4 h-4" />
                  Recent Activity
                </h3>
                <ScrollArea className="h-[300px] sm:h-[400px]">
                  <ActivityFeed limit={5} showViewAll />
                </ScrollArea>
              </div>
            </div>
          </aside>

          <div className="lg:col-span-3 order-1 lg:order-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <TabsList className="grid w-full sm:w-auto grid-cols-4">
                  <TabsTrigger value="new-sheet" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm" data-testid="tab-new-sheet">
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">New Sheet</span>
                    <span className="sm:hidden">New</span>
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm" data-testid="tab-activity">
                    <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">All Activity</span>
                    <span className="sm:hidden">Activity</span>
                  </TabsTrigger>
                  <TabsTrigger value="private-chat" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm" data-testid="tab-private-chat">
                    <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Private Chat</span>
                    <span className="sm:hidden">Chat</span>
                  </TabsTrigger>
                  <TabsTrigger value="users" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm" data-testid="tab-users">
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Community</span>
                    <span className="sm:hidden">Users</span>
                  </TabsTrigger>
                </TabsList>
                {activeTab === "activity" && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExportComparative("pdf")}
                      disabled={isExporting || !activities?.length}
                      data-testid="button-export-comparative-pdf"
                      className="text-xs flex-1 sm:flex-none"
                    >
                      <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 sm:mr-1.5" />
                      <span className="hidden sm:inline">{isExporting ? "..." : "PDF"}</span>
                      <span className="sm:hidden">{isExporting ? "..." : "PDF"}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExportComparative("word")}
                      disabled={isExporting || !activities?.length}
                      data-testid="button-export-comparative-word"
                      className="text-xs flex-1 sm:flex-none"
                    >
                      <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 sm:mr-1.5" />
                      <span className="hidden sm:inline">{isExporting ? "..." : "Word"}</span>
                      <span className="sm:hidden">{isExporting ? "..." : "Doc"}</span>
                    </Button>
                  </div>
                )}
              </div>


              <TabsContent value="activity" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <div className="mb-4">
                      <h2 className="text-lg sm:text-xl font-semibold mb-2">Activity Feed</h2>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        See what everyone is working on
                      </p>
                    </div>
                    <ActivityFeed />
                  </div>
                  <div>
                    <Bakchodi />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="new-sheet" className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <OMRSheetForm />
                </div>
                <div>
                  <Bakchodi />
                </div>
              </TabsContent>

              <TabsContent value="private-chat" className="mt-0">
                <PrivateChat />
              </TabsContent>

              <TabsContent value="users" className="mt-0">
                <UsersDirectory />
              </TabsContent>
            </Tabs>
          </div>

        </div>
      </main>
    </div>
  );
}
