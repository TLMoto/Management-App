"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navigation = [
    { name: "Inventário", href: "/inventario" },
    { name: "TLCrab - Edição", href: "/tlcrab" },
    { name: "TLCrab - Análise", href: "/tlcrab/analise" },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="bg-black bg-opacity-20 backdrop-blur-sm shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white hover:bg-white hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white focus:ring-opacity-50"
              aria-expanded="false"
            >
              <span className="sr-only">Abrir menu principal</span>
              {!isMobileMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            {navigation.map(item => (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${
                    isActive(item.href)
                      ? "bg-white bg-opacity-20 text-white backdrop-blur-sm"
                      : "text-white hover:text-white hover:bg-white hover:bg-opacity-10"
                  }
                `}
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center">
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
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-black bg-opacity-40 backdrop-blur-md border-t border-white border-opacity-20 rounded-b-lg">
              {navigation.map(item => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    block px-3 py-2 rounded-md text-base font-medium transition-colors
                    ${
                      isActive(item.href)
                        ? "text-blue-500 bg-white bg-opacity-20"
                        : "text-white hover:text-blue-500 hover:bg-white hover:bg-opacity-10"
                    }
                  `}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
