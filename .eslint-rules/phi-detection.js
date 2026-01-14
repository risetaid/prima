/**
 * ESLint Plugin: PHI Detection
 *
 * Detects Protected Health Information (PHI) in log statements.
 * This rule helps prevent HIPAA compliance violations by catching
 * patient identifiers before they are logged.
 *
 * Usage: Add to eslint.config.mjs:
 *   import phiDetector from './.eslint-rules/phi-detection.js';
 *   {
 *     plugins: { phi: phiDetector },
 *     rules: { 'phi/no-logging-patient-data': 'error' }
 *   }
 */

// PHI patterns to detect in log statements
// These are field access patterns that should never appear in logs
const PHI_PATTERNS = [
  { pattern: /patient\.name/, field: 'patient.name' },
  { pattern: /patient\.phoneNumber/, field: 'patient.phoneNumber' },
  { pattern: /\.phoneNumber(?!\s*=)/, field: 'phoneNumber' },
  { pattern: /patientId(?!\s*=)/, field: 'patientId' },
  { pattern: /patient_id(?!\s*=)/, field: 'patient_id' },
  { pattern: /patient\.id/, field: 'patient.id' },
  { pattern: /patient\.email/, field: 'patient.email' },
  { pattern: /patient\.address/, field: 'patient.address' },
  { pattern: /patient\.dateOfBirth/, field: 'patient.dateOfBirth' },
  { pattern: /diagnosis/, field: 'diagnosis' },
  { pattern: /emergencyContact/, field: 'emergencyContact' },
  { pattern: /dateOfBirth/, field: 'dateOfBirth' },
  { pattern: /ssn(?!\s*=)/, field: 'ssn' },
  { pattern: /medicalRecord/, field: 'medicalRecord' },
];

const ruleHandler = (context) => {
  /**
   * Check if an argument is wrapped in a sanitizeForAudit() call
   */
  function isSanitized(arg) {
    if (arg.type !== 'CallExpression') return false;
    const callee = arg.callee;
    // Check for sanitizeForAudit() or sanitizeContext()
    if (callee.type === 'Identifier') {
      return ['sanitizeForAudit', 'sanitizeContext', 'maskPatientObject'].includes(callee.name);
    }
    return false;
  }

  return {
    CallExpression(node) {
      // Only process if this is a CallExpression
      if (node.type !== 'CallExpression') return;

      const callee = node.callee;

      // Check if this is a logger method call
      const isLoggerMethod =
        (callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          ['logger', 'log', 'console'].includes(
            callee.object.name
          ) &&
          callee.property.type === 'Identifier' &&
          ['log', 'info', 'warn', 'error', 'debug', 'trace'].includes(
            callee.property.name
          )) ||
        (callee.type === 'Identifier' &&
          ['log', 'info', 'warn', 'error', 'debug'].includes(
            callee.name
          ));

      if (!isLoggerMethod) return;

      // Get the source code of the log arguments
      // Skip arguments that are wrapped in sanitizeForAudit()
      const sourceCode = context.sourceCode;
      const unsanitizedArgs = node.arguments.filter(arg => !isSanitized(arg));

      // If all arguments are sanitized, no need to check
      if (unsanitizedArgs.length === 0) return;

      const argsText = unsanitizedArgs
        .map((arg) => sourceCode.getText(arg))
        .join(', ');

      // Check if any PHI pattern is found in the log statement
      const foundPhi = PHI_PATTERNS.filter((p) =>
        p.pattern.test(argsText)
      );

      if (foundPhi.length > 0) {
        context.report({
          node,
          messageId: 'phiDetected',
          data: {
            fields: foundPhi.map((p) => p.field).join(', '),
          },
        });
      }
    },
  };
};

export default {
  meta: {
    name: 'phi-detection',
    type: 'problem',
    docs: {
      description: 'Detect PHI in log statements',
      recommended: true,
    },
    fixable: false,
    schema: [],
    messages: {
      phiDetected:
        'PHI detected in log statement: {{ fields }}. Use sanitizeForAudit() or [PHI-REDACTED] instead.',
    },
  },
  rules: {
    'no-logging-patient-data': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Detect PHI in log statements',
          recommended: true,
        },
        fixable: false,
        messages: {
          phiDetected:
            'PHI detected in log statement: {{ fields }}. Use sanitizeForAudit() or [PHI-REDACTED] instead.',
        },
      },
      create: ruleHandler,
    },
  },
};
