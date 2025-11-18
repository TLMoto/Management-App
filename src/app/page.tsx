import Link from "next/link";

/**
 * The Home class is the initial page of the application.
 *
 * @class Home
 */

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen text-center">
      <p className="mt-3 max-w-md text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
        TLCrab.
      </p>

      <Link
        href="/tlcrab"
        className="mt-5 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        TLCrab
      </Link>
    </main>
  );
}
