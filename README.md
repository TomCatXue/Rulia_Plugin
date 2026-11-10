<h1 align="center">Rulia_Plugin</h1>

<p align="center">
  <b>Rulia 漫画源插件合集 · 拷贝漫画 / 禁漫天堂 / NoyAcg / 腾讯动漫</b>
</p>

<p align="center">
  <a href="https://github.com/TomCatXue/Rulia_Plugin/stargazers"><img alt="stars" src="https://img.shields.io/github/stars/TomCatXue/Rulia_Plugin?style=flat-square&color=4285dd" /></a>
  <a href="https://github.com/TomCatXue/Rulia_Plugin/issues"><img alt="issues" src="https://img.shields.io/github/issues/TomCatXue/Rulia_Plugin?style=flat-square&color=4285dd" /></a>
  <a href="./LICENSE"><img alt="license" src="https://img.shields.io/github/license/TomCatXue/Rulia_Plugin?style=flat-square&color=4285dd" /></a>
</p>

面向 Windows 漫画阅读器 [Rulia](https://apps.microsoft.com/store/detail/9MVVLRZWRXX8) 的漫画源插件，
从 Tachiyomi 扩展移植而来。把下载好的 `.zip` 直接导入 Rulia 即可在线读漫画。

遇到问题、想加新站点，欢迎提 [Issues](https://github.com/TomCatXue/Rulia_Plugin/issues/new)。

## 插件列表

| 图标 | 名称 | 源站 | 功能说明 | 安装 |
| :-: | :--- | :--- | :--- | :---: |
| <img src="plugins/CopyManga/icon.png" height="20" /> | **拷贝漫画** | mangacopy.com | 浏览 / 搜索 / 收藏（可选填 authorization） | <nobr><a href="./dist/CopyManga.v0.2.0.zip"><strong>下载</strong></a></nobr> |
| <img src="plugins/JinmanTiantang/icon.png" height="20" /> | **禁漫天堂** | 18comic | 浏览 / 搜索 / 分类；章节图为 WebP（需装 WebP 解码扩展） | <nobr><a href="./dist/JinmanTiantang.v0.1.1.zip"><strong>下载</strong></a></nobr> |
| <img src="plugins/NoyAcg/icon.png" height="20" /> | **NoyAcg** | noymanga.com | 需账号密码登录；图片域名强制 `User-Agent: NoyAcg/3.0` | <nobr><a href="./dist/NoyAcg.v0.1.4.zip"><strong>下载</strong></a></nobr> |
| <img src="plugins/TencentComics/icon.png" height="20" /> | **腾讯动漫** | ac.qq.com | 浏览 / 搜索 / 详情 / 章节（含付费章节解密） | <nobr><a href="./dist/TencentComics.v0.1.7.zip"><strong>下载</strong></a></nobr> |

## 安装方法

1. 到上面表格「下载」或仓库 `dist/` 目录，下载对应插件的 `.zip`。
2. 打开 Rulia → **插件** → 右上角 **导入**（或 `+`），选择该 zip。
3. 导入后点开插件即可浏览漫画。

> **升级/重装注意：** Rulia 用 zip 文件的 SHA1 识别插件，所以同一插件重新打包后会被当成“另一个插件”并存。
> 升级前先删除旧条目再导入新包，避免列表里出现多个重复插件。

### 各插件额外配置

- **拷贝漫画**：看「书架/收藏」需要在插件设置里填 `authorization`（浏览器抓请求头 `Token xxx`）；只看浏览/搜索可不填。
- **NoyAcg**：必须在插件设置里填 **用户名 + 密码**（账号密码登录 `https://noymanga.com/api/login`）；另外图片域名强制要求请求头 `User-Agent: NoyAcg/3.0`，请在 Rulia 的自定义请求头设置里添加该头，否则封面和章节图不显示。
- **禁漫天堂**：章节图是 WebP，封面/详情正常；如果图片打不开，见下方「解码扩展」。

## 环境前置

部分源的图片是 **WebP / AVIF**，Windows 原生解码不了会报 `无法找到组件 (0x88982F50)`。去微软商店装这三个免费扩展：

- [WebP 图像扩展](https://apps.microsoft.com/detail/9PG2DK419DRG)
- [HEIF 图像扩展](https://apps.microsoft.com/detail/9PMMSR1CGPWG)
- [AV1 视频扩展](https://apps.microsoft.com/detail/9MVZQVXJBQ9V)

装完最好重启一次 Windows 再测。

## 插件开发避坑（踩过的坑）

写 Rulia 插件时，以下几点会直接导致“装得上但跑不起来 / 图显示不出来”，记录如下：

1. **源码里不能出现字面量 `</script>`** —— Rulia 用 WebView2 把 `index.js` 嵌进 HTML `<script>` 里执行，字面量 `</script>` 会提前闭合标签，整包报 `未知名称 (0x80020006)`。要用正则解析 HTML 时必须写成 `<\/script>`。
2. **封面/图片 URL 必须是绝对 http(s)** —— Rulia 的图片下载器只认 `http://`、`https://`；`//` 协议相对、相对路径、模板占位符 `<%=...%>`、空字符串都会报 `Only 'http' and 'https' schemes are allowed`。统一用 `absUrl` 归一化，正则里要跳过 `<%=...%>` 模板。
3. **图片 CDN 有 UA/风控** —— 部分 CDN 对无浏览器 UA 的请求返回 403（禁漫 `cdn-msp.*` 就是）。Rulia 下载封面/章节图时不带插件自定义 UA/Cookie。办法：换不校验 UA 的域名（禁漫改用 API 服务器域名）；若源强制特定 UA，只能在 Rulia 的自定义请求头设置里手动加。
4. **不要给 `httpRequest` 传 `timeout`** —— 官方插件都不传这个参数，手写插件传了会导致部分源异常，去掉即可。
5. **插件图标必须是 400×240 横版** —— 官方插件全是白底 + 左侧图标 + 右侧名称的横版图，正方形的会被拉伸变形。
6. **NoyAcg 特殊** —— 必须先 `POST /api/login` 拿会话；图片域名 `img.*` 强制 `User-Agent: NoyAcg/3.0`。
7. **Cloudflare 拦截站不可移植** —— 包子漫画（门卫 PoW）、绅士俱乐部、Hanime1.me 都返回 Cloudflare `Just a moment` 403，Rulia 的 `httpRequest` 拿不到响应体，无法绕过，故未收录。

## 插件结构

每个插件目录含四个文件，直接打包成 zip 即可：

```text
TencentComics/
├── index.js       # 插件逻辑（必须）
├── package.json   # 元信息：name / title / version / userConfig（必须）
├── icon.png       # 400×240 图标（必须）
└── README.md      # 插件说明（可选）
```

`index.js` 只声明固定全局函数，不导出模块，通过 `window.Rulia.*` 与宿主通信：

```text
setMangaListFilterOptions()        返回筛选器配置
getMangaList(page, pageSize, keyword, rawFilterOptions)  返回 { list: [{title,url,coverUrl}] }
getMangaData(url)                  返回 { title, description, coverUrl, chapterList }
getChapterImageList(chapterUrl)    返回 [{ url, width, height }]
getImageUrl(url)                   下载前改写图片地址

window.Rulia.httpRequest({ url, method, payload, contentType, headers, responseWithHeaders })
window.Rulia.endWithResult(data) / endWithException(msg) / getUserConfig()
```

## License

[MIT](./LICENSE)

## 免责声明

本项目仅供**个人学习研究与自用**，请勿用于商业用途或违反源站服务条款的行为。
插件不收集、不上传任何个人数据；使用产生的账号异常、访问受限等后果由使用者自行承担。
部分逻辑改编自 keiyoushi / Tachiyomi 社区开源项目，版权归原作者所有；如认为内容侵权，请提 Issue 联系删除。

