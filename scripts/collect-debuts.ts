// デビュー年が未登録の芸人を日本語版 Wikipedia で調べ、data/debuts.json に保存する。
// 記事の基礎情報（Infobox）の「活動時期」「活動期間」「デビュー」から最初の年だけを取り出す。本文は転載しない。
// 見つからなかった人も null で記録し、再実行時は未調査の人だけを調べる。1秒1リクエスト。
//   npx tsx scripts/collect-debuts.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { db } from "@/lib/db"
import type { DebutDump } from "@/lib/debuts"
import {
  cluesOf,
  fetchPages,
  isAmbiguous,
  SUFFIXES,
  type Page,
} from "./wikipedia"

const OUT = new URL("../data/debuts.json", import.meta.url)
const COMEDY = /お笑い|芸人|漫才|落語|コント|吉本|NSC/
const thisYear = new Date().getFullYear()

const dump: DebutDump = existsSync(OUT)
  ? JSON.parse(readFileSync(OUT, "utf8"))
  : { fetched_at: "", debuts: {} }

// 最初の Infobox から活動開始年を取る。コンビ等の記事（結成年・メンバー欄あり）は本人のデビューと限らないので除く
const debutYear = (c: string, clues: string[]) => {
  if (!COMEDY.test(c)) return null
  if (clues.length && !clues.some((w) => c.includes(w))) return null
  const box = c.slice(0, c.indexOf("\n}}") + 1 || 5000)
  if (/^\s*\|\s*(結成年|メンバー)\s*=/m.test(box)) return null
  const field = box.match(/^\s*\|\s*(?:活動時期|活動期間|デビュー)\s*=(.*)$/m)
  const y = Number(field?.[1].match(/(?:19|20)\d{2}/)?.[0])
  return y >= 1900 && y <= thisYear ? y : null
}

const save = () => {
  dump.fetched_at = new Date().toISOString().slice(0, 10)
  writeFileSync(OUT, `${JSON.stringify(dump, null, 2)}\n`)
}

const todo = db.people.filter((p) => !p.debut_date && !(p.id in dump.debuts))
console.log(`${todo.length}人を調査`)
for (let i = 0; i < todo.length; i += 50) {
  const batch = todo.slice(i, i + 50)
  const pages = await fetchPages(batch.map((p) => p.name))
  const ambiguous = batch.filter((p) =>
    isAmbiguous(pages.get(p.name)?.content ?? "")
  )
  const retry = ambiguous.length
    ? await fetchPages(
        ambiguous.flatMap((p) => SUFFIXES.map((s) => `${p.name} ${s}`))
      )
    : new Map<string, Page | undefined>()
  for (const p of batch) {
    const clues = cluesOf(p.id, p.agency_id)
    const candidates = isAmbiguous(pages.get(p.name)?.content ?? "")
      ? SUFFIXES.map((s) => retry.get(`${p.name} ${s}`))
      : [pages.get(p.name)]
    const hit = candidates
      .filter((pg) => pg && !pg.missing)
      .map((pg) => ({ year: debutYear(pg!.content, clues), title: pg!.title }))
      .find((h) => h.year)
    dump.debuts[p.id] = hit ? { year: hit.year!, title: hit.title } : null
  }
  save()
  console.log(`${Math.min(i + 50, todo.length)}/${todo.length}`)
}
