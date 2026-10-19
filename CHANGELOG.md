# github-fork-sync

## 0.1.0

### Minor Changes

- f93abd3: Add single-password sign-in. The password entered on first sign-in becomes the app password.
- 2fdda2f: Connect GitHub with a fine-grained personal access token, choose which forks to sync, and check them for upstream updates. Forks that are behind are synced automatically; forks with merge conflicts are left for you to open a pull request or discard their commits.
