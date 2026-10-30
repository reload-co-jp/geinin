// scripts/collect-lives.ts が FANYチケット（吉本）と各事務所の公演情報ページから集めた公演
export type Live = {
  date: string // YYYY-MM-DD
  start: string | null // HH:MM
  title: string
  venue: string | null // 一覧に会場が載らない事務所もある
  url: string
  source: string // 掲載元（「FANYチケット」「マセキ芸能社」など）
  // 出演者欄と一致した芸人・グループのノード id
  cast: string[]
}
export type LivesDump = {
  fetched_at: string
  lives: Live[]
}

export const FANY = "https://ticket.fany.lol"

// 名前の表記ゆれ（全角半角・空白）を吸収して照合する
export const nameKey = (s: string) => s.normalize("NFKC").replace(/\s+/g, "")

// 「[漫才・落語]A／B\r\n[新喜劇]C」「MC：D」「E（ゲスト）／他」のような出演者欄から名前だけを取り出す
export const performerNames = (detail: string) => [
  ...new Set(
    detail
      .normalize("NFKC")
      .replace(/\[[^\]]*\]|\([^)]*\)|【[^】]*】/g, "/")
      .split(/[/／、,\n]/)
      .map((s) => nameKey(s.replace(/^[^:]*:/, "")))
      .filter((s) => s && s !== "他" && s !== "ほか")
  ),
]

// "2026/10/30(<span>金</span>)" → "2026-10-30"。期間券など日付の無いものは null
export const liveDate = (s: string) =>
  /^\d{4}\/\d{2}\/\d{2}/.test(s) ? s.slice(0, 10).replaceAll("/", "-") : null

// "110000" / "11:00" / "18：30開演" → "11:00"
export const liveTime = (s: string | null) => {
  const m = s?.normalize("NFKC").match(/(\d{1,2}):?(\d{2})/)
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null
}

// 松竹の一覧の「2026年10月2日（金）18：00開場・18：30開演」から開演時刻を取る
export const startTime = (s: string) => {
  const t = s.normalize("NFKC")
  return liveTime(
    t.match(/(\d{1,2}:\d{2})\s*開演/)?.[1] ??
      t.match(/\d{1,2}:\d{2}/)?.[0] ??
      null
  )
}

// タグを除き、よく出る文字参照だけ戻す
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;?/g, " ")
    .replace(/&#0?38;|&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .trim()

// マセキのスケジュール（1ページに数か月分）から LIVE・STAGE の行を取り出す
export const parseMaseki = (html: string) => {
  const out: {
    date: string
    start: string | null
    title: string
    url: string | null
    names: string[]
  }[] = []
  // 日付見出しの後に続く行がその日の予定
  for (const day of html.split(/<a id="day_/).slice(1)) {
    const [, m, d] = day.match(/^(\d+)_(\d+)"/) ?? []
    const y = day.match(/<div>(\d{4})<\/div>/)?.[1]
    if (!m || !y) continue
    for (const row of day.split(/<tr(?=[\s>])/).slice(1)) {
      if (!/<p\s*>(LIVE|STAGE)<\/p>/.test(row)) continue
      const title = text(row.match(/<b>([\s\S]*?)<\/b>/)?.[1] ?? "")
      if (!title) continue
      out.push({
        date: `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`,
        start: liveTime(row.match(/<div>([\d:]+)&nbsp/)?.[1] ?? null),
        title,
        url: row.match(/data-url="([^"]+)"/)?.[1] ?? null,
        names: [
          ...row.matchAll(
            /talent_photoname_list_name"><p>&nbsp;<\/p>([^<]+)</g
          ),
        ].map((x) => nameKey(x[1])),
      })
    }
  }
  return out
}

// 松竹芸能の月別公演一覧
export const parseShochiku = (html: string, year: number) =>
  html
    // 終了した公演は class="event-end"、これからの公演は class=""
    .split(/<li class="(?:event-end)?">/)
    .slice(1)
    .flatMap((li) => {
      const [, m, d] = li.match(/event-data en">(\d{2})\.(\d{2})/) ?? []
      const title = text(li.match(/event-title">([\s\S]*?)<\/h3>/)?.[1] ?? "")
      const url = li.match(/href="([^"]+\/topics\/events\/\d+\/)"/)?.[1]
      if (!m || !title || !url) return []
      const dd = (k: string) =>
        li.match(new RegExp(`<dt>${k}</dt>\\s*<dd>([\\s\\S]*?)</dd>`))?.[1] ??
        ""
      return [
        {
          date: `${year}-${m}-${d}`,
          start: startTime(dd("公演時間")),
          title,
          url,
          names: performerNames(text(dd("出演"))),
        },
      ]
    })

// ノード id → 今日以降の公演（日付順）
export const livesIndex = (dump: LivesDump, today: string) => {
  const by = new Map<string, Live[]>()
  for (const l of dump.lives
    .filter((l) => l.date >= today)
    .toSorted(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.start ?? "").localeCompare(b.start ?? "")
    ))
    for (const id of l.cast) by.set(id, [...(by.get(id) ?? []), l])
  return (nodeId: string) => by.get(nodeId) ?? []
}
