# 后端部署（Docker）

目标：前端在 Vercel，后端代理部署到云服务器并对公网提供 API。

## 前置条件

1. 服务器已安装：`docker`、`docker compose`
2. 你有可 SSH 登录服务器的密钥
3. 已有用于后端的域名（示例：`api.example.com`）

## 方式一：一键远程部署（推荐）

在本地仓库执行：

```bash
cd services/backup-proxy/node/deploy
REMOTE_HOST=<服务器IP或域名> \
REMOTE_USER=root \
PEM_KEY_PATH="$HOME/.ssh/your-key.pem" \
REMOTE_DIR=/opt/snapkeep/backup-proxy \
./remote-deploy.sh
```

可选参数：

- `SSH_PORT`：默认 `22`
- `IMAGE_NAME`：默认 `snapkeep-backup-proxy`
- `IMAGE_TAG`：默认自动取当前 Git 短提交哈希（也兼容 `TAG`）
- `SYNC_ENV`：默认 `1`，会同步并覆盖远端 `.env`；设为 `0` 可关闭
- 第一个位置参数也可传主机：`./remote-deploy.sh <host>`

脚本会自动完成：

1. 在本地构建镜像（可通过 `IMAGE_NAME` / `IMAGE_TAG` 指定名称和版本）
2. 通过 SSH 传输镜像到远程并 `docker load`
3. 同步 `docker-compose.yml`、`.env.example` 到 `REMOTE_DIR`，并在默认配置下覆盖远端 `.env`
4. 远程执行 `docker compose up -d --no-build --remove-orphans`

## 必填环境变量（.env）

- `BACKUP_API_KEY=<强随机值>`
- `ALLOWED_ORIGINS=https://<你的前端域名>`
- `ALLOWED_WEBDAV_HOSTS=dav.jianguoyun.com,dav.aliyundrive.com`

建议同时设置：

- `JSON_BODY_MAX_BYTES=1048576`
- `UPLOAD_BODY_MAX_BYTES=8388608`
- `WEBDAV_TIMEOUT_MS=15000`
- `RATE_LIMIT_WINDOW_MS=60000`
- `RATE_LIMIT_MAX_REQUESTS=120`
- `NODE_OPTIONS=--max-old-space-size=128`
- `CONTAINER_MEM_LIMIT=256m`
- `PUBLIC_PORT=43001`

可选安全配置（仅允许 Worker 访问）：

- `REQUIRE_WORKER_TOKEN=1`
- `WORKER_TOKEN=<与 Worker 保持一致>`

内存调优建议（1C1G 服务器）：

- 优先从 `CONTAINER_MEM_LIMIT=256m` + `NODE_OPTIONS=--max-old-space-size=128` 起步
- 若业务量低可降到 `192m` + `96`
- 若出现 OOM 或频繁重启，再逐步上调两项参数

说明：`docker-compose.yml` 默认映射 `${PUBLIC_PORT:-43001}:3001`。如需修改公网端口，请调整 `.env` 中的 `PUBLIC_PORT`，并同步更新安全组/防火墙规则。

## 上线验证

1. 健康检查（应成功）

```bash
curl "https://api.example.com/api/backup/health"
```

2. 未带 Key（应 401）

```bash
curl -X POST "https://api.example.com/api/backup/list" \
  -H "Content-Type: application/json" \
  -d '{}'
```

3. 带 Key（应进入业务校验，不再 401）

```bash
curl -X POST "https://api.example.com/api/backup/list" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <你的BACKUP_API_KEY>" \
  -d '{"server":"https://dav.jianguoyun.com/dav/","username":"u","password":"p"}'
```

## 与 Vercel 前端对接

1. 前端环境变量：`VITE_BACKUP_API_KEY=<同后端>`
2. Vercel Rewrites：
- `/api/backup/:path*` -> `https://api.example.com/api/backup/:path*`

## 常用运维命令

```bash
cd /opt/snapkeep/backup-proxy
sudo docker compose ps
sudo docker compose logs -f
sudo docker compose restart
IMAGE_NAME=snapkeep-backup-proxy TAG=<版本号> sudo docker compose up -d --no-build
```
