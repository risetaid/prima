"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function BackupSystemPage() {
  const [isTestingMain, setIsTestingMain] = useState(false);
  const [isTestingBackup, setIsTestingBackup] = useState(false);
  const [isTestingFonnte, setIsTestingFonnte] = useState(false);

  // Hidden features - only show in development
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">
              🔒 Halaman ini hanya tersedia dalam mode development
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const testMainCron = async () => {
    setIsTestingMain(true);
    try {
      const response = await fetch("/api/cron", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          `Main cron berhasil! Sent: ${result.stats.sent}, Errors: ${result.stats.errors}`
        );
      } else {
        toast.error("Main cron gagal: " + result.error);
      }
    } catch (error) {
      toast.error("Error testing main cron: " + (error as Error).message);
    } finally {
      setIsTestingMain(false);
    }
  };

  const testBackupCron = async () => {
    setIsTestingBackup(true);
    try {
      const response = await fetch("/api/cron/backup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          `Backup cron berhasil! Sent: ${result.stats.sent}, Errors: ${result.stats.errors}`
        );
      } else {
        toast.error("Backup cron gagal: " + result.error);
      }
    } catch (error) {
      toast.error("Error testing backup cron: " + (error as Error).message);
    } finally {
      setIsTestingBackup(false);
    }
  };

  const testFonnte = async () => {
    setIsTestingFonnte(true);
    try {
      const testPhone = "081234567890"; // Default test number

      const response = await fetch("/api/test?type=whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: testPhone,
          testProvider: "fonnte",
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          `Fonnte test berhasil! Message ID: ${result.result.messageId}`
        );
      } else {
        toast.error("Fonnte test gagal: " + result.error);
      }
    } catch (error) {
      toast.error("Error testing Fonnte: " + (error as Error).message);
    } finally {
      setIsTestingFonnte(false);
    }
  };

  const currentProvider = process.env.NEXT_PUBLIC_WHATSAPP_PROVIDER || "fonnte";

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">🔧 Backup System Control</h1>
        <Badge variant="secondary">Development Only</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📡 Current Provider
              <Badge
                variant={currentProvider === "twilio" ? "default" : "outline"}
              >
                {currentProvider.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              <p>
                <strong>Primary Endpoint:</strong> /api/cron (FastCron → Fonnte)
              </p>
              <p>
                <strong>Backup Endpoint:</strong> /api/cron/backup (Fonnte
                force)
              </p>
              <p>
                <strong>Fallback Endpoint:</strong> /api/cron/twilio-fallback
                (Twilio force)
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Provider Switching:</p>
              <div className="text-xs bg-green-100 p-3 rounded">
                <p>✅ PRIMARY: Fonnte (default)</p>
                <p>✅ FALLBACK: Twilio (if Fonnte blocked)</p>
                <p>✅ ENVIRONMENT: WHATSAPP_PROVIDER=fonnte</p>
                <p>✅ FILES: All Twilio imports preserved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🧪 Test Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={testMainCron}
              disabled={isTestingMain}
              className="w-full"
              variant="outline"
            >
              {isTestingMain
                ? "Testing..."
                : "Test Main Cron (Current Provider)"}
            </Button>

            <Button
              onClick={testBackupCron}
              disabled={isTestingBackup}
              className="w-full"
              variant="outline"
            >
              {isTestingBackup
                ? "Testing..."
                : "Test Backup Cron (Force Fonnte)"}
            </Button>

            <Button
              onClick={testFonnte}
              disabled={isTestingFonnte}
              className="w-full"
              variant="secondary"
            >
              {isTestingFonnte ? "Testing..." : "Test Fonnte Direct"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>📋 Backup Strategy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">
                Reliability Approach:
              </h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Main: FastCron every 3 minutes → /api/cron</li>
                <li>• Backup: FastCron every 3 minutes → /api/cron/backup</li>
                <li>• Manual switch: Change WHATSAPP_PROVIDER env variable</li>
                <li>• Database: Both providers use same ReminderLog table</li>
                <li>
                  • Detection: Different message ID fields (twilio vs fonnte)
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2">
                Implementation Status:
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Badge className="mb-2">✅ Completed</Badge>
                  <ul className="text-xs space-y-1">
                    <li>• Dual provider support</li>
                    <li>• Universal sender function</li>
                    <li>• Backup cron endpoint</li>
                    <li>• Database schema updated</li>
                    <li>• Test endpoints</li>
                  </ul>
                </div>
                <div>
                  <Badge variant="outline" className="mb-2">
                    🔄 Ready to Deploy
                  </Badge>
                  <ul className="text-xs space-y-1">
                    <li>• Add FONNTE_TOKEN to env</li>
                    <li>• Setup backup cron job</li>
                    <li>• Test reliability</li>
                    <li>• Monitor both providers</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
