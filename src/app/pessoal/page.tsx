"use client";

import ProtectedPage from "@/src/components/ProtectedPage";
import { useUser } from "@/src/components/UserProvider"; // Updated import
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { JSX } from "react";

const routes: { href: string; label: string; logout?: boolean }[] = [
  { href: "/pessoal/turnos", label: "Meus Turnos" },
  { href: "/pessoal/disponibilidade", label: "Minha Disponibilidade" },
  { href: "/login", label: "Logout", logout: true },
];

export default function Page(): JSX.Element {
  // 1. Get the full user object and the setter
  const { user, setUser } = useUser();
  const router = useRouter();

  const handleLogout = () => {
    setUser(null); 
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <ProtectedPage>
      <main className="min-h-screen flex flex-col items-center pt-20 px-4">
        {/* 3. Display the user's name instead of ID */}
        <h1 className="text-2xl font-semibold mb-8">
          Turnos de {user?.nome}
        </h1>

        <div className="w-full max-w-md flex flex-col items-center gap-4">
          {routes.map(r =>
            r.logout ? (
              <button
                key={r.href}
                onClick={handleLogout}
                className="
                w-full
                text-center
                px-6 py-3
                rounded-lg
                bg-gradient-to-r from-red-600 to-red-500
                text-white
                font-medium
                shadow-md
                hover:from-red-700 hover:to-red-600
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-red-300
              "
              >
                {r.label}
              </button>
            ) : (
              <Link key={r.href} href={r.href} className="w-full">
                <div
                  className="
                  block
                  w-full
                  text-center
                  px-6 py-3
                  rounded-lg
                  bg-gradient-to-r from-indigo-600 to-indigo-500
                  text-white
                  font-medium
                  shadow-md
                  hover:from-indigo-700 hover:to-indigo-600
                  transition-colors
                  focus:outline-none focus:ring-2 focus:ring-indigo-300
                "
                  aria-label={r.label}
                >
                  {r.label}
                </div>
              </Link>
            )
          )}
        </div>
      </main>
    </ProtectedPage>
  );
}