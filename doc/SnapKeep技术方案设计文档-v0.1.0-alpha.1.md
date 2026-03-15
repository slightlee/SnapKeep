# SnapKeep  v0.1.0-alpha.1 技术方案设计文档

**文档版本**：v0.1.0-alpha.1（内测 Alpha 版）
**文档状态**：已修订
**适用范围**：SnapKeep 前端与备份代理开发、测试、部署人员
**对应产品版本**：SnapKeep  v0.1.0-alpha.1 PRD
**核心目标**：基于本地优先 + 备份代理架构，实现隐私安全、支持私有化部署的灵感捕获工具，具备 WebDAV 备份与本地 JSON 导出/导入双通道、亮暗模式切换；备份通过同源统一接口转发至 WebDAV，规避 CORS 限制，确保功能稳定、体验流畅。

# 一、文档说明

## 1.1 编写目的

明确 SnapKeep v0.1.0-alpha.1 版本的技术架构、技术选型、核心模块实现、数据存储、加密方案、部署流程及测试标准，为前端开发提供清晰的技术指引，确保开发过程规范、可落地，最终交付符合 PRD 需求的产品。

## 1.2 文档范围

覆盖技术架构设计、技术栈选型、核心模块实现（录入、搜索、备份、导出/导入、主题切换等）、数据存储设计、加密方案、响应式适配、私有化部署、测试方案、风险预案，不包含产品需求细节（参考对应 PRD）。

版本标识规则：采用 SemVer + 预发布标识。`alpha` 表示内测，`beta` 表示公测，`rc` 表示正式候选；正式版本去掉预发布标识。

## 1.3 术语与缩写说明

| 术语/缩写   | 全称                                                     | 说明                                                |
| ----------- | -------------------------------------------------------- | --------------------------------------------------- |
| IndexedDB   | Indexed Database API                                     | 浏览器内置本地 NoSQL 数据库，用于本地数据持久化存储 |
| WebDAV      | Web-based Distributed Authoring and Versioning           | 基于 HTTP 的文件管理协议，用于用户自主备份/恢复数据 |
| AES-256-GCM | Advanced Encryption Standard 256-bit Galois/Counter Mode | 对称加密算法，用于备份文件加密                      |
| PBKDF2      | Password-Based Key Derivation Function 2                 | 基于密码的密钥派生函数，用于生成加密密钥            |
| CORS        | Cross-Origin Resource Sharing                            | 浏览器跨域资源共享安全机制，前端直连 WebDAV 受限    |
| 备份代理    | Backup Proxy Service                                     | 与前端同源的备份网关，负责 WebDAV 交互与流式转发    |
| SPA         | Single Page Application                                  | 单页应用，全程无页面跳转，提升用户体验              |
| 静态部署    | 前端静态资源部署                                         | 支持 GitHub Pages、Vercel、Nginx 等平台             |

# 二、技术架构设计

## 2.1 整体架构

SnapKeep v0.1.0-alpha.1 采用 **本地优先 + 备份代理架构**：前端仍为 SPA，本地数据存储不变；WebDAV 备份/恢复通过同源统一接口 `/api/backup/*` 由备份代理服务转发至 WebDAV，避免浏览器 CORS 限制。核心架构分为 5 层，自上而下依次为：

1. UI 交互层：负责页面渲染、用户操作交互（输入、点击、搜索、主题切换等）；

2. 核心业务层：负责业务逻辑实现（录入、标签、搜索、备份/恢复、导出/导入等）；

3. 备份 API 客户端层：负责调用统一备份接口、处理状态与错误提示；

4. 备份代理层：负责 WebDAV 真实交互、流式转发、鉴权与安全校验；

5. 数据存储层：负责本地数据持久化（IndexedDB）、配置存储（主题偏好）、加密处理等。

**架构优势**：本地优先、兼容性提升（规避 CORS）、可选部署、对前端透明、响应速度快。

## 2.2 核心技术栈选型

选型原则：轻量、易用、稳定、生态完善，贴合"本地优先 + 备份代理"的产品定位，避免冗余依赖。

