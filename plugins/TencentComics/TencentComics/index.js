// 腾讯动漫 (ac.qq.com) 漫画源插件 for Rulia
// 参考 keiyoushi/extensions-source: src/zh/tencentcomics
// 使用正则解析 HTML，不依赖 DOMParser；nonce 用自实现求值器，不依赖 eval。

const DESKTOP = 'https://ac.qq.com'
const MOBILE = 'https://m.ac.qq.com'
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'

const GENRES = [
  ['全部', ''], ['恋爱', '105'], ['玄幻', '101'], ['异能', '103'], ['恐怖', '110'],
  ['剧情', '106'], ['科幻', '108'], ['悬疑', '112'], ['奇幻', '102'], ['冒险', '104'],
  ['犯罪', '111'], ['动作', '109'], ['日常', '113'], ['竞技', '114'], ['武侠', '115'],
  ['历史', '116'], ['战争', '117']
]

function match1 (re, html) {
  const m = re.exec(html)
  return m ? m[1] : null
}

function absUrl (attr, base) {
  if (!attr) return ''
  if (/^https?:\/\//.test(attr)) return attr
  if (attr.slice(0, 2) === '//') return 'https:' + attr
  if (attr.charAt(0) === '/') {
    const m = /^https?:\/\/[^/]+/.exec(base)
    return (m ? m[0] : '') + attr
  }
  const m = /^https?:\/\/[^/]+\//.exec(base)
  return (m ? m[0] : base) + attr
}

function decodeEntities (s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

async function getHtml (url, ua) {
  return await window.Rulia.httpRequest({
    url: url,
    method: 'GET',
    payload: '',
    headers: { 'User-Agent': ua || DESKTOP_UA }
  })
}

function parsePopularList (html) {
  const list = []
  const parts = html.split('<li class="ret-search-item')
  for (let i = 1; i < parts.length; i++) {
    const seg = parts[i]
    const id = match1(/\/Comic\/comicInfo\/(?:id\/)?(\d+)/, seg)
    if (!id) continue
    const title = match1(/title="([^"]*)"/, seg)
    const cover = match1(/data-original="([^"]*)"/, seg)
    list.push({ title: decodeEntities(title || ''), url: DESKTOP + '/Comic/comicInfo/id/' + id, coverUrl: absUrl(cover || '', DESKTOP) })
  }
  return list
}

