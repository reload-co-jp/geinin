// Google News RSS から芸人・グループの記事を収集し、data/news.json に保存する。
// 全ての芸人・グループを対象にする。
// ノードごとに最終取得日時を data/news.json の fetched に記録し、
// REFRESH_DAYS 日以内に取得済みのノードはスキップする。
//   npx tsx scripts/collect-news.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { db } from "@/lib/db"
import {
  needsRefresh,
  newsFetchedAt,
  newsRssUrl,
  parseRss,
  type NewsDump,
} from "@/lib/news"

const OUT = new URL("../data/news.json", import.meta.url)
const WAIT_MS = 1000
const MAX_ARTICLES = 10 // 1人あたり最大取得件数
const REFRESH_DAYS = 7 // 最終取得からこの日数が経ったら取り直す
const HEADERS = {
  "User-Agent": "geinin-db importer (news collection, 1 req/s)",
  "Accept-Language": "ja",
}

const dump: NewsDump = existsSync(OUT)
  ? JSON.parse(readFileSync(OUT, "utf8"))
  : { fetched_at: "", items: {} }
// ノード別の取得日時が無い旧データは、ダンプ全体の取得日時で埋めておく
dump.fetched ??= {}
for (const nodeId of Object.keys(dump.items)) {
  const at = newsFetchedAt(dump, nodeId)
  if (at) dump.fetched[nodeId] ??= at
}
const save = () => {
  dump.fetched_at = new Date().toISOString()
  writeFileSync(OUT, `${JSON.stringify(dump, null, 2)}\n`)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const get = async (url: string) => {
  try {
    const res = await fetch(url, { headers: HEADERS })
    if (res.ok) return await res.text()
    console.warn(`${url} HTTP ${res.status}`)
  } catch (e) {
    console.warn(`${url} ${(e as Error).message}`)
  } finally {
    await sleep(WAIT_MS)
  }
  return null
}

// 全ての芸人・グループを対象にする
// （id 自体には接頭辞が無いので、people は p:、groups は g: を付けてノードIDにする）
const targets = [
  ...db.people.map((e) => ({ nodeId: `p:${e.id}`, name: e.name })),
  ...db.groups.map((e) => ({ nodeId: `g:${e.id}`, name: e.name })),
]
const count = (prefix: string) =>
  targets.filter((t) => t.nodeId.startsWith(prefix)).length
console.log(`対象: ${targets.length}件 (芸人 ${count("p:")} / グループ ${count("g:")})`)

for (const [i, e] of targets.entries()) {
  const { nodeId } = e
  // 最近取得済みならスキップ
  const fetchedAt = newsFetchedAt(dump, nodeId)
  if (!needsRefresh(fetchedAt, new Date(), REFRESH_DAYS)) {
    console.log(`  [${i + 1}/${targets.length}] ${e.name} - スキップ（${fetchedAt} 取得済み）`)
    continue
  }

  const rssUrl = newsRssUrl(e.name)
  const xml = await get(rssUrl)
  if (xml) {
    const articles = parseRss(xml).slice(0, MAX_ARTICLES)
    dump.items[nodeId] = articles
    dump.fetched![nodeId] = new Date().toISOString()
    console.log(`  [${i + 1}/${targets.length}] ${e.name} - ${articles.length}件`)
  } else {
    // 失敗時は既存の記事と取得日時を残し、次回に取り直す
    console.log(`  [${i + 1}/${targets.length}] ${e.name} - 取得失敗`)
  }

  if (i % 20 === 19) {
    save()
    console.log(`  保存: ${i + 1}/${targets.length}`)
  }
}

save()
console.log("完了")