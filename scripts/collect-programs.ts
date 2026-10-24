// 芸人・コンビのテレビ出演番組（バラエティ等）を日本語版 Wikipedia で調べ、data/programs.json に保存する。
// 「テレビ番組」「バラエティ」などの節の箇条書きから番組名・局と期間だけを取り出す。本文は転載しない。
// 該当なしも記録し、再実行時は未調査のノードだけを調べる。50件ずつ、2秒に1リクエスト。
//   npx tsx scripts/collect-programs.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { db } from "@/lib/db"
import { extractPrograms, type ProgramsDump } from "@/lib/programs"
import {
  cluesOf,
  fetchPages,
  isAmbiguous,
  SUFFIXES,
  type Page,
} from "./wikipedia"

const OUT = new URL("../data/programs.json", import.meta.url)
const GROUP_SUFFIXES = ["(お笑いコンビ)", "(お笑いトリオ)", "(お笑いグループ)"]
const COMEDY = /お笑い|芸人|漫才|コント|吉本|NSC/

const dump: ProgramsDump = existsSync(OUT)
  ? JSON.parse(readFileSync(OUT, "utf8"))
  : { fetched_at: "", nodes: {}, none: [] }
const done = new Set([...Object.keys(dump.nodes), ...dump.none])

type Target = {
  id: string
  name: string
  clues: string[]
  isGroup: boolean
}
// 事務所名だけでは同じ事務所の別コンビを拾うため、相方・メンバー名が分かればそちらを必須にする
const personName = new Map(db.people.map((p) => [p.id, p.name]))
const groupName = new Map(db.groups.map((g) => [g.id, g.name]))
const strong = (names: (string | undefined)[], fallback: string[]) => {
  const xs = names.filter((n): n is string => !!n)
  return xs.length ? xs : fallback
}
const targets: Target[] = [
  ...db.people.map((p) => ({
    id: `p:${p.id}`,
    name: p.name,
    clues: strong(
      db.memberships
        .filter((m) => m.person_id === p.id)
        .map((m) => groupName.get(m.group_id)),
      cluesOf(p.id, p.agency_id)
    ),
    isGroup: false,
  })),
  ...db.groups.map((g) => ({
    id: `g:${g.id}`,
    name: g.name,
    clues: strong(
      db.memberships
        .filter((m) => m.group_id === g.id)
        .map((m) => personName.get(m.person_id)),
      cluesOf("", g.agency_id)
    ),
    isGroup: true,
  })),
].filter((t) => !done.has(t.id))

// 同名の別人・コンビ記事へのリダイレクトを拾わないよう、記事の種類と手がかりの語を確かめる
const matches = (c: string, t: Target) => {
  if (!COMEDY.test(c)) return false
  if (t.clues.length && !t.clues.some((w) => c.includes(w))) return false
  const box = c.slice(0, c.indexOf("\n}}") + 1 || 5000)
  // 「メンバー1 =」形式や Infobox 名でもコンビ記事と分かるようにする
  const isGroupPage =
    /Infobox お笑い(コンビ|トリオ|グループ|ユニット)/.test(c) ||
    /^\s*\|\s*(結成年|メンバー\d*)\s*=/m.test(box)
  return isGroupPage === t.isGroup
}

const save = () => {
  dump.fetched_at = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Asia/Tokyo",
  })
  writeFileSync(OUT, `${JSON.stringify(dump, null, 2)}\n`)
}

console.log(`${targets.length}件を調査`)
for (let i = 0; i < targets.length; i += 50) {
  const batch = targets.slice(i, i + 50)
  const pages = await fetchPages([...new Set(batch.map((t) => t.name))])
  const suffixes = (t: Target) => (t.isGroup ? GROUP_SUFFIXES : SUFFIXES)
  const ambiguous = batch.filter((t) =>
    isAmbiguous(pages.get(t.name)?.content ?? "")
  )
  const retry = ambiguous.length
    ? await fetchPages(
        ambiguous.flatMap((t) => suffixes(t).map((s) => `${t.name} ${s}`))
      )
    : new Map<string, Page | undefined>()
  for (const t of batch) {
    const candidates = isAmbiguous(pages.get(t.name)?.content ?? "")
      ? suffixes(t).map((s) => retry.get(`${t.name} ${s}`))
      : [pages.get(t.name)]
    const page = candidates.find(
      (pg) => pg && !pg.missing && matches(pg.content, t)
    )
    const items = page ? extractPrograms(page.content) : []
    if (items.length) dump.nodes[t.id] = { page: page!.title, items }
    else dump.none.push(t.id)
  }
  save()
  console.log(`${Math.min(i + 50, targets.length)}/${targets.length}`)
}