function parseSearchList (html) {
  const list = []
  const parts = html.split('<li class="comic-item">')
  for (let i = 1; i < parts.length; i++) {
    const seg = parts[i]
    const id = match1(/\/comic\/index\/id\/(\d+)/, seg)
    if (!id) continue
    const title = match1(/comic-title">([\s\S]*?)<\//, seg)
    const cover = match1(/cover-image"\s+src="([^"]*)"/, seg)
    list.push({ title: (title || '').trim(), url: DESKTOP + '/Comic/comicInfo/id/' + id, coverUrl: absUrl(cover || '', MOBILE) })
  }
  return list
}

async function getMangaList (page, pageSize, keyword, rawFilterOptions) {
  const pageNum = parseInt(page) || 1
  try {
    if (keyword) {
      const html = await getHtml(MOBILE + '/search/result?word=' + encodeURIComponent(keyword) + '&page=' + pageNum, MOBILE_UA)
      window.Rulia.endWithResult({ list: parseSearchList(html) })
      return
    }
    let filter = {}
    try { filter = rawFilterOptions ? JSON.parse(rawFilterOptions) : {} } catch (e) { filter = {} }
    const genre = filter.genre ? 'theme/' + filter.genre + '/' : ''
    const status = filter.status ? 'finish/' + filter.status + '/' : ''
    const popularity = filter.sort === 'time' ? 'time/' : 'hot/'
    const vip = filter.vip ? 'vip/' + filter.vip + '/' : ''
    const url = DESKTOP + '/Comic/all/' + genre + status + 'search/' + popularity + vip + 'page/' + pageNum
    const html = await getHtml(url)
    window.Rulia.endWithResult({ list: parsePopularList(html) })
  } catch (error) {
    window.Rulia.endWithException(error && error.message ? error.message : String(error))
  }
}

async function setMangaListFilterOptions () {
  window.Rulia.endWithResult([
    { label: '排序', name: 'sort', options: [{ label: '热门人气', value: 'hot' }, { label: '更新时间', value: 'time' }] },
    { label: '进度', name: 'status', options: [{ label: '全部', value: '' }, { label: '连载中', value: '1' }, { label: '已完结', value: '2' }] },
    { label: '属性', name: 'vip', options: [{ label: '全部', value: '' }, { label: '免费', value: '1' }, { label: '付费', value: '2' }] },
    { label: '标签', name: 'genre', options: GENRES.map(function (g) { return { label: g[0], value: g[1] } }) }
  ])
}

async function getMangaData (dataPageUrl) {
  try {
    const html = await getHtml(dataPageUrl)
    const title = match1(/works-intro-title[^>]*><strong>([\s\S]*?)<\/strong>/, html)
    const desc = match1(/works-intro-short[^>]*>([\s\S]*?)<\/p>/, html)
    const cover = match1(/works-cover[\s\S]*?<img[^>]*src="(https?:[^"]*)"/, html)

    const chapterList = []
    const parts = html.split('works-chapter-item')
    for (let i = 1; i < parts.length; i++) {
      const seg = parts[i]
      const href = match1(/<a[^>]*href="([^"]*)"/, seg)
      if (!href) continue
      const text = match1(/<a[^>]*>([\s\S]*?)<\/a>/, seg)
      const locked = seg.indexOf('ui-icon-pay') !== -1
      chapterList.push({ title: (locked ? '[付费] ' : '') + (text || '').trim(), url: absUrl(href, DESKTOP) })
    }
    chapterList.reverse()

    window.Rulia.endWithResult({
      title: (title || '').trim(),
      description: (desc || '').trim(),
      coverUrl: absUrl(cover || '', DESKTOP),
      chapterList: chapterList
    })
  } catch (error) {
    window.Rulia.endWithException(error && error.message ? error.message : String(error))
  }
}

async function getChapterImageList (chapterUrl) {
  try {
    const html = await getHtml(chapterUrl, DESKTOP_UA)
    const data = decodeChapterData(html)
    if (!data.chapter || data.chapter.canRead !== true) {
      window.Rulia.endWithException('此章节为付费内容')
      return
    }
    const result = (data.picture || []).map(function (p) { return { url: p.url, width: p.width || 0, height: p.height || 0 } })
    window.Rulia.endWithResult(result)
  } catch (error) {
    window.Rulia.endWithException(error && error.message ? error.message : String(error))
  }
}

function decodeChapterData (html) {
  const afterWindow = html.substring(html.lastIndexOf('window['))
  const nonceExpr = afterWindow.substring(afterWindow.indexOf('] = ') + 4).split('<\/script>')[0].trim()
  let nonceValue
  try {
    nonceValue = eval(nonceExpr.replace(/;\s*$/, ''))
  } catch (e) {
    nonceValue = evalNonceExpr(nonceExpr.replace(/;\s*$/, ''))
  }
  if (nonceValue == null) throw new Error('无法解析章节 nonce')
  let raw = html.substring(html.lastIndexOf('var DATA =') + 'var DATA ='.length)
  raw = raw.split('PRELOAD_NUM')[0].trim().replace(/^'/, '').replace(/',$/, '')
  const chars = raw.split('')
  const tokens = String(nonceValue).match(/\d+[a-zA-Z]+/g) || []
  for (let i = tokens.length - 1; i >= 0; i--) {
    const offset = parseInt(tokens[i]) & 255
    const noise = tokens[i].replace(/\d+/g, '')
    chars.splice(offset, noise.length)
  }
  return JSON.parse(base64ToUtf8(chars.join('')))
}

function evalNonceExpr (expr) {
  const replaced = String(expr).replace(/\(\+eval\("((?:[^"\\]|\\.)*)"\)\)\.toString\(\)/g, function (m, inner) {
    return '"' + String(Number(computeNumber(inner))) + '"'
  })
  const litRe = /"((?:[^"\\]|\\.)*)"/g
  let res = ''
  let mm
  while ((mm = litRe.exec(replaced)) !== null) res += mm[1]
  return res
}

