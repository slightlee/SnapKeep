# Git 提交规范

目标：统一提交历史，便于检索、回溯和发布。

## 1. 格式

统一使用：

```text
<type>(<scope>): <summary>
```

约束：
- `type` 使用小写英文。
- `scope` 使用小写英文或 kebab-case，优先使用模块名或领域名。
- `summary` 可用中文，要求单一、明确、无句号。
- 全局性变更可省略 `scope`。

示例：

```text
feat(settings): 调整设置面板布局顺序
fix(backup): 修复 WebDAV 恢复时的空响应处理
docs(release): 补充版本与发布流程规范
chore(version): bump to 0.1.0-alpha.2
```

## 2. Type

- `feat`：新增功能
- `fix`：缺陷修复
- `docs`：文档变更
- `refactor`：重构，不改变外部行为
- `perf`：性能优化
- `style`：样式或格式调整，不改变业务行为
- `test`：测试变更
- `build`：构建与依赖变更
- `ci`：CI/CD 变更
- `chore`：杂项维护

## 3. Scope

要求：
- 使用稳定的模块名或领域名。
- 不使用中文、组件文件名或临时描述。

推荐：
- `settings`
- `backup`
- `webdav`
- `notes`
- `search`
- `theme`
- `deploy`
- `version`
- `frontend`
- `backend`

不推荐：
- `设置面板`
- `InputSection`
- `功能优化`

## 4. 拆分原则

- 一个 commit 只表达一个变更意图。
- 功能、样式、文档、版本切换分开提交。
- 可独立回滚的内容优先独立提交。

## 5. Body

正文可选。以下情况建议补充：
- 变更原因不直观
- 存在兼容性影响
- 需要说明迁移或取舍

示例：

```text
refactor(settings): 拆分备份配置与数据操作区域

将高频操作前置，降低首次使用时的理解成本。
不涉及功能增删，仅调整信息架构。
```

## 6. 与版本发布的关系

- 不是每个 commit 都打 tag。
- tag 只用于版本里程碑。
- 多个 commit 组成一个版本，tag 打在该版本落点提交上。
- 版本切换提交统一使用：

```text
chore(version): bump to 0.1.0-alpha.2
```

## 7. 禁止项

- 一个标题描述多个独立变更
- 使用模糊表述，如“优化一下”“修复一些问题”
- 将样式调整标记为 `feat`
- 中英混用或随意变动 `scope`
