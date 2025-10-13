import { z } from "zod";
import { get, set, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { createApiHandler } from "@/lib/api-helpers";
import { PatientService } from "@/services/patient/patient.service";
import { PatientAccessControl } from "@/services/patient/patient-access-control";
import type { UpdatePatientDTO } from "@/services/patient/patient.types";

// Validation schemas
const paramsSchema = z.object({
  id: z.string().uuid("Invalid patient ID format"),
});

export const GET = createApiHandler(
  {
    auth: "required",
    params: paramsSchema,
  },
  async (_, context) => {
    const { id } = context.params!;
    const user = context.user!;

    // Try to get from cache first
    const cacheKey = CACHE_KEYS.patient(id);
    const cachedPatient = await get(cacheKey);

    if (cachedPatient) {
      return cachedPatient;
    }

    // Use centralized PatientService to get complete patient data
    const service = new PatientService();
    const patient = await service.getDetail(id, {
      id: user.id,
      role: user.role,
    });

    if (!patient) {
      throw new Error("Patient not found");
    }

    // Cache the patient data
    await set(cacheKey, patient, CACHE_TTL.PATIENT);

    return patient;
  }
);

const updatePatientSchema = z.object({
  name: z.string().optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  birthDate: z.string().optional(),
  diagnosisDate: z.string().optional(),
  cancerStage: z.enum(["I", "II", "III", "IV"]).nullable().optional(),
  doctorName: z.string().optional(),
  hospitalName: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const PUT = createApiHandler(
  {
    auth: "required",
    params: paramsSchema,
    body: updatePatientSchema,
  },
  async (body, context) => {
    const { id } = context.params!;
    const user = context.user!;

    // Check role-based access
    await PatientAccessControl.requireAccess(
      user.id,
      user.role,
      id,
      "update this patient"
    );

    const service = new PatientService();
    const updated = await service.updatePatient(id, body as UpdatePatientDTO);
    return updated;
  }
);

export const DELETE = createApiHandler(
  {
    auth: "required",
    params: paramsSchema,
  },
  async (_, context) => {
    const { id } = context.params!;
    const user = context.user!;

    // Check role-based access
    await PatientAccessControl.requireAccess(
      user.id,
      user.role,
      id,
      "delete this patient"
    );

    const service = new PatientService();
    const result = await service.deletePatient(id);
    return result;
  }
);
