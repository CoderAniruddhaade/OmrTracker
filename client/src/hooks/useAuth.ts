import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { User } from "@shared/schema";

export function useAuth() {
  const [localUser, setLocalUser] = useState<any>(null);
  
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

  const { data: user, isLoading, refetch } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 0,
  });

  // Use localStorage user if available, otherwise use API user
  const finalUser = localUser || user;

  return {
    user: finalUser ?? undefined,
    isLoading,
    isAuthenticated: !!finalUser,
    refetch,
  };
}