| 技术类别    | 选型                            | 选型理由                                                                               |
| ----------- | ------------------------------- | -------------------------------------------------------------------------------------- |
| 前端框架    | Vue 3 + Vite                    | Vue 3 轻量、响应式，适合 SPA 开发；Vite 构建速度快，优化开发体验，打包体积小           |
| 样式框架    | Tailwind CSS（darkMode: class） | 原子化 CSS，开发高效，适配响应式设计；`darkMode: 'class'` 支持亮暗模式切换             |
| 本地存储    | IndexedDB + localForage         | IndexedDB 容量大、支持复杂查询，适合存储大量记录；localForage 封装 IndexedDB，简化操作 |
| 加密工具    | Web Crypto API                  | 浏览器原生支持 AES-256-GCM 和 PBKDF2，无需第三方依赖，安全性和性能优于 crypto-js       |
| WebDAV 交互 | 备份代理服务（可插拔实现）      | 通过同源代理完成 WebDAV 协议交互，规避 CORS；可选择 Node.js/Go/Java/Edge 等实现        |
| 打包部署    | Vite 打包 + 静态部署            | 打包速度快，静态资源可部署至任意静态平台；备份代理按需部署                             |
| 测试工具    | Vitest + Cypress                | Vitest 用于单元测试，Cypress 用于端到端测试，确保功能稳定                              |

# 三、核心模块技术实现

按 PRD 功能优先级，分模块实现，每个模块明确核心逻辑、技术方案、异常处理，确保功能符合需求。

## 3.1 基础环境搭建

### 3.1.1 项目初始化

```bash
# 初始化 Vue 3 + Vite 项目
pnpm create vite@latest snapkeep -- --template vue
cd snapkeep
cd frontend
pnpm install

# 安装核心依赖
pnpm install localforage tailwindcss postcss autoprefixer
pnpm install -D vitest cypress @vitejs/plugin-vue

# 备份代理服务依赖按选型另行安装（Node.js/Go/Java/Edge）
```

### 3.1.2 项目目录结构

```plaintext
snapkeep/
├── frontend/         # 前端项目
│   ├── public/       # 静态资源（图标、空状态插画等）
│   ├── src/
│   │   ├── assets/   # 样式、图片等资源
│   │   │   └── styles/   # 设计 tokens 与基础样式
│   │   ├── components/   # 公共组件（卡片、输入框、弹窗等）
│   │   │   └── index.js  # 组件统一出口
│   │   ├── composables/  # Vue 组合式函数（分页、存储监控等）
│   │   │   └── index.js  # composables 统一出口
│   │   ├── constants/    # 常量（版本、默认值、存储键）
│   │   │   └── index.js  # 常量统一出口
│   │   ├── core/     # 核心模块
│   │   │   ├── db/       # IndexedDB 操作封装
│   │   │   ├── encrypt/  # 加密/解密工具（Web Crypto API）
│   │   │   ├── search/   # 搜索功能封装
│   │   │   ├── export/   # 本地导出/导入工具
│   │   │   └── theme/    # 亮暗模式管理
│   │   │   └── webdav/   # WebDAV 交互封装
│   │   ├── views/        # 页面组件（主页面、设置面板、编辑弹窗）
│   │   ├── utils/        # 工具函数（时间格式化等）
│   │   ├── App.vue       # 根组件
│   │   ├── main.js       # 入口文件
│   │   └── style.css     # 全局样式（含 Tailwind 暗色变量）
│   ├── vite.config.js    # Vite 配置
│   ├── tailwind.config.js# Tailwind 配置（含 darkMode: 'class'）
│   └── package.json      # 依赖配置
├── services/backup-proxy/node/   # 备份代理服务（Node.js）
├── doc/              # 文档
└── CHANGELOG.md
```

备份代理服务可独立部署（单仓库或独立仓库均可），不影响前端静态资源部署。

### 3.1.3 前端规范与边界

前端规范与依赖边界以仓库内文档为准：
1. `frontend/README.md`（开发脚本与依赖边界）
2. `frontend/src/components/README.md`（组件规范）
3. `frontend/src/composables/README.md`（组合式规范）
4. `frontend/src/utils/README.md`（工具函数规范）
5. `frontend/src/constants/README.md`（常量规范）
6. `frontend/src/core/README.md`（核心模块边界）

## 3.2 数据存储模块（核心）

核心需求：本地持久化存储记录、配置信息，支持增删改查与分页，确保数据安全，基于 IndexedDB 实现，通过 localForage 简化操作。

### 3.2.1 存储设计

创建 1 个数据库（SnapKeepDB），2 个对象仓库（表），分别存储记录和配置信息：

1. 数据库信息：
    - 数据库名：SnapKeepDB
    - 版本号：1

2. 笔记对象仓库（notes）：

