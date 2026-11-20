// Wikipedia 日本語版を調べる収集スクリプトの共通処理
import { db } from "@/lib/db"

const API = "https://ja.wikipedia.org/w/api.php"
const WAIT_MS = 2000
// 曖昧さ回避ページだったときに試す記事名
export const SUFFIXES = [
  "(お笑い芸人)",
  "(お笑いタレント)",
  "(芸人)",
  "(タレント)",
]

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type ApiPage = {
  title: string
  missing?: boolean
  revisions?: { slots: { main: { content: string } } }[]
}
export type Page = { title: string; missing?: boolean; content: string }
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
        "User-Agent": "geinin-research/0.1 (geinin.reload.co.jp)",
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

export const fetchPages = async (titles: string[]) => {
  const all = new Map<string, Page | undefined>()
  for (let i = 0; i < titles.length; i += 50)
    for (const [k, v] of await fetchChunk(titles.slice(i, i + 50)))
      all.set(k, v)
  return all
}

export const isAmbiguous = (c: string) =>
  /\{\{\s*(aimai|曖昧さ回避|人名の曖昧さ回避)/i.test(c)

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
export const cluesOf = (personId: string, agencyId: string | null) => [
  ...(agencyId ? (AGENCY_WORDS[agencyId] ?? []) : []),
  ...db.memberships
    .filter((m) => m.person_id === personId)
    .map((m) => groupName.get(m.group_id)!)
    .filter(Boolean),
]

export const GROUP_SUFFIXES = [
  "(お笑いコンビ)",
  "(お笑いトリオ)",
  "(お笑いグループ)",
]
const COMEDY = /お笑い|芸人|漫才|コント|吉本|NSC/

// 調査対象の芸人・グループ。id はノードID（p:/g:）
export type Target = {
  id: string
  name: string
  clues: string[]
  isGroup: boolean
}
// 事務所名だけでは同じ事務所の別コンビを拾うため、相方・メンバー名が分かればそちらを必須にする
export const wikiTargets = (): Target[] => {
  const personName = new Map(db.people.map((p) => [p.id, p.name]))
  const strong = (names: (string | undefined)[], fallback: string[]) => {
    const xs = names.filter((n): n is string => !!n)
    return xs.length ? xs : fallback
  }
  return [
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
  ].filter((t) => t.name.trim())
}

// 同名の別人・コンビ記事へのリダイレクトを拾わないよう、記事の種類と手がかりの語を確かめる
export const matchesTarget = (c: string, t: Target) => {
  if (!COMEDY.test(c)) return false
  if (t.clues.length && !t.clues.some((w) => c.includes(w))) return false
  const box = c.slice(0, c.indexOf("\n}}") + 1 || 5000)
  // 「メンバー1 =」形式や Infobox 名でもコンビ記事と分かるようにする
  const isGroupPage =
    /Infobox お笑い(コンビ|トリオ|グループ|ユニット)/.test(c) ||
    /^\s*\|\s*(結成年|メンバー\d*)\s*=/m.test(box)
  return isGroupPage === t.isGroup
}

// 対象ごとの記事。曖昧さ回避ページなら「(お笑い芸人)」等を付けた記事名で引き直す
export const findArticles = async (batch: Target[]) => {
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
  return new Map(
    batch.map((t) => {
      const candidates = isAmbiguous(pages.get(t.name)?.content ?? "")
        ? suffixes(t).map((s) => retry.get(`${t.name} ${s}`))
        : [pages.get(t.name)]
      const page = candidates.find(
        (pg) => pg && !pg.missing && matchesTarget(pg.content, t)
      )
      return [t.id, page] as const
    })
  )
}
