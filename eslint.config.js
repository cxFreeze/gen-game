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
    ignores: ['src/app/core/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/game/**'],
          message: 'Access the game through GameRuntimeService.',
        }],
      }],
    },
  },
  {
    files: ['src/app/core/**/*.ts'],
    ignores: ['src/app/core/game-runtime/game-runtime.service.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/game/**'],
          message: 'Access the game through GameRuntimeService.',
        }, {
          group: ['**/features/**'],
          message: 'Core infrastructure must not depend on application features.',
        }],
      }],
    },
  },
  {
    files: ['src/app/core/game-runtime/game-runtime.service.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/features/**'],
          message: 'Core infrastructure must not depend on application features.',
        }, {
          group: ['**/game/gameplay/**', '**/game/rendering/**', '**/game/input/**', '**/game/math/**'],
          message: 'The Angular facade must access the game through its runtime.',
        }],
      }],
    },
  },
  {
    files: ['src/game/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@angular/*', '**/app/**'],
          message: 'Keep the game independent of Angular.',
        }],
      }],
    },
  },
  {
    files: ['src/game/rendering/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@angular/*', '**/app/**'],
          message: 'Keep the game independent of Angular.',
        }, {
          group: ['**/gameplay/game', '**/gameplay/characters/**', '**/gameplay/player/**', '**/gameplay/enemies/**', '**/gameplay/projectiles/**'],
          allowTypeImports: true,
          message: 'Rendering uses gameplay interfaces and snapshots, never entity implementations.',
        }],
      }],
    },
  },
  {
    files: ['src/game/runtime/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@angular/*', '**/app/**'],
          message: 'Keep the game independent of Angular.',
        }, {
          group: ['**/gameplay/**', '!**/gameplay/game'],
          message: 'Runtime coordinates Game; entities and managers belong to gameplay.',
        }],
      }],
    },
  },
  {
    files: ['src/game/gameplay/**/*.ts', 'src/game/math/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@angular/*', '@babylonjs/*', '**/app/**', '**/rendering/**', '**/runtime/**', '**/input/**'],
          message: 'Gameplay and math must remain independent of Angular, Babylon, rendering, input, and runtime.',
        }],
      }],
      'no-restricted-globals': ['error', 'window', 'document', 'navigator', 'crypto', 'performance'],
    },
  },
];
