// 芸人・コンビのテレビ出演番組（バラエティ等）を日本語版 Wikipedia で調べ、data/programs.json に保存する。
// 「テレビ番組」「バラエティ」などの節の箇条書きから番組名・局と期間だけを取り出す。本文は転載しない。
// 該当なしも記録し、再実行時は未調査のノードだけを調べる。50件ずつ、2秒に1リクエスト。
//   npx tsx scripts/collect-programs.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { extractPrograms, type ProgramsDump } from "@/lib/programs"
import { findArticles, wikiTargets } from "./wikipedia"

const OUT = new URL("../data/programs.json", import.meta.url)

const dump: ProgramsDump = existsSync(OUT)
  ? JSON.parse(readFileSync(OUT, "utf8"))
  : { fetched_at: "", nodes: {}, none: [] }
const done = new Set([...Object.keys(dump.nodes), ...dump.none])

const targets = wikiTargets().filter((t) => !done.has(t.id))

const save = () => {
  dump.fetched_at = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Asia/Tokyo",
  })
  writeFileSync(OUT, `${JSON.stringify(dump, null, 2)}\n`)
}

console.log(`${targets.length}件を調査`)
for (let i = 0; i < targets.length; i += 50) {
  const batch = targets.slice(i, i + 50)
  const found = await findArticles(batch)
  for (const t of batch) {
    const page = found.get(t.id)
    const items = page ? extractPrograms(page.content) : []
    if (items.length) dump.nodes[t.id] = { page: page!.title, items }
    else dump.none.push(t.id)
  }
  save()
  console.log(`${Math.min(i + 50, targets.length)}/${targets.length}`)
}
