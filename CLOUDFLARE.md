# 收藏站 Cloudflare 发布

正式地址： https://nav.tidyuse.com/ 。GitHub Pages 原地址及 docs 源文件保留。

## 配置

- 仓库：wasabihu/wasabihu.github.io，生产分支 main。
- 框架：None；构建命令：`node scripts/build-cloudflare.mjs`。
- 输出目录：`cloudflare-dist`；根目录：仓库根目录。
- 无 npm 安装步骤、无新依赖、无数据库。
- Pages Git 集成用于提交后自动发布；仅授权此仓库。

## 发布内容

构建脚本只复制运行所需静态资源，保留分类、链接、顺序与原有样式。已识别的 5 项账号或凭据备注会在发布副本里清空，常见凭据提示也会过滤；原 docs/data.js 不变。旧数据导出文件、index_files 与系统文件不进入输出。

新站的“同步远程数据”读取同源 data.js，避免重新拉取旧站未清理的备注。此过滤不是通用秘密扫描器，未来添加内容仍需自行检查，不要在公开收藏备注和 URL 中存密码或令牌。原公开仓库及旧站历史中的敏感内容仍然存在；若是真实有效凭据，应另行更换并清理。

页面 canonical 指向新站；pages.dev 测试地址 noindex。未接入工具站的 GA4，也未将个人收藏加入工具站 sitemap。

## 本地验证

```sh
node scripts/test-cloudflare-build.mjs
node scripts/validate-data.mjs
node scripts/test-data-manager.mjs
node scripts/verify-homepage-improvements.mjs
```

浏览器本地收藏按域名隔离，GitHub Pages 的 localStorage 不会自动转移。新站默认使用仓库数据；不要清除旧站本地数据，先导出核对。新站页面内编辑只保存在该浏览器，不会自动回写 GitHub；仓库提交触发的是静态版本部署。
