"use client";

import { useUser } from "@stackframe/stack";
import { LogOut, User, ChevronDown } from "lucide-react";
import { useState, useRef } from "react";
import Link from "next/link";

export function UserMenu({ forceLeftTop = false }: { forceLeftTop?: boolean }) {
  const user = useUser();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer flex items-center space-x-2"
      >
        <span className="text-sm font-medium text-gray-700 hidden sm:block">
          {user.displayName || user.primaryEmail}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-600" />
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
          {user.displayName?.charAt(0) || user.primaryEmail?.charAt(0) || "U"}
        </div>
      </button>

      {isOpen && (
        <div className={`absolute w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50 ${
          forceLeftTop ? 'bottom-full mb-2 right-0' : 'top-full mt-2 right-0'
        }`}>
          <div className="py-1">
            <div className="px-4 py-2 text-sm text-gray-500 border-b">
              {user.displayName || user.primaryEmail}
            </div>
            <Link
              href="/handler/account-settings"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
              onClick={() => setIsOpen(false)}
            >
              <User className="w-4 h-4 mr-2" />
              Profil
            </Link>
            <button
              onClick={() => {
                setIsOpen(false);
                user.signOut();
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Keluar
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