| 字段名    | 类型           | 说明                           | 约束               |
| --------- | -------------- | ------------------------------ | ------------------ |
| id        | String         | 记录唯一标识，采用 UUID 生成   | 主键，非空，唯一   |
| title     | String         | 记录标题，自动提取内容前 20 字 | 非空，默认"无标题" |
| content   | String         | 记录核心内容，支持长文本、代码 | 非空，上限 100KB   |
| tags      | Array\<String> | 标签列表，用户录入             | 可选，默认空数组   |
| createdAt | Number         | 创建时间戳（毫秒）             | 非空               |
| updatedAt | Number         | 更新时间戳（毫秒）             | 非空               |

3. 配置对象仓库（settings）：

| 字段名    | 类型   | 说明                     | 约束             |
| --------- | ------ | ------------------------ | ---------------- |
| key       | String | 配置键                   | 主键，非空，唯一 |
| value     | Any    | 配置值（对象、字符串等） | 非空             |
| updatedAt | Number | 更新时间戳（毫秒）       | 非空             |

预置配置键：

| key              | value 类型 | 说明                                                 |
| ---------------- | ---------- | ---------------------------------------------------- |
| backupConfigMeta | Object     | 备份配置元信息（提供方、服务器、用户名、是否已配置） |
| themePreference  | String     | 主题偏好：`system` / `light` / `dark`                |
| lastBackupTime   | Number     | 上次备份时间戳                                       |

说明：WebDAV 凭据由备份代理服务端加密保存，前端仅保留配置元信息与状态。

### 3.2.2 封装 IndexedDB 操作

基于 localForage 封装 db.js，提供统一的增删改查与分页接口：

```javascript
// src/core/db/db.js
import localForage from 'localforage';

const db = localForage.createInstance({ name: 'SnapKeepDB', storeName: 'notes', version: 1 });
const settingsDb = localForage.createInstance({ name: 'SnapKeepDB', storeName: 'settings', version: 1 });

export const noteDb = {
  async addNote(note) {
    const defaultNote = {
      id: crypto.randomUUID(),
      title: '无标题',
      content: '',
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...note
    };
    if (defaultNote.content && defaultNote.title === '无标题') {
      defaultNote.title = defaultNote.content.slice(0, 20);
    }
    // 内容上限 100KB
    if (new Blob([defaultNote.content]).size > 100 * 1024) {
      throw new Error('单条记录内容超过 100KB 上限');
    }
    return await db.setItem(defaultNote.id, defaultNote);
  },

  async getAllNotes() {
    const notes = [];
    await db.iterate(value => notes.push(value));
    return notes.sort((a, b) => b.createdAt - a.createdAt);
  },

  // 分页获取（每页 pageSize 条）
  async getNotesPage(page = 1, pageSize = 50) {
    const allNotes = await this.getAllNotes();
    const start = (page - 1) * pageSize;
    return {
      notes: allNotes.slice(start, start + pageSize),
      total: allNotes.length,
      hasMore: start + pageSize < allNotes.length
    };
  },

  async getNoteById(id) { return await db.getItem(id); },

  async updateNote(id, note) {
    const oldNote = await db.getItem(id);
    if (!oldNote) throw new Error('记录不存在');
    const updatedNote = { ...oldNote, ...note, updatedAt: Date.now() };
    return await db.setItem(id, updatedNote);
  },

  async deleteNote(id) { return await db.removeItem(id); },

  async getNoteCount() {
    return await db.length();
  },

  async clearAll() { return await db.clear(); }
};

export { settingsDb };

// 配置操作封装
export const settingsOps = {
  async get(key) { return await settingsDb.getItem(key); },
  async set(key, value) {
    return await settingsDb.setItem(key, { value, updatedAt: Date.now() });
  }
};
```

## 3.3 记录录入与管理模块

### 3.3.1 核心逻辑

用户输入/粘贴内容 → 自动提取标题 → 录入标签 → Ctrl/Cmd+Enter 保存至 IndexedDB → 实时更新列表；支持编辑、删除、复制操作，操作后同步更新本地存储。

### 3.3.2 关键实现

1. 自动聚焦输入框 + Ctrl/Cmd+Enter 保存：

