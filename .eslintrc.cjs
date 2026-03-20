module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'unused-imports', 'simple-import-sort'],
  rules: {
    // Turn off base rule as it can report incorrect errors with TS
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { args: 'after-used', ignoreRestSiblings: true },
    ],

    // Remove unused imports (TS-aware)
    'unused-imports/no-unused-imports-ts': 'error',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
      },
    ],

    // Sort and group imports alphabetically (via simple-import-sort)
    'simple-import-sort/imports': [
      'error',
      { groups: [['^\u0000', '^@?w', '^']] },
    ],
    'simple-import-sort/exports': 'error',
  },
};
