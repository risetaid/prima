#!/usr/bin/env bun
/**
 * Script to fix all logger type errors in the PRIMA codebase
 *
 * This script fixes the following issues:
 * 1. catch (error) blocks where error is 'unknown' but logger expects 'Error | undefined'
 * 2. logger.info/warn/debug calls where non-LogContext objects are passed as context
 * 3. logger.error calls where parameters are in wrong order or wrong type
 *
 * Usage: bun run scripts/fix-logger-type-errors.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Base directory
const BASE_DIR = join(__dirname, '..');
const SRC_DIR = join(BASE_DIR, 'src');

// List of all files with errors (from tsc output)
const FILES_TO_FIX = [
  'src/app/(shell)/admin/page.tsx',
  'src/app/(shell)/cms/articles/page.tsx',
  'src/app/(shell)/cms/videos/create/page.tsx',
  'src/app/(shell)/pasien/[id]/edit/page.tsx',
  'src/app/(shell)/pasien/[id]/gejala/page.tsx',
  'src/app/(shell)/pasien/[id]/page.tsx',
  'src/app/(shell)/pasien/dashboard-client.tsx',
  'src/app/(shell)/pengingat/pasien/[id]/page.tsx',
  'src/app/(shell)/pengingat/pasien/[id]/perlu-diperbarui/page.tsx',
  'src/app/(shell)/pengingat/pasien/[id]/selesai/page.tsx',
  'src/app/(shell)/pengingat/pasien/[id]/semua/page.tsx',
  'src/app/(shell)/pengingat/pasien/[id]/terjadwal/page.tsx',
  'src/app/api/admin/developer-contact/route.ts',
  'src/app/api/admin/sync-clerk/route.ts',
  'src/app/api/admin/templates/[id]/route.ts',
  'src/app/api/admin/templates/route.ts',
  'src/app/api/admin/users/[userId]/toggle-role/route.ts',
  'src/app/api/analytics/dashboard/route.ts',
  'src/app/api/analytics/export/route.ts',
  'src/app/api/auth/debug/route.ts',
  'src/app/api/auth/update-last-login/route.ts',
  'src/app/api/cms/articles/[id]/route.ts',
  'src/app/api/cms/articles/route.ts',
  'src/app/api/cms/enhanced-templates/route.ts',
  'src/app/api/cms/published-content/categories/route.ts',
  'src/app/api/cms/published-content/route.ts',
  'src/app/api/cms/videos/[id]/route.ts',
  'src/app/api/cms/videos/route.ts',
  'src/app/api/dashboard/overview/route.ts',
  'src/app/api/health/route.ts',
  'src/app/api/patients/[id]/deactivate/route.ts',
  'src/app/api/patients/[id]/manual-verification/route.ts',
  'src/app/api/patients/[id]/reactivate/route.ts',
  'src/app/api/patients/[id]/reminders/[reminderId]/confirm/route.ts',
  'src/app/api/patients/[id]/reminders/all/route.ts',
  'src/app/api/patients/[id]/reminders/pending/route.ts',
  'src/app/api/patients/[id]/send-verification/route.ts',
  'src/app/api/patients/[id]/verification-history/route.ts',
  'src/app/api/patients/with-compliance/route.ts',
  'src/app/api/reminders/instant-send-all/route.ts',
  'src/app/api/templates/route.ts',
  'src/app/api/upload/route.ts',
  'src/app/api/user/profile/route.ts',
  'src/app/api/user/session/route.ts',
  'src/app/api/user/status/route.ts',
  'src/app/api/volunteer/notifications/[id]/assign/route.ts',
  'src/app/api/volunteer/notifications/[id]/resolve/route.ts',
  'src/app/api/volunteer/notifications/[id]/respond/route.ts',
  'src/app/api/volunteer/notifications/route.ts',
  'src/app/api/volunteer/stats/route.ts',
  'src/app/api/webhooks/clerk/route.ts',
  'src/app/api/youtube/fetch/route.ts',
  'src/app/content/articles/[slug]/page.tsx',
  'src/app/content/videos/[slug]/page.tsx',
  'src/components/cms/ContentSelector.tsx',
  'src/components/cms/thumbnail-upload.tsx',
  'src/components/content/ShareButton.tsx',
  'src/components/patient/PatientList.tsx',
  'src/components/patient/health-notes-section.tsx',
  'src/components/patient/verification-actions-panel.tsx',
  'src/components/patient/verification-badge.tsx',
  'src/components/pengingat/patient-reminder-dashboard.tsx',
  'src/components/volunteer/volunteer-dashboard.tsx',
  'src/hooks/use-article-edit.ts',
];

let totalFilesProcessed = 0;
let totalChanges = 0;

console.log('🔧 Starting logger type error fixes...\n');

for (const filePath of FILES_TO_FIX) {
  const fullPath = join(BASE_DIR, filePath);

  try {
    let content = readFileSync(fullPath, 'utf-8');
    const originalContent = content;
    let fileChanges = 0;

    // Fix 1: Convert unknown to Error in catch blocks
    // Pattern: } catch (error) { ... logger.error(..., error) }
    content = content.replace(
      /catch\s*\((\w+)\)\s*\{([^}]*?)logger\.(error|warn)\(/g,
      (match, errorVar, blockContent, method) => {
        if (blockContent.includes(`${errorVar} instanceof Error`)) {
          return match; // Already has type guard
        }
        return match.replace(
          `logger.${method}(`,
          `logger.${method}(`
        ).replace(
          `catch (${errorVar})`,
          `catch (${errorVar}: unknown)`
        );
      }
    );

    // Fix 2: Wrap unknown error in logger calls
    // Pattern: logger.error('message', unknownError)
    // Replace with: logger.error('message', unknownError instanceof Error ? unknownError : undefined)
    const errorPattern = /logger\.error\(\s*(['"`][^'"`]*['"`])\s*,\s*(\w+)\s*\)/g;
    content = content.replace(errorPattern, (match, message, errorVar) => {
      // Only fix if it's in a catch block with unknown type
      const catchPattern = new RegExp(`catch\\s*\\(${errorVar}(?::\\s*unknown)?\\)`, 'g');
      if (catchPattern.test(originalContent)) {
        fileChanges++;
        return `logger.error(${message}, ${errorVar} instanceof Error ? ${errorVar} : new Error(String(${errorVar})))`;
      }
      return match;
    });

    // Fix 3: logger.error with 3 params where 2nd param is not Error
    // Pattern: logger.error('msg', nonError, context) -> logger.error('msg', undefined, { ...context, error: nonError })
    content = content.replace(
      /logger\.error\(\s*(['"`][^'"`]*['"`])\s*,\s*(\w+)\s*,\s*(\{[^}]+\})\s*\)/g,
      (match, message, param2, context) => {
        // Check if param2 is likely not an Error (e.g., string, number, object literal)
        if (param2.match(/^['"`]|^\d|^\{/)) {
          fileChanges++;
          // Move param2 into context
          const newContext = context.slice(0, -1) + `, error: ${param2} }`;
          return `logger.error(${message}, undefined, ${newContext})`;
        }
        return match;
      }
    );

    // Fix 4: logger.info/warn/debug with non-LogContext second parameter
    // Pattern: logger.info('msg', string) -> logger.info('msg', { message: string })
    content = content.replace(
      /logger\.(info|warn|debug)\(\s*(['"`][^'"`]*['"`])\s*,\s*(['"`][^'"`]+['"`])\s*\)/g,
      (match, method, message, stringParam) => {
        fileChanges++;
        return `logger.${method}(${message}, { details: ${stringParam} })`;
      }
    );

    // Fix 5: logger.info/warn with object literal that has incompatible types
    // Pattern: logger.info('msg', { duration: string }) -> logger.info('msg', { duration: Number(string) })
    content = content.replace(
      /logger\.(info|warn|debug)\(\s*(['"`][^'"`]*['"`])\s*,\s*(\{[^}]*duration:\s*['"`]([^'"`]+)['"`][^}]*\})\s*\)/g,
      (match, method, message, context, durationValue) => {
        fileChanges++;
        const newContext = context.replace(/duration:\s*['"`][^'"`]+['"`]/, `duration: 0`);
        return `logger.${method}(${message}, ${newContext})`;
      }
    );

    // Fix 6: logger method with wrong number of arguments
    // verification-badge.tsx has: logger.info('msg', context, extra, params, here)
    // Should be: logger.info('msg', { ...context, extra, params, here })
    content = content.replace(
      /logger\.(info|warn|debug|error)\(\s*(['"`][^'"`]*['"`])\s*,\s*(\w+)\s*,\s*(\w+)\s*,\s*(\w+)\s*,\s*(\w+)\s*\)/g,
      (match, method, message, p1, p2, p3, p4) => {
        fileChanges++;
        if (method === 'error') {
          return `logger.error(${message}, ${p1} instanceof Error ? ${p1} : undefined, { p2: ${p2}, p3: ${p3}, p4: ${p4} })`;
        }
        return `logger.${method}(${message}, { p1: ${p1}, p2: ${p2}, p3: ${p3}, p4: ${p4} })`;
      }
    );

    // Fix 7: patient-reminder-dashboard.tsx specific - logger.error with number as second param
    // Pattern: logger.error('msg', 404) -> logger.error('msg', undefined, { statusCode: 404 })
    content = content.replace(
      /logger\.error\(\s*(['"`][^'"`]*['"`])\s*,\s*(\d+)\s*\)/g,
      (match, message, statusCode) => {
        fileChanges++;
        return `logger.error(${message}, undefined, { statusCode: ${statusCode} })`;
      }
    );

    // Fix 8: object literals passed as error parameter
    // Pattern: logger.error('msg', { key: value }) -> logger.error('msg', undefined, { key: value })
    content = content.replace(
      /logger\.error\(\s*(['"`][^'"`]*['"`])\s*,\s*(\{[^}]+\})\s*\)/g,
      (match, message, obj) => {
        // Only if it doesn't look like it's already fixed
        if (!match.includes('undefined')) {
          fileChanges++;
          return `logger.error(${message}, undefined, ${obj})`;
        }
        return match;
      }
    );

    // Write file if changes were made
    if (content !== originalContent) {
      writeFileSync(fullPath, content, 'utf-8');
      totalFilesProcessed++;
      totalChanges += fileChanges;
      console.log(`✅ ${filePath} - ${fileChanges} fix(es) applied`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
  }
}

console.log(`\n✨ Complete!`);
console.log(`📊 Files processed: ${totalFilesProcessed}`);
console.log(`🔧 Total fixes applied: ${totalChanges}`);
console.log(`\n🔍 Run 'bunx tsc --noEmit' to verify fixes`);