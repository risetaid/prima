"use client";

import { useUser } from "@stackframe/stack";
import { LogOut, User, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";

export function UserMenu({ forceLeftTop = false }: { forceLeftTop?: boolean }) {
  const user = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: forceLeftTop ? rect.top - 8 : rect.bottom + 8,
        left: rect.right - 192, // 192px = w-48
        width: 192
      });
    }
  }, [isOpen, forceLeftTop]);

  if (!user) return null;

  const dropdownContent = isOpen && (
    <>
      {/* Click outside to close */}
      <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
      
      {/* Dropdown */}
      <div 
        className="fixed bg-white rounded-md shadow-lg border border-gray-200 z-[9999]"
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
          transform: forceLeftTop ? 'translateY(-100%)' : 'none'
        }}
      >
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
    </>
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
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

      {typeof window !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
}
