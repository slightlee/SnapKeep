# SnapKeep 前端

定位
1. 前端为单页面应用，负责本地记录管理与 WebDAV 备份入口。
2. 业务逻辑优先沉淀到 `src/composables/` 与 `src/core/`，视图保持轻量。

开发环境
1. Node.js 18+
2. pnpm 8+

本地启动
```bash
cd frontend
pnpm install
pnpm dev
```

常用脚本
1. `pnpm run dev` 启动开发服务器
2. `pnpm run build` 构建生产包
3. `pnpm run preview` 预览构建产物
4. `pnpm run lint` 代码规范检查
5. `pnpm run format` 代码格式化

目录规范
1. 组件规范：`src/components/README.md`
2. 组合式规范：`src/composables/README.md`
3. 工具函数规范：`src/utils/README.md`
4. 常量规范：`src/constants/README.md`
5. 核心模块规范：`src/core/README.md`

依赖边界
1. `views` 依赖 `components`、`composables`、`core`、`utils`、`constants`
2. `composables` 依赖 `core`、`utils`、`constants`
3. `components` 不依赖 `core`，仅通过 `props`/`emit` 交互