```html
<!-- src/views/MainView.vue 核心片段 -->
<template>
  <div class="input-container">
    <textarea
      v-model="content"
      ref="contentInput"
      placeholder="粘贴灵感碎片，添加标签，Ctrl/Cmd+Enter 保存"
      @keydown.ctrl.enter="saveNote"
      @keydown.meta.enter="saveNote"
    ></textarea>
    <input v-model="tagsInput" placeholder="标签（空格/逗号分隔）">
    <button @click="saveNote">
      保存 <span class="text-xs opacity-60">Ctrl+Enter</span>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { noteDb } from '@/core/db/db';

const contentInput = ref(null);
const content = ref('');
const tagsInput = ref('');
const emit = defineEmits(['refreshNoteList']);

onMounted(() => contentInput.value?.focus());

const saveNote = async () => {
  if (!content.value.trim()) { alert('请输入内容'); return; }
  const tags = tagsInput.value
    .split(/[ ,，]/)
    .filter(tag => tag.trim())
    .map(tag => tag.trim());
  await noteDb.addNote({ content: content.value, tags });
  content.value = '';
  tagsInput.value = '';
  contentInput.value?.focus();
  emit('refreshNoteList');
};
</script>
```

2. 一键复制：通过 navigator.clipboard API 实现：

```javascript
const copyContent = async (content) => {
  try {
    await navigator.clipboard.writeText(content);
    // 显示 2 秒成功提示后自动消失
  } catch (err) {
    // 显示错误提示并提供重试
  }
};
```

3. 编辑/删除：通过弹窗获取用户输入，调用 noteDb 的 updateNote/deleteNote 接口，删除前添加二次确认。编辑弹窗 PC 端宽度 600px，移动端全屏展示。

## 3.4 全局搜索模块

### 3.4.1 核心逻辑

用户输入关键词 → 实时检索 IndexedDB 中的记录 → 匹配内容或标签中的关键词 → 高亮匹配结果 → 展示筛选后的列表 + 匹配条数；支持模糊匹配、不区分大小写。

### 3.4.2 关键实现

```javascript
// src/core/search/search.js
export const searchNotes = (notes, keyword) => {
  if (!keyword.trim()) return notes;
  const lowerKeyword = keyword.toLowerCase();
  return notes.filter(note =>
    note.content.toLowerCase().includes(lowerKeyword) ||
    note.tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
  );
};

// 高亮匹配关键词（XSS 安全：先转义 HTML，再插入高亮标签）
export const highlightKeyword = (text, keyword) => {
  if (!keyword.trim()) return text;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};
```

## 3.5 WebDAV 备份与恢复模块

### 3.5.1 核心逻辑

1. WebDAV 配置：用户输入服务器地址、用户名、密码，由备份代理服务加密保存；前端仅保存配置状态；

2. 连接测试：前端调用统一接口 `/api/backup/test`，备份代理完成 WebDAV 连接测试并返回结果；

3. 一键备份：获取本地所有记录 → 生成备份 JSON → 用户密码加密 → 调用 `/api/backup/put`，代理服务流式上传至 WebDAV，文件名：`snapkeep-backup-YYYYMMDDHHMMSS.encrypted`；

4. 一键恢复：调用 `/api/backup/list` 获取备份列表 → 选择文件 → 调用 `/api/backup/get` 下载 → 解密 → 写入临时区 → 验证完整性 → 替换正式数据；

5. **兼容性说明**：通过同源备份代理规避 CORS；若代理不可用，降级引导用户使用本地导出/导入（FR-007）。

### 3.5.2 关键实现

1. 统一接口定义（前端只依赖 `/api/backup/*`）：

| 接口                 | 方法 | 说明                               |
| -------------------- | ---- | ---------------------------------- |
| `/api/backup/config` | POST | 保存 WebDAV 配置（代理端加密保存） |
| `/api/backup/test`   | POST | 连接测试                           |
| `/api/backup/list`   | POST | 列出备份文件                       |
| `/api/backup/put`    | POST | 上传备份文件（流式转发）           |
| `/api/backup/get`    | POST | 下载备份文件（流式转发）           |

2. 前端调用示例（统一 API 客户端）：

```javascript
// src/core/backup/api.js（示意）
export const backupApi = {
  async test(config) {
    return await fetch('/api/backup/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
  },
  async list() {
    return await fetch('/api/backup/list', { method: 'POST' });
  },
  async put(payload) {
    return await fetch('/api/backup/put', { method: 'POST', body: payload });
  },
  async get(fileName) {
    return await fetch('/api/backup/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName })
    });
  }
};
```

3. 代理服务职责边界：
   - 目标地址校验（协议、端口、内网/回环限制，防 SSRF）
   - WebDAV 认证与协议交互（PROPFIND/PUT/GET）
   - 流式转发与错误规范化
   - 凭据加密存储与日志脱敏
    // 记录备份时间
    await settingsOps.set('lastBackupTime', Date.now());
    return { success: true, message: '备份成功' };
  } catch (err) {
    return { success: false, message: `备份失败：${err.message}` };
  }
};

