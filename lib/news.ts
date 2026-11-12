import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

// Google News RSS から取得した記事
export type NewsArticle = {
  title: string
  link: string
  pubDate: string // RFC 822 形式
  source: string // ニュース提供元
}

// 1ノード分の保存内容
export type NewsEntry = {
  fetched_at: string // 最後に取得できた日時（ISO 8601）
  items: NewsArticle[]
}

// data/news/<シャード>.json の中身。ノードID（p:xxx, g:xxx）→ NewsEntry
export type NewsShard = Record<string, NewsEntry>

// 全ノードを 1 ファイルにすると数十 MB になり、読み込むだけでテストやビルドが
// メモリ不足になるため、ノードIDのハッシュで 256 ファイルに分け、必要な分だけ読む
export const NEWS_DIR = join(process.cwd(), "data", "news")
const SHARD_COUNT = 256

// ノードIDの属するシャード名（"00"〜"ff"）。FNV-1a 32bit
export const newsShardOf = (nodeId: string): string => {
  let h = 0x811c9dc5
  for (let i = 0; i < nodeId.length; i++) {
    h ^= nodeId.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return ((h >>> 0) % SHARD_COUNT).toString(16).padStart(2, "0")
}

export const readNewsShard = (dir: string, shard: string): NewsShard => {
  const path = join(dir, `${shard}.json`)
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {}
}

// 1ノード1行で書き出す（差分が読みやすく、インデント分のサイズも省ける）
export const writeNewsShard = (dir: string, shard: string, data: NewsShard) => {
  mkdirSync(dir, { recursive: true })
  const lines = Object.keys(data)
    .sort()
    .map((id) => `${JSON.stringify(id)}:${JSON.stringify(data[id])}`)
  writeFileSync(join(dir, `${shard}.json`), `{\n${lines.join(",\n")}\n}\n`)
}

// Google News RSS の URL を生成（名前をクエリに含める）
export const newsRssUrl = (name: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(name)}&hl=ja&gl=JP&ceid=JP:ja`

// RFC 822 日付を ISO 8601 (YYYY-MM-DD) に変換
export const parseRfc822 = (date: string): string | null => {
  const d = new Date(date)
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

// RSS XML をパースして記事を抽出
export const parseRss = (xml: string): NewsArticle[] => {
  const items: NewsArticle[] = []
  // <item>...</item> を抽出（正規表現で簡易的に）
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)
  for (const m of itemMatches) {
    const itemXml = m[1]
    const title = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/)?.[1]
      ?? itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]
    const link = itemXml.match(/<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>|<link>([\s\S]*?)<\/link>/)?.[1]
      ?? itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1]
    const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]
    const source = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]

    if (title && link && pubDate) {
      items.push({
        title: title.replace(/<!\[CDATA\[|\]\]>/g, "").trim(),
        link: link.replace(/<!\[CDATA\[|\]\]>/g, "").trim(),
        pubDate: pubDate.trim(),
        source: source?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() ?? "Google News",
      })
    }
  }
  return items
}

// 記事を日付の新しい順に並べ、指定数まで絞る
export const sortAndLimit = (articles: NewsArticle[], limit: number): NewsArticle[] =>
  articles
    .filter((a) => parseRfc822(a.pubDate)) // 有効な日付のみ
    .sort((a, b) => parseRfc822(b.pubDate)!.localeCompare(parseRfc822(a.pubDate)!))
    .slice(0, limit)

// ノードIDから NewsEntry を引く。読んだシャードは直近 CACHE_SIZE 個だけ保持する
const CACHE_SIZE = 16
export const newsStore = (dir: string = NEWS_DIR) => {
  const cache = new Map<string, NewsShard>()
  const shardOf = (shard: string) => {
    let data = cache.get(shard)
    if (data) {
      cache.delete(shard)
    } else {
      data = readNewsShard(dir, shard)
      if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value!)
    }
    cache.set(shard, data)
    return data
  }
  return (nodeId: string, limit = 5): NewsEntry | null => {
    const entry = shardOf(newsShardOf(nodeId))[nodeId]
    return entry
      ? { fetched_at: entry.fetched_at, items: sortAndLimit(entry.items, limit) }
      : null
  }
}

// 取得日時を日本時間の「YYYY-MM-DD HH:mm」にする。日付だけのものはそのまま返す
export const formatFetchedAt = (fetchedAt: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(fetchedAt)) return fetchedAt
  const d = new Date(fetchedAt)
  if (isNaN(d.getTime())) return fetchedAt
  return d
    .toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" })
    .slice(0, 16)
}

// 最終取得から refreshDays 日以上経っていれば再取得する
export const needsRefresh = (
  fetchedAt: string | null,
  now: Date,
  refreshDays: number
): boolean => {
  if (!fetchedAt) return true
  const t = new Date(fetchedAt).getTime()
  if (isNaN(t)) return true
  return now.getTime() - t >= refreshDays * 24 * 60 * 60 * 1000
}
