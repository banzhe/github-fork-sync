# GitHub Fork Sync

## 技术栈

- [TanStack Start](https://tanstack.com/start) + [SolidJS](https://solidjs.com) (文件路由, SSR, Nitro node-server 输出)
- [Vite+](https://viteplus.dev) (`vp`): 开发/构建, 内置 oxlint + oxfmt + 类型检查
- [Tailwind CSS v4](https://tailwindcss.com) + [Kobalte](https://kobalte.dev) (shadcn 方式组织的组件)
- SQLite ([better-sqlite3](https://github.com/WiseLibs/better-sqlite3)) + [Drizzle ORM](https://orm.drizzle.team)
- [Changesets](https://github.com/changesets/changesets) 版本管理

## 开发

```bash
vp install
vp dev
```

常用命令:

| 命令               | 说明                                    |
| ------------------ | --------------------------------------- |
| `vp dev`           | 启动开发服务器 (http://localhost:29176) |
| `vp check`         | 格式 + lint + 类型检查                  |
| `vp check --fix`   | 自动修复格式与可修复的 lint 问题        |
| `vp test`          | 运行测试 (Vitest)                       |
| `vp build`         | 生产构建, 输出到 `.output/`             |
| `pnpm start`       | 运行生产构建                            |
| `pnpm db:generate` | 根据 schema 生成迁移                    |
| `pnpm db:studio`   | 打开 Drizzle Studio                     |
| `pnpm changeset`   | 记录一次变更                            |

代码风格: 单引号, 无分号, 2 空格缩进, LF 换行 (见 `vite.config.ts` 的 `fmt` 与 `.gitattributes`). 提交前 `vp staged` 会自动运行 `vp check --fix`.

## 组件

组件按 shadcn 的方式组织, 源码直接放在 `src/components/ui/`, 基于 Kobalte 原语 + `cva` + `cn` (`src/lib/utils.ts`). 主题色定义在 `src/styles.css` 的 CSS 变量中, `.dark` 为暗色主题.

新增组件时参照现有文件: 一个组件一个文件, 用 `splitProps` 拆出 `class`, 变体用 `cva` 声明.

## 数据库

- Schema: `src/db/schema.ts`
- 数据访问: `src/db/repositories/`, 每张表一个 repository, 业务代码只通过它们读写数据库
- 迁移: `drizzle/`, 修改 schema 后执行 `pnpm db:generate`
- 服务启动后首次访问数据库时自动执行迁移
- 环境变量 `DATABASE_URL` 指定数据库文件 (默认 `./data/app.db`)

## 测试

`vp test` 运行 `src/**/*.test.ts`. 每个测试文件使用独立的临时 SQLite 数据库 (`src/test/setup.ts`). 测试不访问 GitHub: 用 `vi.mock('~/server/github')` 换成 `src/server/github/__mocks__/index.ts` 中的假客户端.

## 登录

应用使用单密码登录. 首次访问 `/login` 时输入的密码会成为登录密码 (至少 6 位). 忘记密码时, 删除数据库 `settings` 表中 `key = 'password_hash'` 的行, 再次登录即可重新设置.

## 同步 fork

1. 首页填入 GitHub fine-grained personal access token (只支持 `github_pat_` 开头的 token). Repository permissions 需要 Contents: Read and write; 上游改动了 `.github/workflows` 时还需要 Workflows: Read and write. token 明文保存在数据库 `settings` 表中.
2. 点 Choose repositories 选择要同步的 fork. 同步的是 fork 的默认分支, 与上游同名分支比较; 上游没有同名分支时用上游的默认分支. fork 列表在服务端缓存 10 分钟, 更换或移除 token 后失效.
3. 点 Check for updates 检测:
   - GraphQL 批量取两边分支的 head SHA, 相同则已是最新;
   - 不同时用 REST compare 取 ahead/behind;
   - 落后上游时调用 `merge-upstream` 同步 (fast-forward 或 merge commit);
   - 合并有冲突时不同步, 页面上让用户选择: 在 GitHub 上开 PR 解决冲突, 或丢弃 fork 独有的提交.

## 发布

1. 开发时用 `pnpm changeset` 记录变更并随 PR 提交
2. 合并到 `main` 后 Release 工作流会创建/更新版本 PR
3. 合并版本 PR 后自动打 `v*` tag, 创建 GitHub Release, 并推送镜像到 `ghcr.io/<owner>/<repo>`

## 部署

```bash
docker compose up -d
```

`docker-compose.yml` 默认使用 `ghcr.io/banzhe/github-fork-sync:${APP_VERSION:-latest}` 镜像, 也可 `docker compose up -d --build` 本地构建. 数据保存在 `app-data` 卷中 (`/app/data`), 健康检查地址为 `/api/health`.
