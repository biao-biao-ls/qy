import tseslint from '@electron-toolkit/eslint-config-ts'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import eslintPluginReact from 'eslint-plugin-react'
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'
import eslintPluginReactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  { ignores: ['**/node_modules', '**/dist', '**/out', '**/build'] },
  tseslint.configs.recommended,
  eslintPluginReact.configs.flat.recommended,
  eslintPluginReact.configs.flat['jsx-runtime'],
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': eslintPluginReactHooks,
      'react-refresh': eslintPluginReactRefresh,
    },
    rules: {
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginReactRefresh.configs.vite.rules,

      // TypeScript 规则（适度放宽）
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn', // 降级为警告
      '@typescript-eslint/explicit-function-return-type': 'off', // 关闭，让 TypeScript 推断
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-require-imports': 'off', // 允许 require 导入（脚本文件）
      // 注意：以下规则需要类型信息，暂时禁用
      // '@typescript-eslint/prefer-nullish-coalescing': 'error',
      // '@typescript-eslint/prefer-optional-chain': 'error',
      // '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      // '@typescript-eslint/no-floating-promises': 'error',
      // '@typescript-eslint/await-thenable': 'error',
      // '@typescript-eslint/no-misused-promises': 'error',

      // React 规则
      'react/prop-types': 'off', // TypeScript 已提供类型检查
      'react/react-in-jsx-scope': 'off', // React 17+ 不需要
      'react-hooks/exhaustive-deps': 'warn', // 降级为警告
      'react/jsx-no-leaked-render': 'warn',
      'react/jsx-key': ['warn', { checkFragmentShorthand: true }],
      'react/no-array-index-key': 'warn',
      'react/self-closing-comp': 'warn',
      'react/jsx-curly-brace-presence': 'off', // 关闭引号风格检查
      'react/no-unknown-property': 'off', // 关闭未知属性检查（jsx 属性）

      // 通用规则
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      'no-duplicate-imports': 'error',
      'no-useless-return': 'error',
      'no-useless-concat': 'error',
      'no-unneeded-ternary': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-body-style': ['error', 'as-needed'],
      'no-nested-ternary': 'warn',
      complexity: ['warn', 20], // 提高复杂度限制
      'max-depth': ['warn', 6],
      'max-lines-per-function': ['warn', { max: 200, skipBlankLines: true, skipComments: true }], // 提高行数限制

      // 导入规则（暂时关闭）
      'sort-imports': 'off',
    },
  },
  // 脚本文件特殊配置
  {
    files: ['scripts/**/*.js', '*.config.js', '*.config.mjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'no-case-declarations': 'off',
    },
  },
  eslintConfigPrettier
)
