import { useState, useEffect } from "react";
import { Zap, ChevronDown } from "lucide-react";

interface WhatsAppTemplate {
  id: string;
  templateName: string;
  templateText: string;
  variables: string[];
  category: "REMINDER" | "APPOINTMENT" | "EDUCATIONAL";
}

interface AutoFillData {
  nama: string;
  dokter?: string;
  rumahSakit?: string;
  waktu?: string;
  tanggal?: string;
  dataContext?: {
    hasActiveMedications: boolean;
    hasRecentReminders: boolean;
    hasMedicalRecords: boolean;
    assignedVolunteerName?: string;
    currentUserName?: string;
  };
}

interface MessageInputProps {
  message: string;
  onMessageChange: (message: string) => void;
  templates: WhatsAppTemplate[];
  autoFillData: AutoFillData | null;
  selectedTemplate: string;
  onTemplateSelect: (templateId: string) => void;
  time: string;
  selectedDates: string[];
}

export function MessageInput({
  message,
  onMessageChange,
  templates,
  autoFillData,
  selectedTemplate,
  onTemplateSelect,
  time,
  selectedDates,
}: MessageInputProps) {
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isTemplateDropdownOpen &&
        !(event.target as Element)?.closest(".template-dropdown")
      ) {
        setIsTemplateDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isTemplateDropdownOpen]);

  const handleAutoFillMessage = () => {
    if (!autoFillData || !message) return;

    let updatedMessage = message;

    const autoFillMap = {
      "{dokter}": autoFillData.dokter,
      "{rumahSakit}": autoFillData.rumahSakit,
      "{nama}": autoFillData.nama,
      "{waktu}": time,
      "{tanggal}": selectedDates.length > 0 ? selectedDates[0] : "{tanggal}",
    };

    Object.entries(autoFillMap).forEach(([placeholder, value]) => {
      if (value) {
        updatedMessage = updatedMessage.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          value
        );
      }
    });

    onMessageChange(updatedMessage);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template && autoFillData) {
      onTemplateSelect(templateId);
      const messageWithData = applyTemplateVariables(template.templateText, {
        nama: autoFillData.nama,
        waktu: time,
        tanggal: selectedDates.length > 0 ? selectedDates[0] : "{tanggal}",
        dokter: autoFillData.dokter || "",
        rumahSakit: autoFillData.rumahSakit || "",
      });
      onMessageChange(messageWithData);
    }
    setIsTemplateDropdownOpen(false);
  };

  const applyTemplateVariables = (
    text: string,
    variables: Record<string, string>
  ) => {
    let result = text;
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      result = result.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        value
      );
    });
    return result;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-gray-500 text-sm">Isi Pesan</label>

        <div className="flex items-center space-x-2">
          {autoFillData && message && (
            <button
              type="button"
              onClick={handleAutoFillMessage}
              className="flex items-center space-x-1 px-2 py-1 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors cursor-pointer text-xs"
            >
              <Zap className="w-3 h-3" />
              <span>Auto-isi</span>
            </button>
          )}

          {templates.length > 0 && (
            <div className="relative template-dropdown">
              <button
                type="button"
                onClick={() =>
                  setIsTemplateDropdownOpen(!isTemplateDropdownOpen)
                }
                className="flex items-center space-x-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer text-sm"
              >
                <span>📝 Template</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    isTemplateDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isTemplateDropdownOpen && (
                <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <div className="max-h-48 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        onTemplateSelect("");
                        onMessageChange("");
                        setIsTemplateDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 border-b border-gray-100 cursor-pointer"
                    >
                      ✨ Tulis sendiri
                    </button>
                    {["REMINDER", "APPOINTMENT", "EDUCATIONAL"].map(
                      (category) => {
                        const categoryTemplates = templates.filter(
                          (t) => t.category === category
                        );
                        if (categoryTemplates.length === 0) return null;

                        const categoryLabels = {
                          REMINDER: "💊 Pengingat",
                          APPOINTMENT: "📅 Janji Temu",
                          EDUCATIONAL: "📚 Edukasi",
                        };

                        return (
                          <div key={category}>
                            <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 border-b">
                              {
                                categoryLabels[
                                  category as keyof typeof categoryLabels
                                ]
                              }
                            </div>
                            {categoryTemplates.map((template) => (
                              <button
                                key={template.id}
                                type="button"
                                onClick={() =>
                                  handleTemplateSelect(template.id)
                                }
                                className={`w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors cursor-pointer ${
                                  selectedTemplate === template.id
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-gray-700"
                                }`}
                              >
                                <div className="font-medium">
                                  {template.templateName}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {template.templateText.substring(0, 50)}
                                  ...
                                </div>
                              </button>
                            ))}
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <textarea
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        placeholder={
          templates.length > 0
            ? "Pilih template atau tulis pesan sendiri..."
            : "Tulis pesan pengingat..."
        }
        className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none"
        rows={4}
        required
      />

      {autoFillData && (
        <div className="mt-3 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Data Tersedia untuk Auto-isi</span>
            </h4>
            {!message && (
              <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                Tulis pesan dulu
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* Patient Basic Info */}
            {autoFillData.nama && (
              <div className="bg-white p-3 rounded-lg">
                <div className="text-xs text-gray-500">
                  Nama Lengkap Pasien
                </div>
                <div className="text-sm font-medium text-gray-800">
                  {autoFillData.nama}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  {"{nama}"}
                </div>
              </div>
            )}

            {autoFillData.dokter && (
              <div className="bg-white p-3 rounded-lg">
                <div className="text-xs text-gray-500">
                  Nama Dokter
                </div>
                <div className="text-sm font-medium text-gray-800">
                  {autoFillData.dokter}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  {"{dokter}"}
                </div>
              </div>
            )}

            {autoFillData.rumahSakit && (
              <div className="bg-white p-3 rounded-lg">
                <div className="text-xs text-gray-500">
                  Rumah Sakit
                </div>
                <div className="text-sm font-medium text-gray-800">
                  {autoFillData.rumahSakit}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  {"{rumahSakit}"}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-green-200">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-600">
                💡 <strong>Tips:</strong> Ketik variabel seperti{" "}
                <span className="bg-blue-100 text-blue-800 px-1 rounded">
                  {"{nama}"}
                </span>{" "}
                di pesan, lalu klik
                <span className="ml-1 inline-flex items-center bg-green-100 text-green-700 px-1 rounded text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  Auto-isi
                </span>
              </div>
              {message && (
                <button
                  type="button"
                  onClick={handleAutoFillMessage}
                  className="flex items-center space-x-1 px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs font-medium"
                >
                  <Zap className="w-3 h-3" />
                  <span>Auto-isi Sekarang</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedTemplate && (
        <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-700 font-medium">
              📝 Template:{" "}
              {
                templates.find((t) => t.id === selectedTemplate)
                  ?.templateName
              }
            </span>
            <button
              type="button"
              onClick={() => {
                onTemplateSelect("");
                onMessageChange("");
              }}
              className="text-xs text-red-600 hover:text-red-800 cursor-pointer"
            >
              ✕ Hapus template
            </button>
          </div>
        </div>
      )}
    </div>
  );
}