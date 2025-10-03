"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminUsersTableSkeleton } from "@/components/ui/dashboard-skeleton";
import {
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import UserList from "@/components/admin/UserList";

interface User {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "DEVELOPER" | "ADMIN" | "RELAWAN";
  isActive: boolean;
  isApproved: boolean;
  createdAt: string;
  approvedAt: string | null;
  approver?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}



export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const [usersResponse, profileResponse] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/user/profile"),
      ]);

      const usersData = await usersResponse.json();
      const profileData = await profileResponse.json();

      if (usersData.success) setUsers(usersData.users);
      else toast.error("Failed to fetch users");

      if (profileResponse.ok && profileData.id) setCurrentUser(profileData);
    } catch (error) {
      logger.error("Error fetching users", error as Error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [setLoading, setUsers, setCurrentUser]);

  const performUserAction = useCallback(async (
    endpoint: string,
    userId: string,
    successMessage: string,
    errorMessage: string,
    body?: object
  ) => {
    try {
      setActionLoading(userId);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();
      if (data.success) {
        toast.success(successMessage);
        fetchUsers();
      } else {
        toast.error(data.error || errorMessage);
      }
    } catch (error) {
      logger.error(`Error: ${errorMessage}`, error as Error);
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  }, [setActionLoading, fetchUsers]);

  const handleApproval = useCallback((userId: string, action: "approve" | "reject") =>
    performUserAction(
      `/api/admin/users/${userId}?action=${action}`,
      userId,
      `User ${action === "approve" ? "approved" : "rejected"} successfully`,
      `Failed to ${action} user`
    ), [performUserAction]);

  const toggleUserStatus = useCallback((userId: string, currentStatus: boolean) =>
    performUserAction(
      `/api/admin/users/${userId}?action=toggle-status`,
      userId,
      `User ${currentStatus ? "deactivated" : "activated"} successfully`,
      "Failed to update user status"
    ), [performUserAction]);

  const toggleUserRole = useCallback((user: User, currentRole: User["role"]) => {
    if (currentUser?.id === user.id && currentRole === "DEVELOPER") {
      toast.error("Tidak dapat demote diri sendiri sebagai Developer");
      return;
    }

    const roleHierarchy: Record<User["role"], User["role"]> = {
      RELAWAN: "ADMIN",
      ADMIN: "DEVELOPER",
      DEVELOPER: "ADMIN",
    };
    const newRole = roleHierarchy[currentRole];

    performUserAction(
      `/api/admin/users/${user.clerkId}?action=toggle-role`,
      user.id,
      `User role updated to ${newRole} successfully`,
      "Failed to update user role",
      { role: newRole }
    );
  }, [currentUser, performUserAction]);

  const demoteUserRole = useCallback((user: User, targetRole: "ADMIN" | "RELAWAN") => {
    if (currentUser?.id === user.id && user.role === "DEVELOPER") {
      toast.error("Tidak dapat demote diri sendiri sebagai Developer");
      return;
    }

    performUserAction(
      `/api/admin/users/${user.clerkId}?action=toggle-role`,
      user.id,
      `User demoted to ${targetRole} successfully`,
      "Failed to demote user",
      { role: targetRole }
    );
  }, [currentUser, performUserAction]);

  const handleClerkSync = useCallback(async () => {
    if (syncing) return;

    try {
      setSyncing(true);
      const response = await fetch("/api/admin/sync-clerk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      if (data.success) {
        const { results } = data;
        const messages = [];
        if (results.created > 0) messages.push(`${results.created} user baru`);
        if (results.updated > 0) messages.push(`${results.updated} user diperbarui`);
        if (results.reactivated > 0) messages.push(`${results.reactivated} user diaktifkan kembali`);
        if (results.deactivated > 0) messages.push(`${results.deactivated} user dinonaktifkan`);

        const summary = messages.length > 0 ? messages.join(", ") : "Tidak ada perubahan";
        toast.success("Sync Clerk berhasil", { description: `Sinkronisasi selesai: ${summary}` });
        fetchUsers();
      } else {
        toast.error("Sync Clerk gagal", { description: data.error || "Terjadi kesalahan pada server" });
      }
    } catch (error) {
      logger.error("Error syncing with Clerk", error as Error);
      toast.error("Sync Clerk gagal", { description: "Terjadi kesalahan jaringan" });
    } finally {
      setSyncing(false);
    }
  }, [syncing, setSyncing, fetchUsers]);

  useEffect(() => {
    fetchUsers();
    const autoSync = setInterval(() => handleClerkSync(), 5000);
    return () => clearInterval(autoSync);
  }, [handleClerkSync, fetchUsers]);

  if (loading) return <AdminUsersTableSkeleton />;

  const pendingUsers = users.filter((user) => !user.isApproved);

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              <span>Sinkronisasi Clerk</span>
            </CardTitle>
            <Button
              onClick={handleClerkSync}
              disabled={syncing}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 cursor-pointer text-xs sm:text-sm px-3 py-2"
            >
              {syncing ? (
                <>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  <span>Sync Manual</span>
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Sinkronisasi otomatis dijalankan saat panel dibuka. Gunakan tombol sync manual jika diperlukan untuk memastikan konsistensi data antara Clerk dan database PRIMA.
          </p>
        </CardContent>
      </Card>

      {pendingUsers.length > 0 && (
        <UserList
          users={pendingUsers}
          currentUser={currentUser}
          actionLoading={actionLoading}
          onApproval={handleApproval}
          onStatusToggle={toggleUserStatus}
          onRoleToggle={toggleUserRole}
          onDemote={demoteUserRole}
          isPending
        />
      )}

      <UserList
        users={users}
        currentUser={currentUser}
        actionLoading={actionLoading}
        onApproval={handleApproval}
        onStatusToggle={toggleUserStatus}
        onRoleToggle={toggleUserRole}
        onDemote={demoteUserRole}
      />
    </div>
  );
}
