import { encodeRef, graphql, request, send, toError } from './http'

export type RepoRef = { owner: string; repo: string }
export type BranchRef = RepoRef & { branch: string }

export type ForkCandidate = RepoRef & {
  defaultBranch: string
  /** 上游仓库 owner/repo. */
  upstream: string
  private: boolean
}

export type BranchHeads = {
  /** fork 分支的 head SHA, 分支不存在时为 null. */
  fork: string | null
  /** 上游仓库 owner/repo, 仓库不是 fork 时为 null. */
  upstreamRepo: string | null
  /**
   * 与 fork 分支比较的上游分支: 优先同名分支, 上游没有同名分支时用上游默认分支
   * (例如上游把 master 改名为 main). 与 GitHub 网页上 Sync fork 的行为一致.
   */
  upstreamBranch: string | null
  /** upstreamBranch 的 head SHA. */
  upstream: string | null
}

export type Comparison = {
  /** fork 独有的提交数. */
  aheadBy: number
  /** fork 缺少的上游提交数. */
  behindBy: number
}

export type MergeUpstreamResult =
  | { type: 'fast-forward' | 'merge' | 'none' }
  /** 合并上游有冲突, 分支没有改动. */
  | { type: 'conflict' }

type ForkListQuery = {
  viewer: {
    repositories: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
      nodes: {
        name: string
        owner: { login: string }
        isPrivate: boolean
        isArchived: boolean
        defaultBranchRef: { name: string } | null
        parent: { nameWithOwner: string } | null
      }[]
    }
  }
}

const FORK_LIST_QUERY = `
query ($after: String) {
  viewer {
    repositories(
      first: 100
      after: $after
      isFork: true
      ownerAffiliations: [OWNER, ORGANIZATION_MEMBER]
      orderBy: { field: NAME, direction: ASC }
    ) {
      pageInfo { hasNextPage endCursor }
      nodes {
        name
        owner { login }
        isPrivate
        isArchived
        defaultBranchRef { name }
        parent { nameWithOwner }
      }
    }
  }
}`

type Target = { target: { oid: string } | null } | null

type HeadsNode = {
  ref: Target
  parent: {
    nameWithOwner: string
    ref: Target
    defaultBranchRef: ({ name: string } & NonNullable<Target>) | null
  } | null
} | null

const HEADS_BATCH_SIZE = 50

/**
 * 绑定一个 token 的 GitHub API 客户端, 仅在服务端使用. 只支持 fine-grained personal access token.
 *
 * 需要的权限 (Repository permissions):
 * - Contents: Read and write (merge-upstream, 强制更新分支)
 * - Workflows: Read and write (上游改动了 .github/workflows 时才需要)
 * - Metadata: Read (创建 token 时自动包含)
 */
export class GitHubClient {
  readonly #token: string

  constructor(token: string) {
    this.#token = token
  }

  getViewer() {
    return request<{ login: string }>(this.#token, 'GET', '/user')
  }

  /** token 能访问到的 fork. 已归档或拿不到上游/默认分支的不能同步, 直接跳过. */
  async listForks() {
    const forks: ForkCandidate[] = []
    let after: string | null = null
    do {
      const data: ForkListQuery = await graphql<ForkListQuery>(this.#token, FORK_LIST_QUERY, {
        after,
      })
      const { nodes, pageInfo } = data.viewer.repositories
      for (const node of nodes) {
        if (node.isArchived || !node.parent || !node.defaultBranchRef) continue
        forks.push({
          owner: node.owner.login,
          repo: node.name,
          defaultBranch: node.defaultBranchRef.name,
          upstream: node.parent.nameWithOwner,
          private: node.isPrivate,
        })
      }
      after = pageInfo.hasNextPage ? pageInfo.endCursor : null
    } while (after)
    return forks
  }

  /**
   * 用 GraphQL 批量取 fork 分支和对应上游分支的 head SHA.
   * 返回值与 targets 一一对应; 某个仓库读取失败时对应项为 Error.
   */
  async getBranchHeads(targets: BranchRef[]) {
    const results: (BranchHeads | Error)[] = []
    for (let start = 0; start < targets.length; start += HEADS_BATCH_SIZE) {
      const batch = targets.slice(start, start + HEADS_BATCH_SIZE)
      const variables: Record<string, string> = {}
      const params: string[] = []
      const fields = batch.map((target, i) => {
        variables[`o${i}`] = target.owner
        variables[`n${i}`] = target.repo
        variables[`b${i}`] = `refs/heads/${target.branch}`
        params.push(`$o${i}: String!, $n${i}: String!, $b${i}: String!`)
        return `r${i}: repository(owner: $o${i}, name: $n${i}) {
          ref(qualifiedName: $b${i}) { target { oid } }
          parent {
            nameWithOwner
            ref(qualifiedName: $b${i}) { target { oid } }
            defaultBranchRef { name target { oid } }
          }
        }`
      })
      const query = `query (${params.join(', ')}) {\n${fields.join('\n')}\n}`
      const data = await graphql<Record<string, HeadsNode>>(this.#token, query, variables)

      batch.forEach((target, i) => {
        const node = data[`r${i}`]
        if (!node) {
          results.push(new Error(`Can't access ${target.owner}/${target.repo}.`))
          return
        }
        const parent = node.parent
        const sameName = parent?.ref?.target?.oid
        const fallback = parent?.defaultBranchRef
        results.push({
          fork: node.ref?.target?.oid ?? null,
          upstreamRepo: parent?.nameWithOwner ?? null,
          upstreamBranch: sameName ? target.branch : (fallback?.name ?? null),
          upstream: sameName ?? fallback?.target?.oid ?? null,
        })
      })
    }
    return results
  }

  /** 以上游分支为 base, fork 分支为 head 比较. */
  async compareWithUpstream(fork: BranchRef, upstream: { owner: string; branch: string }) {
    const base = `${upstream.owner}:${encodeRef(upstream.branch)}`
    const head = `${fork.owner}:${encodeRef(fork.branch)}`
    const path = `/repos/${fork.owner}/${fork.repo}/compare/${base}...${head}?per_page=1`
    const data = await request<{ ahead_by: number; behind_by: number }>(this.#token, 'GET', path)
    const comparison: Comparison = { aheadBy: data.ahead_by, behindBy: data.behind_by }
    return comparison
  }

  /** 和网页上 Sync fork 的 Update branch 一样. 有冲突时返回 conflict, 不抛错. */
  async mergeUpstream(fork: BranchRef): Promise<MergeUpstreamResult> {
    const res = await send<{ merge_type: 'merge' | 'fast-forward' | 'none' }>(
      this.#token,
      'POST',
      `/repos/${fork.owner}/${fork.repo}/merge-upstream`,
      { branch: fork.branch },
    )
    if (res.ok) return { type: res.data.merge_type }
    if (res.status === 409) return { type: 'conflict' }
    throw toError(res.status, res.message)
  }

  /** 把分支强制指向 sha, 丢弃 fork 上独有的提交. 对应网页上的 Discard commits. */
  async resetBranch(fork: BranchRef, sha: string) {
    await request(
      this.#token,
      'PATCH',
      `/repos/${fork.owner}/${fork.repo}/git/refs/heads/${encodeRef(fork.branch)}`,
      { sha, force: true },
    )
  }
}
