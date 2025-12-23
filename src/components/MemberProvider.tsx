"use client";
import { createContext, useContext, useState, useMemo } from "react";
import { User } from "../components/Interfaces";

const MemberContext = createContext<{
  members: User[];
  setMembers: (user: User[]) => void;
}>({
  members: [],
  setMembers: () => {},
});

export function MemberProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembersState] = useState<User[]>([]);

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

/**
 * Hook to get members organized by area (department) and sorted by department name
 * Returns a Map where:
 * - Key: area/department name
 * - Value: array of users in that department, sorted alphabetically
 */
export function useMembersByArea() {
  const { members } = useMembers();

  const membersByArea = useMemo(() => {
    const grouped = new Map<string, User[]>();

    // Group members by department
    members.forEach(member => {
      const area = member.department || "Sem Departamento";
      if (!grouped.has(area)) {
        grouped.set(area, []);
      }
      grouped.get(area)!.push(member);
    });

    // Sort departments alphabetically and sort members within each department
    const sorted = new Map(
      Array.from(grouped.entries())
        .sort(([areaA], [areaB]) => areaA.localeCompare(areaB))
        .map(([area, users]) => [area, users.sort((a, b) => a.nome.localeCompare(b.nome))])
    );

    return sorted;
  }, [members]);

  return membersByArea;
}

/**
 * Alternative hook that returns an array of objects for easier iteration
 * Useful for rendering purposes
 */
export function useMembersByAreaArray() {
  const membersByArea = useMembersByArea();

  return useMemo(() => {
    return Array.from(membersByArea.entries()).map(([area, users]) => ({
      area,
      users,
    }));
  }, [membersByArea]);
}
