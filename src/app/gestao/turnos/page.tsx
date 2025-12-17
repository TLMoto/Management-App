"use client";

import ProtectedPage from "@/src/components/ProtectedPage";
import Link from "next/link";
import React, { JSX } from "react";

export default function Turnos(): JSX.Element {
  return (
    <ProtectedPage>
      <main className="min-h-screen flex flex-col items-center pt-20 px-4">
        <h1 className="text-2xl font-semibold mb-8">Gestão</h1>

        <div className="w-full max-w-md flex flex-col items-center gap-4"></div>
      </main>
    </ProtectedPage>
  );
}
