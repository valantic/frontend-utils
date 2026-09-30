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
      // Quickfix until eslint-config-valantic is released with 'ok' added upstream, see CHANGELOG.md.
      'id-length': [
        'warn', {
          min: 3,
          properties: 'always',
          exceptions: [
            '$',
            'a',
            'b',
            'e',
            'i',
            'in', // ember-cp-validations
            'j',
            'to', // From/to
            'x',
            'y',
            '_', // _Lowdash
            'fs', // ember
            'gt', // ember-cp-validations
            'id',
            'is', // Vue
            'ok', // Fetch Response#ok
            'DS', // ember-data
            'el', // Vue
            'on', // Vue
            'vm', // Vue
            'v$', // Vuelidate
            'xs', // Bootstrap
            'sm', // Bootstrap
            'md', // Bootstrap
            'lg', // Bootstrap
            'xl', // Bootstrap
            'de', // Locale
            'en', // Locale
            'it', // Locale
            'fr', // Locale
          ],
        },
      ],
      'vue/no-unsupported-features': [
        'error',
        {
          version: '^3.5.0',
        },
      ],
    },
  },
];
