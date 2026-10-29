// scripts/collect-x.ts が公式プロフィールから集めた X（旧Twitter）アカウント
export type XAccount = {
  handle: string
  // 以下は X API で取れたときだけ。取れなければリンクのみ出す
  name?: string
  description?: string
  location?: string
  url?: string
  followers?: number
  created_at?: string
}
export type XDump = {
  fetched_at: string
  // 出典 id → ページに載っていたハンドル。空配列は「調べたが無かった」
  pages: Record<string, string[]>
  // 小文字のハンドル → X API の取得結果
  accounts: Record<string, XAccount>
}

// 事務所公式アカウントのように多数のページに載るものは本人のものではない（youtube.ts と同じ）
const SHARED_LIMIT = 15
// x.com/share のようなアカウントでないパス
const NOT_HANDLE = new Set(
  "share intent home i hashtag search login signup explore settings messages notifications tos privacy widgets".split(
    " "
  )
)

// プロフィールページ中のアカウント。共有ボタン・投稿へのリンクのパスは除く
export const xHandles = (html: string) => [
  ...new Set(
    [
      ...html.matchAll(
        /https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/(?:#!\/)?@?([A-Za-z0-9_]{1,15})(?![A-Za-z0-9_])/g
      ),
    ]
      .map((m) => m[1].toLowerCase())
      .filter((h) => !NOT_HANDLE.has(h))
  ),
]

export const xIndex = (dump: XDump) => {
  const count = new Map<string, number>()
  for (const hs of Object.values(dump.pages))
    for (const h of hs) count.set(h, (count.get(h) ?? 0) + 1)
  // コンビのメンバーのページには相方やコンビのアカウントも載るので、
  // 個人には他のページに載らないものだけを本人のものとして付ける
  return (sourceIds: string[], personal: boolean): XAccount[] =>
    [...new Set(sourceIds.flatMap((s) => dump.pages[s] ?? []))]
      .filter((h) => (count.get(h) ?? 0) < (personal ? 2 : SHARED_LIMIT))
      .map((h) => dump.accounts[h] ?? { handle: h })
}

export const xUrl = (handle: string) => `https://x.com/${handle}`
