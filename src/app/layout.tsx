import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "../components/Navbar";
import BackGroundLayout from "../components/BackGroundLayout";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TLMoto Management App",
  description: "Sistema de gestão de turnos e gestão de inventário.",
};

/**
 * The Layout class defines the overall structure of the application.
 *
 * @class Layout
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <BackGroundLayout>
          <Navbar />
          {children}
        </BackGroundLayout>
      </body>
    </html>
  );
}