export const restoreFromWebDav = async (fileName, userPassword) => {
  try {
    const config = await getWebDavConfig(userPassword);
    if (!config) throw new Error('未配置 WebDAV');
    const client = createClient(config.server, {
      username: config.username,
      password: config.password
    });
    const encryptedData = await client.getFileContents(`/${fileName}`, { format: 'text' });
    const backupData = JSON.parse(await decrypt(encryptedData, userPassword));

    // 版本兼容性检查（支持向后兼容）
    if (!backupData.version || !backupData.notes) {
      throw new Error('备份文件格式无效');
    }

    // 原子恢复：先写入临时区验证，再替换正式数据
    const tempDb = localForage.createInstance({ name: 'SnapKeepDB_temp', storeName: 'notes' });
    for (const note of backupData.notes) {
      await tempDb.setItem(note.id, note);
    }
    // 验证写入完整性
    const tempCount = await tempDb.length();
    if (tempCount !== backupData.notes.length) {
      await tempDb.dropInstance();
      throw new Error('数据完整性验证失败');
    }
    // 替换正式数据
    await noteDb.clearAll();
    for (const note of backupData.notes) {
      await noteDb.addNote(note);
    }
    await tempDb.dropInstance();
    return { success: true, message: '恢复成功' };
  } catch (err) {
    return { success: false, message: `恢复失败：${err.message}` };
  }
};
```

## 3.6 加密模块

核心需求：WebDAV 备份文件加密（前端）与凭据加密存储（代理端），采用 AES-256-GCM 对称加密，密钥由**用户设置的密码**通过 PBKDF2 派生，确保数据安全。

### 3.6.1 加密方案

1. **实现方式**：Web Crypto API（浏览器原生），不使用 crypto-js（其 AES-GCM 支持不完整）；

2. 加密算法：AES-256-GCM（行业标准，支持加密后验证完整性）；

3. 密钥生成：PBKDF2 算法，由用户密码 + 随机 salt 派生，密钥长度 256 位，迭代 100000 次；

4. **无默认密钥**：加密密码必须由用户主动设置，不硬编码任何默认值；

5. 加密流程：明文 → 生成随机 salt（16 字节）→ PBKDF2 派生密钥 → 生成随机 IV（12 字节）→ AES-GCM 加密 → 拼接 salt + IV + 密文 → Base64 输出；

6. 解密流程：Base64 解码 → 拆分 salt + IV + 密文 → PBKDF2 派生密钥 → AES-GCM 解密验证 → 输出明文。

### 3.6.2 关键实现

```javascript
// src/core/encrypt/encrypt.js（Web Crypto API 实现）

const PBKDF2_ITERATIONS = 100000;

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(plaintext, password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  // 拼接 salt(16) + iv(12) + ciphertext
  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(encrypted), salt.length + iv.length);
  return btoa(String.fromCharCode(...result));
}

export async function decrypt(ciphertext, password) {
  try {
    const data = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const salt = data.slice(0, 16);
    const iv = data.slice(16, 28);
    const encrypted = data.slice(28);
    const key = await deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    throw new Error('解密失败，密码错误或文件损坏');
  }
}
```

## 3.7 响应式适配模块

核心需求：适配 PC、手机、平板等不同尺寸设备，支持亮暗模式，确保操作流畅、界面美观。

### 3.7.1 关键实现

1. Tailwind 配置（含暗色模式和响应式断点）：

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class', // 通过 <html class="dark"> 切换暗色模式
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    screens: {
      sm: '375px',    // 手机
      md: '768px',    // 平板竖屏
      lg: '1024px',   // 平板横屏/PC 小屏
      xl: '1440px'    // PC 大屏
    },
    extend: {}
  }
};
```

2. 页面布局适配：

```html
<!-- 响应式输入框 -->
<textarea
  class="w-full md:w-3/4 lg:w-1/2 p-2 md:p-3 text-sm md:text-base
         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
         border border-gray-300 dark:border-gray-600"
  placeholder="粘贴灵感碎片..."
></textarea>

<!-- 响应式卡片列表 -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <NoteCard v-for="note in notes" :key="note.id" :note="note" />
</div>
```

3. 移动端交互优化：调整按钮大小、输入框高度，确保触摸操作流畅；编辑弹窗移动端全屏展示。

## 3.8 本地导出/导入模块

核心需求（对应 PRD FR-007）：用户可将本地全部记录导出为 JSON 文件下载，或选择 JSON 文件导入恢复，作为 WebDAV 备份的备选通道。导出文件为明文 JSON（不加密）。

