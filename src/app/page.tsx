"use client";

import { useUser } from "@stackframe/stack";
import { useRouter } from "next/navigation";
import { DesktopHeader } from "@/components/ui/desktop-header";

export default function LandingPage() {
  const user = useUser();
  const router = useRouter();

  const handleGetStarted = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/handler/signin");
    }
  };

  const handleViewPatients = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/handler/signin");
    }
  };

  return (
    <div className="min-h-screen bg-white relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90"
          style={{
            backgroundImage: "url(/bg_desktop.png)",
          }}
        />
      </div>

      {/* Header */}
      <DesktopHeader showNavigation={true} />

      {/* Hero Section */}
      <main className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
            {/* Hero Content */}
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Main Title */}
              <h1 className="text-4xl lg:text-6xl font-bold text-blue-600 leading-tight">
                Palliative Remote
                <br />
                Integrated Monitoring
                <br />
                and Assistance
              </h1>

              {/* Description */}
              <div className="max-w-2xl mx-auto">
                <p className="text-lg lg:text-xl text-gray-700 leading-relaxed">
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
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
                {user ? (
                  <button
                    onClick={handleViewPatients}
                    className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg cursor-pointer flex items-center space-x-2"
                  >
                    <span>📋</span>
                    <span>Lihat Daftar Pasien</span>
                  </button>
                ) : (
                  <>
                    {/* Mobile: Stack vertically */}
                    <div className="sm:hidden space-y-4">
                      <button
                        onClick={handleGetStarted}
                        className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg cursor-pointer flex items-center space-x-2"
                      >
                        <span>🚀</span>
                        <span>Mulai Sekarang</span>
                      </button>
                      <button
                        onClick={handleViewPatients}
                        className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-colors duration-200 shadow-lg cursor-pointer flex items-center space-x-2"
                      >
                        <span>📋</span>
                        <span>Lihat Daftar Pasien</span>
                      </button>
                    </div>

                    {/* Desktop: Side by side */}
                    <div className="hidden sm:flex space-x-4">
                      <button
                        onClick={handleGetStarted}
                        className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg cursor-pointer flex items-center space-x-2"
                      >
                        <span>🚀</span>
                        <span>Mulai Sekarang</span>
                      </button>
                      <button
                        onClick={handleViewPatients}
                        className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-colors duration-200 shadow-lg cursor-pointer flex items-center space-x-2"
                      >
                        <span>📋</span>
                        <span>Lihat Daftar Pasien</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
