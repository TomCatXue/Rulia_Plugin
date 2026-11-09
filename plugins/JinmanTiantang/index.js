// 禁漫天堂 (18comic) 漫画源插件 for Rulia
// 参考 keiyoushi/extensions-source: src/zh/jinmantiantang

const TOKEN_SECRET = '185Hcomic3PAPP7R'
const SERVER_LIST_SECRET = 'diosfjckwpqpdfjkvnqQjsik'
const APP_VERSION = '2.1.12'
const SCRAMBLE_ID = 220980
const SERVER_LIST_URL = 'https://rup4a04-c02.tos-cn-hongkong.bytepluses.com/newsvr-2025.txt'
const FALLBACK_SERVERS = ['www.cdnhjk.net', 'www.cdnutc.cc', 'www.cdngwc.net', 'www.cdngwc.club']

const userConfig = window.Rulia.getUserConfig() || {}
const MIRROR = (userConfig.mirror || 'https://18comic.vip').replace(/\/+$/, '')
const MIRROR_HOST = MIRROR.replace(/^https?:\/\//, '').split('/')[0]
const COVER_HOST = 'https://cdn-msp.' + MIRROR_HOST

let apiHost = null

// ---------------- crypto ----------------
function md5 (str) {
  const bytes = []
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i)
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      const lo = str.charCodeAt(i + 1)
      if (lo >= 0xdc00 && lo <= 0xdfff) { c = 0x10000 + ((c - 0xd800) << 10) + (lo - 0xdc00); i++ }
    }
    if (c < 0x80) bytes.push(c)
    else if (c < 0x800) { bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63)) }
    else if (c < 0x10000) { bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)) }
    else { bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)) }
  }
  const bitLen = bytes.length * 8
  bytes.push(0x80)
  while (bytes.length % 64 !== 56) bytes.push(0)
  for (let i = 0; i < 8; i++) bytes.push((bitLen / Math.pow(2, 8 * i)) & 0xff)
  const K = [0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8, 0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665, 0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391]
  const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21]
  function rotl (x, c) { return ((x << c) | (x >>> (32 - c))) >>> 0 }
  let a0 = 0x67452301; let b0 = 0xefcdab89; let c0 = 0x98badcfe; let d0 = 0x10325476
  for (let o = 0; o < bytes.length; o += 64) {
    const M = new Array(16)
    for (let i = 0; i < 16; i++) M[i] = (bytes[o + 4 * i] | (bytes[o + 4 * i + 1] << 8) | (bytes[o + 4 * i + 2] << 16) | (bytes[o + 4 * i + 3] << 24)) >>> 0
    let A = a0; let B = b0; let C = c0; let D = d0
    for (let i = 0; i < 64; i++) {
      let f; let g
      if (i < 16) { f = (B & C) | (~B & D); g = i } else if (i < 32) { f = (D & B) | (~D & C); g = (5 * i + 1) % 16 } else if (i < 48) { f = B ^ C ^ D; g = (3 * i + 5) % 16 } else { f = C ^ (B | ~D); g = (7 * i) % 16 }
      f = f >>> 0
      const tmp = D; D = C; C = B
      B = (B + rotl((A + f + K[i] + M[g]) >>> 0, S[i])) >>> 0
      A = tmp
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0
  }
  function hex (x) { let s = ''; for (let i = 0; i < 4; i++) s += ('0' + ((x >>> (i * 8)) & 0xff).toString(16)).slice(-2); return s }
  return hex(a0) + hex(b0) + hex(c0) + hex(d0)
}

function base64ToBytes (b64) {
  const cleaned = String(b64).replace(/\s+/g, '')
  const table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const out = []
  let buffer = 0; let bits = 0
  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned.charAt(i)
    if (c === '=') break
    const idx = table.indexOf(c)
    if (idx === -1) continue
    buffer = (buffer << 6) | idx
    bits += 6
    if (bits >= 8) { bits -= 8; out.push((buffer >> bits) & 0xff) }
  }
  return out
}

