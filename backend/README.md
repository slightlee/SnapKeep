# SnapKeep 备份代理服务

WebDAV 备份代理服务，用于解决浏览器前端直连 WebDAV 时的 CORS 跨域限制问题。

## 功能特性

- **同源代理**：前端通过同源 `/api/backup/*` 接口访问，规避 CORS 限制
- **SSRF 防护**：内置目标地址校验，禁止访问内网/本地地址
- **流式转发**：支持大文件备份/恢复的流式传输
- **配置加密**：WebDAV 凭据使用 AES-256-GCM 加密存储
- **统一接口**：标准化的 REST API 设计

## 接口列表

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/backup/health` | GET | 健康检查 |
| `/api/backup/config` | POST | 保存 WebDAV 配置（加密存储） |
| `/api/backup/test` | POST | 测试 WebDAV 连接 |
| `/api/backup/list` | POST | 列出备份文件列表 |
| `/api/backup/get` | POST | 下载备份文件（流式） |
| `/api/backup/put` | POST | 上传备份文件（流式） |

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 启动服务

```bash
# 开发模式
pnpm dev

# 或指定端口
PORT=3001 pnpm dev
```

服务默认监听 `http://localhost:3001`

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | `3001` | 服务端口 |
| `BACKUP_PROXY_PORT` | `3001` | 备选端口配置 |

## 请求示例

### 健康检查

```bash
curl http://localhost:3001/api/backup/health
```

### 保存配置

```bash
curl -X POST http://localhost:3001/api/backup/config \
  -H "Content-Type: application/json" \
  -d '{
    "server": "https://dav.jianguoyun.com/dav/",
    "username": "your-username",
    "password": "your-password",
    "provider": "jianguoyun",
    "encryptPwd": "your-encryption-password"
  }'
```

### 测试连接

```bash
curl -X POST http://localhost:3001/api/backup/test \
  -H "Content-Type: application/json" \
  -d '{
    "server": "https://dav.jianguoyun.com/dav/",
    "username": "your-username",
    "password": "your-password"
  }'
```

### 列出备份文件

```bash
curl -X POST http://localhost:3001/api/backup/test \
  -H "Content-Type: application/json" \
  -d '{
    "encryptPwd": "your-encryption-password"
  }'
```

### 下载备份文件

```bash
curl -X POST http://localhost:3001/api/backup/get \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "snapkeep-backup-20260312120000.encrypted",
    "encryptPwd": "your-encryption-password"
  }' \
  --output backup.encrypted
```

### 上传备份文件

```bash
curl -X POST http://localhost:3001/api/backup/put \
  -H "Content-Type: text/plain" \
  -H "x-backup-file-name: snapkeep-backup-20260312120000.encrypted" \
  -H "x-backup-encrypt-pwd: your-encryption-password" \
  --data-binary @backup.encrypted
```

## 项目结构

```
backend/
├── src/
│   ├── index.js        # 服务入口，HTTP 路由
│   ├── http.js         # HTTP 工具函数
│   ├── ssrf.js         # SSRF 防护，URL 校验
│   ├── configStore.js  # 配置加密存储
│   └── webdav.js       # WebDAV 客户端封装
├── package.json
└── README.md
```

## 安全说明

1. **SSRF 防护**：服务会校验目标 URL，禁止访问本地地址（127.0.0.1, localhost 等）和内网地址（10.x.x.x, 192.168.x.x 等）
2. **配置加密**：WebDAV 密码使用用户提供的加密密码进行 AES-256-GCM 加密后存储
3. **无持久化存储**：除加密的配置文件外，服务不存储任何用户数据

## 与前端集成

前端开发时，可通过配置代理将 `/api/backup/*` 请求转发到本服务：

**vite.config.js 示例：**

```javascript
export default {
  server: {
    proxy: {
      '/api/backup': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
}
```

生产环境部署时，可将前端静态资源和本服务部署在同一域名下，或使用反向代理（如 Nginx）进行路由。
