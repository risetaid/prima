import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { createErrorResponse } from "@/lib/api-utils";
import { analyticsService } from "@/services/analytics/analytics.service";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'DEVELOPER')) {
      return createErrorResponse(
        'Unauthorized. Admin access required.',
        401,
        undefined,
        'AUTHORIZATION_ERROR'
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    // Get analytics data
    const data = await analyticsService.getDashboardData(dateRange);

    logger.info("Comprehensive analytics data retrieved", {
      userId: user.id,
      dateRange: dateRange ? `${startDate} to ${endDate}` : "default"
    });

    return NextResponse.json(data);
  } catch (error) {
    logger.error("Failed to get comprehensive analytics data", error as Error);
    return createErrorResponse(
      "Failed to get analytics data",
      500,
      undefined,
      'INTERNAL_ERROR'
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'DEVELOPER')) {
      return createErrorResponse(
        'Unauthorized. Admin access required.',
        401,
        undefined,
        'AUTHORIZATION_ERROR'
      );
    }

    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case "export":
        const exportedData = await analyticsService.exportData(params);
        
        logger.info("Analytics data exported", {
          userId: user.id,
          format: params.format,
          dateRange: `${params.dateRange.start} to ${params.dateRange.end}`
        });

        return NextResponse.json({ data: exportedData });
      
      case "trackEvent":
        await analyticsService.trackEvent(params);
        
        logger.debug("Analytics event tracked", {
          userId: user.id,
          eventType: params.eventType,
          eventName: params.eventName
        });

        return NextResponse.json({ success: true });
      
      case "recordMetric":
        await analyticsService.recordMetric(params);
        
        logger.debug("Performance metric recorded", {
          userId: user.id,
          metricType: params.metricType,
          metricName: params.metricName
        });

        return NextResponse.json({ success: true });
      
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("Failed to process analytics action", error as Error);
    return createErrorResponse(
      "Failed to process action",
      500,
      undefined,
      'INTERNAL_ERROR'
    );
  }
}