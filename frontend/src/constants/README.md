# Constants 规范

目标：集中管理跨模块常量，避免硬编码与重复定义。

原则

1. 按语义分类到独立文件，例如 `version.js`、`storageKeys.js`。
2. 仅导出常量，不包含业务逻辑。
3. 统一通过 `index.js` 暴露对外出口。
