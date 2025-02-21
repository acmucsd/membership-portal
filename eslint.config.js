const eslintParser = require('@typescript-eslint/parser');

module.exports = [
  {
    // Apply to all files
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['node_modules/**', 'build/**', 'logs/**', '.env'],
    languageOptions: {
      parser: eslintParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      globals: {
        browser: true,
        node: true,
        jest: true,
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
    },
    rules: {
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: 'type|_*',
        },
      ],
      'class-methods-use-this': 'off',
      'consistent-return': 'off',
      'func-names': 'off',
      'global-require': 'off',
      'import/no-cycle': 'off',
      'import/prefer-default-export': 'off',
      'max-classes-per-file': 'off',
      'max-len': [
        'error',
        {
          code: 120,
        },
      ],
      'no-bitwise': [
        'error',
        {
          allow: ['^'],
        },
      ],
      'no-param-reassign': 'off',
      'no-unused-vars': 'off',
      'object-curly-newline': [
        'error',
        {
          consistent: true,
        },
      ],
    },
  },
  {
    // Specific rules for test files
    files: ['tests/*.test.ts'],
    rules: {
      'no-await-in-loop': 'off',
    },
  },
];
