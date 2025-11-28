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
  const [isLocalAuth, setIsLocalAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for auth
    const checkAuth = () => {
      const auth = localStorage.getItem("omr_auth");
      if (auth) {
        try {
          const parsed = JSON.parse(auth);
          setIsLocalAuth(parsed.authenticated === true);
        } catch (e) {
          setIsLocalAuth(false);
        }
      } else {
        setIsLocalAuth(false);
      }
    };
    
    checkAuth();
    setIsLoading(false);
    
    // Listen for storage changes (from other tabs or this tab)
    window.addEventListener("storage", checkAuth);
    
    // Listen for custom events from same page
    window.addEventListener("authChange", checkAuth);
    
    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("authChange", checkAuth);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/">
        {isLocalAuth ? <Home /> : <Landing />}
      </Route>
      <Route path="/my-sheets">
        {isLocalAuth ? <ProtectedRoute component={MySheets} isAuth={isLocalAuth} /> : <Redirect to="/" />}
      </Route>
      <Route path="/user/:userId">
        {isLocalAuth ? (params) => <ProtectedRoute component={UserProfile} userId={params.userId} isAuth={isLocalAuth} /> : <Redirect to="/" />}
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
