"use client";

import ProtectedPage from "@/src/components/ProtectedPage";
import { useUser } from "@/src/components/UserProvider"; // Updated import
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { JSX } from "react";

const routes = [
  { href: "/calendario", label: "Meus Turnos", filter: "eu" },
  { href: "/pessoal/disponibilidade", label: "Minha Disponibilidade" },
  { href: "/login", label: "Logout", logout: true },
];

const baseClasses =
  "block w-full text-center px-6 py-3 rounded-lg font-medium shadow-md transition-colors focus:outline-none";

export default function Page(): JSX.Element {
  // 1. Get the full user object and the setter
  const { user, setUser } = useUser();
  const router = useRouter();

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    router.push("/login");
  };

  const renderRoute = (r: (typeof routes)[number]) => {
    const href = r.filter ? `${r.href}?filter=${encodeURIComponent(r.filter)}` : r.href;

    const className = r.logout
      ? `${baseClasses} bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-700 hover:to-red-600`
      : `${baseClasses} bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-700 hover:to-indigo-600`;

    if (r.logout) {
      return (
        <button key={r.href} onClick={handleLogout} className={className}>
          {r.label}
        </button>
      );
    }

    return (
      <Link key={r.href} href={href} className="w-full">
        <div className={className} aria-label={r.label}>
          {r.label}
        </div>
      </Link>
    );
  };

  return (
    <ProtectedPage>
      <main className="min-h-screen flex flex-col items-center pt-20 px-4">
        {/* 3. Display the user's name instead of ID */}
        <h1 className="text-2xl font-semibold mb-8">Turnos de {user?.nome}</h1>

        <div className="w-full max-w-md flex flex-col items-center gap-4">
          {routes.map(renderRoute)}
        </div>
      </main>
    </ProtectedPage>
  );
}
