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

  const { data: user, isLoading, refetch, isError, status } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 0,
    refetchInterval: 5000, // Poll every 5 seconds to detect ban status
  });

  // Handle ban: if API returns error, logout user
  useEffect(() => {
    if ((status === "error" || isError) && localUser) {
      // User was authenticated but now getting error - likely banned
      localStorage.removeItem("user");
      localStorage.removeItem("omr_auth");
      setLocalUser(null);
      setWasBanned(true);
      
      // Dispatch custom event so other parts of app can show toast
      window.dispatchEvent(new CustomEvent("userBanned", { detail: { message: "Your account has been banned." } }));
    }
  }, [status, isError, localUser]);

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
