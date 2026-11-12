// Google News RSS から芸人・グループの記事を収集し、data/news/<シャード>.json に保存する。
// 全ての芸人・グループを対象にする。
// ノードごとに最終取得日時（fetched_at）を記録し、
// REFRESH_DAYS 日以内に取得済みのノードはスキップする。
//   npx tsx scripts/collect-news.ts
import { db } from "@/lib/db"
import {
  NEWS_DIR,
  needsRefresh,
  newsRssUrl,
  newsShardOf,
  parseRss,
  readNewsShard,
  sortAndLimit,
  writeNewsShard,
  type NewsShard,
} from "@/lib/news"

const WAIT_MS = 1000
// 1人あたりの保存件数。画面に出すのは最大5件なので、表示分だけ残す
const MAX_ARTICLES = 5
const REFRESH_DAYS = 7 // 最終取得からこの日数が経ったら取り直す
const HEADERS = {
  "User-Agent": "geinin-db importer (news collection, 1 req/s)",
  "Accept-Language": "ja",
}

// 読み込んだシャードと、未保存の変更があるシャード
const shards = new Map<string, NewsShard>()
const dirty = new Set<string>()
const shardOf = (shard: string) => {
  let data = shards.get(shard)
  if (!data) shards.set(shard, (data = readNewsShard(NEWS_DIR, shard)))
  return data
}
const save = () => {
  for (const shard of dirty) writeNewsShard(NEWS_DIR, shard, shards.get(shard)!)
  dirty.clear()
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
].filter((t) => t.name.trim()) // 名前が空では検索できない
const count = (prefix: string) =>
  targets.filter((t) => t.nodeId.startsWith(prefix)).length
console.log(`対象: ${targets.length}件 (芸人 ${count("p:")} / グループ ${count("g:")})`)

for (const [i, e] of targets.entries()) {
  const { nodeId } = e
  // 最近取得済みならスキップ
  const shard = newsShardOf(nodeId)
  const fetchedAt = shardOf(shard)[nodeId]?.fetched_at ?? null
  if (!needsRefresh(fetchedAt, new Date(), REFRESH_DAYS)) {
    console.log(`  [${i + 1}/${targets.length}] ${e.name} - スキップ（${fetchedAt} 取得済み）`)
    continue
  }

  const rssUrl = newsRssUrl(e.name)
  const xml = await get(rssUrl)
  if (xml) {
    const articles = sortAndLimit(parseRss(xml), MAX_ARTICLES)
    shardOf(shard)[nodeId] = { fetched_at: new Date().toISOString(), items: articles }
    dirty.add(shard)
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