"use client";

import { Trash2, X } from "lucide-react";

interface FloatingActionButtonsProps {
  isDeleteMode: boolean;
  selectedCount: number;
  totalCount: number;
  onToggleDeleteMode: () => void;
  onDeleteSelected: () => void;
  onCancelDelete: () => void;
}

export function FloatingActionButtons({
  isDeleteMode,
  selectedCount,
  totalCount,
  onToggleDeleteMode,
  onDeleteSelected,
  onCancelDelete,
}: FloatingActionButtonsProps) {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
      {isDeleteMode ? (
        <div className="flex flex-col space-y-3">
          {/* Delete Selected Button - Show first when items are selected */}
          {selectedCount > 0 && (
            <button
              onClick={onDeleteSelected}
              className="bg-red-500 text-white px-4 py-3 rounded-full shadow-lg hover:bg-red-600 transition-colors cursor-pointer flex items-center space-x-2"
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-sm font-medium">
                Hapus ({selectedCount})
              </span>
            </button>
          )}

          {/* Cancel Button */}
          <button
            onClick={onCancelDelete}
            className="bg-gray-500 text-white px-4 py-3 rounded-full shadow-lg hover:bg-gray-600 transition-colors cursor-pointer flex items-center space-x-2"
          >
            <X className="w-5 h-5" />
            <span className="text-sm font-medium">Batal</span>
          </button>
        </div>
      ) : (
        /* Delete Mode Button */
        <button
          onClick={onToggleDeleteMode}
          disabled={totalCount === 0}
          className="bg-red-500 text-white rounded-full p-4 shadow-lg hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50"
          title="Hapus Pengingat"
        >
          <Trash2 className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}