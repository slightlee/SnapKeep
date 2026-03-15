# SnapKeep 备份代理服务

Node.js 实现的 WebDAV 备份代理，用于解决浏览器前端直连 WebDAV 时的跨域限制。

## 功能特性

- 同源代理：统一走 `/api/backup/*`
- SSRF 防护：拦截本地/内网目标地址
- WebDAV 主机白名单：可限制仅允许指定主机
- 请求体大小限制：JSON 与上传接口可分别限流量
- 基础鉴权：支持 `X-API-Key` / `Authorization: Bearer`
- 基础限流：按 IP 限制单位时间请求数
- 上游超时控制：避免慢连接长期占用资源

## 接口列表

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/backup/health` | GET | 健康检查 |
| `/api/backup/test` | POST | 测试 WebDAV 连接 |
| `/api/backup/list` | POST | 列出备份文件 |
| `/api/backup/get` | POST | 下载备份文件 |
| `/api/backup/put` | POST | 上传备份文件 |
| `/api/backup/delete` | POST | 删除备份文件 |

## 快速开始

```bash
pnpm install
pnpm dev
```

默认监听：`http://localhost:3001`

### Docker 启动（推荐生产）

```bash
cd services/backup-proxy/node
cp .env.example .env
# 编辑 .env 后启动
sudo docker compose up -d --build
```

查看状态：

```bash
sudo docker compose ps
sudo docker compose logs -f --tail=100
```

## 环境变量

服务启动时会自动读取 `services/backup-proxy/node/.env`。建议先复制示例文件：

```bash
cp .env.example .env
```

优先级说明：运行环境中已存在的同名环境变量优先，`.env` 仅用于补充未设置项。

关键变量：

- `PORT`：服务端口，默认 `3001`
- `PUBLIC_PORT`：Docker 宿主机映射端口，默认 `43001`
- `NODE_OPTIONS`：Node 启动参数，默认建议 `--max-old-space-size=128`
- `CONTAINER_MEM_LIMIT`：Docker 容器内存上限（如 `256m`，由 `docker-compose.yml` 读取）
- `BACKUP_API_KEY`：接口鉴权密钥（公网建议必配）
- `REQUIRE_WORKER_TOKEN`：是否仅允许来自 Worker 的请求（`1/true` 启用）
- `WORKER_TOKEN`：Worker 与 Node 之间的共享密钥
- `ALLOWED_ORIGINS`：允许的前端来源（逗号分隔）
- `ALLOWED_WEBDAV_HOSTS`：允许连接的 WebDAV 主机（逗号分隔，支持 `*.domain`）
- `JSON_BODY_MAX_BYTES`：JSON 请求体大小上限（字节）
- `UPLOAD_BODY_MAX_BYTES`：上传请求体大小上限（字节）
- `RATE_LIMIT_WINDOW_MS`：限流窗口时长（毫秒）
- `RATE_LIMIT_MAX_REQUESTS`：窗口内最大请求数
- `WEBDAV_TIMEOUT_MS`：单次 WebDAV 请求超时（毫秒）

## 请求示例

### 健康检查

```bash
curl "http://localhost:3001/api/backup/health"
```

### 鉴权联调（`BACKUP_API_KEY`）

当 `.env` 配置了 `BACKUP_API_KEY` 后，除 `/api/backup/health` 外的接口都需要携带 `X-API-Key`（或 `Authorization: Bearer`）。

```bash
# 未带 key：应返回 401
curl -X POST "http://localhost:3001/api/backup/list" \
  -H "Content-Type: application/json" \
  -d '{}'

# 带 key：不再返回 401（后续可能进入业务参数校验）
curl -X POST "http://localhost:3001/api/backup/list" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your-api-key>" \
  -d '{}'
```

### 测试连接

```bash
curl -X POST "http://localhost:3001/api/backup/test" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your-api-key>" \
  -d '{
    "server": "https://dav.jianguoyun.com/dav/",
    "username": "your-username",
    "password": "your-password"
  }'
```

### 上传备份文件

```bash
curl -X POST "http://localhost:3001/api/backup/put" \
  -H "Content-Type: text/plain" \
  -H "X-API-Key: <your-api-key>" \
  -H "x-backup-file-name: snapkeep-backup-20260312120000.encrypted" \
  -H "x-backup-server: https://dav.jianguoyun.com/dav/" \
  -H "x-backup-username: your-username" \
  -H "x-backup-password: your-password" \
  --data-binary @backup.encrypted
```

## 部署建议

- 生产环境建议启用 `BACKUP_API_KEY`、`ALLOWED_WEBDAV_HOSTS`、`ALLOWED_ORIGINS`
- 建议结合你现有网关或防火墙策略配置 HTTPS、连接数和请求体限制
- 若前端与代理非同源，请显式配置 `ALLOWED_ORIGINS`
- 小内存机器建议同时配置：`NODE_OPTIONS=--max-old-space-size=96~128`、`CONTAINER_MEM_LIMIT=192m~256m`
- 部署文档（Docker-only）：[deploy/README.md](./deploy/README.md)
