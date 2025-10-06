// Batch migration utility for API routes
// This script helps identify and apply common migration patterns

const fs = require('fs');
const path = require('path');

// Common migration patterns
const legacyImports = [
  `import { NextRequest, NextResponse } from "next/server";`,
  `import { getCurrentUser } from "@/lib/auth-utils";`,
  `import { createErrorResponse, handleApiError } from "@/lib/api-helpers";`
];

const newImports = [
  `import { createApiHandler } from "@/lib/api-helpers";`,
  `import { schemas } from "@/lib/api-schemas";`
];

// Legacy patterns to replace
const patterns = [
  {
    from: /export async function GET\(request: NextRequest\)\s*\{\s*try\s*\{[\s\S]*?const user = await getCurrentUser\(\);\s*if \(!user\)\s*\{\s*return NextResponse\.json\(\s*\{\s*error: "Unauthorized"\s*\},\s*\{\s*status: 401\s*\}\s*\);\s*\}/g,
    to: `export const GET = createApiHandler(\n  { auth: "required" },\n  async (_, { user }) => {`
  },
  {
    from: /return NextResponse\.json\(\s*{\s*success: true,\s*data: ([^}]+)\s*}\s*\);/g,
    to: `return $1;`
  },
  {
    from: /return NextResponse\.json\(\s*{\s*error: "([^"]+)"\s*}\s*,\s*\{\s*status: (\d+)\s*\}\s*\);/g,
    to: `throw new Error("$1");`
  },
  {
    from: /} catch \(error\) \{\s*return handleApiError\(error, "([^"]+)"\);\s*\}/g,
    to: `  }\n);`
  }
];

// List of files to migrate (simpler ones first)
const simpleApis = [
  'src/app/api/health/route.ts',
  'src/app/api/user/session/route.ts',
  'src/app/api/user/status/route.ts',
  'src/app/api/auth/debug/route.ts'
];

console.log('Batch migration utility ready');
console.log('Target APIs:', simpleApis);
console.log('Run individual migrations for complex APIs');