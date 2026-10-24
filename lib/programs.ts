// scripts/collect-programs.ts が Wikipedia 日本語版から集めたテレビ出演番組（二次情報・未照合）
// status: 放送期間か節の見出しから判断。どちらからも分からなければ null
export type ProgramStatus = "current" | "past" | null
export type Program = {
  title: string
  note: string | null
  status: ProgramStatus
}
export type ProgramsDump = {
  fetched_at: string
  // ノード id → 記事名と番組。調べて該当がなかったノードは none に入れる
  nodes: Record<string, { page: string; items: Program[] }>
  none: string[]
}

// 1ノードあたりの上限。長寿芸人は数百件あるため
export const PROGRAM_LIMIT = 60

// 拾う節: テレビ・バラエティ系。ドラマ・ラジオなどは除く
const TV = /テレビ|バラエティ|レギュラー|特番|特別番組|出演番組|ゲスト/
const NOT_TV =
  /ドラマ|アニメ|映画|ラジオ|CM|配信|ウェブ|Web|ネット|DVD|舞台|ビデオ|ミュージック|書籍|ゲーム/

// ウィキ記法を表示用の文字列にする
export const cleanWikitext = (s: string) => {
  let t = s
    .replace(/<ref[^>]*\/>/g, "")
    .replace(/<ref[^>]*>.*?<\/ref>/g, "")
    .replace(/<!--.*?-->/g, "")
  // 入れ子のテンプレートは内側から消す
  for (let prev = ""; prev !== t;) {
    prev = t
    t = t.replace(/\{\{[^{}]*\}\}/g, "")
  }
  return t
    .replace(/\[\[(?:File|ファイル|画像):[^\]]*\]\]/g, "")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/\[https?:\/\/\S+\s([^\]]*)\]/g, "$1")
    .replace(/'{2,}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const STATIONS =
  /^(NHK(総合)?|Eテレ|日本テレビ|フジテレビ|TBS(テレビ)?|テレビ朝日|テレビ東京|読売テレビ|毎日放送|MBS|朝日放送|ABC|関西テレビ|BS.{0,4}|CS)$/

// 局名だけの行（下の階層に番組が並ぶ書き方）
const isStation = (text: string) =>
  !/[（(]/.test(text) && /テレビ|放送|NHK|TBS|BS|CS|系$/.test(text)

// 「1997年 - 」「放送中」は出演中、「1995年4月 - 1996年3月」は終了
const statusOfNote = (note: string): ProgramStatus =>
  /放送中|現在/.test(note) || /[-–〜]\s*(?:[、,]|$)/.test(note)
    ? "current"
    : /[-–〜]\s*\d/.test(note)
      ? "past"
      : null

// 「番組名（局、期間）- 役割」→ 番組名と括弧内
export const toProgram = (
  line: string,
  status: ProgramStatus
): Program | null => {
  const text = cleanWikitext(line)
  const title = text.split(/（|\(| - |：/)[0].trim()
  // 局名だけ・記号だけの行は番組ではない
  if (title.length < 2 || title.length > 60 || STATIONS.test(title)) return null
  const note = text.match(/[（(]([^（）()]*)[）)]/)?.[1].trim() || null
  return { title, note, status: (note ? statusOfNote(note) : null) ?? status }
}

const statusOfLabel = (label: string): ProgramStatus =>
  /過去|終了/.test(label) ? "past" : /現在/.test(label) ? "current" : null

export const extractPrograms = (wikitext: string): Program[] => {
  const items: Program[] = []
  let inTv = false
  let skip = false
  let status: ProgramStatus = null
  let stationParent = false
  for (const raw of wikitext.split("\n")) {
    const line = raw.trim()
    const heading = line.match(/^(=+)\s*(.+?)\s*\1$/)
    if (heading) {
      const h = cleanWikitext(heading[2])
      inTv = TV.test(h) && !NOT_TV.test(h)
      skip = false
      status = statusOfLabel(h)
      continue
    }
    if (!inTv || !line) continue
    const bullet = line.match(/^(\*+)\s*(.*)$/)
    if (!bullet) {
      // 「'''過去の出演番組'''」や {{Dl2 | ドラマ |}} の見出し代わりの行
      const label = cleanWikitext(line.replace(/^\|/, "").replace(/\|$/, ""))
      if (label && label.length < 40) {
        status = statusOfLabel(label)
        skip = NOT_TV.test(label)
      }
      continue
    }
    if (skip) continue
    const depth = bullet[1].length
    if (depth === 1) {
      stationParent = isStation(cleanWikitext(bullet[2]))
      if (stationParent) continue
    } else if (!(depth === 2 && stationParent)) continue
    const p = toProgram(bullet[2], status)
    if (p) items.push(p)
  }
  // 上限で切るときは出演中の番組を残す
  const order = { current: 0, null: 1, past: 2 }
  return [...new Map(items.map((p) => [p.title, p])).values()]
    .toSorted((a, b) => order[`${a.status}`] - order[`${b.status}`])
    .slice(0, PROGRAM_LIMIT)
}
