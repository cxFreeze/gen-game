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
  },
  {
    files: ['src/app/**/*.ts'],
    ignores: ['src/app/game/game-engine.service.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/engine/**'],
          message: 'Access the engine through GameEngineService.',
        }],
      }],
    },
  },
  {
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@angular/*'],
          message: 'Keep the game engine independent of Angular.',
        }],
      }],
    },
  },
];
