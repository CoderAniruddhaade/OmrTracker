import { useState, useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import UserProfile from "@/pages/user-profile";
import MySheets from "@/pages/my-sheets";
import Moderator from "@/pages/moderator";

function ProtectedRoute({ component: Component, isAuth, ...props }: { component: React.ComponentType<any>, isAuth: boolean, [key: string]: any }) {
  const { isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  if (!isAuth) {
    return <Redirect to="/" />;
  }
  
  return <Component {...props} />;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isLocalAuth, setIsLocalAuth] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem("omr_auth");
    if (auth) {
      try {
        const parsed = JSON.parse(auth);
        setIsLocalAuth(parsed.authenticated === true);
      } catch (e) {
        setIsLocalAuth(false);
      }
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Use local auth if available, otherwise fall back to API auth
  const authenticated = isLocalAuth || isAuthenticated;

  return (
    <Switch>
      <Route path="/">
        {authenticated ? <Home /> : <Landing />}
      </Route>
      <Route path="/my-sheets">
        <ProtectedRoute component={MySheets} isAuth={authenticated} />
      </Route>
      <Route path="/user/:userId">
        {(params) => <ProtectedRoute component={UserProfile} userId={params.userId} isAuth={authenticated} />}
      </Route>
      <Route path="/moderator">
        <Moderator />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
