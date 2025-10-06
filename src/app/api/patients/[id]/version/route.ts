import { z } from "zod";
import { createApiHandler } from "@/lib/api-helpers";
import { db, patients } from "@/db";
import { eq } from "drizzle-orm";

const paramsSchema = z.object({
  id: z.string().min(1, "Patient ID is required"),
});

export const GET = createApiHandler(
  {
    auth: "required",
    params: paramsSchema,
  },
  async (_, context) => {
    const { id } = context.params!;

    // Get only the updatedAt timestamp for lightweight polling
    const patientResult = await db
      .select({
        updatedAt: patients.updatedAt,
        verificationStatus: patients.verificationStatus,
      })
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);

    if (patientResult.length === 0) {
      throw new Error("Patient not found");
    }

    const patient = patientResult[0];

    return {
      version: patient.updatedAt.getTime(), // Use timestamp as version
      verificationStatus: patient.verificationStatus,
      updatedAt: patient.updatedAt,
    };
  }
);
