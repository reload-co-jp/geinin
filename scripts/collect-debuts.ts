// デビュー年が未登録の芸人を日本語版 Wikipedia で調べ、data/debuts.json に保存する。
// 記事の基礎情報（Infobox）の「活動時期」「活動期間」「デビュー」から最初の年だけを取り出す。本文は転載しない。
// 見つからなかった人も null で記録し、再実行時は未調査の人だけを調べる。1秒1リクエスト。
//   npx tsx scripts/collect-debuts.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { db } from "@/lib/db"
import type { DebutDump } from "@/lib/debuts"

const OUT = new URL("../data/debuts.json", import.meta.url)
const API = "https://ja.wikipedia.org/w/api.php"
const WAIT_MS = 2000
// 曖昧さ回避ページだったときに試す記事名
const SUFFIXES = ["(お笑い芸人)", "(お笑いタレント)", "(芸人)", "(タレント)"]
const COMEDY = /お笑い|芸人|漫才|落語|コント|吉本|NSC/
const thisYear = new Date().getFullYear()

const dump: DebutDump = existsSync(OUT)
  ? JSON.parse(readFileSync(OUT, "utf8"))
  : { fetched_at: "", debuts: {} }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type ApiPage = {
  title: string
  missing?: boolean
  revisions?: { slots: { main: { content: string } } }[]
}
type Page = { title: string; missing?: boolean; content: string }
// 50件ずつまとめて取得し、リダイレクトをたどって「指定した記事名 → 記事」の対応を返す
const fetchChunk = async (titles: string[]) => {
  const url = `${API}?${new URLSearchParams({
    action: "query",
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
    format: "json",
    formatversion: "2",
    redirects: "1",
    titles: titles.join("|"),
  })}`
  let res: Response
  // 429・5xx は Retry-After（なければ30秒）待って最大5回やり直す
  for (let n = 0; ; n++) {
    res = await fetch(url, {
      headers: {
        "User-Agent": "geinin-debut-research/0.1 (geinin.reload.co.jp)",
      },
    })
    await sleep(WAIT_MS)
    if (res.ok || n >= 5 || (res.status !== 429 && res.status < 500)) break
    const wait = Number(res.headers.get("retry-after")) || 30
    console.log(`${res.status}: ${wait}秒待機`)
    await sleep(wait * 1000)
  }
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  const { query } = await res.json()
  const alias = new Map<string, string>()
  for (const r of [...(query.normalized ?? []), ...(query.redirects ?? [])])
    alias.set(r.from, r.to)
  const pages = new Map<string, Page>(
    query.pages.map((p: ApiPage) => [
      p.title,
      {
        title: p.title,
        missing: p.missing,
        content: p.revisions?.[0]?.slots.main.content ?? "",
      },
    ])
  )
  const resolve = (t: string): string =>
    alias.has(t) && alias.get(t) !== t ? resolve(alias.get(t)!) : t
  return new Map(titles.map((t) => [t, pages.get(resolve(t))]))
}

const fetchPages = async (titles: string[]) => {
  const all = new Map<string, Page | undefined>()
  for (let i = 0; i < titles.length; i += 50)
    for (const [k, v] of await fetchChunk(titles.slice(i, i + 50)))
      all.set(k, v)
  return all
}

const isAmbiguous = (c: string) =>
  /\{\{\s*(aimai|曖昧さ回避|人名の曖昧さ回避)/i.test(c)

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

// 同名の別人の記事を拾わないよう、所属事務所かコンビ名が記事中にあることを確かめる
const AGENCY_WORDS: Record<string, string[]> = {
  yoshimoto: ["吉本"],
  ohtapro: ["太田プロ"],
  titan: ["タイタン"],
  tngon: ["T.Nゴン"],
  grape: ["グレープカンパニー"],
  kdash: ["ケイダッシュ"],
  maseki: ["マセキ"],
  jinrikisha: ["人力舎"],
  shochiku: ["松竹芸能"],
  watanabe: ["ワタナベ"],
  sma: ["ソニー・ミュージックアーティスツ", "SMA"],
  asai: ["浅井企画"],
}
const groupName = new Map(db.groups.map((g) => [g.id, g.name]))
const cluesOf = (personId: string, agencyId: string | null) => [
  ...(agencyId ? (AGENCY_WORDS[agencyId] ?? []) : []),
  ...db.memberships
    .filter((m) => m.person_id === personId)
    .map((m) => groupName.get(m.group_id)!)
    .filter(Boolean),
]

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
