import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardCheck, Activity, Plus, LogOut } from "lucide-react";
import OMRSheetForm from "@/components/omr-sheet-form";
import ActivityFeed from "@/components/activity-feed";
import UserStats from "@/components/user-stats";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("new-sheet");

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
          <Button variant="outline" asChild data-testid="button-logout">
            <a href="/api/logout">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </a>
          </Button>
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
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="new-sheet" className="flex items-center gap-2" data-testid="tab-new-sheet">
                  <Plus className="w-4 h-4" />
                  New Sheet
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex items-center gap-2" data-testid="tab-activity">
                  <Activity className="w-4 h-4" />
                  All Activity
                </TabsTrigger>
              </TabsList>

              <TabsContent value="new-sheet" className="mt-0">
                <OMRSheetForm onSuccess={() => setActiveTab("activity")} />
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
