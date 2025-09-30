"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, User } from "lucide-react";
import UserCard from "@/components/admin/UserCard";

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

interface UserListProps {
  users: User[];
  currentUser: User | null;
  actionLoading: string | null;
  onApproval: (userId: string, action: "approve" | "reject") => void;
  onStatusToggle: (userId: string, currentStatus: boolean) => void;
  onRoleToggle: (user: User, currentRole: User["role"]) => void;
  onDemote: (user: User, targetRole: "ADMIN" | "RELAWAN") => void;
  isPending?: boolean;
}

const UserList: React.FC<UserListProps> = ({
  users,
  currentUser,
  actionLoading,
  onApproval,
  onStatusToggle,
  onRoleToggle,
  onDemote,
  isPending = false,
}) => {
  if (isPending && users.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          {isPending ? (
            <>
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
              <span className="hidden sm:inline">Pending Approvals ({users.length})</span>
              <span className="sm:hidden">Menunggu Persetujuan ({users.length})</span>
            </>
          ) : (
            <>
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <span className="hidden sm:inline">All Users ({users.length})</span>
              <span className="sm:hidden">Semua Pengguna ({users.length})</span>
            </>
          )}
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
              onApproval={onApproval}
              onStatusToggle={onStatusToggle}
              onRoleToggle={onRoleToggle}
              onDemote={onDemote}
              showApprovalActions={isPending}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserList;