// NSC（吉本総合芸能学院）の期ごとの芸人一覧（サーバー側の静的生成専用）。
// 期は公式プロフィール・Wikipedia に「NSC大阪33期」のように書かれた芸人だけを数える。
// デビュー年が同じなだけの芸人（/doki/<年>/）とは「同期」の意味が違うので混ぜない
import { db, graph, groupById } from "@/lib/db"
import { NSC_SLUGS, rankLabel, termHref, termYear } from "@/lib/graph"
import { stageRank } from "@/lib/m1"

// 一覧ページを検索に出す最少人数。これ未満の期はページだけ作り noindex にする
export const TERM_MIN_INDEXED = 3

const membershipsOf = Map.groupBy(db.memberships, (m) => m.person_id)
const resultsOf = Map.groupBy(db.competitionResults, (r) => r.entrant_id)

// 本人（ピン）と所属コンビの賞レース記録から、一番良い成績を一言で
const bestOf = (personId: string) => {
  const rs = [
    `p:${personId}`,
    ...(membershipsOf.get(personId) ?? []).map((m) => `g:${m.group_id}`),
  ].flatMap((id) => resultsOf.get(id) ?? [])
  if (!rs.length) return { label: null, score: 0 }
  const finals = rs.filter((r) => r.stage === "決勝")
  const b = rs.toSorted(
    (a, b) =>
      stageRank(b.stage) - stageRank(a.stage) ||
      (a.rank ?? 99) - (b.rank ?? 99) ||
      b.year - a.year
  )[0]
  return {
    label:
      b.stage === "決勝"
        ? `${b.competition_name}${b.year} ${rankLabel(b.rank) || "決勝"}`
        : `${b.competition_name}${b.year} ${b.stage}`,
    // 並び順の目安。決勝は重く、予選は出場回数だけ
    score: finals.length * 10 + stageRank(b.stage) + rs.length / 100,
  }
}

export type TermMember = {
  id: string
  name: string
  photo: string | null
  groups: { id: string; name: string; former: boolean }[]
  best: string | null
  score: number
}

export const terms = [
  ...Map.groupBy(
    db.people.filter(
      (p) =>
        p.training_school &&
        p.training_school_term &&
        NSC_SLUGS[p.training_school]
    ),
    (p) => `${p.training_school}\t${p.training_school_term}`
  ),
]
  .map(([key, ps]) => {
    const [school, t] = key.split("\t")
    const term = Number(t)
    const members: TermMember[] = ps
      .map((p) => {
        const best = bestOf(p.id)
        return {
          id: p.id,
          name: p.name,
          photo: graph.nodes.get(`p:${p.id}`)?.photo ?? null,
          groups: (membershipsOf.get(p.id) ?? []).flatMap((m) => {
            const g = groupById.get(m.group_id)
            return g
              ? [{ id: g.id, name: g.name, former: m.status === "former" }]
              : []
          }),
          best: best.label,
          score: best.score,
        }
      })
      .toSorted((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    // 同じ期の芸人どうしで組んだコンビ・グループ
    const ids = new Set(ps.map((p) => p.id))
    const inTerm = [
      ...Map.groupBy(
        db.memberships.filter((m) => ids.has(m.person_id)),
        (m) => m.group_id
      ),
    ]
      .filter(([, ms]) => ms.length >= 2)
      .flatMap(([gid]) => groupById.get(gid) ?? [])
    // 入学年は Wikipedia「吉本総合芸能学院」の表、無ければグラフで推定した年
    const tableYear = termYear(school, term)
    const year = tableYear ?? graph.nodes.get(`t:${school}${term}期`)?.year
    return {
      school,
      slug: NSC_SLUGS[school],
      term,
      label: `${school}${term}期`,
      href: termHref(school, term),
      nodeId: `t:${school}${term}期`,
      year: year ?? null,
      yearEstimated: !tableYear && !!year,
      members,
      inTerm,
    }
  })
  .toSorted(
    (a, b) =>
      Object.keys(NSC_SLUGS).indexOf(a.school) -
        Object.keys(NSC_SLUGS).indexOf(b.school) || a.term - b.term
  )

export type Term = (typeof terms)[number]

export const termOf = (slug: string, term: number) =>
  terms.find((t) => t.slug === slug && t.term === term)

export const indexedTerms = terms.filter(
  (t) => t.members.length >= TERM_MIN_INDEXED
)

// 同じ校舎の前後の期
export const neighbors = (t: Term) => {
  const same = terms.filter((x) => x.school === t.school)
  const i = same.indexOf(t)
  return { prev: same[i - 1] ?? null, next: same[i + 1] ?? null }
}

// 同じ年に入学した他校舎の期（東京・大阪の同期など）
export const sameYearTerms = (t: Term) =>
  t.year && !t.yearEstimated
    ? terms.filter((x) => x !== t && x.year === t.year && !x.yearEstimated)
    : []
