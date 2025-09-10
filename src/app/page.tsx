"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/header";
// import { UserButton } from "@clerk/nextjs"; // Available for future use

export default function LandingPage() {
  const { user } = useUser();
  const router = useRouter();

  const handleGetStarted = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/sign-in");
    }
  };


  return (
    <div className="min-h-screen bg-white relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-90"
          style={{
            backgroundImage: "url(/bg_desktop.png)",
          }}
        />
      </div>

      {/* Unified Responsive Header */}
      <Header showNavigation={true} />

      {/* Hero Section */}
      <main className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center min-h-[70vh] sm:min-h-[80vh] text-center py-8">
            {/* Hero Content */}
            <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
              {/* Main Title */}
              <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-blue-600 leading-tight">
                Palliative Remote
                <br />
                Integrated Monitoring
                <br />
                and Assistance
              </h1>

              {/* Description */}
              <div className="max-w-2xl mx-auto px-4">
                <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed">
                  PRIMA merupakan inovasi sistem monitoring terpadu berbasis
                  Android yang didesain khusus untuk meningkatkan efektivitas
                  pendampingan pasien kanker payudara oleh relawan paliatif.
                  PRIMA mengintegrasikan berbagai fitur yang saling terkoneksi
                  untuk mendukung kepatuhan terapi dan monitoring pasien secara
                  komprehensif, antara lain: integrasi pengingat obat,
                  monitoring gejala, edukasi pasien, dan komunikasi dalam satu
                  platform terpadu.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex justify-center items-center pt-6 sm:pt-8">
                {!user && (
                  <button
                    onClick={handleGetStarted}
                    className="bg-blue-600 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-lg font-semibold text-base sm:text-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg cursor-pointer flex items-center space-x-2"
                  >
                    <span>🚀</span>
                    <span>Mulai Sekarang</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
