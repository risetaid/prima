'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Settings, Trash2, Zap, Save, X, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'

interface PatientVariablesManagerProps {
  patientId: string
  patientName: string
}

const COMMON_VARIABLES = [
  { name: 'nama', label: 'Nama Pasien', placeholder: 'Nama lengkap pasien' },
  { name: 'nomor', label: 'No. WhatsApp', placeholder: '081234567890' },
  { name: 'obat', label: 'Nama Obat', placeholder: 'Paracetamol' },
  { name: 'dosis', label: 'Dosis', placeholder: '500mg' },
  { name: 'dokter', label: 'Nama Dokter', placeholder: 'Dr. Ahmad Wijaya' },
  { name: 'rumahSakit', label: 'Rumah Sakit', placeholder: 'RS Prima Medika' },
  { name: 'volunteer', label: 'Volunteer', placeholder: 'Suster Maria' },
  { name: 'waktu', label: 'Waktu Default', placeholder: '08:00' },
  { name: 'tanggal', label: 'Tanggal Default', placeholder: '2025-01-01' },
]

export function PatientVariablesManager({ patientId, patientName }: PatientVariablesManagerProps) {
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingValues, setEditingValues] = useState<Record<string, string>>({})
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [variableToDelete, setVariableToDelete] = useState<string | null>(null)

  // Load variables
  const loadVariables = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/patients/${patientId}/variables`)
      
       if (!response.ok) {
         throw new Error('Failed to load variables')
       }

       const data = await response.json()
       setVariables(data.variables || {})
    } catch (error) {
      console.error('Error loading variables:', error)
      toast.error('Gagal memuat variabel pasien')
    } finally {
      setIsLoading(false)
    }
  }

  // Save variables
  const saveVariables = async () => {
    try {
      setIsLoading(true)
      
      // Filter out empty values
      const cleanedValues = Object.fromEntries(
        Object.entries(editingValues).filter(([_, value]) => value.trim() !== '')
      )

      const response = await fetch(`/api/patients/${patientId}/variables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variables: cleanedValues
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save variables')
      }

       const data = await response.json()
       setVariables(data.variables || {})
       setIsDialogOpen(false)
      toast.success('Variabel pasien berhasil disimpan')
    } catch (error) {
      console.error('Error saving variables:', error)
      toast.error('Gagal menyimpan variabel pasien')
    } finally {
      setIsLoading(false)
    }
  }

  // Delete variable
  const deleteVariable = async (variableName: string) => {
    setVariableToDelete(variableName)
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteVariable = async () => {
    if (!variableToDelete) return

    try {
      setIsLoading(true)
      const response = await fetch(
        `/api/patients/${patientId}/variables?variableName=${encodeURIComponent(variableToDelete)}`,
        {
          method: 'DELETE',
        }
      )

      if (response.ok) {
        toast.success(`Variabel "${variableToDelete}" berhasil dihapus`)
        loadVariables()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Gagal menghapus variabel')
      }
    } catch (error) {
      console.error('Error deleting variable:', error)
      toast.error('Terjadi kesalahan saat menghapus variabel')
    } finally {
      setIsLoading(false)
      setVariableToDelete(null)
    }
  }

  // Open dialog with current values
  const openEditDialog = () => {
    const initialValues = { ...variables }
    
    // Add empty slots for common variables that don't exist
    COMMON_VARIABLES.forEach(({ name }) => {
      if (!(name in initialValues)) {
        initialValues[name] = ''
      }
    })
    
    setEditingValues(initialValues)
    setIsDialogOpen(true)
  }

  useEffect(() => {
    loadVariables()
  }, [patientId])

  const variablesCount = Object.keys(variables).length

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
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Kelola Data Pasien - {patientName}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <strong>Data pasien akan diprioritaskan</strong> saat menggunakan template WhatsApp. 
                    Kosongkan kolom untuk menggunakan data otomatis dari sistem.
                  </div>
                </div>
              </div>

               <div className="grid gap-4">
                 {COMMON_VARIABLES.map(({ name, label, placeholder }) => (
                   <div key={name} className="grid grid-cols-1 md:grid-cols-4 items-start md:items-center gap-2 md:gap-4">
                     <Label htmlFor={name} className="text-left md:text-right font-medium">
                       {label}
                       <span className="text-xs text-muted-foreground block">
                         {`{${name}}`}
                       </span>
                     </Label>
                     <div className="col-span-1">
                       <Input
                         id={name}
                         placeholder={placeholder}
                         value={editingValues[name] || ''}
                         onChange={(e) => setEditingValues(prev => ({
                           ...prev,
                           [name]: e.target.value
                         }))}
                         className="w-full"
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
                <Button 
                  onClick={saveVariables}
                  disabled={isLoading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {isLoading ? 'Menyimpan...' : 'Simpan'}
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
            <p className="text-xs">Klik "Kelola" untuk mengatur data pasien</p>
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(variables).slice(0, 6).map(([name, value]) => (
              <div key={name} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {`{${name}}`}
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
          setIsDeleteModalOpen(false)
          setVariableToDelete(null)
        }}
        onConfirm={confirmDeleteVariable}
        title="Hapus Variabel"
        description={`Yakin ingin menghapus variabel "${variableToDelete}"?`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        variant="destructive"
        loading={isLoading}
      />
    </Card>
  )
}