### 3.8.1 核心逻辑

1. 一键导出：获取全部记录 → JSON 序列化 → 创建 Blob → 触发浏览器下载，文件名 `snapkeep-export-YYYYMMDD.json`；
2. 一键导入：用户选择文件 → FileReader 读取 → JSON 解析 → 格式校验（检查 notes 数组结构）→ 二次确认 → 清空本地 → 批量写入 → 刷新列表。

### 3.8.2 关键实现

```javascript
// src/core/export/export.js
import { noteDb } from '@/core/db/db';

export const exportToJSON = async () => {
  const notes = await noteDb.getAllNotes();
  const exportData = {
    version: '0.1.0-alpha.1',
    exportTime: Date.now(),
    count: notes.length,
    notes
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = new Date();
  const dateStr = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('');
  const a = document.createElement('a');
  a.href = url;
  a.download = `snapkeep-export-${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const importFromJSON = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        // 格式校验
        if (!data.notes || !Array.isArray(data.notes)) {
          throw new Error('文件格式无效：缺少 notes 数组');
        }
        for (const note of data.notes) {
          if (!note.id || !note.content) {
            throw new Error('文件格式无效：记录缺少必要字段');
          }
        }
        // 清空本地并批量写入
        await noteDb.clearAll();
        for (const note of data.notes) {
          await noteDb.addNote(note);
        }
        resolve({ success: true, message: `导入成功，共 ${data.notes.length} 条记录` });
      } catch (err) {
        reject(new Error(`导入失败：${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
};
```

## 3.9 亮色/暗色模式模块

核心需求（对应 PRD FR-008）：支持跟随系统（默认）、手动亮色、手动暗色三种模式，偏好本地持久化，暗色模式下所有元素统一适配。

### 3.9.1 核心逻辑

通过 Tailwind `darkMode: 'class'` 实现，在 `<html>` 根元素上切换 `dark` class 控制全局主题。用户偏好存入 IndexedDB settings 仓库 `themePreference` 键。

### 3.9.2 关键实现

```javascript
// src/core/theme/theme.js
import { settingsOps } from '@/core/db/db';

const THEME_KEY = 'themePreference';
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme(isDark) {
  document.documentElement.classList.toggle('dark', isDark);
}

export async function initTheme() {
  const setting = await settingsOps.get(THEME_KEY);
  const mode = setting?.value || 'system';

  if (mode === 'system') {
    applyTheme(mediaQuery.matches);
    mediaQuery.addEventListener('change', (e) => applyTheme(e.matches));
  } else {
    applyTheme(mode === 'dark');
  }
  return mode;
}

export async function setTheme(mode) {
  await settingsOps.set(THEME_KEY, mode);

  // 移除之前的系统监听
  mediaQuery.removeEventListener('change', applyTheme);

  if (mode === 'system') {
    applyTheme(mediaQuery.matches);
    mediaQuery.addEventListener('change', (e) => applyTheme(e.matches));
  } else {
    applyTheme(mode === 'dark');
  }
}

// 三态循环切换：system → light → dark → system
export async function toggleTheme() {
  const setting = await settingsOps.get(THEME_KEY);
  const current = setting?.value || 'system';
  const next = current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
  await setTheme(next);
  return next;
}
```

入口文件初始化：

```javascript
// src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import { initTheme } from '@/core/theme/theme';
import './style.css';

initTheme(); // 页面加载时立即应用主题，避免闪屏
createApp(App).mount('#app');
```

## 3.10 列表分页加载模块

核心需求（对应 PRD FR-003 / AC-010）：记录列表每页 50 条，滚动触底自动加载下一页，减少大量记录时的渲染压力。

### 3.10.1 关键实现

```javascript
// src/composables/usePagination.js
import { ref } from 'vue';
import { noteDb } from '@/core/db/db';

export function usePagination(pageSize = 50) {
  const notes = ref([]);
  const page = ref(1);
  const hasMore = ref(true);
  const loading = ref(false);

  const loadPage = async () => {
    if (loading.value || !hasMore.value) return;
    loading.value = true;
    const result = await noteDb.getNotesPage(page.value, pageSize);
    notes.value.push(...result.notes);
    hasMore.value = result.hasMore;
    page.value++;
    loading.value = false;
  };

  const reset = async () => {
    notes.value = [];
    page.value = 1;
    hasMore.value = true;
    await loadPage();
  };

  return { notes, hasMore, loading, loadPage, reset };
}
```

列表组件中使用 Intersection Observer 监测触底：

```html
<template>
  <div>
    <NoteCard v-for="note in notes" :key="note.id" :note="note" />
    <div ref="sentinel" v-show="hasMore" class="h-4"></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { usePagination } from '@/composables/usePagination';

const { notes, hasMore, loadPage, reset } = usePagination();
const sentinel = ref(null);

onMounted(async () => {
  await reset();
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) loadPage();
  });
  if (sentinel.value) observer.observe(sentinel.value);
});
</script>
```

## 3.11 存储监控模块

核心需求（对应 PRD FR-011 / 业务规则第 11 条）：展示本地记录总条数和已用存储量，接近 50MB 阈值时触发提醒。

### 3.11.1 关键实现

```javascript
// src/composables/useStorageMonitor.js
import { ref } from 'vue';
import { noteDb, settingsOps } from '@/core/db/db';

const WARN_THRESHOLD = 50 * 1024 * 1024; // 50MB

export function useStorageMonitor() {
  const noteCount = ref(0);
  const usedBytes = ref(0);
  const lastBackupTime = ref(null);
  const storageWarning = ref(false);

  const refresh = async () => {
    noteCount.value = await noteDb.getNoteCount();

    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      usedBytes.value = estimate.usage || 0;
      storageWarning.value = usedBytes.value >= WARN_THRESHOLD;
    }

    const setting = await settingsOps.get('lastBackupTime');
    lastBackupTime.value = setting?.value || null;
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return { noteCount, usedBytes, lastBackupTime, storageWarning, refresh, formatBytes };
}
```

# 四、私有化部署方案

v0.1.0-alpha.1 前端为纯静态页面，支持多种静态平台部署；若启用 WebDAV 备份，则需额外部署备份代理服务并与前端同源或由反向代理统一域名。

## 4.1 打包配置

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    sourcemap: false
  }
});
```

## 4.2 打包命令

```bash
cd frontend
pnpm install
pnpm run build
```

打包完成后，生成 `frontend/dist` 文件夹，包含所有静态资源（HTML、CSS、JS、图片等）。

## 4.3 主流部署方式

### 4.3.1 GitHub Pages 部署（推荐，免费）

1. 创建 GitHub 仓库（公开/私有均可）；
2. 将 `frontend/dist` 文件夹中的所有文件，上传至 GitHub 仓库根目录；
3. 进入仓库 Settings → Pages → 选择部署分支（如 main），根目录，点击 Save；
4. 等待 1-5 分钟，即可通过 `https://用户名.github.io/仓库名` 访问。

