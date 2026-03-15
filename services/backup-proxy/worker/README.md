# Cloudflare Worker 反向代理

本目录提供“仅转发”的 Worker，实现将 `/api/backup/*` 请求转发到 Node 版代理服务。

- `GET /api/backup/health`
- `POST /api/backup/test`
- `POST /api/backup/list`
- `POST /api/backup/get`
- `POST /api/backup/put`
- `POST /api/backup/delete`

## 使用方式

1. 安装并登录 `wrangler`
2. 复制示例配置：

```bash
cp wrangler.example.toml wrangler.toml
```

3. 在 `wrangler.toml` 中填写 `UPSTREAM_BASE_URL`。
4. 进入目录后启动：

```bash
cd services/backup-proxy/worker
wrangler dev
```

## 环境变量

`wrangler.toml` 默认不提交，请基于示例文件生成本地配置。
`WORKER_TOKEN` 建议通过 `wrangler secret put` 写入。

- `UPSTREAM_BASE_URL`：Node 代理服务的基础地址（必须包含 `/api/backup`）
- `WORKER_TOKEN`：可选，Worker 与 Node 之间的共享密钥（启用 Node 校验时必填）

若启用 Node 校验，请在 Node 服务中配置 `REQUIRE_WORKER_TOKEN=1` 与同名 `WORKER_TOKEN`。

## 前端接入

将前端的 `VITE_BACKUP_PROXY_BASE_URL` 配置为 Worker 的域名，例如：

```bash
VITE_BACKUP_PROXY_BASE_URL=https://your-worker.example.com/api/backup
```
