import eslintPluginVue from 'eslint-plugin-vue'
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'

export default [
  {
    ignores: [
      '**/node_modules',
      'dist',
      '*.d.ts',
      'public',
      '.env',
      '.vscode',
      '*.config.js',
      '__tests__',
      'coverage'
    ]
  },
  {
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: typescriptParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue']
      }
    }
  },
  eslintPluginPrettier,
  {
    plugins: {
      vue: eslintPluginVue,
      '@typescript': typescriptEslint
    },
    rules: {
      // Base rules
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',

      // TypeScript rules
      '@typescript/no-explicit-any': 'off',
      '@typescript/no-unused-vars': 'warn',

      // Vue rules
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
      'vue/component-api-style': ['error', ['script-setup']]
    }
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript/no-shadow': 'error',
      '@typescript/no-use-before-define': 'error'
    }
  }
]
