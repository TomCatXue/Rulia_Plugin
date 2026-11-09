# 禁漫天堂

禁漫天堂（18comic）漫画源插件，移植自 keiyoushi 的 JinmanTiantang 扩展。

## 已实测

- 列表 / 搜索 / 详情 / 章节 / 图片地址接口均已在实网验证通过。
- 内置纯 JS 的 MD5 与 AES-256-ECB 解密（与官方扩展一致）。

## 已知限制

- 章节图片（album id ≥ 220980）在 CDN 上是「行打乱」的；插件在 `getImageUrl` 里用 `canvas` 尽力还原。若 Rulia 运行环境不支持 `fetch`/`canvas`/`createImageBitmap`，会退回原图（此时图片是打乱的，无法正常阅读）。
- 登录（收藏 / 签到）未实现。
