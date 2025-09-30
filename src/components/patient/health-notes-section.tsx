"use client";

import { useState } from "react";
import { Edit, Plus, Trash2, Calendar, Clock } from "lucide-react";
import { formatDateTimeWIB } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { logger } from '@/lib/logger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface HealthNote {
  id: string;
  date: string;
  note: string;
  createdAt: string;
}

interface HealthNotesSectionProps {
  healthNotes: HealthNote[];
  patientId: string;
  onAddNote: (note: string, date: string) => Promise<void>;
  onEditNote: (noteId: string, note: string, date: string) => Promise<void>;
  onDeleteNotes: (noteIds: string[]) => Promise<void>;
}

export function HealthNotesSection({
  healthNotes,
  onAddNote,
  onEditNote,
  onDeleteNotes,
}: HealthNotesSectionProps) {
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [isEditNoteModalOpen, setIsEditNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<HealthNote | null>(null);
  const [newNoteText, setNewNoteText] = useState("");
  const [editNoteText, setEditNoteText] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [editSelectedDate, setEditSelectedDate] = useState("");
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);

  const formatNoteDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    return `${days[date.getDay()]}, ${date.getDate()} ${
      months[date.getMonth()]
    } ${date.getFullYear()}`;
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;

    try {
      await onAddNote(newNoteText.trim(), selectedDate);
      setNewNoteText("");
      setSelectedDate(new Date().toISOString().split("T")[0]);
      setIsAddNoteModalOpen(false);
    } catch (error: unknown) {
      logger.error("Error adding note:", error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleEditNote = (note: HealthNote) => {
    setEditingNote(note);
    setEditNoteText(note.note);
    setEditSelectedDate(note.date);
    setIsEditNoteModalOpen(true);
  };

  const handleSaveEditNote = async () => {
    if (!editNoteText.trim() || !editingNote) return;

    try {
      await onEditNote(editingNote.id, editNoteText.trim(), editSelectedDate);
      setIsEditNoteModalOpen(false);
      setEditingNote(null);
      setEditNoteText("");
      setEditSelectedDate("");
    } catch (error: unknown) {
      logger.error("Error editing note:", error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleDeleteSelectedNotes = async () => {
    if (selectedNotes.length === 0) return;

    try {
      await onDeleteNotes(selectedNotes);
      setSelectedNotes([]);
      setIsDeleteMode(false);
    } catch (error: unknown) {
      logger.error("Error deleting notes:", error instanceof Error ? error : new Error(String(error)));
    }
  };

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNotes((prev) =>
      prev.includes(noteId)
        ? prev.filter((id) => id !== noteId)
        : [...prev, noteId]
    );
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        {/* Health Notes Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 sm:p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Edit className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">
                Catatan Kesehatan
              </h2>
              <p className="text-purple-100 text-sm sm:text-base">
                Riwayat dan catatan kondisi pasien
              </p>
            </div>
          </div>
        </div>

        {/* Health Notes Content */}
        <div className="p-4 sm:p-6">
          <div className="">
            {healthNotes.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-gray-500">
                <Edit className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-30 text-purple-300" />
                <h3 className="text-base sm:text-lg font-medium text-gray-600 mb-2">
                  Belum ada catatan kesehatan
                </h3>
                <p className="text-xs sm:text-sm">
                  Klik &ldquo;Tambah Catatan&rdquo; untuk menambah catatan
                  pertama
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {healthNotes.map((note, index) => (
                  <div
                    key={note.id}
                    className="group bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-3 sm:p-4 hover:from-purple-100 hover:to-pink-100 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      {isDeleteMode && (
                        <input
                          type="checkbox"
                          checked={selectedNotes.includes(note.id)}
                          onChange={() => toggleNoteSelection(note.id)}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 rounded focus:ring-purple-500 mt-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}

                      {/* Note Number Badge */}
                      <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">
                        {index + 1}
                      </div>

                      {/* Note Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm sm:text-base text-gray-900 font-medium break-words">
                              {note.note}
                            </p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatNoteDate(note.date)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Dibuat{" "}
                                {formatDateTimeWIB(new Date(note.createdAt))}
                              </span>
                            </div>
                          </div>

                          {/* Edit Button */}
                          {!isDeleteMode && (
                            <button
                              onClick={() => handleEditNote(note)}
                              className="cursor-pointer flex-shrink-0 p-2 text-purple-600 hover:bg-purple-200 rounded-lg transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100"
                              title="Edit catatan"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Health Notes Footer */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={() => {
                setIsAddNoteModalOpen(true);
                setNewNoteText("");
                setSelectedDate(new Date().toISOString().split("T")[0]);
              }}
              className="flex-1 bg-white text-purple-600 px-4 sm:px-6 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-all duration-200 cursor-pointer flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base">
                Tambah Catatan Kesehatan
              </span>
            </button>
            <button
              onClick={() => {
                if (isDeleteMode && selectedNotes.length > 0) {
                  handleDeleteSelectedNotes();
                } else {
                  setIsDeleteMode(!isDeleteMode);
                  setSelectedNotes([]);
                }
              }}
              className={`px-4 sm:px-6 py-3 rounded-xl font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl ${
                isDeleteMode && selectedNotes.length > 0
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : isDeleteMode
                  ? "bg-gray-600 text-white hover:bg-gray-700"
                  : "bg-red-500 text-white hover:bg-red-600"
              }`}
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base">
                {isDeleteMode && selectedNotes.length > 0
                  ? `Hapus ${selectedNotes.length}`
                  : isDeleteMode
                  ? "Batal"
                  : "Hapus"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Add Health Note Modal */}
      <Dialog open={isAddNoteModalOpen} onOpenChange={setIsAddNoteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Catatan Kesehatan</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="mb-4">
              <label className="block text-gray-500 text-sm mb-2">
                Catatan
              </label>
              <input
                type="text"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Contoh: Gatal-gatal, efek samping obat"
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-500 text-sm mb-2">
                Tanggal
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddNoteModalOpen(false);
                setNewNoteText("");
                setSelectedDate(new Date().toISOString().split("T")[0]);
              }}
              className="flex-1"
            >
              Batal
            </Button>
            <Button onClick={handleAddNote} className="flex-1">
              <Plus className="w-4 h-4 mr-2" />
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Health Note Modal */}
      <Dialog
        open={isEditNoteModalOpen && editingNote !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsEditNoteModalOpen(false);
            setEditingNote(null);
            setEditNoteText("");
            setEditSelectedDate("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Catatan Kesehatan Pasien</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="mb-4">
              <label className="block text-gray-500 text-sm mb-2">
                Catatan
              </label>
              <input
                type="text"
                value={editNoteText}
                onChange={(e) => setEditNoteText(e.target.value)}
                placeholder="Contoh: Gatal-gatal, efek samping obat"
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-500 text-sm mb-2">
                Tanggal
              </label>
              <input
                type="date"
                value={editSelectedDate}
                onChange={(e) => setEditSelectedDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditNoteModalOpen(false);
                setEditingNote(null);
                setEditNoteText("");
                setEditSelectedDate("");
              }}
              className="flex-1"
            >
              Batal
            </Button>
            <Button onClick={handleSaveEditNote} className="flex-1">
              <Edit className="w-4 h-4 mr-2" />
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}