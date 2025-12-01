"use client";

import { createContext, useContext, useState, useEffect } from "react";

// 1. Define the User Interface based on your requirements
export interface User {
  id: string;
  nome: string;
  funcao: string;
  department: string;
  istId: number; // TypeScript uses 'number' for integers
}

// 3. Create the Context
const UserContext = createContext<{
  user: User | null;
  setUser: (user: User | null) => void;
}>({
  user: null,
  setUser: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);

  // Load from localStorage ONCE when app loads
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        // We must parse the JSON string back into an object
        setUserState(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to parse user data:", error);
        localStorage.removeItem("user"); // Clean up corrupt data
      }
    }
  }, []);

  // When value changes, save to (or remove from) localStorage
  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    
    if (newUser) {
      // Store object as a JSON string
      localStorage.setItem("user", JSON.stringify(newUser));
    } else {
      // If null is passed (logout), remove from storage
      localStorage.removeItem("user");
    }
  };

  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>

}

export function useUser() {
  return useContext(UserContext);
}

export function hasPermission(role: string): boolean {
    const regex = /^(Sublíder|Líder)(?: de .+)?$/;
    return regex.test(role);
}

