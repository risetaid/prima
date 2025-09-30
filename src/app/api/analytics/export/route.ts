import { NextRequest, NextResponse } from "next/server";
import {
  analyticsService,
  type ExportOptions,
} from "@/services/analytics/analytics.service";
import { apiError } from "@/lib/api-response";

import { logger } from '@/lib/logger';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { format, dateRange, includeMetrics }: ExportOptions = body;

    if (!format || !dateRange?.start || !dateRange?.end) {
      return apiError(
        "Missing required parameters: format, dateRange.start, dateRange.end",
        {
          status: 400,
          code: "VALIDATION_ERROR"
        }
      );
    }

    const exportOptions: ExportOptions = {
      format,
      dateRange: {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end),
      },
      includeMetrics,
    };

    const exportedData = await analyticsService.exportData(exportOptions);

    // Set appropriate headers based on format
    const headers = new Headers();
    const now = new Date().toISOString().split("T")[0];

    if (format === "csv") {
      headers.set("Content-Type", "text/csv");
      headers.set(
        "Content-Disposition",
        `attachment; filename="prima-analytics-${now}.csv"`
      );
    } else {
      headers.set("Content-Type", "application/json");
      headers.set(
        "Content-Disposition",
        `attachment; filename="prima-analytics-${now}.json"`
      );
    }

    return new NextResponse(exportedData, {
      status: 200,
      headers,
    });
  } catch (error: unknown) {
    logger.error("Failed to export analytics data:", error instanceof Error ? error : new Error(String(error)));
    return apiError(
      "Failed to export analytics data",
      {
        status: 500,
        code: "INTERNAL_ERROR"
      }
    );
  }
}
