import parser from '@typescript-eslint/parser';
import plugin from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import phiDetector from './.eslint-rules/phi-detection.js';

const eslintConfig = [
  // TypeScript/JavaScript files
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': plugin,
      'react-hooks': reactHooks,
      phi: phiDetector,
    },
    rules: {
      ...plugin.configs.recommended.rules,

      // Custom overrides
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'prefer-const': 'warn',

      // React Hooks
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',

      // PHI Detection
      'phi/no-logging-patient-data': 'error',
    },
  },
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'public/sw.js',
      'public/workbox-*.js',
      '*.d.ts',
    ],
  },
];

export default eslintConfig;
