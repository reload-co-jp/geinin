// scripts/collect-youtube.ts が公式プロフィールから集めた YouTube チャンネル
export type YoutubeChannel = {
  url: string
  title: string
  subscribers: number | null
}
export type YoutubeDump = {
  fetched_at: string
  // 出典 id → ページに載っていたチャンネル URL。空配列は「調べたが無かった」
  pages: Record<string, string[]>
  // チャンネル URL → 取得結果。null はチャンネルページが取れなかった
  channels: Record<string, YoutubeChannel | null>
}

// 事務所公式チャンネルのように多数のページに載るものは本人のチャンネルではない
const SHARED_LIMIT = 5

// プロフィールページ中のチャンネル URL。動画・再生リストへのリンクは除く
export const channelUrls = (html: string) => [
  ...new Set(
    [
      ...html.matchAll(
        /https?:\/\/(?:www\.|m\.)?youtube\.com\/(channel\/UC[\w-]{22}|@[^/?#"'<\s]+|c\/[^/?#"'<\s]+|user\/[^/?#"'<\s]+)/g
      ),
    ].map((m) => `https://www.youtube.com/${decodeURIComponent(m[1])}`)
  ),
]

// 「チャンネル登録者数 5.09万人」→ 50900
export const parseSubscribers = (text: string) => {
  const m = text.match(/([\d.,]+)\s*(万|億)?\s*人/)
  if (!m) return null
  const unit = m[2] === "億" ? 1e8 : m[2] === "万" ? 1e4 : 1
  return Math.round(Number(m[1].replace(/,/g, "")) * unit)
}

export const youtubeIndex = (dump: YoutubeDump) => {
  const count = new Map<string, number>()
  for (const urls of Object.values(dump.pages))
    for (const u of urls) count.set(u, (count.get(u) ?? 0) + 1)
  return (sourceIds: string[]): YoutubeChannel[] => {
    const urls = sourceIds.flatMap((s) => dump.pages[s] ?? [])
    const found = urls
      .filter((u) => (count.get(u) ?? 0) < SHARED_LIMIT)
      .flatMap((u) => dump.channels[u] ?? [])
    return [...new Map(found.map((c) => [c.url, c])).values()]
  }
}
