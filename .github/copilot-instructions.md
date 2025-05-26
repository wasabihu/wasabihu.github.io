# Copilot 项目指导规则 v2.0

> **目标**：让 Copilot 在本仓库生成的代码天然符合团队统一的风格、结构、质量与合规要求。  
> **覆盖**：前端 React / Next.js（ES2022）、Node.js、Jest 测试脚本、Markdown 文档。

## 1. 基本规范
- **中文注释与文档**：所有代码注释、README、内联说明均使用简体中文（接口字段保持英文原文）。
- **语义化命名**：变量、函数、文件名须能一眼读懂其用途；避免无意义缩写（如 `tmp` 、`obj`）。
- **代码简洁**：按需实现功能，拒绝过度设计与死代码。
- **统一格式**：使用 Prettier；CI 执行 `prettier --check .`；IDE 保存自动格式化。


## 2. 目录与模块
- `components/` 复用型 UI 组件  
  - 每个组件一个文件夹：`index.tsx` + `style.module.css` + `types.ts`
- `pages/` 路由页面（Next.js 约定）
- `utils/` 纯工具函数（无 React 依赖；单测覆盖 ≥ 90%）
- `hooks/` 自定义 Hook，文件名 `useXxx.ts`
- `services/` 接口封装（Axios 重试/超时；独立 error 处理中间件）
- `assets/` 静态资源（图片 WebP；>300 KB 需压缩）
- `types/` 全局 TypeScript 类型（业务枚举、通用响应等）


## 3. 代码风格
- **ES2022**：禁止 `var`；用 `const / let`；默认 strict 模式。
- **早返回**：优先使用早返回，避免深层嵌套。
- **错误处理**：统一抛出 `AppError` （含 `code` 字段），UI 层捕获后 toast/dialog。
- **严格类型**：开启 `--strict`；禁止 `any` （必要时 TODO）。
- **命名规范**
  - 变量 / 函数：`camelCase`
  - 组件 / 类：`PascalCase`
  - 常量：`UPPER_SNAKE_CASE`
  - CSS 类：`kebab-case`


## 4. 注释与文档
- 组件顶部 JSDoc：一句话功能说明 + Props 描述 + 使用示例链接
- 复杂算法：关键步骤行内注释，可附参考链接
- API 封装：注明后端接口文档 URL、参数、返回值
- TODO 格式：`// TODO(owner): 描述`

## 5. Git 提交规范（Conventional Commits）
```

feat:      ✨ 新功能
fix:       🐛 修复 Bug
docs:      📝 仅文档变更
style:     🎨 格式（无逻辑修改）
refactor:  ♻️  代码重构
test:      ✅ 测试相关
chore:     🔧 构建/依赖/脚手架
perf:      ⚡ 性能优化

```
- 描述 ≤ 72 字；必要时加 `BREAKING CHANGE:` 或 `Closes #issue`。

## 6. 性能守则
- 列表渲染加 `key`；大列表使用虚拟滚动。
- 重计算逻辑包裹 `useMemo`；事件包裹 `useCallback`。
- 图片自动压缩，SVG 优先；动态 import 拆包。


## 7. 安全与隐私
- 密钥 / Token 禁止入库。
- 统一 axios 拦截器附 Auth header。
- 前后端双重校验用户输入。
- 面向用户的错误信息去除调用栈。


## 8. 提交前检查
1. `npm run lint` 无错误  
2. `npm run test` 全绿，覆盖率 ≥ 80%  
3. 无 `console.log` / `debugger`  
4. `npm run build` 通过，无 TS error  
5. PR 至少 1 名 Reviewer 通过

---

## 9. 测试准则
- **单元测试**：每个导出函数/组件 ≥ 2 条 Jest 用例（正常 + 异常）。
- **集成测试**：关键业务流用 Playwright / Cypress。
- **Mock**：使用 `msw`；测试禁直连线上接口。
- **Snapshot**：仅对稳定小片段使用。

---

## 10. Copilot 指令（`.github/copilot-instructions.md`）
- 生成代码时遵循本规则：命名、早返回、`AppError`。
- 生成 React 组件：自动附带 JSDoc 注释，默认导出。
- 生成函数：附带 ≥ 2 条 Jest 示例。
- 禁止使用 `var`、`any`、`console.log`。

