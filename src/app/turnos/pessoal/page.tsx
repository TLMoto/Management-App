import Link from "next/link";
import React, { JSX } from "react";

const routes: { href: string; label: string }[] = [
  { href: "/tlcrab/turnos/criar", label: "Criar Turno" },
  { href: "/tlcrab/turnos/lista", label: "Listar Turnos" },
  { href: "/tlcrab/turnos/calendario", label: "Calendario" },
  { href: "/tlcrab/turnos/ajustes", label: "Ajustes" },
];

export default function Page(): JSX.Element {
  return (
    <main className="min-h-screen flex flex-col items-center pt-20 px-4">
      <h1 className="text-2xl font-semibold mb-8">Turnos</h1>

      <div className="w-full max-w-md flex flex-col items-center gap-4">
        {routes.map(r => (
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
        ))}
      </div>
    </main>
  );
}
