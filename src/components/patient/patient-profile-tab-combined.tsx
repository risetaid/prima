import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IndonesianDateInput } from "@/components/ui/indonesian-date-input";
import { Separator } from "@/components/ui/separator";

import { User, Edit, Save, X, MapPin, FileText, Camera, Trash2, Stethoscope } from "lucide-react";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

interface Patient {
  name: string;
  phoneNumber: string;
  address: string | null;
  birthDate: Date | null;
  diagnosisDate: Date | null;
  cancerStage: string | null;
  doctorName: string | null;
  hospitalName: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  photoUrl?: string | null;
}

interface ProfileForm {
  // Basic info
  name: string;
  phoneNumber: string;
  address: string;
  birthDate: string;
  diagnosisDate: string;
  // Medical info
  cancerStage: string;
  doctorName: string;
  hospitalName: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
}

interface PatientProfileTabProps {
  patient: Patient;
  isEditingProfile: boolean;
  setIsEditingProfile: (editing: boolean) => void;
  profileForm: ProfileForm;
  setProfileForm: (form: ProfileForm) => void;
  handleSaveProfile: (photoData?: { file: File | null; shouldRemove: boolean }) => void;
  handleCancelProfile: () => void;
}

export function PatientProfileTabCombined({
  patient,
  isEditingProfile,
  setIsEditingProfile,
  profileForm,
  setProfileForm,
  handleSaveProfile,
  handleCancelProfile,
}: PatientProfileTabProps) {
  // Profile image states
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [shouldRemovePhoto, setShouldRemovePhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File Terlalu Besar", {
          description: "Ukuran file maksimal 5MB. Silakan pilih file yang lebih kecil.",
        });
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Format File Tidak Valid", {
          description: "File harus berupa gambar (JPG, PNG, GIF, dll).",
        });
        return;
      }

      setPhotoFile(file);
      setIsUploading(true);

      const reader = new FileReader();
      reader.onload = async (e) => {
        setPhotoPreview(e.target?.result as string);

        const photoFormData = new FormData();
        photoFormData.append("photo", file);

        try {
          const photoResponse = await fetch("/api/upload?type=patient-photo", {
            method: "POST",
            body: photoFormData,
          });

          if (photoResponse.ok) {
            toast.success("Foto profil berhasil diunggah");
          } else {
            toast.error("Gagal mengunggah foto profil");
            setPhotoPreview(null);
            setPhotoFile(null);
          }
        } catch {
          toast.error("Kesalahan jaringan saat mengunggah foto");
          setPhotoPreview(null);
          setPhotoFile(null);
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setPhotoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveExistingPhoto = () => {
    if (patient.photoUrl) {
      setPhotoPreview(null);
      setPhotoFile(null);
      setShouldRemovePhoto(true);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Reset photo states when exiting edit mode
  useEffect(() => {
    if (!isEditingProfile) {
      setPhotoPreview(null);
      setPhotoFile(null);
      setShouldRemovePhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isEditingProfile]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            Profil Pasien
          </div>
          {!isEditingProfile ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingProfile(true)}
              className="h-8 px-2"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelProfile}
                className="h-8 px-2"
              >
                <X className="w-4 h-4 mr-1" />
                Batal
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  handleSaveProfile({
                    file: photoFile,
                    shouldRemove: shouldRemovePhoto,
                  })
                }
                className="h-8 px-2"
              >
                <Save className="w-4 h-4 mr-1" />
                Simpan
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Photo */}
        {isEditingProfile && (
          <div className="flex justify-center">
            <div>
              <label className="block text-gray-600 text-sm mb-2 text-center">
                Foto Profil
              </label>
              <div className="flex items-center justify-center">
                {photoPreview || (patient.photoUrl && !shouldRemovePhoto) ? (
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-blue-200">
                      <Image
                        src={photoPreview || patient.photoUrl || ""}
                        alt="Preview"
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={
                        patient.photoUrl && !photoPreview
                          ? handleRemoveExistingPhoto
                          : removePhoto
                      }
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-2 h-2" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={handlePhotoClick}
                    className="w-20 h-20 border-4 border-dashed border-blue-300 rounded-full flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <Camera className="w-5 h-5 text-blue-400 mb-1" />
                    <span className="text-xs text-blue-400">Foto</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
                disabled={isUploading}
              />
              {isUploading && (
                <p className="text-xs text-blue-600 text-center mt-1">
                  Mengunggah...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Basic Information Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <User className="w-4 h-4 mr-2" />
            Informasi Dasar
          </h3>
          {isEditingProfile ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Nama Lengkap
                </label>
                <Input
                  value={profileForm.name}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, name: e.target.value })
                  }
                  placeholder="Masukkan nama lengkap"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Nomor Telepon
                </label>
                <Input
                  value={profileForm.phoneNumber}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      phoneNumber: e.target.value,
                    })
                  }
                  placeholder="Masukkan nomor telepon"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Tanggal Lahir
                </label>
                <IndonesianDateInput
                  value={profileForm.birthDate}
                  onChange={(value) =>
                    setProfileForm({ ...profileForm, birthDate: value })
                  }
                  placeholder="hh/bb/tttt"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Tanggal Diagnosis
                </label>
                <IndonesianDateInput
                  value={profileForm.diagnosisDate}
                  onChange={(value) =>
                    setProfileForm({ ...profileForm, diagnosisDate: value })
                  }
                  placeholder="hh/bb/tttt"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-gray-500 flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  Alamat
                </label>
                <Input
                  value={profileForm.address}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, address: e.target.value })
                  }
                  placeholder="Masukkan alamat"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Nama Lengkap
                </label>
                <p className="text-gray-900">{patient.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Nomor Telepon
                </label>
                <p className="text-gray-900">{patient.phoneNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Tanggal Lahir
                </label>
                <p className="text-gray-900">
                  {patient.birthDate
                    ? new Date(patient.birthDate).toLocaleDateString("id-ID")
                    : "Tidak tersedia"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Tanggal Diagnosis
                </label>
                <p className="text-gray-900">
                  {patient.diagnosisDate
                    ? new Date(patient.diagnosisDate).toLocaleDateString(
                        "id-ID"
                      )
                    : "Tidak tersedia"}
                </p>
              </div>
              {patient.address && (
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-gray-500 flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    Alamat
                  </label>
                  <p className="text-gray-900">{patient.address}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Medical Information Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <Stethoscope className="w-4 h-4 mr-2" />
            Informasi Medis
          </h3>
          {isEditingProfile ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Stadium Kanker
                </label>
                <Select
                  value={profileForm.cancerStage}
                  onValueChange={(value) =>
                    setProfileForm({ ...profileForm, cancerStage: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih stadium kanker" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="I">Stadium I</SelectItem>
                    <SelectItem value="II">Stadium II</SelectItem>
                    <SelectItem value="III">Stadium III</SelectItem>
                    <SelectItem value="IV">Stadium IV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Dokter
                </label>
                <Input
                  value={profileForm.doctorName}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      doctorName: e.target.value,
                    })
                  }
                  placeholder="Masukkan nama dokter"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Rumah Sakit
                </label>
                <Input
                  value={profileForm.hospitalName}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      hospitalName: e.target.value,
                    })
                  }
                  placeholder="Masukkan nama rumah sakit"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Nama Kontak Darurat
                </label>
                <Input
                  value={profileForm.emergencyContactName}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      emergencyContactName: e.target.value,
                    })
                  }
                  placeholder="Nama kontak darurat"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-gray-500">
                  Nomor Kontak Darurat
                </label>
                <Input
                  value={profileForm.emergencyContactPhone}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      emergencyContactPhone: e.target.value,
                    })
                  }
                  placeholder="Nomor telepon kontak darurat"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-gray-500 flex items-center">
                  <FileText className="w-4 h-4 mr-1" />
                  Catatan Medis
                </label>
                <Textarea
                  value={profileForm.notes}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, notes: e.target.value })
                  }
                  placeholder="Masukkan catatan medis"
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Stadium Kanker
                </label>
                <p className="text-gray-900">
                  {patient.cancerStage || "Tidak tersedia"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Dokter
                </label>
                <p className="text-gray-900">
                  {patient.doctorName || "Tidak tersedia"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Rumah Sakit
                </label>
                <p className="text-gray-900">
                  {patient.hospitalName || "Tidak tersedia"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Kontak Darurat
                </label>
                <p className="text-gray-900">
                  {patient.emergencyContactName && patient.emergencyContactPhone
                    ? `${patient.emergencyContactName} (${patient.emergencyContactPhone})`
                    : "Tidak tersedia"}
                </p>
              </div>
              {patient.notes && (
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-gray-500 flex items-center">
                    <FileText className="w-4 h-4 mr-1" />
                    Catatan Medis
                  </label>
                  <p className="text-gray-900">{patient.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
