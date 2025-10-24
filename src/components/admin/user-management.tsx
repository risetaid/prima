"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import UserList from "@/components/admin/UserList";
import type { User, UserRole } from "@/types/api";

// Extended User type for admin display with approver info
interface UserWithApprover
  extends Omit<User, "createdAt" | "updatedAt" | "lastLoginAt" | "deletedAt"> {
  createdAt: string | Date;
  approver?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

export default function UserManagement() {
  const [allUsers, setAllUsers] = useState<UserWithApprover[]>([]); // Store all fetched users
  const [currentUser, setCurrentUser] = useState<UserWithApprover | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageLimit] = useState(10);

  // Client-side filtering of users
  const filteredUsers = (() => {
    if (!searchQuery.trim()) return allUsers;

    const query = searchQuery.toLowerCase();
    return allUsers.filter((user) => {
      const email = user.email?.toLowerCase() || "";
      const firstName = user.firstName?.toLowerCase() || "";
      const lastName = user.lastName?.toLowerCase() || "";
      const fullName = `${firstName} ${lastName}`.trim();

      return (
        email.includes(query) ||
        firstName.includes(query) ||
        lastName.includes(query) ||
        fullName.includes(query)
      );
    });
  })();

  // Client-side pagination
  const totalPages = Math.ceil(filteredUsers.length / pageLimit);
  const totalUsers = filteredUsers.length;
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageLimit,
    currentPage * pageLimit
  );

  const fetchUsers = useCallback(async () => {
    try {
      setIsInitialLoading(true);
      const queryParams = new URLSearchParams({
        page: "1",
        limit: "1000", // Fetch all users for client-side filtering
      });

      const [usersResult, profileResult] = await Promise.all([
        apiClient<{
          users: UserWithApprover[];
          pagination: {
            total: number;
            totalPages: number;
            page: number;
            hasMore: boolean;
          };
          pendingCount: number;
        }>(`/api/admin/users?${queryParams.toString()}`),
        apiClient<UserWithApprover>("/api/user/profile"),
      ]);

      if (usersResult.success && usersResult.data) {
        setAllUsers(usersResult.data.users);
      } else {
        toast.error("Failed to fetch users", {
          description: getApiErrorMessage(usersResult),
        });
      }

      if (profileResult.success && profileResult.data) {
        setCurrentUser(profileResult.data);
      }
    } catch {
      toast.error("Failed to fetch users", {
        description: "Network error occurred",
      });
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  const performUserAction = useCallback(
    async (
      endpoint: string,
      userId: string,
      successMessage: string,
      errorMessage: string,
      body?: object
    ) => {
      try {
        setActionLoading(userId);
        const result = await apiClient<{ success: boolean; error?: string }>(
          endpoint,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: body ? JSON.stringify(body) : undefined,
          }
        );

        if (result.success) {
          toast.success(successMessage);
          fetchUsers();
        } else {
          toast.error(errorMessage, {
            description: getApiErrorMessage(result),
          });
        }
      } catch {
        toast.error(errorMessage, {
          description: "Network error occurred",
        });
      } finally {
        setActionLoading(null);
      }
    },
    [setActionLoading, fetchUsers]
  );

  const handleApproval = useCallback(
    (userId: string, action: "approve" | "reject") =>
      performUserAction(
        `/api/admin/users/${userId}?action=${action}`,
        userId,
        `User ${action === "approve" ? "approved" : "rejected"} successfully`,
        `Failed to ${action} user`
      ),
    [performUserAction]
  );

  const toggleUserStatus = useCallback(
    (userId: string, currentStatus: boolean) =>
      performUserAction(
        `/api/admin/users/${userId}?action=toggle-status`,
        userId,
        `User ${currentStatus ? "deactivated" : "activated"} successfully`,
        "Failed to update user status"
      ),
    [performUserAction]
  );

  const toggleUserRole = useCallback(
    (user: UserWithApprover, currentRole: UserRole) => {
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
        `/api/admin/users/${user.id}?action=toggle-role`,
        user.id,
        `User role updated to ${newRole} successfully`,
        "Failed to update user role",
        { role: newRole }
      );
    },
    [currentUser, performUserAction]
  );

  const demoteUserRole = useCallback(
    (user: UserWithApprover, targetRole: "ADMIN" | "RELAWAN") => {
      if (currentUser?.id === user.id && user.role === "DEVELOPER") {
        toast.error("Tidak dapat demote diri sendiri sebagai Developer");
        return;
      }

      performUserAction(
        `/api/admin/users/${user.id}?action=toggle-role`,
        user.id,
        `User demoted to ${targetRole} successfully`,
        "Failed to demote user",
        { role: targetRole }
      );
    },
    [currentUser, performUserAction]
  );

  const handleClerkSync = useCallback(async () => {
    if (syncing) return;

    try {
      setSyncing(true);
      const result = await apiClient<{
        results: {
          created: number;
          updated: number;
          reactivated: number;
          deactivated: number;
        };
      }>("/api/admin/sync-clerk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (result.success && result.data) {
        const { results } = result.data;
        const messages = [];
        if (results.created > 0) messages.push(`${results.created} user baru`);
        if (results.updated > 0)
          messages.push(`${results.updated} user diperbarui`);
        if (results.reactivated > 0)
          messages.push(`${results.reactivated} user diaktifkan kembali`);
        if (results.deactivated > 0)
          messages.push(`${results.deactivated} user dinonaktifkan`);

        const summary =
          messages.length > 0 ? messages.join(", ") : "Tidak ada perubahan";
        toast.success("Sync Clerk berhasil", {
          description: `Sinkronisasi selesai: ${summary}`,
        });
        fetchUsers();
      } else {
        toast.error("Sync Clerk gagal", {
          description: getApiErrorMessage(result),
        });
      }
    } catch {
      toast.error("Sync Clerk gagal", {
        description: "Terjadi kesalahan jaringan",
      });
    } finally {
      setSyncing(false);
    }
  }, [syncing, setSyncing, fetchUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const pendingUsers = paginatedUsers.filter((user) => !user.isApproved);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600">Memuat data pengguna...</p>
        </div>
      </div>
    );
  }

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
            Gunakan tombol sync manual jika diperlukan untuk memastikan
            konsistensi data antara Clerk dan database PRIMA.
          </p>
        </CardContent>
      </Card>

      {/* Search Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Cari Pengguna</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="text"
            placeholder="Cari berdasarkan email atau nama..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
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
          loading={false}
        />
      )}

      <UserList
        users={paginatedUsers}
        currentUser={currentUser}
        actionLoading={actionLoading}
        onApproval={handleApproval}
        onStatusToggle={toggleUserStatus}
        onRoleToggle={toggleUserRole}
        onDemote={demoteUserRole}
        loading={false}
      />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
              <p className="text-sm text-gray-600">
                Menampilkan {(currentPage - 1) * pageLimit + 1} -{" "}
                {Math.min(currentPage * pageLimit, totalUsers)} dari{" "}
                {totalUsers} pengguna
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  size="sm"
                  variant="outline"
                  className="text-xs sm:text-sm"
                >
                  Sebelumnya
                </Button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <Button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        size="sm"
                        variant={page === currentPage ? "default" : "outline"}
                        className="text-xs sm:text-sm min-w-8"
                      >
                        {page}
                      </Button>
                    )
                  )}
                </div>
                <Button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  size="sm"
                  variant="outline"
                  className="text-xs sm:text-sm"
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
