// Jest types are available globally with @types/jest
import "@testing-library/jest-dom";
import { ComplianceService } from "@/services/patient/compliance.service";
import { db } from "@/db";
import { logger } from "@/lib/logger";

// Mock the database and logger
jest.mock("@/db", () => ({
  db: {
    select: jest.fn(),
    execute: jest.fn(),
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    performance: jest.fn(),
    error: jest.fn(),
    cache: jest.fn(),
    info: jest.fn(),
  },
}));

describe("ComplianceService", () => {
  let complianceService: ComplianceService;

  beforeEach(() => {
    jest.clearAllMocks();
    complianceService = new ComplianceService();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("calculatePatientCompliance", () => {
    it("should calculate compliance correctly", async () => {
      const mockDeliveredResult = [{ count: 10 }];
      const mockConfirmedResult = [{ count: 8 }];

       // Mock database calls
       const mockFrom = jest.fn().mockReturnThis() as jest.Mock;
       const mockWhere = jest.fn() as jest.Mock<Promise<Array<{ count: number }>>, []>;

      (db.select as jest.Mock).mockImplementation(() => ({
        from: mockFrom,
        where: mockWhere,
      }));

      mockWhere.mockResolvedValueOnce(mockDeliveredResult);
      mockWhere.mockResolvedValueOnce(mockConfirmedResult);

      const result = await complianceService.calculatePatientCompliance(
        "patient-123"
      );

      expect(result.deliveredCount).toBe(10);
      expect(result.confirmedCount).toBe(8);
      expect(result.complianceRate).toBe(80);
      expect(logger.info).toHaveBeenCalled();
    });

    it("should handle zero delivered reminders", async () => {
      const mockDeliveredResult = [{ count: 0 }];
      const mockConfirmedResult = [{ count: 0 }];


      const mockFrom = jest.fn().mockReturnThis() as jest.Mock;
      const mockWhere = jest.fn() as jest.Mock<Promise<Array<{ count: number }>>, []>;

      (db.select as jest.Mock).mockImplementation(() => ({
        from: mockFrom,
        where: mockWhere,
      }));

      mockWhere.mockResolvedValueOnce(mockDeliveredResult);
      mockWhere.mockResolvedValueOnce(mockConfirmedResult);

      const result = await complianceService.calculatePatientCompliance(
        "patient-123"
      );

      expect(result.deliveredCount).toBe(0);
      expect(result.confirmedCount).toBe(0);
      expect(result.complianceRate).toBe(0);
    });

    it("should handle database errors gracefully", async () => {

      const mockFrom = jest.fn().mockReturnThis() as jest.Mock;
      const mockWhere = jest.fn() as jest.Mock<Promise<Array<{ count: number }>>, []>;

      (db.select as jest.Mock).mockImplementation(() => ({
        from: mockFrom,
        where: mockWhere,
      }));

      mockWhere.mockRejectedValueOnce(new Error("Database connection failed"));

      const result = await complianceService.calculatePatientCompliance(
        "patient-123"
      );

      expect(result.deliveredCount).toBe(0);
      expect(result.confirmedCount).toBe(0);
      expect(result.complianceRate).toBe(0);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("getPatientComplianceStats", () => {
    it("should return detailed compliance statistics", async () => {
      const mockCompliance = {
        deliveredCount: 10,
        confirmedCount: 8,
        complianceRate: 80,
        lastCalculated: new Date(),
      };

      const mockTotalResult = [{ count: 12 }];
      const mockPendingResult = [{ count: 2 }];
      const mockResponseTimeResult = [{ avgResponseTime: 3600 }]; // 1 hour in seconds

      // Mock the calculatePatientCompliance method
      jest
        .spyOn(complianceService, "calculatePatientCompliance")
        .mockResolvedValue(mockCompliance);


      const mockFrom = jest.fn().mockReturnThis() as jest.Mock;
      const mockWhere = jest.fn() as jest.Mock<Promise<Array<{ count?: number; avgResponseTime?: number }>>, []>;
      const mockLeftJoin = jest.fn().mockReturnThis() as jest.Mock;
      const mockOrderBy = jest.fn().mockReturnThis() as jest.Mock;
      const mockLimit = jest.fn() as jest.Mock<Promise<Array<unknown>>, []>;

      (db.select as jest.Mock).mockImplementation(() => ({
        from: mockFrom,
        where: mockWhere,
        leftJoin: mockLeftJoin,
        orderBy: mockOrderBy,
        limit: mockLimit,
      }));

      mockWhere.mockResolvedValueOnce(mockTotalResult);
      mockWhere.mockResolvedValueOnce(mockPendingResult);
      mockWhere.mockResolvedValueOnce(mockResponseTimeResult);

      const result = await complianceService.getPatientComplianceStats(
        "patient-123"
      );

      expect(result.totalReminders).toBe(12);
      expect(result.deliveredReminders).toBe(10);
      expect(result.confirmedReminders).toBe(8);
      expect(result.pendingConfirmations).toBe(2);
      expect(result.complianceRate).toBe(80);
      expect(result.averageResponseTime).toBe(3600);
    });
  });

  describe("calculateBulkCompliance", () => {
    it("should handle empty patient list", async () => {
      const result = await complianceService.calculateBulkCompliance([]);
      expect(result).toEqual({});
    });

    it("should calculate compliance for multiple patients", async () => {
      const patients = ["patient-1", "patient-2"];

      // Mock individual compliance calculations
      jest
        .spyOn(complianceService, "calculatePatientCompliance")
        .mockResolvedValueOnce({
          deliveredCount: 10,
          confirmedCount: 8,
          complianceRate: 80,
          lastCalculated: new Date(),
        })
        .mockResolvedValueOnce({
          deliveredCount: 5,
          confirmedCount: 4,
          complianceRate: 80,
          lastCalculated: new Date(),
        });

      const result = await complianceService.calculateBulkCompliance(patients);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result["patient-1"].complianceRate).toBe(80);
      expect(result["patient-2"].complianceRate).toBe(80);
    });
  });

  describe("invalidatePatientCompliance", () => {
    it("should invalidate compliance cache", async () => {
      // Mock the cache invalidation (this would normally interact with Redis)
      // For this test, we just ensure the method doesn't throw
      await expect(
        complianceService.invalidatePatientCompliance("patient-123")
      ).resolves.not.toThrow();
    });
  });

  describe("getComplianceTrends", () => {
    it("should return compliance trends over time", async () => {
      const mockReminderLogs = [
        { sentAt: new Date("2024-01-01"), id: "log-1" },
        { sentAt: new Date("2024-01-02"), id: "log-2" },
      ];

      const mockConfirmations = [
        {
          reminderLogId: "log-1",
          confirmedAt: new Date("2024-01-01T02:00:00"),
        },
      ];


      const mockFrom = jest.fn().mockReturnThis() as jest.Mock;
      const mockWhere = jest.fn() as jest.Mock<Promise<Array<{ sentAt?: Date; id?: string; reminderLogId?: string; confirmedAt?: Date }>>, []>;
      const mockOrderBy = jest.fn() as jest.Mock;

      (db.select as jest.Mock).mockImplementation(() => ({
        from: mockFrom,
        where: mockWhere,
        orderBy: mockOrderBy,
      }));

      mockWhere.mockResolvedValueOnce(mockReminderLogs);
      mockWhere.mockResolvedValueOnce(mockConfirmations);

      const result = await complianceService.getComplianceTrends(
        "patient-123",
        7
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("date");
      expect(result[0]).toHaveProperty("complianceRate");
      expect(result[0]).toHaveProperty("deliveredCount");
      expect(result[0]).toHaveProperty("confirmedCount");
    });
  });
});

