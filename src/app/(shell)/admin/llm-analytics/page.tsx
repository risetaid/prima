"use client";

import { LLMAnalyticsDashboard } from "@/components/admin/llm-analytics-dashboard";
import { Header } from "@/components/ui/header";

export default function LLMAnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-90"
          style={{
            backgroundImage: "url(/bg_desktop.png)",
          }}
        />
      </div>

      <Header showNavigation={true} className="relative z-10" />

      <main className="relative z-10 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">LLM Analytics</h1>
            <p className="text-gray-600 mt-2">
              Monitor AI usage, costs, and performance metrics
            </p>
          </div>

          <LLMAnalyticsDashboard />
        </div>
      </main>
    </div>
  );
}
