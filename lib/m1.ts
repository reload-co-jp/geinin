import type { CompetitionResult, Db, Group, Person } from "@/lib/types"

// M-1グランプリ公式サイトから集めた、結成年（scripts/import-m1-formation.mjs）と予選の結果を統合する

export const M1 = "M-1グランプリ"

// コンビ番号ページの URL → 一覧に載っていた名前と結成年
export type M1FormationDump = {
  fetched_at: string | null
  year: number
  formed: Record<string, number | { name: string; year: number }>
}

// 予選の進出記録。stage はその回戦に出場（＝前の回戦を通過）したことを表す
export type M1Prelim = {
  year: number
  stage: PrelimStage
  url: string // コンビ番号ページ
  name: string
  date: string | null // YYYY-MM-DD
  venue: string | null
  source_url: string // 結果が載っているページ
}
export type M1PrelimsDump = { fetched_at: string | null; results: M1Prelim[] }

// 準決勝は data/db.ts に手入力の記録もあり、同じ年・組なら重ねない
export const PRELIM_STAGES = [
  "1回戦",
  "2回戦",
  "3回戦",
  "準々決勝",
  "準決勝",
] as const
export type PrelimStage = (typeof PRELIM_STAGES)[number]
// 進んだ順。数字が大きいほど先の段階
export const STAGE_ORDER = [...PRELIM_STAGES, "敗者復活戦", "決勝"]
export const stageRank = (stage: string) => STAGE_ORDER.indexOf(stage)

const key = (s: string) => s.normalize("NFKC").replace(/[\s・]/g, "")

// 出典 URL（M-1 公式のコンビ番号ページ）か、同名がひとつだけのときは名前でノードを引く
export const resolver = (db: Db) => {
  const byUrl = new Map<string, Person | Group>()
  const urlOf = new Map(db.sources.map((s) => [s.id, s.source_url]))
  for (const e of [...db.groups, ...db.people])
    for (const sid of e.source_ids) {
      const u = urlOf.get(sid)
      if (u) byUrl.set(u, e)
    }
  // M-1 は2人以上の組で出場するので、名前での照合はグループに限る（同名の個人を取り違えない）
  const byName = Map.groupBy(db.groups, (e) => key(e.name))
  return (url: string, name: string) => {
    const hit = byUrl.get(url)
    if (hit) return hit
    const same = byName.get(key(name)) ?? []
    return same.length === 1 ? same[0] : undefined
  }
}
export const nodeId = (e: Person | Group) =>
  `${"group_type" in e ? "g" : "p"}:${e.id}`

// 結成年が未登録のグループにだけ補う
export const mergeM1Formation = (base: Db, dump: M1FormationDump): Db => {
  const find = resolver(base)
  const years = new Map<string, number>()
  for (const [url, v] of Object.entries(dump.formed)) {
    const { name, year } = typeof v === "number" ? { name: "", year: v } : v
    const e = find(url, name)
    if (e && "group_type" in e && !e.formation_date) years.set(e.id, year)
  }
  if (!years.size) return base
  return {
    ...base,
    groups: base.groups.map((g) =>
      years.has(g.id) ? { ...g, formation_date: String(years.get(g.id)) } : g
    ),
  }
}

// 予選の進出を賞レース成績に加える。同じ大会・年・段階の記録があれば足さない
export const mergeM1Prelims = (base: Db, dump: M1PrelimsDump): Db => {
  const find = resolver(base)
  const have = new Set(
    base.competitionResults.map(
      (r) => `${r.competition_name} ${r.year} ${r.stage} ${r.entrant_id}`
    )
  )
  const sources = new Map<string, Db["sources"][number]>()
  const results: CompetitionResult[] = []
  for (const p of dump.results) {
    const e = find(p.url, p.name)
    if (!e) continue
    const entrant = nodeId(e)
    const k = `${M1} ${p.year} ${p.stage} ${entrant}`
    if (have.has(k)) continue
    have.add(k)
    const sid = `m1-prelim:${p.source_url}`
    sources.set(sid, {
      id: sid,
      source_name: `M-1グランプリ 公式サイト ${p.year} ${p.stage}`,
      source_url: p.source_url,
      source_type: "competition_official",
      published_at: null,
      checked_at: dump.fetched_at,
    })
    results.push({
      id: `m1p-${p.year}-${p.stage}-${entrant}`,
      competition_name: M1,
      year: p.year,
      entrant_id: entrant,
      stage: p.stage,
      rank: null,
      score: null,
      source_ids: [sid],
    })
  }
  return {
    ...base,
    sources: [...base.sources, ...sources.values()],
    competitionResults: [...base.competitionResults, ...results],
  }
}

// 同じ年・同じ回戦の同じ日・同じ会場に出た組（予選の「同じ組」）
export const prelimPeers = (base: Db, dump: M1PrelimsDump) => {
  const find = resolver(base)
  const groups = Map.groupBy(
    dump.results.filter((p) => p.date && p.venue),
    (p) => `${p.year} ${p.stage} ${p.date} ${p.venue}`
  )
  const of = new Map<string, { ids: string[]; prelim: M1Prelim }[]>()
  for (const ps of groups.values()) {
    const ids = [
      ...new Set(
        ps.flatMap((p) => {
          const e = find(p.url, p.name)
          return e ? [nodeId(e)] : []
        })
      ),
    ]
    for (const id of ids)
      of.set(id, [
        ...(of.get(id) ?? []),
        { ids: ids.filter((x) => x !== id), prelim: ps[0] },
      ])
  }
  // 新しい年・先の回戦の組を先に
  return (id: string) =>
    (of.get(id) ?? []).toSorted(
      (a, b) =>
        b.prelim.year - a.prelim.year ||
        stageRank(b.prelim.stage) - stageRank(a.prelim.stage)
    )
}

// 予選の回戦別ページ /m1/{年}/{slug}/ のスラッグ
export const STAGE_SLUGS: Record<PrelimStage, string> = {
  "1回戦": "r1",
  "2回戦": "r2",
  "3回戦": "r3",
  準々決勝: "qf",
  準決勝: "sf",
}
export const prelimHref = (year: number, stage: string) =>
  stage in STAGE_SLUGS
    ? `/m1/${year}/${STAGE_SLUGS[stage as PrelimStage]}/`
    : null
