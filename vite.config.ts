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
        // 测试里需要把 mock 断言成真实类型
        files: ['src/**/*.test.ts', 'src/test/**', 'src/**/__mocks__/**'],
        rules: { 'typescript/no-unsafe-type-assertion': 'off' },
      },
      {
        // Kobalte 多态组件需要收窄 props 类型
        files: ['src/components/ui/**'],
        rules: { 'typescript/no-unsafe-type-assertion': 'off' },
      },
    ],
    ignorePatterns: ['src/routeTree.gen.ts', 'drizzle/**'],
    options: { typeAware: true, typeCheck: true },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['src/test/setup.ts'],
  },
  resolve: { tsconfigPaths: true },
  // 测试只覆盖服务端模块, 不需要这些插件; 加载它们会让 vp test 结束后进程无法退出.
  plugins: lazyPlugins(() =>
    process.env.VITEST
      ? []
      : [devtools(), nitro(), tailwindcss(), tanstackStart(), solidPlugin({ ssr: true })],
  ),
})
