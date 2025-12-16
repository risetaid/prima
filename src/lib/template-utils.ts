/**
 * Template variable replacement utilities
 * Centralizes template processing logic
 */

/**
 * Replace template variables in message
 * Supports {nama} for patient name and custom variables
 */
export function replaceTemplateVariables(
  message: string,
  patientName: string,
  additionalVars?: Record<string, string>
): string {
  let processedMessage = message;

  // Replace patient name
  processedMessage = processedMessage.replace(/{nama}/g, patientName);

  // Replace additional variables if provided
  if (additionalVars) {
    Object.keys(additionalVars).forEach((key) => {
      const placeholder = `{${key}}`;
      if (processedMessage.includes(placeholder)) {
        processedMessage = processedMessage.replace(
          new RegExp(placeholder, 'g'),
          additionalVars[key] || ''
        );
      }
    });
  }

  return processedMessage;
}
