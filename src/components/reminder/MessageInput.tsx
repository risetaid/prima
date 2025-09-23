import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface WhatsAppTemplate {
  id: string;
  templateName: string;
  templateText: string;
  variables: string[];
  category: "REMINDER" | "APPOINTMENT" | "EDUCATIONAL";
}

interface MessageInputProps {
  message: string;
  onMessageChange: (message: string) => void;
  templates: WhatsAppTemplate[];
  selectedTemplate: string;
  onTemplateSelect: (templateId: string) => void;
  time: string;
  selectedDates: string[];
}

export function MessageInput({
  message,
  onMessageChange,
  templates,
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

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      onTemplateSelect(templateId);
      const messageWithData = applyTemplateVariables(template.templateText, {
        nama: "{nama}",
        waktu: time,
        tanggal: selectedDates.length > 0 ? selectedDates[0] : "{tanggal}",
        dokter: "{dokter}",
        rumahSakit: "{rumahSakit}",
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
                          REMINDER: "⏰ Pengingat",
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

      {selectedTemplate && (
        <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-700 font-medium">
              📝 Template:{" "}
              {templates.find((t) => t.id === selectedTemplate)?.templateName}
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
