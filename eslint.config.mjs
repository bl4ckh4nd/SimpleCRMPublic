import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/*.js', '**/*.mjs', 'dist/**', 'dist-build/**', 'dist-electron/**', 'coverage/**', 'node_modules/**'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
  },
);
