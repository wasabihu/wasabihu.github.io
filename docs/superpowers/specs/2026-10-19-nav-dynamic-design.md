# 收藏站动态管理方案

日期：2026-10-19。状态：待用户审阅；尚未创建数据库、配置登录或安装依赖。

## 已确认目标

- 地址仍为 https://nav.tidyuse.com/ 。所有人可公开浏览，只有站主登录后可以增删。
- 新增、编辑、删除网址及管理分类后保存到云端，手机和电脑重新加载即可看到相同内容。
- 保留现有分类、标签页、搜索和移动端布局；保存失败不能显示成功，也不能丢失表单内容。

## 当前代码依据

仓库为 wasabihu/wasabihu.github.io，已核对本地提交 bbd16fb。
docs/index.js 已有增删改交互；docs/dataManager.js 仅写 localStorage。
Cloudflare 构建由 scripts/build-cloudflare.mjs 生成独立发布目录，目前没有数据库或后台。
此文档与既有 nav-migration.md 一起保存在工具站工作区，实施修改应发生在收藏站仓库。

## 方案选择

推荐现有 Cloudflare Pages + Pages Functions + D1 + Access，托管、数据和登录放在同一平台。
另一个选择是保存时提交 GitHub：无需数据库，但每次保存要等待构建发布，也需要服务端处理 GitHub 授权。
第三个选择是外接 Supabase：数据库和登录成熟，但增加一个账号及服务，当前单人收藏需求没有必要。

## 页面与权限

- 首页公开展示和搜索，提供“管理收藏”入口。
- /admin/ 使用现有风格提供管理界面；/admin/api/ 下的写接口同样受保护。
- Cloudflare Access 采用邮箱验证码，只允许一个明确批准的站主邮箱；拟使用 wasabi.net@gmail.com，需确认。
- 后端独立验证 Access JWT 的签名、颁发者、受众、有效期及邮箱，不能仅依赖隐藏按钮或客户端变量。
- pages.dev 别名和预览部署也不能绕过后端权限；未配置验证参数时拒绝写入。
- 写接口校验请求来源、JSON 格式及输入长度，网址仅允许 HTTP/HTTPS。禁止执行导入文件中的 JavaScript。

## 数据与保存

- 拟新建 D1 数据库 tidyuse-nav-data，仅供收藏站使用。
- 小规模个人收藏使用一个带版本号的 JSON 文档保存分类、链接与顺序，保留当前数据形状及稳定 ID。
- 公开 GET /api/bookmarks 返回当前已保存版本；管理接口通过版本号条件更新，防止两台设备互相覆盖。
- 冲突提示重新加载并保留未提交内容；网络或登录失效时不假报成功。
- 删除前确认；保留数据导出备份入口。清理浏览器缓存不再影响云端收藏。
- 初次导入使用经过清理的 Cloudflare 发布数据，预计 38 个分类、341 个链接，实施前再次核对。
- 不导入旧站敏感备注或历史导出文件；不把浏览器本地内容自动上传。若发现本地有新增内容，先列出差异让用户决定。

## 费用及外部变更

- 预计个人使用的新增托管月费为 0 美元；以免费额度内运行作为方案约束，不自动升级付费套餐。
- D1 Free：每日 500 万行读取、10 万行写入、总存储 5 GB；Functions 另受 Workers 免费额度限制。
- Workers Free：每日 10 万次请求；Access Free 可供最多 50 名用户使用，本方案仅一个管理用户。
- nav 是现有域名的子域名，无需另买域名；原 tidyuse.com 的域名续费继续存在。
- 需要用户批准的操作：创建 D1、配置 Access 邮箱白名单和登录、安装 jose 与开发工具 wrangler 并锁定版本。
- jose 用于标准 JWT 校验；wrangler 用于本地真实运行时测试与部署验证。实施前核对包版本和许可，不安装无关依赖。

## 验收与发布

1. 先备份已清理的初始数据，开发分支验证后再发布生产。
2. 测试匿名读取、匿名写入拒绝、错误身份拒绝、合法身份增删改、过期令牌及跨站请求拒绝。
3. 测试失败保存、重复提交、版本冲突、URL 校验与恶意文本安全渲染。
4. 使用本地 D1 验证持久化；部署后由站主完成验证码登录，再验证新增、刷新、第二设备读取和删除。
5. 核对原有分类和链接数量；回归手机布局、搜索、分类、HTTPS 与原 GitHub Pages。
6. 只有上述验证完成后才报告动态站已上线；出现故障时保留原数据库数据及可回退的静态部署。

## 官方依据

- https://developers.cloudflare.com/pages/functions/bindings/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://www.cloudflare.com/plans/
- https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
