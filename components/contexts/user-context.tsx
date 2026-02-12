"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { UserResponse } from "@/lib/types";
import { AuthService } from "@/api/services";

interface UserContextType {
  user: UserResponse | null;
  loading: boolean;
  error: Error | null;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const userData = await AuthService.getCurrentUser();
      setUser(userData);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch user in context", err);
      setError(
        err instanceof Error ? err : new Error("Failed to fetch user data"),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        error,
        refreshUser: fetchUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
