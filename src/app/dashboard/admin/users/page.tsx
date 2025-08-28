import { requireAdmin } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import UserManagement from "@/components/admin/user-management";
import { DesktopHeader } from "@/components/ui/desktop-header";

export default async function AdminUsersPage() {
  const user = await requireAdmin();

  if (!user) {
    redirect("/unauthorized");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Use consistent header */}
      <DesktopHeader showNavigation={true} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        <div className="my-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Manajemen Pengguna
          </h1>
          <p className="text-gray-600">
            Kelola registrasi dan persetujuan pengguna
          </p>
        </div>

        <UserManagement />
      </main>
    </div>
  );
}
