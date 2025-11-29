import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ClipboardCheck, Users, TrendingUp, Atom, FlaskConical, Leaf } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [view, setView] = useState<"landing" | "login" | "register">("landing");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({ title: "Error", description: "Username and password required", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    try {
      const normalizedUsername = username.replace(/\s+/g, '').trim();
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: normalizedUsername, password }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast({ title: "Error", description: error.message || "Login failed", variant: "destructive" });
        setPassword("");
        return;
      }

      const user = await res.json();
      localStorage.setItem("omr_auth", JSON.stringify({
        authenticated: true,
        id: user.id,
        username: user.username,
        name: user.firstName || user.username,
        timestamp: Date.now(),
      }));
      window.dispatchEvent(new Event("authChange"));
      setUsername("");
      setPassword("");
      toast({ title: "Success", description: `Welcome, ${user.firstName}!` });
      setTimeout(() => setLocation("/"), 100);
    } catch (error) {
      toast({ title: "Error", description: "Login failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !confirmPassword) {
      toast({ title: "Error", description: "All fields required", variant: "destructive" });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords don't match", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    try {
      const normalizedUsername = username.replace(/\s+/g, '').trim();
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: normalizedUsername, password }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast({ title: "Error", description: error.message || "Registration failed", variant: "destructive" });
        return;
      }

      const user = await res.json();
      localStorage.setItem("omr_auth", JSON.stringify({
        authenticated: true,
        id: user.id,
        username: user.username,
        name: user.firstName || user.username,
        timestamp: Date.now(),
      }));
      window.dispatchEvent(new Event("authChange"));
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      toast({ title: "Success", description: "Account created! Welcome!" });
      setTimeout(() => setLocation("/"), 100);
    } catch (error) {
      toast({ title: "Error", description: "Registration failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (view === "login") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold">Sign In</h1>
              <p className="text-sm text-muted-foreground mt-1">Access your NEET Tracker account</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                data-testid="input-login-username"
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-login-password"
              />
              <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button
                onClick={() => {
                  setView("register");
                  setUsername("");
                  setPassword("");
                }}
                className="text-primary hover:underline"
                data-testid="button-go-register"
              >
                Create one
              </button>
            </div>
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => {
                setView("landing");
                setUsername("");
                setPassword("");
              }}
              data-testid="button-back-landing"
            >
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === "register") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold">Create Account</h1>
              <p className="text-sm text-muted-foreground mt-1">Join NEET Tracker</p>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
              <Input
                placeholder="Choose username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                data-testid="input-register-username"
              />
              <Input
                type="password"
                placeholder="Create password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-register-password"
              />
              <Input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="input-register-confirm"
              />
              <Button type="submit" className="w-full" disabled={loading} data-testid="button-register">
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button
                onClick={() => {
                  setView("login");
                  setUsername("");
                  setPassword("");
                  setConfirmPassword("");
                }}
                className="text-primary hover:underline"
                data-testid="button-go-login"
              >
                Sign in
              </button>
            </div>
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => {
                setView("landing");
                setUsername("");
                setPassword("");
                setConfirmPassword("");
              }}
              data-testid="button-back-landing2"
            >
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-base sm:text-lg truncate">NEET Tracker</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-12 sm:py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 leading-tight">
              Track Your Practice Progress
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
              A simple way to track your Physics, Chemistry, and Biology practice sessions. 
              Mark what you've done, what you've practiced, and see how you compare with others.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => setView("login")}
                className="text-sm sm:text-base"
                data-testid="button-sign-in"
              >
                Sign In
              </Button>
              <Button
                size="lg"
                onClick={() => setView("register")}
                variant="outline"
                className="text-sm sm:text-base"
                data-testid="button-create-account"
              >
                Create Account
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="text-sm sm:text-base"
                data-testid="button-moderator"
              >
                <a href="/moderator">Moderator Panel</a>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16 px-4 bg-card/30">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-semibold text-center mb-8 sm:mb-12">Subjects You'll Track</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card className="hover-elevate">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-md mb-4 flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--physics))' }}>
                    <Atom className="w-6 h-6" style={{ color: 'hsl(var(--physics-foreground))' }} />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2">Physics</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    Track 8 physics questions per session. Mark as done and practiced to monitor your progress.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-md mb-4 flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--chemistry))' }}>
                    <FlaskConical className="w-6 h-6" style={{ color: 'hsl(var(--chemistry-foreground))' }} />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2">Chemistry</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    Keep up with 8 chemistry questions. Visual indicators show completion and practice status.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-md mb-4 flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--biology))' }}>
                    <Leaf className="w-6 h-6" style={{ color: 'hsl(var(--biology-foreground))' }} />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2">Biology</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    Monitor 8 biology questions each session. Easy tracking with intuitive toggles.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-semibold text-center mb-8 sm:mb-12">Why Use NEET Tracker?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <ClipboardCheck className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-2 text-sm sm:text-base">Easy Tracking</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Simple toggles to mark questions as Done or Not Done, with practice status tracking.
                </p>
              </div>

              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-2 text-sm sm:text-base">Activity Feed</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  See what others are doing. Track peer progress and stay motivated together.
                </p>
              </div>

              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-2 text-sm sm:text-base">Progress Stats</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  View your completion rates and practice percentages across all subjects.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 sm:py-8 px-4 mt-auto">
        <div className="max-w-6xl mx-auto text-center text-xs sm:text-sm text-muted-foreground">
          <p>NEET Tracker - Track your practice progress effectively</p>
        </div>
      </footer>
    </div>
  );
}
