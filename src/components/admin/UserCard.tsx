"use client";

import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Calendar,
} from "lucide-react";
import UserActions from "./UserActions";

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
        <UserActions
          user={user}
          currentUser={currentUser}
          actionLoading={actionLoading}
          onApproval={onApproval}
          onStatusToggle={onStatusToggle}
          onRoleToggle={onRoleToggle}
          onDemote={onDemote}
          showApprovalActions={showApprovalActions}
        />
      </div>
    </div>
  );
};

export default UserCard;