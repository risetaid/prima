import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IndonesianDateInput } from "@/components/ui/indonesian-date-input";
import { Separator } from "@/components/ui/separator";
import { PatientVariablesManager } from "@/components/patient/patient-variables-manager";
import { User, Stethoscope, Edit, Save, X, MapPin, FileText } from "lucide-react";

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
}

interface BasicInfoForm {
  name: string;
  phoneNumber: string;
  address: string;
  birthDate: string;
  diagnosisDate: string;
}

interface MedicalInfoForm {
  cancerStage: string;
  doctorName: string;
  hospitalName: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
}

interface PatientProfileTabProps {
  patient: Patient;
  isEditingBasicInfo: boolean;
  setIsEditingBasicInfo: (editing: boolean) => void;
  basicInfoForm: BasicInfoForm;
  setBasicInfoForm: (form: BasicInfoForm) => void;
  handleSaveBasicInfo: () => void;
  handleCancelBasicInfo: () => void;
  isEditingMedicalInfo: boolean;
  setIsEditingMedicalInfo: (editing: boolean) => void;
  medicalInfoForm: MedicalInfoForm;
  setMedicalInfoForm: (form: MedicalInfoForm) => void;
  handleSaveMedicalInfo: () => void;
  handleCancelMedicalInfo: () => void;
  patientId: string;
}

export function PatientProfileTab({
  patient,
  isEditingBasicInfo,
  setIsEditingBasicInfo,
  basicInfoForm,
  setBasicInfoForm,
  handleSaveBasicInfo,
  handleCancelBasicInfo,
  isEditingMedicalInfo,
  setIsEditingMedicalInfo,
  medicalInfoForm,
  setMedicalInfoForm,
  handleSaveMedicalInfo,
  handleCancelMedicalInfo,
  patientId,
}: PatientProfileTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Informasi Dasar
              </div>
              {!isEditingBasicInfo ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingBasicInfo(true)}
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
                    onClick={handleCancelBasicInfo}
                    className="h-8 px-2"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Batal
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveBasicInfo}
                    className="h-8 px-2"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Simpan
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditingBasicInfo ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nama Lengkap</label>
                  <Input
                    value={basicInfoForm.name}
                    onChange={(e) => setBasicInfoForm({ ...basicInfoForm, name: e.target.value })}
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Nomor Telepon</label>
                  <Input
                    value={basicInfoForm.phoneNumber}
                    onChange={(e) => setBasicInfoForm({ ...basicInfoForm, phoneNumber: e.target.value })}
                    placeholder="Masukkan nomor telepon"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tanggal Lahir</label>
                  <IndonesianDateInput
                    value={basicInfoForm.birthDate}
                    onChange={(value) => setBasicInfoForm({ ...basicInfoForm, birthDate: value })}
                    placeholder="hh/bb/tttt"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tanggal Diagnosis</label>
                  <IndonesianDateInput
                    value={basicInfoForm.diagnosisDate}
                    onChange={(value) => setBasicInfoForm({ ...basicInfoForm, diagnosisDate: value })}
                    placeholder="hh/bb/tttt"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nama Lengkap</label>
                  <p className="text-gray-900">{patient.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Nomor Telepon</label>
                  <p className="text-gray-900">{patient.phoneNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tanggal Lahir</label>
                  <p className="text-gray-900">
                    {patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('id-ID') : 'Tidak tersedia'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tanggal Diagnosis</label>
                  <p className="text-gray-900">
                    {patient.diagnosisDate ? new Date(patient.diagnosisDate).toLocaleDateString('id-ID') : 'Tidak tersedia'}
                  </p>
                </div>
              </div>
            )}
            {isEditingBasicInfo ? (
              <>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    Alamat
                  </label>
                  <Input
                    value={basicInfoForm.address}
                    onChange={(e) => setBasicInfoForm({ ...basicInfoForm, address: e.target.value })}
                    placeholder="Masukkan alamat"
                  />
                </div>
              </>
            ) : (
              patient.address && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      Alamat
                    </label>
                    <p className="text-gray-900">{patient.address}</p>
                  </div>
                </>
              )
            )}
          </CardContent>
        </Card>

        {/* Medical Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Stethoscope className="w-5 h-5 mr-2" />
                Informasi Medis
              </div>
              {!isEditingMedicalInfo ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingMedicalInfo(true)}
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
                    onClick={handleCancelMedicalInfo}
                    className="h-8 px-2"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Batal
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveMedicalInfo}
                    className="h-8 px-2"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Simpan
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditingMedicalInfo ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Stadium Kanker</label>
                  <Select
                    value={medicalInfoForm.cancerStage}
                    onValueChange={(value) => setMedicalInfoForm({ ...medicalInfoForm, cancerStage: value })}
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
                  <label className="text-sm font-medium text-gray-500">Dokter</label>
                  <Input
                    value={medicalInfoForm.doctorName}
                    onChange={(e) => setMedicalInfoForm({ ...medicalInfoForm, doctorName: e.target.value })}
                    placeholder="Masukkan nama dokter"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Rumah Sakit</label>
                  <Input
                    value={medicalInfoForm.hospitalName}
                    onChange={(e) => setMedicalInfoForm({ ...medicalInfoForm, hospitalName: e.target.value })}
                    placeholder="Masukkan nama rumah sakit"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Kontak Darurat</label>
                  <div className="space-y-2">
                    <Input
                      value={medicalInfoForm.emergencyContactName}
                      onChange={(e) => setMedicalInfoForm({ ...medicalInfoForm, emergencyContactName: e.target.value })}
                      placeholder="Nama kontak darurat"
                    />
                    <Input
                      value={medicalInfoForm.emergencyContactPhone}
                      onChange={(e) => setMedicalInfoForm({ ...medicalInfoForm, emergencyContactPhone: e.target.value })}
                      placeholder="Nomor telepon kontak darurat"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Stadium Kanker</label>
                  <p className="text-gray-900">{patient.cancerStage || 'Tidak tersedia'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Dokter</label>
                  <p className="text-gray-900">{patient.doctorName || 'Tidak tersedia'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Rumah Sakit</label>
                  <p className="text-gray-900">{patient.hospitalName || 'Tidak tersedia'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Kontak Darurat</label>
                  <p className="text-gray-900">
                    {patient.emergencyContactName && patient.emergencyContactPhone
                      ? `${patient.emergencyContactName} (${patient.emergencyContactPhone})`
                      : 'Tidak tersedia'}
                  </p>
                </div>
              </div>
            )}
            {isEditingMedicalInfo ? (
              <>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center">
                    <FileText className="w-4 h-4 mr-1" />
                    Catatan
                  </label>
                  <Textarea
                    value={medicalInfoForm.notes}
                    onChange={(e) => setMedicalInfoForm({ ...medicalInfoForm, notes: e.target.value })}
                    placeholder="Masukkan catatan medis"
                    rows={3}
                  />
                </div>
              </>
            ) : (
              patient.notes && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center">
                      <FileText className="w-4 h-4 mr-1" />
                      Catatan
                    </label>
                    <p className="text-gray-900">{patient.notes}</p>
                  </div>
                </>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* Patient Variables */}
      <PatientVariablesManager
        patientId={patientId}
        patientName={patient.name}
      />
    </div>
  );
}