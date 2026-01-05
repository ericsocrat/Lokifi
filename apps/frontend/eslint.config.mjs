// ESLint Flat Config for Lokifi Frontend
// Compatible with eslint-config-next@15.x and preparing for @16.x
// Reference: https://nextjs.org/docs/app/api-reference/config/eslint

import eslint from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import security from 'eslint-plugin-security';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript-ESLint recommended rules
  ...tseslint.configs.recommended,

  // Main configuration
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        React: 'readonly',
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      '@next/next': nextPlugin,
      security,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // Next.js rules
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@next/next/no-img-element': 'warn',

      // TypeScript rules - allow underscore prefix for intentionally unused vars
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],

      // React rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off',
      'react/no-unescaped-entities': 'warn',
      'react/self-closing-comp': 'warn',

      // Code quality
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }], // Allow empty catch for graceful degradation
      'import/no-anonymous-default-export': 'off', // Not available without import plugin

      // Security rules (from eslint-security.config.mjs)
      // Note: detect-object-injection disabled - high false positive rate in typed React code
      // TypeScript types constrain property access keys, making prototype pollution unlikely
      // See: https://github.com/eslint-community/eslint-plugin-security/issues/21
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'warn',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-require': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'error',

      // Accessibility rules (from eslint-a11y.config.mjs)
      'jsx-a11y/alt-text': 'error',
    },
    settings: {
      react: {
        version: 'detect',
      },
      next: {
        rootDir: '.',
      },
    },
  },

  // Override: Allow console in logger utility
  {
    files: ['lib/utils/logger.ts', 'src/lib/utils/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // Override: Allow console in test files and specific utilities
  {
    files: [
      'app/test/**/*.tsx',
      'src/lib/utils/webVitals.ts',
      'components/WebSocketConnection.tsx',
      'src/hooks/useNotifications.ts',
      'src/services/backendPriceService.ts',
      'src/lib/data/adapter.ts',
    ],
    rules: {
      'no-console': 'off',
    },
  },

  // Override: Allow console in observability stores
  {
    files: [
      'src/lib/stores/mobileA11yStore.tsx',
      'src/lib/stores/observabilityStore.tsx',
      'src/lib/stores/performanceStore.tsx',
      'src/lib/stores/rollbackStore.tsx',
    ],
    rules: {
      'no-console': 'off',
    },
  },

  // Global ignores
  {
    ignores: [
      // Default ignores
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      // Additional ignores
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'coverage-dashboard/**',
      'playwright-report/**',
      '*.config.js',
      '*.config.ts',
    ],
  },

  // Node.js config files
  {
    files: ['*.config.mjs', '*.config.js', 'next.config.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
        process: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off', // Config files may have unused vars for options
    },
  },

  // CommonJS scripts (allow require)
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        process: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Test files - more lenient rules
  {
    files: ['tests/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', 'tools/**/*.{js,ts}'],
    rules: {
      // Allow common test patterns that would fail strict linting
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'warn',
      'no-prototype-builtins': 'warn',
      'security/detect-unsafe-regex': 'warn',
      '@next/next/no-assign-module-variable': 'off', // Test mocks may assign module
      'no-useless-escape': 'warn',
      // Tests and tools legitimately need dynamic file paths for fixtures/data
      'security/detect-non-literal-fs-filename': 'off',
    },
  }
);
