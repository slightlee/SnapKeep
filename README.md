<p align="center">
  <img src="./frontend/public/branding/snapkeep-logo-horizontal.svg" width="420" alt="SnapKeep logo" />
</p>

# SnapKeep

本地优先（Local-first）的轻量记录工具，支持 WebDAV 加密备份与恢复。

## 特性

- 数据默认存储在本地（IndexedDB）
- 支持记录管理、搜索、标签、JSON 导入导出
- 支持 WebDAV 备份/恢复（前端加密）
- 提供独立备份代理服务（鉴权、限流、SSRF 防护）

## 快速开始

环境要求：`Node.js >= 18`、`pnpm >= 8`

```bash
# backend
cd backend && pnpm install && pnpm dev

# frontend
cd frontend && pnpm install && pnpm dev
```

本地默认地址：
- 前端：`http://localhost:5173`
- 后端：`http://localhost:3001`

## 文档

- 前端说明：[frontend/README.md](./frontend/README.md)
- 后端说明：[backend/README.md](./backend/README.md)
- 后端部署：[backend/deploy/README.md](./backend/deploy/README.md)

## License

`AGPL-3.0`，详见 [LICENSE](/Users/ming/ai-project/SnapKeep/LICENSE)。
