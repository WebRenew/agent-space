module.exports = {
  root: true,
  env: {
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-require-imports': 'off',
    'no-inner-declarations': 'off',
    'no-constant-condition': 'off',
    'no-useless-escape': 'off',
    'no-unsafe-finally': 'off',
    'no-control-regex': 'off',
  },
  ignorePatterns: [
    'out/',
    'release/',
    'node_modules/',
    'web/',
    '*.config.js',
    '*.config.mjs',
  ],
  overrides: [
    {
      files: ['src/renderer/**/*.{ts,tsx}'],
      env: {
        browser: true,
      },
      plugins: ['react-hooks', 'react-refresh'],
      extends: ['plugin:react-hooks/recommended'],
      rules: {
        'react-hooks/purity': 'off',
        'react-hooks/refs': 'off',
        'react-hooks/set-state-in-effect': 'off',
        'react-hooks/exhaustive-deps': 'off',
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      },
    },
    {
      files: ['src/main/**/*.{ts,tsx}', 'src/preload/**/*.{ts,tsx}', 'src/shared/**/*.{ts,tsx}', 'electron.vite.config.ts'],
      env: {
        node: true,
      },
    },
  ],
}