### 4.3.2 Vercel 部署（免费，简单）

1. 注册 Vercel 账号（关联 GitHub）；
2. 点击 New Project → Import Git Repository → 选择 SnapKeep 仓库；
3. Root Directory 选择 `frontend`，Vercel 自动识别 Vue 项目；
4. 点击 Deploy；
4. 部署完成后，获取 Vercel 提供的免费域名，即可访问。

### 4.3.3 Nginx 部署（本地/自有服务器）

1. 安装 Nginx 服务器；
2. 将 `frontend/dist` 文件夹复制至 Nginx 的 html 目录（如 `/usr/share/nginx/html/snapkeep`）；
3. 修改 Nginx 配置文件：

```nginx
server {
  listen 80;
  server_name localhost;

  location /snapkeep {
    root /usr/share/nginx/html;
    index index.html;
    try_files $uri $uri/ /snapkeep/index.html;
  }
}
```

4. 重启 Nginx：`systemctl restart nginx`；
5. 通过 `http://服务器IP/snapkeep` 访问。

## 4.4 部署注意事项

1. 打包时确保 base 配置为 `'./'`，避免静态资源路径错误；
2. 部署后若出现页面空白，检查静态资源路径是否正确，SPA 路由是否配置；
3. 自有服务器部署需开放对应端口（如 80、443），确保网络可访问；
4. 启用备份代理服务时，确保与前端同源或通过反向代理统一域名，避免跨域问题。

# 五、测试方案

确保产品功能稳定、体验流畅、兼容性良好，分为单元测试、端到端测试、兼容性测试。

## 5.1 单元测试

使用 Jest 测试核心工具函数、数据操作、加密/解密等模块：

