import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { User } from "@shared/schema";

export function useAuth() {
  const [localUser, setLocalUser] = useState<any>(null);
  const [wasBanned, setWasBanned] = useState(false);
  
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setLocalUser(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse local user");
      }
    }
  }, []);

  const { data: user, isLoading, refetch, isError, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 0,
    refetchInterval: 2000, // Poll every 2 seconds to detect ban status quickly
    gcTime: 0, // Don't cache results
    queryFn: async () => {
      const response = await fetch("/api/auth/user");
      
      // If banned (403), logout immediately
      if (response.status === 403) {
        throw new Error("BANNED");
      }
      
      // If not authenticated (200 with null)
      if (!response.ok && response.status !== 200) {
        throw new Error("Not authenticated");
      }
      
      const data = await response.json();
      return data as User | null;
    },
  });

  // Handle ban: if query throws "BANNED" error, logout user
  useEffect(() => {
    if (error && error.message === "BANNED" && localUser) {
      // User was authenticated but now banned
      localStorage.removeItem("user");
      localStorage.removeItem("omr_auth");
      setLocalUser(null);
      setWasBanned(true);
      
      // Dispatch custom event so other parts of app can show toast
      window.dispatchEvent(new CustomEvent("userBanned", { detail: { message: "Your account has been banned." } }));
    }
  }, [error, localUser]);

  // Use localStorage user if available, otherwise use API user
  const finalUser = localUser || user;

  return {
    user: finalUser ?? undefined,
    isLoading,
    isAuthenticated: !!finalUser,
    refetch,
    wasBanned,
  };
}
