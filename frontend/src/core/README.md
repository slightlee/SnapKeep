# Core 规范

定位

1. `core` 负责“数据与外部交互”的实现层（IndexedDB、WebDAV、加密等）。
2. 保持框架无关，避免直接操作 DOM 或组件。

边界原则

1. `core` 不依赖 `components`、`views`、`composables`。
2. `core` 可以依赖 `utils` 与 `constants`。
3. 任何副作用（网络/存储）必须封装在 `core` 内部，视图层只调用 API。

目录职责

1. `core/db` 本地数据读写与封装
2. `core/webdav` WebDAV 备份交互
3. `core/encrypt` 加密/解密
4. `core/export` 本地导出辅助
5. `core/search` 搜索逻辑
6. `core/theme` 主题偏好处理

约束

1. API 设计优先简单明确，不预埋未使用参数（YAGNI）。
2. 同类能力尽量统一输出结构，避免重复逻辑（DRY）。
