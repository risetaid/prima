"use client";

import { MessageSquare } from "lucide-react";
import { formatDateTimeWIB } from "@/lib/datetime";
import VerificationBadge, {
  getVerificationStatusTitle,
  getVerificationStatusDescription,
} from "@/components/patient/verification-badge";
import VerificationActionsPanel from "@/components/patient/verification-actions-panel";
import VerificationHistory from "@/components/patient/verification-history";
import VerificationStatusIcon from "@/components/patient/verification-status-icon";
import { Patient } from "@/db/schema";

interface WhatsAppVerificationSectionProps {
  patient: Patient;
  onUpdate: () => void;
}

export function WhatsAppVerificationSection({
  patient,
  onUpdate,
}: WhatsAppVerificationSectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">
              Verifikasi WhatsApp
            </h2>
            <p className="text-green-100 text-sm sm:text-base">
              Status dan pengelolaan verifikasi pasien
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* Status Overview */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <VerificationStatusIcon
                status={patient.verificationStatus}
              />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Status Verifikasi
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">
                {getVerificationStatusDescription(
                  patient.verificationStatus,
                  patient.isActive
                )}
              </p>
            </div>
          </div>
          <div className="flex justify-center sm:justify-end">
            <VerificationBadge
              status={
                patient.verificationStatus as
                  | "pending_verification"
                  | "verified"
                  | "declined"
                  | "expired"
                  | "unsubscribed"
              }
              size="large"
              patient={patient}
            />
          </div>
        </div>

        {/* Verification Details Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-green-50 rounded-xl p-3 sm:p-4 border border-green-200">
            <div className="text-xs sm:text-sm font-medium text-green-600 mb-1">
              Status
            </div>
            <div className="text-sm sm:text-base font-semibold text-gray-900">
              {getVerificationStatusTitle(
                patient.verificationStatus,
                patient.isActive
              )}
            </div>
          </div>

          {patient.verificationSentAt && (
            <div className="bg-blue-50 rounded-xl p-3 sm:p-4 border border-blue-200">
              <div className="text-xs sm:text-sm font-medium text-blue-600 mb-1">
                Terkirim
              </div>
              <div className="text-xs sm:text-sm font-semibold text-gray-900 break-words">
                {formatDateTimeWIB(new Date(patient.verificationSentAt))}
              </div>
            </div>
          )}

          {patient.verificationResponseAt && (
            <div className="bg-purple-50 rounded-xl p-3 sm:p-4 border border-purple-200">
              <div className="text-xs sm:text-sm font-medium text-purple-600 mb-1">
                Direspon
              </div>
              <div className="text-xs sm:text-sm font-semibold text-gray-900 break-words">
                {formatDateTimeWIB(
                  new Date(patient.verificationResponseAt)
                )}
              </div>
            </div>
          )}

          {patient.verificationAttempts &&
            parseInt(patient.verificationAttempts) > 0 && (
            <div className="bg-orange-50 rounded-xl p-3 sm:p-4 border border-orange-200">
              <div className="text-xs sm:text-sm font-medium text-orange-600 mb-1">
                Percobaan
              </div>
              <div className="text-sm sm:text-base font-semibold text-gray-900">
                {patient.verificationAttempts}x
              </div>
            </div>
          )}
        </div>

        {/* Actions Panel */}
        <div className="mb-6">
          <VerificationActionsPanel
            patient={patient}
            onUpdate={onUpdate}
          />
        </div>

        {/* Verification History */}
        <div className="border-t border-gray-200 pt-6">
          <VerificationHistory patientId={patient.id} />
        </div>
      </div>
    </div>
  );
}