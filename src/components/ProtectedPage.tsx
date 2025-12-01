"use client";

import { useEffect, useState } from "react";
import { useUserId } from "@/src/components/UserIdProvider";
import { useRouter } from "next/navigation";

interface ProtectedPageProps {
  children: React.ReactNode;
}

export default function ProtectedPage({ children }: ProtectedPageProps) {
  const { userId } = useUserId();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Mark component as mounted (client-side) so we don't access localStorage during server render
    setMounted(true);

    const savedId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!userId && !savedId) {
      // Redirect to login page
      router.replace("/login");
    }
  }, [userId, router]);

  // Render nothing until we've mounted on the client to avoid touching localStorage during SSR
  if (!mounted) return null;

  // If after mount there's still no user, hide content (useEffect will redirect)
  if (!userId && typeof window !== "undefined" && !localStorage.getItem("userId")) {
    return null;
  }

  return <>{children}</>;
}
