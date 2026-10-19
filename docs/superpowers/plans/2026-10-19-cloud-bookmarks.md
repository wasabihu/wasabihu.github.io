# 收藏站动态管理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 公开浏览收藏，只有 wasabi.net@gmail.com 可登录云端增删改，跨设备持久化。
**Architecture:** 保留 GitHub Pages 源文件；Cloudflare 发布副本采用独立前端适配层与 Pages Functions。D1 单文档版本比较更新，Access + 服务端 JWT 验证守护 /admin/*。
**Tech Stack:** JavaScript、Node test、Cloudflare Pages/D1/Access、jose 6.2.12、wrangler 4.151.1。
**Spec:** ../specs/2026-10-19-nav-dynamic-design.md

## Global Constraints
- 免费套餐，不自动升级；管理员邮箱 wasabi.net@gmail.com。
- 仅导入清理后的 38 分类、341 链接；保持旧站源数据不变。
- 数据库、Access 和上述依赖已获得用户明确授权。
- 使用独立收藏站 checkout 的 feat/cloud-bookmarks 分支；当前工具站未提交改动不动。

## Review Focus
- 双设备旧版本提交必须返回冲突，不能覆盖新数据。
- pages.dev 入口必须执行相同身份校验。
- 登录跳转或网络断线不能误报保存成功或丢失表单。
- 新增 URL 与恶意文本不能执行脚本。
- 初始导入与后续部署不得重置已保存的收藏。

### Task 1: 数据与身份边界
**Files:** 新增 cloud/server/*.mjs、migrations/0001.sql、tests/server.test.mjs、package.json。
**Interfaces:** validateDocument(data) 返回规范化 {categories,links}；authorize(request,env) 返回允许的邮箱，否则抛出；readDocument(env)、writeDocument(env,version,data) 返回 {version,categories,links}。
- [x] 写验证测试：合法数据通过，危险网址、重复 ID、孤立分类、超大文档拒绝；过期/伪造/错误邮箱 JWT 拒绝。
- [x] 运行 node --test tests/server.test.mjs，确认缺少功能失败。
- [x] 实现输入验证、严格 JWT 校验和 D1 版本更新；SQL 初始表不覆盖已有内容。
- [x] 重跑测试至通过并提交。

### Task 2: 路由与真实数据库
**Files:** 新增 functions/api/bookmarks.js、functions/admin/[[path]].js、wrangler.jsonc、tests/integration.test.mjs。
**Interfaces:** GET /api/bookmarks 返回文档；GET /admin/api/session 返回邮箱；PUT /admin/api/bookmarks 接收 {version,categories,links}，成功返回新版文档，冲突 409。
- [x] 写无身份/无配置/伪造身份/跨站写入/并发旧版本测试，使用真实本地 D1。
- [x] 运行测试确认未实现路由失败。
- [x] 实现只读公共接口、统一管理鉴权及写入来源校验，API 错误返回中文 JSON。
- [x] 测试 CAS、持久化及输入错误状态，提交。

### Task 3: 浏览和管理界面
**Files:** 新增 cloud/client/*，修改 scripts/build-cloudflare.mjs；新增 tests/client.test.mjs 与构建检查。
**Interfaces:** 首页从公开 API 读取；管理页面鉴权后读取并提供已有增删/分类交互；保存回执成功后才更新已保存版本。
- [x] 写客户端状态测试：失败保留草稿，成功替换版本，冲突保留输入，重复提交禁用；先观察失败。
- [x] 实现中文加载/保存状态、管理入口、退出、导出、删除确认及手机布局。
- [x] 构建保留旧 GitHub 源文件，发布文件不得包含历史数据备份；移除动态发布的旧 data.js 回退防止展示过时删除项。
- [x] 执行原有测试与新增测试，浏览器操作实际验证，提交。

### Task 4: 配置与上线
**Files:** CLOUDFLARE.md、部署记录及证据。
- [x] 创建 D1，导入清理数据一次，配置 Pages 绑定与 Access 参数。
- [x] Access 仅保护 nav.tidyuse.com/admin/*，仅允许指定邮箱；服务端对所有域名执行验证。
- [x] 全量测试与独立代码审查后发布；保持旧 GitHub Pages 可用。
- [x] 正式管理员登录、线上新增/编辑/刷新/删除、公开读取回验已通过；匿名读/禁止写、Pages 别名防绕过、手机视图已通过。
