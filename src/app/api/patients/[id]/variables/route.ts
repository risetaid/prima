import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth-utils";
import { VariablesService } from "@/services/patient/variables.service";
import { PatientError } from "@/services/patient/patient.types";
import { requirePatientAccess } from "@/lib/patient-access-control";
import {
  apiSuccess,
  apiError,
  apiAuthError,
  apiValidationError,
  extractRequestContext,
} from "@/lib/api-response";

const variablesService = new VariablesService();

// GET /api/patients/[id]/variables - Get all variables for a patient
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const currentUser = await getAuthUser();
    if (!currentUser) {
      return apiAuthError("Authentication required", {
        context: extractRequestContext(request),
        operation: "get_patient_variables",
        userId: "anonymous",
      });
    }

    const { id: patientId } = await params;

    // Check role-based access to this patient
    await requirePatientAccess(
      currentUser.id,
      currentUser.role,
      patientId,
      "view this patient's variables"
    );

    const response = await variablesService.get(patientId);

    return apiSuccess(response, {
      message: "Patient variables retrieved successfully",
      context: extractRequestContext(request, currentUser.id),
      operation: "get_patient_variables",
      duration: Date.now() - startTime,
    });
  } catch (error) {
    if (error instanceof PatientError) {
      return apiError(error.message, {
        status: error.statusCode,
        context: extractRequestContext(request),
        operation: "get_patient_variables",
        duration: Date.now() - startTime,
        code: "PATIENT_ERROR",
      });
    }

    return apiError("Failed to retrieve patient variables", {
      status: 500,
      context: extractRequestContext(request),
      operation: "get_patient_variables",
      duration: Date.now() - startTime,
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}

// POST /api/patients/[id]/variables - Create or update patient variables
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const currentUser = await getAuthUser();
    if (!currentUser) {
      return apiAuthError("Authentication required", {
        context: extractRequestContext(request),
        operation: "update_patient_variables",
        userId: "anonymous",
      });
    }

    const { id: patientId } = await params;

    // Check role-based access to this patient
    await requirePatientAccess(
      currentUser.id,
      currentUser.role,
      patientId,
      "modify this patient's variables"
    );

    const body = await request.json();
    let { variables } = body;

    // Handle both array format [{name, value}] and object format {variables: {name: value}}
    if (!variables) {
      return apiValidationError(
        [
          {
            field: "variables",
            message: "Variables must be provided",
            code: "MISSING_VARIABLES",
          },
        ],
        {
          context: extractRequestContext(request, currentUser.id),
          operation: "update_patient_variables",
          duration: Date.now() - startTime,
        }
      );
    }

    // Convert object format to array format if needed
    if (!Array.isArray(variables)) {
      if (typeof variables === 'object' && variables !== null) {
        // Convert {nama: "value", dokter: "value"} to [{name: "nama", value: "value"}, ...]
        variables = Object.entries(variables).map(([name, value]) => ({
          name,
          value: String(value)
        }));
      } else {
        return apiValidationError(
          [
            {
              field: "variables",
              message: "Variables must be an array or object",
              code: "INVALID_FORMAT",
            },
          ],
          {
            context: extractRequestContext(request, currentUser.id),
            operation: "update_patient_variables",
            duration: Date.now() - startTime,
          }
        );
      }
    }

    if (!Array.isArray(variables)) {
      return apiValidationError(
        [
          {
            field: "variables",
            message: "Variables must be provided as an array",
            code: "INVALID_FORMAT",
          },
        ],
        {
          context: extractRequestContext(request, currentUser.id),
          operation: "update_patient_variables",
          duration: Date.now() - startTime,
        }
      );
    }

    // Convert array to Record<string, string> format expected by service
    const variablesRecord: Record<string, string> = {};
    for (const variable of variables) {
      if (variable.name && variable.value !== undefined) {
        variablesRecord[variable.name] = String(variable.value);
      }
    }

    const response = await variablesService.upsertMany(
      patientId,
      variablesRecord,
      currentUser.id
    );

    return apiSuccess(response, {
      message: `${variables.length} patient variables updated successfully`,
      context: extractRequestContext(request, currentUser.id),
      operation: "update_patient_variables",
      duration: Date.now() - startTime,
    });
  } catch (error) {
    if (error instanceof PatientError) {
      return apiError(error.message, {
        status: error.statusCode,
        context: extractRequestContext(request),
        operation: "update_patient_variables",
        duration: Date.now() - startTime,
        code: "PATIENT_ERROR",
      });
    }

    return apiError("Failed to update patient variables", {
      status: 500,
      context: extractRequestContext(request),
      operation: "update_patient_variables",
      duration: Date.now() - startTime,
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}

// DELETE /api/patients/[id]/variables - Delete a specific variable
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const currentUser = await getAuthUser();
    if (!currentUser) {
      return apiAuthError("Authentication required", {
        context: extractRequestContext(request),
        operation: "delete_patient_variable",
        userId: "anonymous",
      });
    }

    const { id: patientId } = await params;

    // Check role-based access to this patient
    await requirePatientAccess(
      currentUser.id,
      currentUser.role,
      patientId,
      "modify this patient's variables"
    );

    const { searchParams } = new URL(request.url);
    const variableName = searchParams.get("variableName");

    if (!variableName) {
      return apiValidationError(
        [
          {
            field: "variableName",
            message: "variableName parameter is required",
            code: "MISSING_PARAMETER",
          },
        ],
        {
          context: extractRequestContext(request, currentUser.id),
          operation: "delete_patient_variable",
          duration: Date.now() - startTime,
        }
      );
    }

    const result = await variablesService.delete(patientId, variableName);

    return apiSuccess(
      {
        deletedCount: result.deletedCount,
        variableName,
      },
      {
        message: `Variable '${variableName}' deleted successfully`,
        context: extractRequestContext(request, currentUser.id),
        operation: "delete_patient_variable",
        duration: Date.now() - startTime,
      }
    );
  } catch (error) {
    if (error instanceof PatientError) {
      return apiError(error.message, {
        status: error.statusCode,
        context: extractRequestContext(request),
        operation: "delete_patient_variable",
        duration: Date.now() - startTime,
        code: "PATIENT_ERROR",
      });
    }

    return apiError("Failed to delete patient variable", {
      status: 500,
      context: extractRequestContext(request),
      operation: "delete_patient_variable",
      duration: Date.now() - startTime,
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}