function computeNumber (src) {
  const s = String(src)
  let p = 0
  function ws () { while (p < s.length && /\s/.test(s.charAt(p))) p++ }
  function parseExpression () { return parseTernary() }
  function parseTernary () {
    const cond = parseLogicalOr()
    ws()
    if (s.charAt(p) === '?') {
      p++
      const a = parseExpression()
      ws()
      if (s.charAt(p) === ':') p++
      const b = parseExpression()
      return cond ? a : b
    }
    return cond
  }
  function parseLogicalOr () {
    let v = parseLogicalAnd()
    for (;;) {
      ws()
      if (s.substr(p, 2) === '||') { p += 2; v = v || parseLogicalAnd() } else break
    }
    return v
  }
  function parseLogicalAnd () {
    let v = parseEquality()
    for (;;) {
      ws()
      if (s.substr(p, 2) === '&&') { p += 2; v = v && parseEquality() } else break
    }
    return v
  }
  function parseEquality () {
    let v = parseRelational()
    for (;;) {
      ws()
      if (s.substr(p, 3) === '===') { p += 3; v = v === parseRelational() }
      else if (s.substr(p, 3) === '!==') { p += 3; v = v !== parseRelational() }
      else if (s.substr(p, 2) === '==') { p += 2; v = v == parseRelational() }
      else if (s.substr(p, 2) === '!=') { p += 2; v = v != parseRelational() }
      else break
    }
    return v
  }
  function parseRelational () {
    let v = parseAdditive()
    for (;;) {
      ws()
      if (s.substr(p, 2) === '<=') { p += 2; v = v <= parseAdditive() }
      else if (s.substr(p, 2) === '>=') { p += 2; v = v >= parseAdditive() }
      else if (s.charAt(p) === '<') { p++; v = v < parseAdditive() }
      else if (s.charAt(p) === '>') { p++; v = v > parseAdditive() }
      else break
    }
    return v
  }
  function parseAdditive () {
    let v = parseMultiplicative()
    for (;;) {
      ws()
      if (s.charAt(p) === '+') { p++; v = v + parseMultiplicative() }
      else if (s.charAt(p) === '-') { p++; v = v - parseMultiplicative() }
      else break
    }
    return v
  }
  function parseMultiplicative () {
    let v = parseUnary()
    for (;;) {
      ws()
      if (s.charAt(p) === '*') { p++; v = v * parseUnary() }
      else if (s.charAt(p) === '/') { p++; v = v / parseUnary() }
      else if (s.charAt(p) === '%') { p++; v = v % parseUnary() }
      else break
    }
    return v
  }
  function parseUnary () {
    ws()
    if (s.charAt(p) === '+') { p++; return +parseUnary() }
    if (s.charAt(p) === '-') { p++; return -parseUnary() }
    if (s.charAt(p) === '!') { p++; return !parseUnary() }
    return parsePrimary()
  }
  function parsePrimary () {
    ws()
    if (s.charAt(p) === '(') {
      p++
      const v = parseExpression()
      ws()
      if (s.charAt(p) === ')') p++
      return v
    }
    if (s.substr(p, 5) === 'Math.') {
      p += 5
      const nm = s.slice(p).match(/^[a-zA-Z]+/)
      p += nm[0].length
      ws()
      if (s.charAt(p) === '(') p++
      const arg = parseExpression()
      ws()
      if (s.charAt(p) === ')') p++
      if (nm[0] === 'floor') return Math.floor(arg)
      if (nm[0] === 'ceil') return Math.ceil(arg)
      if (nm[0] === 'round') return Math.round(arg)
      if (nm[0] === 'abs') return Math.abs(arg)
      if (nm[0] === 'sqrt') return Math.sqrt(arg)
      return NaN
    }
    if (s.substr(p, 8) === 'parseInt') {
      p += 8
      ws()
      if (s.charAt(p) === '(') p++
      const arg = parseExpression()
      ws()
      if (s.charAt(p) === ')') p++
      return arg < 0 ? Math.ceil(arg) : Math.floor(arg)
    }
    if (s.substr(p, 10) === 'parseFloat') {
      p += 10
      ws()
      if (s.charAt(p) === '(') p++
      const arg = parseExpression()
      ws()
      if (s.charAt(p) === ')') p++
      return parseFloat(arg)
    }
    const num = s.slice(p).match(/^\d+(\.\d+)?/)
    if (num) { p += num[0].length; return parseFloat(num[0]) }
    if (s.substr(p, 4) === 'true') { p += 4; return true }
    if (s.substr(p, 5) === 'false') { p += 5; return false }
    throw new Error('无法解析表达式: ' + src)
  }
  const result = parseExpression()
  ws()
  return result
}

function base64ToUtf8 (b64) {
  const cleaned = String(b64).replace(/\s+/g, '')
  const table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const bytes = []
  let buffer = 0
  let bits = 0
  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned.charAt(i)
    if (c === '=') break
    const idx = table.indexOf(c)
    if (idx === -1) continue
    buffer = (buffer << 6) | idx
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 0xff)
    }
  }
  let out = ''
  let i = 0
  while (i < bytes.length) {
    const b0 = bytes[i++]
    if (b0 < 0x80) out += String.fromCharCode(b0)
    else if (b0 < 0xe0) out += String.fromCharCode(((b0 & 0x1f) << 6) | (bytes[i++] & 0x3f))
    else if (b0 < 0xf0) out += String.fromCharCode(((b0 & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f))
    else { const cp = ((b0 & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f); out += String.fromCharCode((cp >> 10) + 0xd800) + String.fromCharCode((cp & 0x3ff) + 0xdc00) }
  }
  return out
}

async function getImageUrl (path) {
  window.Rulia.endWithResult(path)
}
