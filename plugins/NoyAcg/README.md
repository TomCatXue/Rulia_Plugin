# NoyAcg

NoyAcg（noymanga.com）漫画源插件，移植自 keiyoushi 的 NoyAcg 扩展。

## 配置

- **API 域名**：默认 `api.noyteam.online`，失效时可换 `api.noymanga.com` / `api.noy.asia`。
- **成人内容**：`both` 全部 / `none` 隐藏 / `only` 仅成人。

## 说明

- 登录（收藏/签到）暂未实现；游客模式配合 `allow-adult` 头即可浏览。
- 章节图片尺寸未从接口获取，返回 `0`，由阅读器下载后自适应。
