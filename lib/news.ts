// Google News RSS から取得した記事
export type NewsArticle = {
  title: string
  link: string
  pubDate: string // RFC 822 形式
  source: string // ニュース提供元
  sourceUrl: string
}

// RSS ダンプ（ビルド時に collect-news.ts が生成）
export type NewsDump = {
  // 収集スクリプトの最終実行日時（ISO 8601。旧データは YYYY-MM-DD）
  fetched_at: string
  // ノードID → そのノードのニュースを最後に取得できた日時（ISO 8601）
  fetched?: Record<string, string>
  // ノードID（p:xxx, g:xxx）→ 記事リスト
  items: Record<string, NewsArticle[]>
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
    const sourceUrl = itemXml.match(/<source[^>]*url="([^"]*)"[^>]*>/)?.[1]

    if (title && link && pubDate) {
      items.push({
        title: title.replace(/<!\[CDATA\[|\]\]>/g, "").trim(),
        link: link.replace(/<!\[CDATA\[|\]\]>/g, "").trim(),
        pubDate: pubDate.trim(),
        source: source?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() ?? "Google News",
        sourceUrl: sourceUrl ?? "",
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

// ダンプからノードIDで記事を取得
export const newsIndex = (dump: NewsDump) => {
  return (nodeId: string, limit = 5): NewsArticle[] => {
    const articles = dump.items[nodeId] ?? []
    return sortAndLimit(articles, limit)
  }
}

// ノードのニュースを最後に取得した日時。ノード別の記録が無い旧データは
// ダンプ全体の fetched_at で代用し、未取得なら null
export const newsFetchedAt = (dump: NewsDump, nodeId: string): string | null =>
  dump.fetched?.[nodeId] ?? (nodeId in dump.items ? dump.fetched_at || null : null)

// 取得日時を日本時間の「YYYY-MM-DD HH:mm」にする。日付だけの旧データはそのまま返す
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
