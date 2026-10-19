import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 把 catch 到的值转成可以展示的错误信息. */
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

/** `1 commit` / `2 commits`. */
export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** 仓库的 `owner/repo` 全名, 也用作 fork 的唯一标识. */
export const repoName = (repo: { owner: string; repo: string }) => `${repo.owner}/${repo.repo}`
