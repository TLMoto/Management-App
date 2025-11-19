"use client";

import Link from "next/link";

/**
 * The Home class is the initial page of the application.
 *
 * @class Home
 */

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen text-center">
      <Link
        href="/tlcrab"
        className="mt-5 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        TLCrab
      </Link>
    </main>
  );
}
