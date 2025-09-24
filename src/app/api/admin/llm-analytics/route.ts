import { NextRequest, NextResponse } from "next/server";
import { llmCostService } from "@/lib/llm-cost-service";
import { analyticsService } from "@/services/analytics/analytics.service";
import { logger } from "@/lib/logger";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    // Get LLM usage analytics from database
    const [stats, limits] = await Promise.all([
      analyticsService.getLLMAnalytics(),
      llmCostService.checkLimits(),
    ]);

    // Map alerts to expected format
    const mappedAlerts = limits.alerts.map((alert) => {
      // Parse alert message to extract values
      const match = alert.message.match(
        /(\w+) token limit (exceeded|approaching): (\d+)\/(\d+)/
      );
      if (match) {
        const [, type, , current, threshold] = match;
        return {
          type: type.toLowerCase() === "daily" ? "budget" : "rate_limit",
          message: alert.message,
          threshold: parseInt(threshold),
          current: parseInt(current),
          severity: alert.severity,
        };
      }
      // Fallback for unrecognized alert format
      return {
        type: "performance" as const,
        message: alert.message,
        threshold: 0,
        current: 0,
        severity: alert.severity,
      };
    });

    return NextResponse.json({
      stats,
      limits: limits.limits,
      alerts: mappedAlerts,
      allowed: limits.allowed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to fetch LLM analytics", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "reset_daily":
        // Simple daily reset (for testing)
        return NextResponse.json({
          message: "Daily reset not needed (auto-reset daily)",
        });

      case "reset_monthly":
        // Simple monthly reset (for testing)
        return NextResponse.json({
          message: "Monthly reset not needed (auto-reset monthly)",
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("Failed to process LLM analytics action", error as Error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 }
    );
  }
}
