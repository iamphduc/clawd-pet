import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  // Written by Claude Code each time it loads the plugin.
  { ignores: ['plugins/*/.claude-plugin/types/'] },
  js.configs.recommended,
  {
    // Typed linting: needs the plugin API types above, so load the plugin once first.
    files: ['plugins/**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      // Hook handlers are async by design, and checking them against every
      // overload of the engine's on(...) stalls this rule for minutes.
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { arguments: false } }],
    },
  },
  {
    // Engine mocks return promises without awaiting anything: async () => ({ value }).
    files: ['plugins/*/tests/**'],
    rules: { '@typescript-eslint/require-await': 'off' },
  },
  { files: ['scripts/**/*.mjs'], languageOptions: { globals: globals.node } },
  // Leave layout to Prettier.
  prettier,
);
