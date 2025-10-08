"use client";

import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  Crown,
  UserCheck,
} from "lucide-react";
import type { User, UserRole } from "@/types/api";

// Extended User type for display
interface UserDisplay extends Omit<User, 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'deletedAt'> {
  createdAt: string | Date;
  approver?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

interface UserActionsProps {
  user: UserDisplay;
  currentUser: UserDisplay | null;
  actionLoading: string | null;
  onApproval: (userId: string, action: "approve" | "reject") => void;
  onStatusToggle: (userId: string, currentStatus: boolean) => void;
  onRoleToggle: (user: UserDisplay, currentRole: UserRole) => void;
  onDemote: (user: UserDisplay, targetRole: "ADMIN" | "RELAWAN") => void;
  showApprovalActions?: boolean;
}

const UserActions: React.FC<UserActionsProps> = ({
  user,
  currentUser,
  actionLoading,
  onApproval,
  onStatusToggle,
  onRoleToggle,
  onDemote,
  showApprovalActions = false,
}) => {
  return (
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
  );
};

export default UserActions;