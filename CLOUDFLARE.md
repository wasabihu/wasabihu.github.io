# 收藏站 Cloudflare 发布与维护

- 公开浏览：https://nav.tidyuse.com/
- 管理：https://nav.tidyuse.com/admin/ ，仅 wasabi.net@gmail.com 邮箱验证码登录。
- 仓库：wasabihu/wasabihu.github.io；生产分支 main；Pages 项目 tidyuse-nav。
- Node 22；构建命令 `node scripts/build-cloudflare.mjs`；输出 `cloudflare-dist`。
- Cloudflare Free；未升级套餐。免费额度耗尽可能影响服务，需要届时另行决定是否付费。

## 数据和权限

D1 `tidyuse-nav-data`：`77019f49-6c28-426c-b6d7-158fedcfb5db`，绑定 `DB`。结构在 `migrations/0001.sql`。只存一个带版本号的收藏文档，条件更新避免旧设备覆盖新数据。重新部署不运行初始化 SQL，也不重置收藏。

Access 应用 `Tidyuse 收藏管理` 保护 `nav.tidyuse.com/admin` 及子路径，Allow 策略仅包含指定邮箱。Pages Functions 额外校验 Access JWT 签名、issuer、audience、有效期和邮箱，默认 pages.dev 管理地址无令牌也拒绝；不是只靠隐藏按钮。

`wrangler.jsonc` 是生产绑定和公开身份配置的来源：`ADMIN_EMAIL`、`ACCESS_TEAM_DOMAIN`、`ACCESS_AUD`。这些是校验参数，不是登录密钥。预览环境不绑定生产数据库，也不配置管理身份，默认拒绝管理。

## 使用

登录后可新增、编辑、移动、排序、删除网址及分类。点击保存并看到“已保存到云端”后，其他设备重新加载即可看到。未登录只能浏览。

两台设备同时编辑时，后保存的一方会收到版本冲突。输入保持在表单中；点击“加载最新收藏，保留输入”，核对再保存。网络错误或登录过期时也保留输入。可在新标签页重新登录，再重试。导出备份下载当前 JSON。

删除分类会同时删除其中网址，页面会明确确认。必要时可从 D1 Time Travel 恢复整个数据库到可恢复的历史时间；这会影响该时间之后的所有收藏变化，恢复前先导出当前备份并确认。

## 初次导入与旧站

原 GitHub Pages 与 `docs/*` 保留，不自动双向同步。导入的是清理后的 38 分类、341 网址，5 条已识别敏感备注已移除。构建不发布 data.js、历史导出或旧静态回退数据，公开数据仅由数据库读取。

`node scripts/prepare-seed.mjs` 在本地生成 `.wrangler/seed.sql`，使用 `INSERT OR IGNORE` 防止覆盖已有文档；部署流程不调用它。该过滤不是通用秘密扫描器，新增内容均公开展示，不要填写密码、令牌或私人账号备注。旧浏览器 localStorage 不自动上传，原旧站和仓库内容未修改。

## 验证与回退

```sh
npm test
node scripts/test-cloudflare-build.mjs
npm run test:legacy
```

本地 UI 验收：先生成 seed、构建，再 `node tests/serve-ui.mjs`，访问 `http://127.0.0.1:4186/admin/`。此测试服务器只监听本机，使用临时本地数据库和测试身份，绝不发布。

构建要求新的空输出目录，可用 `BUILD_OUTPUT=/tmp/nav-build-唯一目录 npm run build`。生产 CI 每次使用新 checkout。

回退应用可在 Pages 部署列表选择前一版本；D1 不随代码回退。回退到旧静态版会显示旧数据且无法云端管理，恢复前应先导出数据库。旧静态构建脚本保留为 `scripts/build-static.mjs`，仅用于初次数据清理和应急参考。
