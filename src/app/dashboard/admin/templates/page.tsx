import { requireAdmin } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import TemplateManagement from "@/components/admin/template-management";
import { DesktopHeader } from "@/components/ui/desktop-header";

export default async function AdminTemplatesPage() {
  const user = await requireAdmin();

  if (!user) {
    redirect("/unauthorized");
  }

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

      {/* Use consistent header */}
      <div className="relative z-10">
        <DesktopHeader showNavigation={true} />
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto relative z-10">
        <div className="my-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Manajemen Template WhatsApp
          </h1>
          <p className="text-gray-600">
            Kelola template pesan WhatsApp untuk pengingat, janji, dan edukasi
          </p>
        </div>

        <TemplateManagement />
      </main>
    </div>
  );
}