"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Calendário", href: "/calendario" },
    { name: "Gestão", href: "/gestao" },
    { name: "Pessoal", href: "/pessoal" },
  ];

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="relative top-0 left-0 right-0 bg-black/20 backdrop-blur-sm shadow-sm">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* BACK BUTTON (only if NOT on home) */}
          {pathname !== "/" && (
            <button
              onClick={() => router.back()}
              className="p-2 mr-2 rounded-md text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* MOBILE MENU BUTTON */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
          >
            {isMobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>

          {/* DESKTOP NAVIGATION */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map(item => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all
                  ${
                    isActive(item.href)
                      ? "text-white outline outline-2 outline-white"
                      : "text-white hover:drop-shadow-[0_0_6px_white] hover:outline hover:outline-2 hover:outline-white"
                  }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* LOGO */}
          <Link href="/" className="flex items-center">
            <Image
              src="/TL_logo_princ.png"
              alt="TLMoto Logo"
              width={100}
              height={150}
              className="rounded-full"
            />
          </Link>
        </div>

        {/* MOBILE MENU */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-black/40 backdrop-blur-md border-t border-white/20 rounded-b-lg px-2 py-3 space-y-1">
            {navigation.map(item => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-all
                  ${
                    isActive(item.href)
                      ? "text-blue-500 bg-white/20"
                      : "text-white hover:text-blue-400 hover:bg-white/10"
                  }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;