```javascript
// 加密/解密单元测试
import { encrypt, decrypt } from '@/core/encrypt/encrypt';

test('AES-256-GCM 加密解密功能正常', async () => {
  const plaintext = 'test content 测试内容';
  const password = 'userPassword123';
  const encrypted = await encrypt(plaintext, password);
  const decrypted = await decrypt(encrypted, password);
  expect(decrypted).toBe(plaintext);
});

test('错误密码解密应抛出异常', async () => {
  const encrypted = await encrypt('secret', 'correctPassword');
  await expect(decrypt(encrypted, 'wrongPassword')).rejects.toThrow();
});
```

```javascript
// 导出/导入单元测试
import { noteDb } from '@/core/db/db';
import { importFromJSON } from '@/core/export/export';

test('导入非法 JSON 应拒绝', async () => {
  const invalidFile = new Blob(['not json'], { type: 'application/json' });
  await expect(importFromJSON(invalidFile)).rejects.toThrow();
});
```

## 5.2 端到端测试

使用 Cypress 测试完整用户流程，覆盖核心功能：

1. 记录录入（Ctrl/Cmd+Enter 保存）、编辑、删除；
2. 全局搜索功能；
3. WebDAV 配置、连接测试、备份/恢复；
4. 本地 JSON 导出/导入；
5. 亮暗模式切换（system / light / dark 三态循环）；
6. 响应式适配（不同设备尺寸）；
7. 列表分页加载（50 条触底加载）。

## 5.3 兼容性测试

| 终端类型   | 测试范围                                               | 测试重点                                              |
| ---------- | ------------------------------------------------------ | ----------------------------------------------------- |
| PC 浏览器  | Chrome ≥ 80、Edge ≥ 80、Firefox ≥ 78、Safari ≥ 14      | 功能完整性、搜索流畅度、暗色模式渲染、Web Crypto 兼容 |
| 手机浏览器 | 微信浏览器、QQ浏览器、Safari（iOS）、Chrome（Android） | 响应式适配、触摸操作、输入流畅度、暗色模式            |
| 部署平台   | GitHub Pages、Vercel、Nginx                            | 页面加载、资源访问、路由跳转                          |

## 5.4 性能测试

1. 页面加载时间：≤ 1 秒（gzip 后）；
2. 操作响应时间：保存、删除、搜索 ≤ 200ms；
3. 存储性能：支持 1000 条以上记录，保持流畅运行；
4. 列表滚动帧率：≥ 30fps。

# 六、风险与应对方案

| 编号 | 风险                                             | 概率  | 影响  |  等级  | 技术应对方案                                                | 降级方案                              |
| ---- | ------------------------------------------------ | :---: | :---: | :----: | ----------------------------------------------------------- | ------------------------------------- |
| R-01 | 备份代理服务不可用或配置错误导致 WebDAV 备份失败 |  中   |  高   | **高** | 提供健康检查、部署指南与配置校验；前端提示降级路径          | 本地 JSON 导出/导入（FR-007）作为保底 |
| R-02 | 用户不会配置 WebDAV                              |  高   |  中   | **高** | 设置面板预置坚果云、阿里云盘配置模板                        | 引导使用本地导出/导入                 |
| R-03 | 浏览器数据被清理导致记录丢失                     |  中   |  高   | **高** | 记录数 > 10 时触发备份提醒；设置面板展示上次备份时间        | 定期提醒"N 条记录未备份"              |
| R-04 | 加密密码丢失导致备份无法解密                     |  中   |  高   | **高** | 密码由用户主动设置（无默认值），UI 明确提示"请牢记密码"     | 本地导出为明文 JSON，始终可用         |
| R-05 | 用户误删数据                                     |  中   |  中   | **中** | 删除/恢复/导入操作均设二次确认弹窗                          | —                                     |
| R-06 | 私有化部署失败                                   |  中   |  低   | **中** | 提供分平台部署文档 + 常见问题排查                           | —                                     |
| R-07 | 浏览器存储配额限制                               |  低   |  中   | **中** | `navigator.storage.estimate()` 监控用量；接近 50MB 弹出提醒 | 引导导出后清理旧记录                  |
| R-08 | 备份/恢复中断（关闭页面/网络异常）               |  低   |  中   | **中** | 恢复采用"临时区写入→验证→替换"原子策略；操作中禁止关闭      | 中断后本地数据不变，可重试            |
| R-09 | 备份文件版本不兼容                               |  低   |  中   | **低** | 备份文件携带 version 字段；恢复时检测版本并执行迁移函数     | 不兼容时提示用户并阻止恢复            |
| R-10 | IndexedDB 兼容性（老旧浏览器）                   |  低   |  中   | **低** | 适配 Chrome ≥ 80 等主流浏览器；页面添加不兼容提示           | localStorage 紧急降级方案             |
