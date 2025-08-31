"use client";

import { useUser } from "@stackframe/stack";
import { useRouter } from "next/navigation";
import { DesktopHeader } from "@/components/ui/desktop-header";
import { UserMenu } from "@/components/ui/user-menu";

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

      {/* Desktop Header */}
      <div className="hidden lg:block">
        <DesktopHeader showNavigation={true} />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden relative z-10">
        <header className="bg-white shadow-sm">
          <div className="flex justify-between items-center px-4 py-4">
            <div 
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => router.push("/")}
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <h1 className="text-2xl font-bold text-blue-600">PRIMA</h1>
            </div>
            
            {/* Mobile Navigation Actions */}
            <div className="flex items-center space-x-3">
              {user ? (
                <>
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Dashboard
                  </button>
                  <UserMenu />
                </>
              ) : (
                <button
                  onClick={() => router.push("/handler/signin")}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Masuk
                </button>
              )}
            </div>
          </div>
        </header>
      </div>

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
