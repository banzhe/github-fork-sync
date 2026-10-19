import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/solid-start/plugin/vite'
import solid from 'eslint-plugin-solid'
import { nitro } from 'nitro/vite'
import solidPlugin from 'vite-plugin-solid'
import { defineConfig, lazyPlugins } from 'vite-plus'

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  fmt: {
    semi: false,
    singleQuote: true,
    jsxSingleQuote: false,
    tabWidth: 2,
    useTabs: false,
    endOfLine: 'lf',
    printWidth: 100,
    trailingComma: 'all',
    sortImports: {},
    sortTailwindcss: {
      stylesheet: './src/styles.css',
      functions: ['cn', 'cva'],
    },
    sortPackageJson: true,
    ignorePatterns: ['src/routeTree.gen.ts', 'drizzle/**', 'pnpm-lock.yaml', 'CHANGELOG.md'],
  },
  lint: {
    jsPlugins: [
      { name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' },
      { name: 'solid', specifier: 'eslint-plugin-solid' },
    ],
    plugins: ['typescript', 'unicorn', 'oxc', 'import'],
    categories: {
      correctness: 'error',
      suspicious: 'warn',
    },
    rules: {
      // eslint-plugin-solid 推荐规则 (TypeScript 版)
      ...solid.configs['flat/typescript'].rules,
      'vite-plus/prefer-vite-plus-imports': 'error',
    },
    overrides: [
      {
        // Kobalte 多态组件需要收窄 props 类型
        files: ['src/components/ui/**'],
        rules: { 'typescript/no-unsafe-type-assertion': 'off' },
      },
    ],
    ignorePatterns: ['src/routeTree.gen.ts', 'drizzle/**'],
    options: { typeAware: true, typeCheck: true },
  },
  resolve: { tsconfigPaths: true },
  plugins: lazyPlugins(() => [
    devtools(),
    nitro(),
    tailwindcss(),
    tanstackStart(),
    solidPlugin({ ssr: true }),
  ]),
})
