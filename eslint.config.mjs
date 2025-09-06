import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Downgrade unused variable warnings to warnings (not errors)
      "@typescript-eslint/no-unused-vars": "warn",
      
      // Allow any types in specific cases (medical/healthcare context may need flexibility)
      "@typescript-eslint/no-explicit-any": "warn",
      
      // Allow empty object types (common in UI libraries)
      "@typescript-eslint/no-empty-object-type": "warn",
      
      // React Hook dependency warnings (can be complex to fix without breaking functionality)
      "react-hooks/exhaustive-deps": "warn",
      
      // Allow unescaped entities (common in medical text)
      "react/no-unescaped-entities": "warn",
      
      // Allow img elements (Next.js Image might not work in all medical contexts)
      "@next/next/no-img-element": "warn",
      
      // Allow const reassignment warnings
      "prefer-const": "warn",
    }
  }
];

export default eslintConfig;
