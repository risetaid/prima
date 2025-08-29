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
    <div className="min-h-screen bg-gray-50 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90"
          style={{
            backgroundImage: "url(/bg_desktop.png)",
          }}
        />
      </div>

      {/* Mobile Header with Back Button */}
      <div className="lg:hidden bg-white shadow-sm border-b relative z-10">
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
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <h1 className="text-xl font-bold text-blue-600">PRIMA</h1>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block relative z-10">
        <DesktopHeader showNavigation={true} />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] lg:min-h-[calc(100vh-120px)] p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl">
            {/* Auth Card */}
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
                {/* Logo Header */}
                <div className="text-center mb-8 lg:mb-10">
                  <div className="flex justify-center mb-4 lg:mb-6">
                    <div className="w-16 h-16 lg:w-20 lg:h-20 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-2xl lg:text-3xl">P</span>
                    </div>
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">PRIMA</h2>
                  <p className="text-sm lg:text-base text-gray-600">
                    Palliative Remote Integrated Monitoring
                  </p>
                </div>

                {/* Stack Auth Container */}
                <div className="stack-auth-container">
                  {children}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-6 space-y-2">
              <p className="text-sm lg:text-base text-gray-600 font-medium">
                Membantu relawan memberikan perawatan terbaik 💙
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        /* Custom Stack Auth Styling */
        .stack-auth-container {
          font-family: inherit;
        }

        /* Hide Stack Auth default logo/header */
        .stack-auth-container h1,
        .stack-auth-container .stack-logo {
          display: none !important;
        }

        /* Style form elements */
        .stack-auth-container input[type="email"],
        .stack-auth-container input[type="password"],
        .stack-auth-container input[type="text"] {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          transition: border-color 0.2s, ring 0.2s;
          outline: none;
        }

        @media (min-width: 1024px) {
          .stack-auth-container input[type="email"],
          .stack-auth-container input[type="password"],
          .stack-auth-container input[type="text"] {
            padding: 1rem;
            font-size: 1rem;
          }
        }

        .stack-auth-container input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Style buttons */
        .stack-auth-container button[type="submit"],
        .stack-auth-container .primary-button {
          width: 100%;
          background-color: #3b82f6;
          color: white;
          padding: 0.75rem;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 0.875rem;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-top: 0.5rem;
        }

        @media (min-width: 1024px) {
          .stack-auth-container button[type="submit"],
          .stack-auth-container .primary-button {
            padding: 1rem;
            font-size: 1rem;
            margin-top: 1rem;
          }
        }

        .stack-auth-container button[type="submit"]:hover,
        .stack-auth-container .primary-button:hover {
          background-color: #2563eb;
        }

        /* Style secondary buttons */
        .stack-auth-container .secondary-button {
          width: 100%;
          background-color: white;
          color: #374151;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 0.5rem;
        }

        @media (min-width: 1024px) {
          .stack-auth-container .secondary-button {
            padding: 1rem;
            font-size: 1rem;
            margin-top: 1rem;
          }
        }

        .stack-auth-container .secondary-button:hover {
          background-color: #f9fafb;
          border-color: #9ca3af;
        }

        /* Style labels */
        .stack-auth-container label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.25rem;
          margin-top: 1rem;
        }

        @media (min-width: 1024px) {
          .stack-auth-container label {
            font-size: 1rem;
            margin-bottom: 0.5rem;
            margin-top: 1.25rem;
          }
        }

        .stack-auth-container label:first-of-type {
          margin-top: 0;
        }

        /* Style OAuth buttons (Google, etc) - Centered for all devices */
        .stack-auth-container button:not([type="submit"]):not(.primary-button):not(.secondary-button) {
          display: flex !important;
          align-items: center;
          justify-content: center;
          width: 100%;
          margin: 0.5rem auto !important;
          text-align: center;
        }

        @media (min-width: 1024px) {
          .stack-auth-container button:not([type="submit"]):not(.primary-button):not(.secondary-button) {
            margin: 1rem auto !important;
          }
        }

        /* Center all form content */
        .stack-auth-container,
        .stack-auth-container > div,
        .stack-auth-container > form,
        .stack-auth-container form > div,
        .stack-auth-container form {
          text-align: center;
        }

        /* Ensure input alignment is left for readability */
        .stack-auth-container input[type="email"],
        .stack-auth-container input[type="password"],
        .stack-auth-container input[type="text"] {
          text-align: left;
        }

        /* Style links */
        .stack-auth-container a {
          color: #3b82f6;
          text-decoration: none;
          font-size: 0.875rem;
        }

        .stack-auth-container a:hover {
          color: #2563eb;
          text-decoration: underline;
        }

        /* Style error messages */
        .stack-auth-container .error {
          color: #dc2626;
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }

        /* Style success messages */
        .stack-auth-container .success {
          color: #059669;
          font-size: 0.875rem;
        }

        /* Responsive adjustments */
        @media (max-width: 640px) {
          .stack-auth-container input,
          .stack-auth-container button {
            font-size: 16px; /* Prevent zoom on iOS */
          }
        }
      `}</style>
    </div>
  );
}
