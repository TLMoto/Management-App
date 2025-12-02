"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "./UserProvider";

interface ProtectedPageProps {
  children: React.ReactNode;
}

export default function ProtectedPage({ children }: ProtectedPageProps) {
  const { user } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Mark component as mounted (client-side) so we don't access localStorage during server render
    setMounted(true);

    const savedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    if (!user && !savedUser) {
      // Redirect to login page
      router.replace("/login");
    }
  }, [user, router]);

  // Render nothing until we've mounted on the client to avoid touching localStorage during SSR
  if (!mounted) return null;

  // If after mount there's still no user, hide content (useEffect will redirect)
  if (!user && typeof window !== "undefined" && !localStorage.getItem("user")) {
    return null;
  }

  return <>{children}</>;
}
