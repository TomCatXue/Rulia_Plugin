# NoyAcg

NoyAcg（noymanga.com）漫画源插件，移植自 keiyoushi 的 NoyAcg 扩展。

## 配置（必填）

- **用户名 / 密码**：账号密码登录 `https://<API域名>/api/login` 获取会话；不填则列表为空。
- **API 域名**：默认 `api.noyteam.online`，失效时可换 `api.noymanga.com` / `api.noy.asia`。

## 重要：图片需要自定义请求头

图片域名 `img.*` 强制要求请求头 `User-Agent: NoyAcg/3.0`。请在 Rulia 的自定义请求头设置里添加该头，否则封面和章节图不显示。
