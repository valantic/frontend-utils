import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import eslintConfigValanticPrettier from 'eslint-config-valantic/prettier-vue.js';
import eslintConfigValanticTypescript from 'eslint-config-valantic/typescript.js';
import eslintConfigValantic from 'eslint-config-valantic/vue.js';

// https://eslint.org/docs/user-guide/configuring
export default [
  eslint.configs.recommended,
  ...eslintConfigValanticTypescript,
  ...eslintConfigValantic,
  ...eslintConfigValanticPrettier,
  eslintConfigPrettier,
  {
    ignores: ['dist/', 'node_modules/', '**/.DS_Store'],
  },
  {
    languageOptions: {
      globals: {
        google: 'readonly', // Fixes `no-undef` for `google` namespace. (types are loaded by `@types/google.maps`)
      },
    },
    rules: {
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-useless-undefined': 'off',
      'import/extensions': 'off',
      'no-undefined': 'off',
      'vue/no-unsupported-features': [
        'error',
        {
          version: '^3.5.0',
        },
      ],
    },
  },
];
