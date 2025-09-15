"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminUsersTableSkeleton } from "@/components/ui/dashboard-skeleton";
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  Calendar,
  Crown,
  UserCheck,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

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

interface UserCardProps {
  user: User;
  currentUser: User | null;
  actionLoading: string | null;
  onApproval: (userId: string, action: "approve" | "reject") => void;
  onStatusToggle: (userId: string, currentStatus: boolean) => void;
  onRoleToggle: (user: User, currentRole: User["role"]) => void;
  onDemote: (user: User, targetRole: "ADMIN" | "RELAWAN") => void;
  showApprovalActions?: boolean;
}

const UserCard: React.FC<UserCardProps> = ({
  user,
  currentUser,
  actionLoading,
  onApproval,
  onStatusToggle,
  onRoleToggle,
  onDemote,
  showApprovalActions = false,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (user: User) => {
    if (!user.isApproved) {
      return (
        <Badge
          variant="outline"
          className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs whitespace-nowrap"
        >
          <span className="sm:hidden">⏳</span>{" "}
          <span>Menunggu Persetujuan</span>
        </Badge>
      );
    }
    if (!user.isActive) {
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200 text-xs whitespace-nowrap"
        >
          <span className="sm:hidden">❌</span> <span>Tidak Aktif</span>
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="bg-green-50 text-green-700 border-green-200 text-xs whitespace-nowrap"
      >
        <span className="sm:hidden">✅</span> <span>Aktif</span>
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    if (role === "DEVELOPER") {
      return (
        <Badge
          variant="default"
          className="text-xs whitespace-nowrap bg-purple-600 hover:bg-purple-700"
        >
          <span className="sm:hidden">⭐</span> <span>Developer</span>
        </Badge>
      );
    } else if (role === "ADMIN") {
      return (
        <Badge
          variant="default"
          className="text-xs whitespace-nowrap bg-blue-600 hover:bg-blue-700"
        >
          <span className="sm:hidden">👑</span> <span>Admin</span>
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-xs whitespace-nowrap">
          <span className="sm:hidden">👤</span> <span>Relawan</span>
        </Badge>
      );
    }
  };

  const cardClass = showApprovalActions
    ? "flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-200 space-y-3 sm:space-y-0"
    : "flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg space-y-3 sm:space-y-0";

  const avatarClass = showApprovalActions
    ? "w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0"
    : "w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0";

  const avatarIconClass = showApprovalActions
    ? "w-4 h-4 sm:w-5 sm:h-5 text-yellow-700"
    : "w-4 h-4 sm:w-5 sm:h-5 text-blue-700";

  return (
    <div className={cardClass}>
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <div className={avatarClass}>
          <User className={avatarIconClass} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm sm:text-base text-gray-900 truncate">
            {user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`
              : "Unnamed User"}
          </div>
          <div className="text-xs sm:text-sm text-gray-600 flex items-center gap-1 truncate">
            <Mail className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
          <div className="text-xs text-gray-500 flex flex-wrap items-center gap-1 mt-0.5 sm:mt-1">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span className="hidden sm:inline">{showApprovalActions ? "Registered: " : "Joined: "}</span>
            <span className="sm:hidden">{showApprovalActions ? "Daftar: " : "Bergabung: "}</span>
            {formatDate(user.createdAt)}
            {user.approvedAt && !showApprovalActions && (
              <span className="hidden sm:inline">
                {` • Approved: ${formatDate(user.approvedAt)}`}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 sm:flex-shrink-0">
        <div className="flex flex-col justify-center sm:justify-start space-y-1 items-center sm:items-start">
          {getRoleBadge(user.role)}
          {!showApprovalActions && getStatusBadge(user)}
        </div>
        <div className="flex flex-col space-y-1.5 sm:flex-row sm:space-y-0 sm:space-x-2">
          {showApprovalActions ? (
            <div className="flex space-x-2">
              <Button
                onClick={() => onApproval(user.id, "approve")}
                disabled={actionLoading === user.id}
                size="sm"
                className="bg-green-600 hover:bg-green-700 cursor-pointer flex-1 sm:flex-none text-xs sm:text-sm px-2 sm:px-3 py-1.5"
              >
                {actionLoading === user.id ? (
                  <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">Approve</span>
                    <span className="sm:hidden">Setuju</span>
                  </>
                )}
              </Button>
              <Button
                onClick={() => onApproval(user.id, "reject")}
                disabled={actionLoading === user.id}
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50 cursor-pointer flex-1 sm:flex-none text-xs sm:text-sm px-2 sm:px-3 py-1.5"
              >
                {actionLoading === user.id ? (
                  <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-red-700 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">Reject</span>
                    <span className="sm:hidden">Tolak</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              {/* Role Toggle Button */}
              <Button
                onClick={() => onRoleToggle(user, user.role)}
                disabled={
                  actionLoading === user.id ||
                  (currentUser?.id === user.id && user.role === "DEVELOPER")
                }
                size="sm"
                variant={user.role === "RELAWAN" ? "outline" : "default"}
                title={
                  currentUser?.id === user.id && user.role === "DEVELOPER"
                    ? "Tidak dapat demote diri sendiri"
                    : "Click untuk ganti role"
                }
                className={`cursor-pointer text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap ${
                  user.role === "DEVELOPER"
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : user.role === "ADMIN"
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {actionLoading === user.id ? (
                  <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {user.role === "DEVELOPER" ? (
                      <>
                        <Crown className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        <span className="hidden sm:inline">↓ Admin</span>
                        <span className="sm:hidden">↓ Admin</span>
                      </>
                    ) : user.role === "ADMIN" ? (
                      <>
                        <Crown className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        <span className="hidden sm:inline">↑ Developer</span>
                        <span className="sm:hidden">↑ Developer</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        <span className="hidden sm:inline">↑ Admin</span>
                        <span className="sm:hidden">↑ Admin</span>
                      </>
                    )}
                  </>
                )}
              </Button>

              {/* Demote Button - Only for ADMIN to demote to MEMBER */}
              {user.role === "ADMIN" && (
                <Button
                  onClick={() => onDemote(user, "RELAWAN")}
                  disabled={
                    actionLoading === user.id || currentUser?.id === user.id
                  }
                  size="sm"
                  variant="outline"
                  title="Demote to Member"
                  className="cursor-pointer text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                >
                  {actionLoading === user.id ? (
                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="hidden sm:inline">↓ Member</span>
                      <span className="sm:hidden">↓ Member</span>
                    </>
                  )}
                </Button>
              )}

              {/* Status Toggle Button - Only for regular members */}
              {user.role === "RELAWAN" && (
                <Button
                  onClick={() => onStatusToggle(user.id, user.isActive)}
                  disabled={actionLoading === user.id}
                  size="sm"
                  variant="outline"
                  className="cursor-pointer text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap"
                >
                  {actionLoading === user.id ? (
                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="hidden sm:inline">
                        {user.isActive ? "Deactivate" : "Activate"}
                      </span>
                      <span className="sm:hidden">
                        {user.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </span>
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

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
      console.error("Error fetching users:", error);
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
      console.error(`Error: ${errorMessage}`, error);
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  }, [setActionLoading, fetchUsers]);

  const handleApproval = useCallback((userId: string, action: "approve" | "reject") =>
    performUserAction(
      `/api/admin/users/${userId}/${action}`,
      userId,
      `User ${action === "approve" ? "approved" : "rejected"} successfully`,
      `Failed to ${action} user`
    ), [performUserAction]);

  const toggleUserStatus = useCallback((userId: string, currentStatus: boolean) =>
    performUserAction(
      `/api/admin/users/${userId}/toggle-status`,
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
      `/api/admin/users/${user.clerkId}/toggle-role`,
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
      `/api/admin/users/${user.clerkId}/toggle-role`,
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
      console.error("Error syncing with Clerk:", error);
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
              <span className="hidden sm:inline">Pending Approvals ({pendingUsers.length})</span>
              <span className="sm:hidden">Menunggu Persetujuan ({pendingUsers.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {pendingUsers.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  currentUser={currentUser}
                  actionLoading={actionLoading}
                  onApproval={handleApproval}
                  onStatusToggle={toggleUserStatus}
                  onRoleToggle={toggleUserRole}
                  onDemote={demoteUserRole}
                  showApprovalActions
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <span className="hidden sm:inline">All Users ({users.length})</span>
            <span className="sm:hidden">Semua Pengguna ({users.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                currentUser={currentUser}
                actionLoading={actionLoading}
                onApproval={handleApproval}
                onStatusToggle={toggleUserStatus}
                onRoleToggle={toggleUserRole}
                onDemote={demoteUserRole}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
