//import Link from "next/link";
import Navbar from "../components/Navbar";
import BackGroundLayout from "@/components/BackGroundLayout";

export default function Home() {
  return (
    <BackGroundLayout>
      <Navbar />
      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Sistema de gestão de turnos e gestão de inventário.
          </p>
        </div>
      </main>
    </BackGroundLayout>
  );
}
