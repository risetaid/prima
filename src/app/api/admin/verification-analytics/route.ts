import { createApiHandler } from '@/lib/api-helpers'
import { verificationAnalytics } from '@/lib/verification-analytics'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const verificationAnalyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  timeSeries: z.enum(['true', 'false']).optional().transform(val => val === 'true')
});

// GET /api/admin/verification-analytics - Get verification analytics
export const GET = createApiHandler(
  { auth: "required", query: verificationAnalyticsQuerySchema },
  async (_, { user, query }) => {
    // Only admins and developers can access verification analytics
    if (user!.role !== "ADMIN" && user!.role !== "DEVELOPER") {
      throw new Error("Admin access required");
    }

    const { startDate, endDate, timeSeries } = query || {};

    logger.info('Admin verification analytics request', {
      startDate,
      endDate,
      timeSeries,
      requestedBy: user!.id
    });

    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);

      // Date validation is handled by Zod's datetime validation
      if (start > end) {
        throw new Error('Start date must be before end date');
      }
    } else {
      // Default to last 30 days
      end = new Date();
      start = new Date();
      start.setDate(start.getDate() - 30);
    }

    if (timeSeries) {
      const timeSeriesData = await verificationAnalytics.getTimeSeriesData(start, end);
      logger.info(`Time series data retrieved for period: ${start.toISOString()} to ${end.toISOString()}`);

      return {
        timeSeries: timeSeriesData,
        period: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      };
    } else {
      const analytics = await verificationAnalytics.getAnalytics(start, end);
      logger.info(`Analytics data retrieved for period: ${start.toISOString()} to ${end.toISOString()}`);

      return analytics;
    }
  }
);