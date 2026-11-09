// NoyAcg (noymanga.com) 漫画源插件 for Rulia
// 参考 keiyoushi/extensions-source: src/zh/noyacg

const userConfig = window.Rulia.getUserConfig() || {}

const API_HOST = (userConfig.apiHost || 'api.noyteam.online')
  .replace(/^https?:\/\//, '')
  .replace(/\/+$/, '')
const API_BASE = 'https://' + API_HOST
const IMG_BASE = API_BASE.replace('api', 'img')
const ALLOW_ADULT = userConfig.allowAdult || 'both'

let sessionCookie = ''
try { sessionCookie = window.Rulia.localStorage.getItem('noy_session') || '' } catch (e) { sessionCookie = '' }

async function login () {
  const cfg = window.Rulia.getUserConfig() || {}
  const username = cfg.username || ''
  const password = cfg.password || ''
  if (!username || !password) throw new Error('请先在插件配置中填写 NoyAcg 用户名和密码')
  const raw = await window.Rulia.httpRequest({
    url: API_BASE + '/api/login',
    method: 'POST',
    payload: 'user=' + encodeURIComponent(username) + '&pass=' + encodeURIComponent(password),
    contentType: 'application/x-www-form-urlencoded',
    headers: {
      'Origin': API_BASE,
      'Referer': API_BASE + '/',
      'User-Agent': 'NoyAcg/3.0'
    },
    responseWithHeaders: true
  })
  const parsed = JSON.parse(raw)
  const body = parsed && parsed.data ? JSON.parse(parsed.data) : {}
  if (body.status === 'error') throw new Error('NoyAcg 登录失败：账号或密码错误')
  if (body.status === 'danger') throw new Error('NoyAcg 登录失败：账号或密码含不允许的字符')
  const headers = (parsed && parsed.headers) || {}
  const setCookie = headers['set-cookie'] || headers['Set-Cookie'] || headers['SET-COOKIE'] || ''
  sessionCookie = String(setCookie).split(',')[0].split(';')[0].trim()
  if (!sessionCookie || sessionCookie.indexOf('=') === -1) throw new Error('NoyAcg 登录失败：未获取到会话 Cookie')
  try { window.Rulia.localStorage.setItem('noy_session', sessionCookie) } catch (e) {}
}

async function ensureLogin () {
  if (sessionCookie) return
  await login()
}

function pick (obj) {
  for (let i = 1; i < arguments.length; i++) {
    const key = arguments[i]
    const value = obj == null ? undefined : obj[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

async function request (url, options) {
  options = options || {}
  await ensureLogin()
  const headers = {
    'User-Agent': 'NoyAcg/3.0',
    'allow-adult': ALLOW_ADULT,
    'Accept': 'application/json'
  }
  if (sessionCookie) headers['Cookie'] = sessionCookie
  if (options.headers) {
    for (const k in options.headers) headers[k] = options.headers[k]
  }

  return await window.Rulia.httpRequest({
    url,
    method: options.method || 'GET',
    payload: options.payload || '',
    contentType: options.contentType || 'application/x-www-form-urlencoded',
    headers
  })
}

function toListManga (item) {
  const id = pick(item, 'id', 'Bid')
  const name = pick(item, 'name', 'Bookname')
  return {
    title: String(name == null ? '' : name),
    url: String(id),
    coverUrl: IMG_BASE + '/' + id + '/m1.webp'
  }
}

function formatAuthors (author) {
  if (!author) return ''
  return author.split(' ').map(name => {
    return name.split('-').map(word => {
      return word.charAt(0).toUpperCase() + word.slice(1)
    }).join(' ')
  }).join(' ')
}

function formatTime (time) {
  if (!time) return ''
  const d = new Date(time * 1000)
  const p = n => (n < 10 ? '0' : '') + n
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function formatDescription (info) {
  const description = pick(info, 'description', 'Description') || ''
  if (description) return description
  const author = formatAuthors(pick(info, 'author', 'Author') || '')
  const time = formatTime(pick(info, 'time', 'Time'))
  const rating = pick(info, 'rating_sum', 'RatingSUM')
  const pTag = pick(info, 'pTag', 'Ptag')
  const parts = []
  if (time) parts.push('時間：' + time)
  if (rating != null) parts.push('评分：' + rating)
  if (author) parts.push('作者：' + author)
  if (pTag) parts.push('标签：' + String(pTag).replace(/ /g, ', '))
  return parts.join('\n')
}

async function getMangaList (page, pageSize, keyword, rawFilterOptions) {
  const pageNum = parseInt(page) || 1
  try {
    if (keyword) {
      return await search(pageNum, keyword)
    }
    return await browse(pageNum, rawFilterOptions)
  } catch (error) {
    window.Rulia.endWithException(error && error.message ? error.message : String(error))
  }
}

async function search (page, keyword) {
  const payload = 'value=' + encodeURIComponent(keyword) + '&page=' + page + '&type=book'
  const raw = await request(API_BASE + '/api/v4/search/fetch', { method: 'POST', payload })
  const json = JSON.parse(raw)
  const list = json.data || json.info || []
  window.Rulia.endWithResult({ list: (list || []).map(toListManga) })
}

async function browse (page, rawFilterOptions) {
  let filter = {}
  try { filter = rawFilterOptions ? JSON.parse(rawFilterOptions) : {} } catch (e) { filter = {} }

  let path
  let payload
  if (filter.sort === 'new') {
    path = '/api/b1/booklist'
    payload = 'page=' + page + '&sort=new'
  } else {
    path = '/api/readLeaderboard'
    payload = 'type=' + encodeURIComponent(filter.sort || 'day') + '&page=' + page
  }

  const raw = await request(API_BASE + path, { method: 'POST', payload })
  const json = JSON.parse(raw)
  const list = json.data || json.info || []
  window.Rulia.endWithResult({ list: (list || []).map(toListManga) })
}

async function setMangaListFilterOptions () {
  window.Rulia.endWithResult([
    {
      label: '排序',
      name: 'sort',
      options: [
        { label: '热门 · 今日', value: 'day' },
        { label: '热门 · 本周', value: 'week' },
        { label: '热门 · 本月', value: 'month' },
        { label: '最新上架', value: 'new' }
      ]
    }
  ])
}

async function getMangaData (dataPageUrl) {
  const id = String(dataPageUrl).trim()
  try {
    const raw = await request(API_BASE + '/api/v4/book/' + id + '?comment=false', { method: 'GET' })
    const json = JSON.parse(raw)
    const book = json.book || {}
    const info = book.info || {}

    const result = {
      title: pick(info, 'name', 'Bookname') || '',
      description: formatDescription(info),
      coverUrl: IMG_BASE + '/' + id + '/m1.webp',
      chapterList: buildChapterList(id, info, json.chapters)
    }
    window.Rulia.endWithResult(result)
  } catch (error) {
    window.Rulia.endWithException(error && error.message ? error.message : String(error))
  }
}

function buildChapterList (mangaId, info, chaptersObj) {
  const categories = (chaptersObj && chaptersObj.categories) || []
  const data = (chaptersObj && chaptersObj.data) || {}
  const result = []

  if (categories.length === 0) {
    const len = pick(info, 'Len', 'len') || 0
    result.push({ title: '單章節（' + len + 'P）', url: mangaId + '/0/' + len })
    return result
  }

  for (const cat of categories) {
    const chapters = data[String(cat.id)] || []
    for (const ch of chapters.slice().reverse()) {
      result.push({
        title: cat.name + '｜' + ch.name + '（' + ch.count + 'P）',
        url: mangaId + '/' + ch.id + '/' + ch.count
      })
    }
  }
  return result
}

async function getChapterImageList (chapterUrl) {
  try {
    const parts = String(chapterUrl).split('/')
    const mangaId = parts[0]
    const chapterId = parts[1]
    const count = parseInt(parts[2]) || 0
    const result = []
    for (let n = 1; n <= count; n++) {
      const path = chapterId === '0'
        ? '/' + mangaId + '/' + n + '.webp'
        : '/' + mangaId + '/' + chapterId + '/' + n + '.webp'
      result.push({ url: IMG_BASE + path, width: 0, height: 0 })
    }
    window.Rulia.endWithResult(result)
  } catch (error) {
    window.Rulia.endWithException(error && error.message ? error.message : String(error))
  }
}

async function getImageUrl (path) {
  window.Rulia.endWithResult(path)
}
