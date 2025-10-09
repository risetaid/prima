"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import UserList from "@/components/admin/UserList";
import type { User, UserRole } from "@/types/api";

// Extended User type for admin display with approver info
interface UserWithApprover extends Omit<User, 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'deletedAt'> {
  createdAt: string | Date;
  approver?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}



export default function UserManagement() {
  const [users, setUsers] = useState<UserWithApprover[]>([]);
  const [currentUser, setCurrentUser] = useState<UserWithApprover | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const [usersResult, profileResult] = await Promise.all([
        apiClient<{ users: UserWithApprover[]; pagination: unknown; pendingCount: number }>("/api/admin/users"),
        apiClient<UserWithApprover>("/api/user/profile"),
      ]);

      if (usersResult.success && usersResult.data) {
        setUsers(usersResult.data.users);
      } else {
        toast.error("Failed to fetch users", {
          description: getApiErrorMessage(usersResult)
        });
      }

      if (profileResult.success && profileResult.data) {
        setCurrentUser(profileResult.data);
      }
    } catch {
      toast.error("Failed to fetch users", {
        description: "Network error occurred"
      });
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
      const result = await apiClient<{ success: boolean; error?: string }>(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (result.success) {
        toast.success(successMessage);
        fetchUsers();
      } else {
        toast.error(errorMessage, {
          description: getApiErrorMessage(result)
        });
      }
    } catch {
      toast.error(errorMessage, {
        description: "Network error occurred"
      });
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

  const toggleUserRole = useCallback((user: UserWithApprover, currentRole: UserRole) => {
    if (currentUser?.id === user.id && currentRole === "DEVELOPER") {
      toast.error("Tidak dapat demote diri sendiri sebagai Developer");
      return;
    }

    const roleHierarchy: Record<UserRole, UserRole> = {
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

  const demoteUserRole = useCallback((user: UserWithApprover, targetRole: "ADMIN" | "RELAWAN") => {
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
      const result = await apiClient<{ 
        results: { created: number; updated: number; reactivated: number; deactivated: number } 
      }>("/api/admin/sync-clerk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (result.success && result.data) {
        const { results } = result.data;
        const messages = [];
        if (results.created > 0) messages.push(`${results.created} user baru`);
        if (results.updated > 0) messages.push(`${results.updated} user diperbarui`);
        if (results.reactivated > 0) messages.push(`${results.reactivated} user diaktifkan kembali`);
        if (results.deactivated > 0) messages.push(`${results.deactivated} user dinonaktifkan`);

        const summary = messages.length > 0 ? messages.join(", ") : "Tidak ada perubahan";
        toast.success("Sync Clerk berhasil", { description: `Sinkronisasi selesai: ${summary}` });
        fetchUsers();
      } else {
        toast.error("Sync Clerk gagal", { 
          description: getApiErrorMessage(result) 
        });
      }
    } catch {
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

  if (loading) return <TableSkeleton rows={10} columns={6} />;

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
