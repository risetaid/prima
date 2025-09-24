import { NextRequest } from "next/server";
import { analyticsService } from "@/services/analytics/analytics.service";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");

    const dateRange =
      startDate && endDate
        ? {
            start: new Date(startDate),
            end: new Date(endDate),
          }
        : undefined;

    const data = await analyticsService.getDashboardData(dateRange);

    return apiSuccess(data);
  } catch (error) {
    console.error("Failed to fetch analytics dashboard data:", error);
    return apiError(
      "Failed to fetch analytics data",
      {
        status: 500,
        code: "INTERNAL_ERROR"
      }
    );
  }
}
