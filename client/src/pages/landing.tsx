import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ClipboardCheck, Users, TrendingUp, Atom, FlaskConical, Leaf } from "lucide-react";

const PASSWORD = "NEETKeLavde";

export default function Landing() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === PASSWORD) {
      setIsAuthenticated(true);
      setError("");
      setPassword("");
    } else {
      setError("Incorrect password");
      setPassword("");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-md bg-primary flex items-center justify-center mx-auto mb-3">
                <ClipboardCheck className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">OMR Tracker</h1>
              <p className="text-sm text-muted-foreground mt-2">Enter password to access</p>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-password"
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
              <Button type="submit" className="w-full" data-testid="button-unlock">
                Unlock
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">OMR Tracker</span>
          </div>
          <Button asChild data-testid="button-login">
            <a href="/api/login">Sign In</a>
          </Button>
        </div>
      </header>

      <main>
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Track Your Practice Progress
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              A simple way to track your Physics, Chemistry, and Biology practice sessions. 
              Mark what you've done, what you've practiced, and see how you compare with others.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild data-testid="button-get-started">
                <a href="/api/login">Get Started</a>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-card/30">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-semibold text-center mb-12">Subjects You'll Track</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="hover-elevate">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-md mb-4 flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--physics))' }}>
                    <Atom className="w-6 h-6" style={{ color: 'hsl(var(--physics-foreground))' }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Physics</h3>
                  <p className="text-muted-foreground text-sm">
                    Track 8 physics questions per session. Mark as done and practiced to monitor your progress.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-md mb-4 flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--chemistry))' }}>
                    <FlaskConical className="w-6 h-6" style={{ color: 'hsl(var(--chemistry-foreground))' }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Chemistry</h3>
                  <p className="text-muted-foreground text-sm">
                    Keep up with 8 chemistry questions. Visual indicators show completion and practice status.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-md mb-4 flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--biology))' }}>
                    <Leaf className="w-6 h-6" style={{ color: 'hsl(var(--biology-foreground))' }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Biology</h3>
                  <p className="text-muted-foreground text-sm">
                    Monitor 8 biology questions each session. Easy tracking with intuitive toggles.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-semibold text-center mb-12">Why Use OMR Tracker?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <ClipboardCheck className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Easy Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Simple toggles to mark questions as Done or Not Done, with practice status tracking.
                </p>
              </div>

              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Activity Feed</h3>
                <p className="text-sm text-muted-foreground">
                  See what others are doing. Track peer progress and stay motivated together.
                </p>
              </div>

              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Progress Stats</h3>
                <p className="text-sm text-muted-foreground">
                  View your completion rates and practice percentages across all subjects.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p>OMR Tracker - Track your practice progress effectively</p>
        </div>
      </footer>
    </div>
  );
}
