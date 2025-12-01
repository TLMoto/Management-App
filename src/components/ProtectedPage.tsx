"use client";

import { useEffect } from "react";
import { useUserId } from "@/src/components/UserIdProvider";
import { useRouter } from "next/navigation";

interface ProtectedPageProps {
  children: React.ReactNode;
}

export default function ProtectedPage({ children }: ProtectedPageProps) {
  const { userId } = useUserId();
  const router = useRouter();

  useEffect(() => {
    const savedId = localStorage.getItem("userId");
    if (!userId && !savedId) {
      // Redirect to login page
      router.replace("/login");
    }
  }, [userId, router]);

  // Optionally show nothing while checking
  if (!userId && !localStorage.getItem("userId")) {
    return null;
  }

  return <>{children}</>;
}
