"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, Trash2, Zap, Save, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

interface PatientVariablesManagerProps {
  patientId: string;
  patientName: string;
}

const COMMON_VARIABLES = [
  {
    name: "nama",
    label: "Nama Lengkap Pasien",
    placeholder: "Nama lengkap pasien",
  },
  { name: "dokter", label: "Nama Dokter", placeholder: "Dr. Ahmad Wijaya" },
  { name: "rumahSakit", label: "Rumah Sakit", placeholder: "RS Prima Medika" },
];

export function PatientVariablesManager({
  patientId,
  patientName,
}: PatientVariablesManagerProps) {
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingValues, setEditingValues] = useState<Record<string, string>>(
    {}
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [variableToDelete, setVariableToDelete] = useState<string | null>(null);

  // Load variables
  const loadVariables = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/patients/${patientId}/variables`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error(
          "Variables API error",
          new Error(`API Error: ${response.status} ${response.statusText}`),
          {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            patientId,
          }
        );
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      logger.info("Variables loaded successfully", {
        patientId,
        variablesCount: Object.keys(data.variables || {}).length,
      });
      setVariables(data.variables || {});
    } catch (error) {
      logger.error("Error loading variables", error as Error, { patientId });
      toast.error("Gagal memuat variabel pasien");
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  // Save variables
  const saveVariables = async () => {
    try {
      setIsLoading(true);

      // Filter out empty values
      const cleanedValues = Object.fromEntries(
        Object.entries(editingValues).filter(([, value]) => value.trim() !== "")
      );

      logger.info("Saving variables", {
        patientId,
        variablesCount: Object.keys(cleanedValues).length,
        // Note: Not logging actual variable names/values for privacy compliance
      });
      const response = await fetch(`/api/patients/${patientId}/variables`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          variables: cleanedValues,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error(
          "Variables save API error",
          new Error(`API Error: ${response.status} ${response.statusText}`),
          {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            patientId,
            requestBody: { variables: cleanedValues },
          }
        );
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      logger.info("Variables saved successfully", {
        patientId,
        variablesCount: Object.keys(data.variables || {}).length,
        // Note: Not logging actual variable contents for privacy
      });
      setVariables(data.variables || {});
      setIsDialogOpen(false);
      toast.success("Variabel pasien berhasil disimpan");
    } catch (error) {
      logger.error("Error saving variables", error as Error, { patientId });
      toast.error("Gagal menyimpan variabel pasien");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete variable
  const deleteVariable = async (variableName: string) => {
    setVariableToDelete(variableName);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteVariable = async () => {
    if (!variableToDelete) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/patients/${patientId}/variables?variableName=${encodeURIComponent(
          variableToDelete
        )}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast.success('Variabel "' + variableToDelete + '" berhasil dihapus');
        loadVariables();
      } else {
        const error = await response.json();
        toast.error(error.error || "Gagal menghapus variabel");
      }
    } catch (error) {
      logger.error("Error deleting variable", error as Error);
      toast.error("Terjadi kesalahan saat menghapus variabel");
    } finally {
      setIsLoading(false);
      setVariableToDelete(null);
    }
  };

  // Open dialog with current values
  const openEditDialog = () => {
    const initialValues = { ...variables };

    // Add empty slots for common variables that don't exist
    COMMON_VARIABLES.forEach(({ name }) => {
      if (!(name in initialValues)) {
        initialValues[name] = "";
      }
    });

    setEditingValues(initialValues);
    setIsDialogOpen(true);
  };

  useEffect(() => {
    loadVariables();
  }, [loadVariables]);

  const variablesCount = Object.keys(variables).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Data Pasien
          {variablesCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {variablesCount}
            </Badge>
          )}
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={openEditDialog}>
              <Settings className="h-4 w-4 mr-1" />
              Kelola
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Kelola Data Pasien - {patientName}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <strong>Data pasien akan diprioritaskan</strong> saat
                    menggunakan template WhatsApp. Kosongkan kolom untuk
                    menggunakan data otomatis dari sistem.
                  </div>
                </div>
              </div>

              <div className="grid gap-6">
                {COMMON_VARIABLES.map(({ name, label, placeholder }) => (
                  <div
                    key={name}
                    className="grid grid-cols-1 lg:grid-cols-3 items-start lg:items-center gap-3 lg:gap-6"
                  >
                    <Label
                      htmlFor={name}
                      className="text-left lg:text-right font-medium text-gray-700"
                    >
                      {label}
                      <span className="text-xs text-muted-foreground block lg:inline lg:ml-2">
                        {"{" + name + "}"}
                      </span>
                    </Label>
                    <div className="lg:col-span-2">
                      <Input
                        id={name}
                        placeholder={placeholder}
                        value={editingValues[name] || ""}
                        onChange={(e) =>
                          setEditingValues((prev) => ({
                            ...prev,
                            [name]: e.target.value,
                          }))
                        }
                        className="w-full h-11 text-base"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4 mr-1" />
                  Batal
                </Button>
                <Button onClick={saveVariables} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-1" />
                  {isLoading ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {variablesCount === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada data pasien</p>
            <p className="text-xs">
              Klik &quot;Kelola&quot; untuk mengatur data pasien
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(variables)
              .slice(0, 6)
              .map(([name, value]) => (
                <div
                  key={name}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {"{" + name + "}"}
                    </Badge>
                    <span className="text-sm truncate max-w-[200px]">
                      {value}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteVariable(name)}
                    className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}

            {variablesCount > 6 && (
              <div className="text-xs text-muted-foreground text-center pt-2">
                +{variablesCount - 6} variabel lainnya
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setVariableToDelete(null);
        }}
        onConfirm={confirmDeleteVariable}
        title="Hapus Variabel"
        description={
          'Yakin ingin menghapus variabel "' + variableToDelete + '"?'
        }
        confirmText="Ya, Hapus"
        cancelText="Batal"
        variant="destructive"
        loading={isLoading}
      />
    </Card>
  );
}