function bytesToUtf8 (bytes) {
  let out = ''
  let i = 0
  while (i < bytes.length) {
    const b0 = bytes[i++]
    if (b0 < 0x80) out += String.fromCharCode(b0)
    else if (b0 < 0xe0) out += String.fromCharCode(((b0 & 0x1f) << 6) | (bytes[i++] & 0x3f))
    else if (b0 < 0xf0) out += String.fromCharCode(((b0 & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f))
    else { const cp = ((b0 & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f); out += String.fromCodePoint(cp) }
  }
  return out
}

const SBOX = [0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76, 0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0, 0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15, 0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75, 0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84, 0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf, 0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8, 0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2, 0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73, 0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb, 0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79, 0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08, 0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a, 0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e, 0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf, 0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16]
const INV_SBOX = [0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e, 0x81, 0xf3, 0xd7, 0xfb, 0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87, 0x34, 0x8e, 0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb, 0x54, 0x7b, 0x94, 0x32, 0xa6, 0xc2, 0x23, 0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e, 0x08, 0x2e, 0xa1, 0x66, 0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49, 0x6d, 0x8b, 0xd1, 0x25, 0x72, 0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16, 0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65, 0xb6, 0x92, 0x6c, 0x70, 0x48, 0x50, 0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15, 0x46, 0x57, 0xa7, 0x8d, 0x9d, 0x84, 0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a, 0xf7, 0xe4, 0x58, 0x05, 0xb8, 0xb3, 0x45, 0x06, 0xd0, 0x2c, 0x1e, 0x8f, 0xca, 0x3f, 0x0f, 0x02, 0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b, 0x3a, 0x91, 0x11, 0x41, 0x4f, 0x67, 0xdc, 0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6, 0x73, 0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8, 0x1c, 0x75, 0xdf, 0x6e, 0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89, 0x6f, 0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b, 0xfc, 0x56, 0x3e, 0x4b, 0xc6, 0xd2, 0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4, 0x1f, 0xdd, 0xa8, 0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59, 0x27, 0x80, 0xec, 0x5f, 0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d, 0x2d, 0xe5, 0x7a, 0x9f, 0x93, 0xc9, 0x9c, 0xef, 0xa0, 0xe0, 0x3b, 0x4d, 0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb, 0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61, 0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6, 0x26, 0xe1, 0x69, 0x14, 0x63, 0x55, 0x21, 0x0c, 0x7d]
const RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36]
function gmul (a, b) { let r = 0; while (b) { if (b & 1) r ^= a; const hi = a & 0x80; a = (a << 1) & 0xff; if (hi) a ^= 0x1b; b >>= 1 } return r }
function aes256EcbDecrypt (cipher, key) {
  const w = new Array(60).fill(0)
  for (let i = 0; i < 8; i++) w[i] = ((key[4 * i] << 24) | (key[4 * i + 1] << 16) | (key[4 * i + 2] << 8) | key[4 * i + 3]) >>> 0
  for (let i = 8; i < 60; i++) {
    let t = w[i - 1]
    if (i % 8 === 0) { t = (SBOX[(t >>> 16) & 0xff] << 24) | (SBOX[(t >>> 8) & 0xff] << 16) | (SBOX[t & 0xff] << 8) | SBOX[(t >>> 24) & 0xff]; t ^= RCON[i / 8] << 24 } else if (i % 8 === 4) { t = (SBOX[(t >>> 24) & 0xff] << 24) | (SBOX[(t >>> 16) & 0xff] << 16) | (SBOX[(t >>> 8) & 0xff] << 8) | SBOX[t & 0xff] }
    w[i] = (w[i - 8] ^ t) >>> 0
  }
  const out = []
  for (let off = 0; off < cipher.length; off += 16) {
    const s = []; for (let i = 0; i < 16; i++) s[i] = cipher[off + i]
    const addRoundKey = r => { for (let c = 0; c < 4; c++) { const k = w[r * 4 + c]; s[c * 4] ^= (k >>> 24) & 0xff; s[c * 4 + 1] ^= (k >>> 16) & 0xff; s[c * 4 + 2] ^= (k >>> 8) & 0xff; s[c * 4 + 3] ^= k & 0xff } }
    const invSubBytes = () => { for (let i = 0; i < 16; i++) s[i] = INV_SBOX[s[i]] }
    const invShiftRows = () => { const t = [s[0], s[13], s[10], s[7], s[4], s[1], s[14], s[11], s[8], s[5], s[2], s[15], s[12], s[9], s[6], s[3]]; for (let i = 0; i < 16; i++) s[i] = t[i] }
    const invMixColumns = () => { for (let c = 0; c < 4; c++) { const i = c * 4; const a0 = s[i]; const a1 = s[i + 1]; const a2 = s[i + 2]; const a3 = s[i + 3]; s[i] = gmul(a0, 14) ^ gmul(a1, 11) ^ gmul(a2, 13) ^ gmul(a3, 9); s[i + 1] = gmul(a0, 9) ^ gmul(a1, 14) ^ gmul(a2, 11) ^ gmul(a3, 13); s[i + 2] = gmul(a0, 13) ^ gmul(a1, 9) ^ gmul(a2, 14) ^ gmul(a3, 11); s[i + 3] = gmul(a0, 11) ^ gmul(a1, 13) ^ gmul(a2, 9) ^ gmul(a3, 14) } }
    addRoundKey(14)
    for (let r = 13; r >= 1; r--) { invShiftRows(); invSubBytes(); addRoundKey(r); invMixColumns() }
    invShiftRows(); invSubBytes(); addRoundKey(0)
    for (let i = 0; i < 16; i++) out.push(s[i])
  }
  return out
}

function decryptB64 (b64, secret) {
  const key = []; const hex = md5(secret); for (let i = 0; i < 32; i++) key.push(hex.charCodeAt(i))
  const dec = aes256EcbDecrypt(base64ToBytes(b64), key)
  const pad = dec[dec.length - 1]
  let n = dec.length
  if (pad >= 1 && pad <= 16) n -= pad
  return bytesToUtf8(dec.slice(0, n))
}

// ---------------- API ----------------
async function httpGetText (url, headers) {
  return await window.Rulia.httpRequest({ url: url, method: 'GET', payload: '', headers: headers || {} })
}

async function getApiHost () {
  if (apiHost) return apiHost
  try {
    const text = (await httpGetText(SERVER_LIST_URL, { 'User-Agent': 'Mozilla/5.0' })).replace(/^\uFEFF/, '').trim()
    const obj = JSON.parse(decryptB64(text, SERVER_LIST_SECRET))
    const list = obj.Server || obj.Setting || []
    if (list.length) apiHost = list[0]
  } catch (e) {}
  if (!apiHost) apiHost = FALLBACK_SERVERS[Math.floor(Math.random() * FALLBACK_SERVERS.length)]
  return apiHost
}

async function apiGet (path, params) {
  const host = await getApiHost()
  const timestamp = String(Math.floor(Date.now() / 1000))
  const parts = []
  for (const k in params) parts.push(k + '=' + encodeURIComponent(params[k]))
  parts.push('lang=CN')
  const url = 'https://' + host + '/' + path + '?' + parts.join('&')
  const headers = {
    'Token': md5(timestamp + TOKEN_SECRET),
    'Tokenparam': timestamp + ',' + APP_VERSION,
    'User-Agent': 'Mozilla/5.0'
  }
  const raw = await httpGetText(url, headers)
  const body = JSON.parse(raw)
  if (body.code !== 200) {
    if (body.code === 401 && apiHost) { apiHost = null; return await apiGet(path, params) }
    throw new Error(body.errorMsg || ('禁漫服务器异常 code=' + body.code))
  }
  if (typeof body.data === 'string') return JSON.parse(decryptB64(body.data, timestamp + TOKEN_SECRET))
  return body.data
}

function albumPath (id) { return '/album/' + id + '/' }
function coverUrl (id) { return 'https://' + (apiHost || MIRROR_HOST) + '/media/albums/' + id + '_3x4.jpg' }

function imgUrl (p) {
  if (!p) return ''
  if (/^https?:\/\//.test(p)) return p
  const host = apiHost || MIRROR_HOST
  return p.charAt(0) === '/' ? 'https://' + host + p : 'https://' + host + '/' + p
}
function unescapeEntities (s) { return String(s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'") }

function toListManga (item) {
  return {
    title: unescapeEntities(item.name),
    url: albumPath(item.id),
    coverUrl: coverUrl(item.id)
  }
}

async function getMangaList (page, pageSize, keyword, rawFilterOptions) {
  const pageNum = parseInt(page) || 1
  let filter = {}
  try { filter = rawFilterOptions ? JSON.parse(rawFilterOptions) : {} } catch (e) { filter = {} }
  try {
    let data
    if (keyword) {
      data = await apiGet('search', { search_query: keyword.trim(), o: filter.sort || 'mv', search_type: filter.type || 'video', page: String(pageNum) })
    } else {
      data = await apiGet('categories/filter', { page: String(pageNum), c: filter.category || '0', o: filter.sort || 'mv' })
    }
    const list = (data.content || []).map(toListManga)
    window.Rulia.endWithResult({ list })
  } catch (error) {
    window.Rulia.endWithException(error && error.message ? error.message : String(error))
  }
}

async function setMangaListFilterOptions () {
  let categories = [{ label: '全部', value: '0' }]
  try {
    const data = await apiGet('categories', {})
    const groups = data.categories || []
    for (const g of groups) {
      const slug = g.slug || '0'
      categories.push({ label: g.name, value: slug })
      for (const sub of (g.sub_categories || [])) categories.push({ label: g.name + ' · ' + sub.name, value: slug + '_' + sub.slug })
    }
  } catch (e) {}
  window.Rulia.endWithResult([
    { label: '排序', name: 'sort', options: [{ label: '最多浏览', value: 'mv' }, { label: '最新上架', value: 'mr' }] },
    { label: '分类', name: 'category', options: categories }
  ])
}

async function getMangaData (dataPageUrl) {
  const m = /\/album\/(\d+)/.exec(dataPageUrl || '')
  const id = m ? m[1] : String(dataPageUrl).trim()
  try {
    const album = await apiGet('album', { id })
    const chapterList = []
    const series = album.series || []
    if (series.length === 0) {
      chapterList.push({ title: '单章节', url: '/photo/' + id + '/' })
    } else {
      for (let i = series.length - 1; i >= 0; i--) {
        const name = series[i].name || ''
        const prefix = '第' + (i + 1) + '话'
        chapterList.push({ title: name ? (name.indexOf(prefix) === 0 ? name : prefix + ' ' + name) : prefix, url: '/photo/' + series[i].id })
      }
    }
    const tags = album.tags || []
    const status = tags.some(t => t === '连载中' || t === '连载') ? '连载中' : (tags.indexOf('完结') !== -1 ? '已完结' : '')
    const descParts = []
    if (album.description) descParts.push(album.description.trim())
    if (status) descParts.push('状态：' + status)
    window.Rulia.endWithResult({
      title: unescapeEntities(album.name),
      description: descParts.join('\n'),
      coverUrl: coverUrl(album.id),
      chapterList
    })
  } catch (error) {
    window.Rulia.endWithException(error && error.message ? error.message : String(error))
  }
}

async function getChapterImageList (chapterUrl) {
  const m = /\/photo\/(\d+)/.exec(chapterUrl || '')
  if (!m) { window.Rulia.endWithException('无效的章节链接'); return }
  try {
    const data = await apiGet('comic_read', { id: m[1], express: '' })
    const result = (data.images || []).map(img => ({ url: imgUrl(img.image), width: 0, height: 0 }))
    window.Rulia.endWithResult(result)
  } catch (error) {
    window.Rulia.endWithException(error && error.message ? error.message : String(error))
  }
}

function needsUnscramble (url) {
  if (String(url).indexOf('media/photos') === -1) return false
  if (String(url).indexOf('_3x4.jpg') !== -1) return false
  const segs = String(url).split('/').filter(Boolean)
  const aid = parseInt(segs[segs.length - 2])
  return !isNaN(aid) && aid >= SCRAMBLE_ID
}

function md5LastCharCode (input) {
  const h = md5(input)
  return h.charCodeAt(h.length - 1)
}

function getRows (aid, imgIndex) {
  const modulus = aid >= 421926 ? 8 : 10
  return 2 * (md5LastCharCode(String(aid) + imgIndex) % modulus) + 2
}

async function getImageUrl (url) {
  if (!needsUnscramble(url)) { window.Rulia.endWithResult(url); return }
  try {
    if (typeof fetch === 'undefined' || typeof document === 'undefined' || typeof createImageBitmap === 'undefined') {
      window.Rulia.endWithResult(url); return
    }
    const segs = String(url).split('/').filter(Boolean)
    const aid = parseInt(segs[segs.length - 2])
    const imgIndex = segs[segs.length - 1].split('?')[0].split('.')[0]
    const rows = getRows(aid, imgIndex)

    const blob = await (await fetch(url)).blob()
    const bmp = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = bmp.width; canvas.height = bmp.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bmp, 0, 0)
    const src = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const dst = ctx.createImageData(canvas.width, canvas.height)
    const width = canvas.width; const height = canvas.height
    const remainder = height % rows
    const rowBytes = width * 4
    for (let x = 0; x < rows; x++) {
      let copyH = Math.floor(height / rows)
      let py = copyH * x
      const y = height - copyH * (x + 1) - remainder
      if (x === 0) copyH += remainder; else py += remainder
      for (let r = 0; r < copyH; r++) {
        const srcStart = (y + r) * rowBytes
        const dstStart = (py + r) * rowBytes
        for (let p = 0; p < rowBytes; p++) dst.data[dstStart + p] = src.data[srcStart + p]
      }
    }
    ctx.putImageData(dst, 0, 0)
    window.Rulia.endWithResult(canvas.toDataURL('image/jpeg', 0.9))
  } catch (e) {
    window.Rulia.endWithResult(url)
  }
}
