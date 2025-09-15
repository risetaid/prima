"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface InstantSendResult {
  success: boolean;
  message?: string;
  error?: string;
  results?: {
    messagesSent: number;
    remindersFound: number;
    errors: number;
    successRate: string;
  };
}

interface InstantSendDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isSending: boolean;
  result: InstantSendResult | null;
  onSendAll: () => void;
  onClose: () => void;
}

export function InstantSendDialog({
  isOpen,
  onOpenChange,
  isSending,
  result,
  onSendAll,
  onClose,
}: InstantSendDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-md mx-2 sm:mx-4">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-base sm:text-lg font-semibold leading-tight">
            Konfirmasi Kirim Pengingat Hari Ini
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {!result ? (
              "Kirim pesan pengingat hari ini ke semua pasien Anda sekarang?"
            ) : (
              "Hasil pengiriman:"
            )}
          </DialogDescription>
        </DialogHeader>

        {result && (
          <div className={`p-3 sm:p-4 rounded-lg text-sm ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'} mb-2`}>
              {result.message || result.error}
            </div>
            {result.results && (
              <div className="text-xs text-gray-600 space-y-1">
                <div>📊 Ditemukan: <span className="font-medium">{result.results.remindersFound}</span></div>
                <div>✅ Terkirim: <span className="font-medium">{result.results.messagesSent}</span></div>
                <div>❌ Error: <span className="font-medium">{result.results.errors}</span></div>
                <div>📈 Sukses: <span className="font-medium">{result.results.successRate}</span></div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end pt-2">
          {!result ? (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto order-2 sm:order-1 h-10"
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={onSendAll}
                disabled={isSending}
                className="w-full sm:w-auto order-1 sm:order-2 h-10"
              >
                {isSending ? (
                  <div className="flex items-center gap-2 justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Mengirim...
                  </div>
                ) : (
                  "Ya, Kirim Sekarang"
                )}
              </Button>
            </>
          ) : (
            <Button onClick={onClose} className="w-full sm:w-auto h-10">
              Tutup
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}