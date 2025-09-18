/**
 * Simplified followup response handler - stub since followup tables were removed
 */

import { StandardResponseHandler, ResponseContext, StandardResponse, createErrorResponse } from "../response-handler";

export class FollowupResponseHandler extends StandardResponseHandler {
  constructor() {
    super("followup_response", 20); // Lower priority than verification and medication
  }

  async handle(context: ResponseContext): Promise<StandardResponse> {
    const startTime = Date.now();

    // Followup functionality disabled since tables were removed
    return createErrorResponse(
      "Followup functionality disabled",
      "Followup response handling is currently disabled",
      {
        patientId: context.patientId,
        processingTimeMs: Date.now() - startTime,
        source: "followup_handler",
        action: "disabled"
      }
    );
  }
}