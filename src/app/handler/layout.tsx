"use client";

import { useRouter } from "next/navigation";
import { DesktopHeader } from "@/components/ui/desktop-header";

export default function HandlerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Mobile Header with Back Button */}
      <div className="lg:hidden bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center text-blue-600 hover:text-blue-700 cursor-pointer transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="font-medium">Kembali</span>
          </button>
          <h1 className="text-xl font-bold text-blue-600">PRIMA</h1>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block">
        <DesktopHeader showNavigation={true} />
      </div>

      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-4">
        <div className="w-full max-w-md lg:max-w-2xl xl:max-w-4xl">
          {/* Stack Auth Container with Custom Styling */}
          <div className="stack-auth-container">{children}</div>

          <div className="text-center mt-6 space-y-2">
            <p className="text-sm text-gray-500 font-medium">
              Membantu relawan memberikan perawatan terbaik 💙
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
