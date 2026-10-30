// 劇場・ライブの公演を集め、出演者と所属芸人・グループを照合して data/lives.json に保存する。
// 毎回取り直す（1秒に1リクエスト）。日付と出演者が一覧で取れる掲載元だけを使う。
//   FANYチケット（吉本）: 全公演を10件ずつ。出演者欄の名前を吉本所属の名前と照合
//   マセキ芸能社: スケジュール（数か月分が1ページ）の LIVE・STAGE。出演者名で照合
//   ワタナベエンターテインメント: 月別 JSON。出演者のタレント id を公式プロフィールの出典 id と照合
//   松竹芸能: 月別の公演一覧。出演者欄の名前で照合
//   npx tsx scripts/collect-lives.ts
import { writeFileSync } from "node:fs"
import { db } from "@/lib/db"
import {
  FANY,
  liveDate,
  liveTime,
  nameKey,
  parseMaseki,
  parseShochiku,
  performerNames,
  type Live,
  type LivesDump,
} from "@/lib/lives"

const OUT = new URL("../data/lives.json", import.meta.url)
const MONTHS = 3 // 今月から何か月分見るか
const WAIT_MS = 1000
const HEADERS = {
  "User-Agent": "geinin-db importer (fact extraction, 1 req/s)",
  "Accept-Language": "ja",
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const get = async (url: string) => {
  try {
    const res = await fetch(url, { headers: HEADERS })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    await sleep(WAIT_MS)
  }
}

const nodes = [
  ...db.people.map((e) => ["p", e] as const),
  ...db.groups.map((e) => ["g", e] as const),
]
// 名前 → ノード id。他事務所との同名や事務所内の同名は誤りやすいので、その事務所で一意な名前だけ使う
const namesOf = (agency: string) => {
  const ids = Map.groupBy(
    nodes
      .filter(([, e]) => e.agency_id === agency)
      .flatMap(([k, e]) =>
        [e.name, ...e.aliases].map((n) => [nameKey(n), `${k}:${e.id}`] as const)
      ),
    ([n]) => n
  )
  const nodeOf = new Map(
    [...ids].flatMap(([n, v]) =>
      new Set(v.map(([, id]) => id)).size === 1 ? [[n, v[0][1]] as const] : []
    )
  )
  return (names: string[]) => [
    ...new Set(names.flatMap((n) => nodeOf.get(n) ?? [])),
  ]
}

const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" })
const months = Array.from({ length: MONTHS }, (_, i) => {
  const d = new Date(`${today.slice(0, 7)}-01`)
  d.setMonth(d.getMonth() + i)
  return { y: d.getFullYear(), m: d.getMonth() + 1 }
})
const lives: Live[] = []
const add = (l: Omit<Live, "cast">, cast: string[]) => {
  if (cast.length && l.date >= today) lives.push({ ...l, cast })
}

type Performance = {
  id: number
  event_id: number
  name: string
  venue_name: string
  performance_date: string
  start_time: string
  performer_detail: string | null
}
const yoshimoto = namesOf("yoshimoto")
for (let offset = 0; ;) {
  const { performances, load_count } = JSON.parse(
    await get(`${FANY}/search/event_more?offset=${offset}`)
  ) as { performances: Performance[]; load_count: number }
  for (const p of performances) {
    const date = liveDate(p.performance_date)
    if (date)
      add(
        {
          date,
          start: liveTime(p.start_time),
          title: p.name.trim(),
          venue: p.venue_name,
          url: `${FANY}/event/detail/${p.event_id}/${p.id}`,
          source: "FANYチケット",
        },
        yoshimoto(performerNames(p.performer_detail ?? ""))
      )
  }
  if (!load_count) break
  offset += load_count
  if (offset % 500 === 0) console.log(`FANY ${offset}件`)
}

const maseki = namesOf("maseki")
for (const l of parseMaseki(await get("https://www.maseki.co.jp/schedule/")))
  add(
    {
      date: l.date,
      start: l.start,
      title: l.title,
      venue: null,
      url: new URL(l.url ?? "/schedule/", "https://www.maseki.co.jp").href,
      source: "マセキ芸能社",
    },
    maseki(l.names)
  )

// タレント id → ノード id。コンビとメンバーで同じページを共有するときはコンビに付ける
const watanabe = Map.groupBy(
  nodes.flatMap(([k, e]) =>
    e.source_ids
      .filter((s) => s.startsWith("watanabe:"))
      .map((s) => [s.slice(9), k, `${k}:${e.id}`] as const)
  ),
  ([id]) => id
)
const watanabeOf = (id: string) => {
  const v = watanabe.get(id) ?? []
  const groups = v.filter(([, k]) => k === "g")
  return (groups.length ? groups : v).map(([, , n]) => n)
}
type WatanabeSchedule = {
  schedule_id: string
  title: string
  casts: string
  place: string
  event_date_ymd: string
  start_time: string | null
}
for (const { y, m } of months) {
  const { schedule } = JSON.parse(
    await get(
      `https://www.watanabepro.co.jp/liveinfo/json/${y}${String(m).padStart(2, "0")}.json`
    )
  ) as { schedule: WatanabeSchedule[] }
  for (const s of schedule)
    add(
      {
        date: s.event_date_ymd.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"),
        start: liveTime(s.start_time),
        title: s.title,
        // 自由記述。「◆公演概要」のような見出しと「（住所）」を除いた最初の行を会場名とする
        venue:
          s.place
            .replace(/<[^>]+>/g, "\n")
            .split(/\r?\n/)
            .map((x) =>
              x
                .replace(/\s*[（(].*$/, "")
                .replace(/\s+/g, " ")
                .trim()
            )
            .find((x) => x && !x.startsWith("◆")) ?? null,
        // 公演ごとのページは無いので一覧へ
        url: "https://www.watanabepro.co.jp/liveinfo/",
        source: "ワタナベエンターテインメント",
      },
      [...new Set(s.casts.split("/").filter(Boolean).flatMap(watanabeOf))]
    )
}

const shochiku = namesOf("shochiku")
for (const { y, m } of months)
  for (const { names, ...l } of parseShochiku(
    await get(
      `https://www.shochikugeino.co.jp/topics/events/?yearId=${y}&monthId=${m}`
    ),
    y
  ))
    add({ ...l, venue: null, source: "松竹芸能" }, shochiku(names))

const dump: LivesDump = { fetched_at: today, lives }
writeFileSync(OUT, `${JSON.stringify(dump)}\n`)
const count = Map.groupBy(lives, (l) => l.source)
console.log(
  [...count].map(([s, ls]) => `${s} ${ls.length}公演`).join(" / "),
  "を保存しました"
)
