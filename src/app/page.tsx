"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const savedId = localStorage.getItem("userId");

    if (!savedId) {
      router.replace("/login");
    }
  }, [router]);

  return <div className="flex items-center justify-center min-h-screen"></div>;
}
