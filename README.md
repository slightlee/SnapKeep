<p align="center">
  <img src="./frontend/public/branding/snapkeep-logo-horizontal.svg" width="420" alt="SnapKeep logo" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/release-v0.1.0--alpha.1-2563eb" alt="release" />
  <img src="https://img.shields.io/badge/stage-alpha-f59e0b" alt="stage" />
  <img src="https://img.shields.io/badge/license-AGPL--3.0-16a34a" alt="license" />
  <img src="https://img.shields.io/badge/frontend-Vue%203-42b883" alt="frontend" />
  <img src="https://img.shields.io/badge/backend-Node.js-3c873a" alt="backend" />
</p>

# SnapKeep

本地优先（Local-first）的轻量记录工具，面向注重隐私与可迁移性的个人知识记录场景，支持 WebDAV 加密备份与恢复。

## 特性

- 数据默认存储在本地（IndexedDB）
- 支持记录管理、搜索、标签、JSON 导入导出
- 支持 WebDAV 备份/恢复（前端加密）
- 提供独立备份代理服务（鉴权、限流、SSRF 防护）

## 快速开始

环境要求：`Node.js >= 18`、`pnpm >= 8`

仅体验本地记录功能：

```bash
cd frontend && pnpm install && pnpm dev
```

需要联调 WebDAV 备份功能：

```bash
# backup-proxy (node)
cd services/backup-proxy/node && pnpm install && pnpm dev

# frontend
cd frontend && pnpm install && pnpm dev
```

本地默认地址：
- 前端：`http://localhost:5173`
- 后端：`http://localhost:3001`

## 仓库结构

- `frontend/`：前端单页应用，负责本地记录管理与 WebDAV 备份入口
- `services/backup-proxy/node/`：WebDAV 备份代理服务（Node.js）
- `services/backup-proxy/worker/`：备份代理入口（Cloudflare Worker 反向代理）
- `doc/`：版本、发布、提交流程等项目文档
- `.codex/skills/`：项目内 AI 协作技能

## 文档

使用与部署
- 前端说明：[frontend/README.md](./frontend/README.md)
- 后端说明：[services/backup-proxy/node/README.md](./services/backup-proxy/node/README.md)
- 后端部署：[services/backup-proxy/node/deploy/README.md](./services/backup-proxy/node/deploy/README.md)
- Worker 说明：[services/backup-proxy/worker/README.md](./services/backup-proxy/worker/README.md)

工程规范
- Git 提交规范：[doc/Git提交规范.md](./doc/Git提交规范.md)
- 版本定义规范：[doc/版本定义规范.md](./doc/版本定义规范.md)
- 发布流程：[doc/发布流程.md](./doc/发布流程.md)


## 许可证

本项目采用 [AGPL-3.0](./LICENSE) 开源许可证。


## 反馈与贡献

- 问题反馈：[Issue](https://github.com/slightlee/SnapKeep/issues)
- 改进建议：[Pull Request](https://github.com/slightlee/SnapKeep/pulls)
- 如果项目对你有帮助，欢迎 Star 支持

## Star History

<a href="https://star-history.com/#slightlee/SnapKeep&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=slightlee/SnapKeep&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=slightlee/SnapKeep&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=slightlee/SnapKeep&type=Date" />
 </picture>
</a>
