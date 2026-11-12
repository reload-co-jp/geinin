// Google News RSS から芸人・グループの記事を収集し、data/news.json に保存する。
// isThin で薄いページ（コンテンツが少ない）だけを対象にする。
//   npx tsx scripts/collect-news.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { db, isThin, nodeInfo } from "@/lib/db"
import { newsRssUrl, parseRss, type NewsDump } from "@/lib/news"

const OUT = new URL("../data/news.json", import.meta.url)
const WAIT_MS = 1000
const MAX_ARTICLES = 10 // 1人あたり最大取得件数
const HEADERS = {
  "User-Agent": "geinin-db importer (news collection, 1 req/s)",
  "Accept-Language": "ja",
}

const dump: NewsDump = existsSync(OUT)
  ? JSON.parse(readFileSync(OUT, "utf8"))
  : { fetched_at: "", items: {} }
const save = () => {
  dump.fetched_at = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Asia/Tokyo",
  })
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

// isThin な芸人・グループを対象にする
const targets = [...db.people, ...db.groups].filter((e) => isThin(e.id.startsWith("p:") ? `p:${e.id}` : `g:${e.id}`))
console.log(`対象: ${targets.length}件 (芸人 ${targets.filter((t) => t.id.startsWith("p:")).length} / グループ ${targets.filter((t) => t.id.startsWith("g:")).length})`)

for (const [i, e] of targets.entries()) {
  const nodeId = e.id.startsWith("p:") ? `p:${e.id}` : `g:${e.id}`
  // 既に取得済みならスキップ
  if (nodeId in dump.items) {
    console.log(`  [${i + 1}/${targets.length}] ${e.name} - スキップ（既存）`)
    continue
  }

  const rssUrl = newsRssUrl(e.name)
  const xml = await get(rssUrl)
  if (xml) {
    const articles = parseRss(xml).slice(0, MAX_ARTICLES)
    dump.items[nodeId] = articles
    console.log(`  [${i + 1}/${targets.length}] ${e.name} - ${articles.length}件`)
  } else {
    dump.items[nodeId] = []
    console.log(`  [${i + 1}/${targets.length}] ${e.name} - 取得失敗`)
  }

  if (i % 20 === 19) {
    save()
    console.log(`  保存: ${i + 1}/${targets.length}`)
  }
}

save()
console.log("完了")