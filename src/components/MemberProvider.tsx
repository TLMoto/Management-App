"use client";

import { createContext, useContext, useState } from "react";
import { User } from "../app/api/airtable/airtable";

const MemberContext = createContext<{
  members: User[];
  setMembers: (user: User[]) => void;
}>({
  members: [],
  setMembers: () => {},
});

export function MemberProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembersState] = useState<User[]>([]);

  // When value changes, save to (or remove from) localStorage
  const setMembers = (members: User[]) => {
    setMembersState(members);
  };

  return (
    <MemberContext.Provider value={{ members, setMembers }}>{children}</MemberContext.Provider>
  );
}

export function useMembers() {
  return useContext(MemberContext);
}
