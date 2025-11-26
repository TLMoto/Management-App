"use client";

import { createContext, useContext, useState, useEffect } from "react";

const UserIdContext = createContext<{
  userId: string | null;
  setUserId: (id: string) => void;
}>({
  userId: null,
  setUserId: () => {},
});

export function UserIdProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserIdState] = useState<string | null>(null);

  // Load from localStorage ONCE when app loads
  useEffect(() => {
    const stored = localStorage.getItem("userId");
    if (stored) setUserIdState(stored);
  }, []);

  // When value changes, save to localStorage
  const setUserId = (id: string) => {
    setUserIdState(id);
    localStorage.setItem("userId", id);
  };

  return <UserIdContext.Provider value={{ userId, setUserId }}>{children}</UserIdContext.Provider>;
}

export function useUserId() {
  return useContext(UserIdContext);
}
