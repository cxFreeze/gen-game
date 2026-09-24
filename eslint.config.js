import pluginJs from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';


export default [
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        {
          'assertionStyle': 'never'
        }
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'quotes': [
        'warn',
        'single',
        {
          'allowTemplateLiterals': true
        }
      ],
      'camelcase': [
        'warn',
        {
          'properties': 'never',
          'ignoreDestructuring': true
        }
      ],
      'curly': 'warn',
      'eqeqeq': [
        'warn',
        'smart'
      ],
      'prefer-const': 'warn',
      'brace-style': [
        'warn',
        'stroustrup'
      ],
      'prefer-template': 'warn',
      'template-curly-spacing': 'warn',
      'semi': 'warn',
      'no-console': [
        'warn',
        {
          'allow': [
            'info',
            'warn',
            'error',
            'time',
            'timeEnd'
          ]
        }
      ],
    }
  }
];