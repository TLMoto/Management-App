"use client";
import ProtectedPage from "../components/ProtectedPage";

/**
 * Home Page
 */
export default function Home() {
  return (
    <ProtectedPage>
      <div className="flex items-center justify-center min-h-screen"></div>
    </ProtectedPage>
  );
}
