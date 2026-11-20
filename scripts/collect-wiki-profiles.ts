// 芸人・グループの基礎情報を日本語版 Wikipedia の Infobox から集め、data/wiki-profiles.json に保存する。
// 取り出すのは生年月日・没年月日・養成所と期・師匠（リンク先の記事名）・結成年・解散年だけ。本文は転載しない。
// 記事が見つからなかったノードも null で記録し、再実行時は未調査のノードだけを調べる。50件ずつ、2秒に1リクエスト。
//   npx tsx scripts/collect-wiki-profiles.ts [--limit 件数]
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { extractProfile, type WikiProfileDump } from "@/lib/wiki-profiles"
import { findArticles, wikiTargets } from "./wikipedia"

const OUT = new URL("../data/wiki-profiles.json", import.meta.url)
const limitArg = process.argv.indexOf("--limit")
const LIMIT =
  limitArg >= 0 ? Number(process.argv[limitArg + 1]) : Number.POSITIVE_INFINITY

const dump: WikiProfileDump = existsSync(OUT)
  ? JSON.parse(readFileSync(OUT, "utf8"))
  : { fetched_at: "", nodes: {} }

const targets = wikiTargets()
  .filter((t) => !(t.id in dump.nodes))
  .slice(0, LIMIT)

const save = () => {
  dump.fetched_at = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Asia/Tokyo",
  })
  // キー順を固定して差分を小さくする
  dump.nodes = Object.fromEntries(
    Object.entries(dump.nodes).sort(([a], [b]) => (a < b ? -1 : 1))
  )
  writeFileSync(OUT, `${JSON.stringify(dump, null, 2)}\n`)
}

console.log(`${targets.length}件を調査`)
let hits = 0
for (let i = 0; i < targets.length; i += 50) {
  const batch = targets.slice(i, i + 50)
  const found = await findArticles(batch)
  for (const t of batch) {
    const page = found.get(t.id)
    dump.nodes[t.id] = page
      ? extractProfile(page.content, page.title, t.isGroup)
      : null
    if (page) hits++
  }
  save()
  console.log(
    `${Math.min(i + 50, targets.length)}/${targets.length}（記事あり ${hits}）`
  )
}
