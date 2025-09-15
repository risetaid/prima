"use client";

import { Edit, User, Camera, Upload, X } from "lucide-react";
import Image from "next/image";

interface Patient {
  id: string;
  name: string;
  phoneNumber: string;
  photoUrl: string | null;
  isActive: boolean;
  assignedVolunteer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string | null;
  } | null;
  volunteerFirstName: string | null;
  volunteerLastName: string | null;
  volunteerEmail: string | null;
  volunteerRole: string | null;
}

interface PatientProfileSectionProps {
  patient: Patient;
  isEditMode: boolean;
  editData: {
    name: string;
    phoneNumber: string;
    photoUrl: string;
  };
  photoPreview: string | null;
  onEditDataChange: (data: { name: string; phoneNumber: string; photoUrl: string }) => void;
  onPhotoChange: (file: File | null) => void;
  onRemovePhoto: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onToggleStatus: () => void;
}

export function PatientProfileSection({
  patient,
  isEditMode,
  editData,
  photoPreview,
  onEditDataChange,
  onPhotoChange,
  onRemovePhoto,
  onEdit,
  onCancel,
  onSave,
  onToggleStatus,
}: PatientProfileSectionProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRandomAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-cyan-500",
      "bg-teal-500",
      "bg-emerald-500",
      "bg-lime-500",
      "bg-orange-500",
      "bg-rose-500",
      "bg-violet-500",
      "bg-sky-500",
    ];
    const hash = name.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onPhotoChange(file);
      const reader = new FileReader();
      reader.onload = () => {
        // Handle preview in parent component
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <User className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">
                Profil Pasien
              </h1>
              <p className="text-blue-100 text-sm sm:text-base">
                Informasi lengkap dan pengelolaan data pasien
              </p>
            </div>
          </div>
        </div>

        {/* Managed by information */}
        {patient.assignedVolunteer && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
              <div className="flex items-center space-x-2 text-blue-100 mb-1">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Dikelola oleh</span>
              </div>
              <div className="text-white">
                <div className="font-semibold">
                  {patient.volunteerFirstName} {patient.volunteerLastName}
                </div>
                <div className="text-xs text-blue-100 mt-1">
                  <span className="font-medium">
                    {patient.volunteerEmail}
                  </span>
                  {patient.volunteerRole && (
                    <>
                      {" • "}
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          patient.volunteerRole === "SUPERADMIN"
                            ? "bg-red-500/20 text-red-100 border border-red-400/30"
                            : patient.volunteerRole === "ADMIN"
                            ? "bg-yellow-500/20 text-yellow-100 border border-yellow-400/30"
                            : "bg-green-500/20 text-green-100 border border-green-400/30"
                        }`}
                      >
                        {patient.volunteerRole === "SUPERADMIN"
                          ? "Super Admin"
                          : patient.volunteerRole === "ADMIN"
                          ? "Admin"
                          : "Member"}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Profile Content */}
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column: Basic Info & Photo */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Picture */}
            <div className="flex justify-center relative">
              {photoPreview || patient.photoUrl ? (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-blue-200 shadow-lg relative">
                  <Image
                    src={photoPreview || patient.photoUrl!}
                    alt={patient.name}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                  {isEditMode && (
                    <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-full">
                      <label
                        htmlFor="photo-upload"
                        className="cursor-pointer"
                      >
                        <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </label>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`w-24 h-24 sm:w-32 sm:h-32 ${getRandomAvatarColor(
                    patient.name
                  )} rounded-full flex items-center justify-center relative shadow-lg border-4 border-white`}
                >
                  <span className="text-white font-bold text-xl sm:text-3xl">
                    {getInitials(patient.name)}
                  </span>
                  {isEditMode && (
                    <div className="absolute inset-0 bg-black bg-opacity-30 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <label
                        htmlFor="photo-upload"
                        className="cursor-pointer"
                      >
                        <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {isEditMode && (
                <>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  <div className="absolute -bottom-2 flex space-x-2">
                    <button
                      onClick={() =>
                        document.getElementById("photo-upload")?.click()
                      }
                      className="bg-blue-500 text-white rounded-full p-2 hover:bg-blue-600 transition-colors cursor-pointer shadow-md"
                      title="Upload Foto"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    {(photoPreview || patient.photoUrl) && (
                      <button
                        onClick={onRemovePhoto}
                        className="bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors cursor-pointer shadow-md"
                        title="Hapus Foto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Basic Patient Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-600 text-sm mb-2 font-medium">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) =>
                    isEditMode &&
                    onEditDataChange({ ...editData, name: e.target.value })
                  }
                  readOnly={!isEditMode}
                  className={`w-full px-4 py-3 border rounded-xl text-gray-900 font-medium transition-all ${
                    isEditMode
                      ? "border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none bg-white shadow-sm"
                      : "border-gray-200 bg-gray-50 cursor-default"
                  }`}
                />
              </div>

              <div>
                <label className="block text-gray-600 text-sm mb-2 font-medium">
                  Nomor WhatsApp
                </label>
                <input
                  type="text"
                  value={editData.phoneNumber}
                  onChange={(e) =>
                    isEditMode &&
                    onEditDataChange({
                      ...editData,
                      phoneNumber: e.target.value,
                    })
                  }
                  readOnly={!isEditMode}
                  className={`w-full px-4 py-3 border rounded-xl text-gray-900 font-medium transition-all ${
                    isEditMode
                      ? "border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none bg-white shadow-sm"
                      : "border-gray-200 bg-gray-50 cursor-default"
                  }`}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {isEditMode ? (
                <>
                  <button
                    onClick={onCancel}
                    className="cursor-pointer w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200 shadow-sm border border-gray-200"
                  >
                    Batal
                  </button>
                  <button
                    onClick={onSave}
                    className="cursor-pointer w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg"
                  >
                    Simpan Perubahan
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onEdit}
                    className="cursor-pointer w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg"
                  >
                    <Edit className="w-5 h-5" />
                    <span>Edit Profil</span>
                  </button>

                  <button
                    onClick={onToggleStatus}
                    className={`cursor-pointer w-full py-3 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all duration-200 shadow-lg ${
                      patient.isActive
                        ? "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700"
                        : "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
                    }`}
                  >
                    {patient.isActive ? (
                      <>
                        <User className="w-5 h-5" />
                        <span>Nonaktifkan</span>
                      </>
                    ) : (
                      <>
                        <User className="w-5 h-5" />
                        <span>Aktifkan</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Placeholder for other content */}
          <div className="lg:col-span-2">
            {/* This will be filled by other components */}
          </div>
        </div>
      </div>
    </div>
  );
}