import Link from "next/link"
import { FC } from "react"
import { db, edgeIndex, graph, groupById, personById } from "@/lib/db"
import { nodeHref, termYear } from "@/lib/graph"

const results = Map.groupBy(db.competitionResults, (r) => r.entrant_id)
// 賞レース成績（本人とコンビ等の出場）と共演の数
const score = (id: string) => {
  const es = edgeIndex.get(id) ?? []
  return (
    [
      id,
      ...es
        .filter((e) => e.kind === "member" || e.kind === "former_member")
        .map((e) => e.target),
    ].reduce((n, x) => n + (results.get(x)?.length ?? 0), 0) +
    es.filter((e) => e.kind === "costar").length
  )
}

export const SHOWN = 5
export const ESTIMATED = "デビュー年が未登録のため、グループの結成年から推定"

const groupsOf = Map.groupBy(db.memberships, (m) => m.person_id)
const thisYear = new Date().getFullYear()
// 同期が同じ年に並ぶよう、養成所出身者は登録済みのデビュー年より期の卒業年（入学の翌年）を優先する。
// それ以外はデビュー年、未登録なら所属グループの最初の結成年で補う。在学中の期は使わない
const debut = (id: string) => {
  const p = personById.get(id.slice(2))!
  const enrolled =
    p.training_school &&
    p.training_school_term &&
    (graph.nodes.get(`t:${p.training_school}${p.training_school_term}期`)
      ?.year ??
      termYear(p.training_school, p.training_school_term))
  const term = enrolled && enrolled + 1 <= thisYear ? enrolled + 1 : null
  const formed = (groupsOf.get(p.id) ?? [])
    .map((m) => groupById.get(m.group_id)?.formation_date)
    .filter((d) => d != null)
    .map((d) => Number(d.slice(0, 4)))
  const y =
    term ||
    (p.debut_date
      ? Number(p.debut_date.slice(0, 4))
      : formed.length
        ? Math.min(...formed)
        : null)
  return y ? { y, estimated: !term && !p.debut_date } : null
}

const termOf = (id: string) => {
  const p = personById.get(id.slice(2))!
  return p.training_school && p.training_school_term
    ? `${p.training_school}${p.training_school_term}`
    : null
}
const estimates = [...graph.nodes.values()]
  .filter((n) => n.kind === "person")
  .flatMap((n) => {
    const d = debut(n.id)
    return d ? [{ ...n, ...d }] : []
  })
// 入学年のわからない期は各自のグループ結成年がばらつくため、期の中で最も早い年にそろえる
const termFirst = new Map<string, number>()
for (const n of estimates) {
  const t = n.estimated && termOf(n.id)
  if (t) termFirst.set(t, Math.min(termFirst.get(t) ?? n.y, n.y))
}
const people = estimates.map((n) => {
  const t = n.estimated && termOf(n.id)
  return t ? { ...n, y: termFirst.get(t)! } : n
})
export const unknown = db.people.length - people.length

export const years = [...Map.groupBy(people, (n) => n.y)]
  .toSorted(([a], [b]) => a - b)
  .map(([y, ps]) => {
    const scores = new Map(ps.map((p) => [p.id, score(p.id)]))
    return [
      y,
      ps.toSorted((a, b) => scores.get(b.id)! - scores.get(a.id)!),
    ] as const
  })

// 養成所出身なら「NSC大阪1期」のように添える
const school = (id: string) => {
  const p = personById.get(id.slice(2))
  return (
    p?.training_school &&
    `${p.training_school}${p.training_school_term ? `${p.training_school_term}期` : ""}`
  )
}

export const css = `
.doki { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr)); gap: .5rem; }
.doki li { display: flex; gap: .4rem; align-items: center; }
.doki .ph { width: 40px; height: 40px; flex-shrink: 0; background: center / contain no-repeat var(--line); }
.doki li > span { min-width: 0; overflow-wrap: anywhere; }
.doki small { display: block; color: var(--muted); font-size: .75rem; }
.doki abbr { color: var(--muted); text-decoration: none; }
`

export const Names: FC<{ ps: (typeof years)[number][1] }> = ({ ps }) => (
  <ul className="doki">
    {ps.map((p) => {
      const s = school(p.id)
      return (
        <li key={p.id}>
          <span
            className="ph"
            style={
              p.photo
                ? { backgroundImage: `url(${JSON.stringify(p.photo)})` }
                : undefined
            }
          />
          <span>
            <Link href={nodeHref(p.id)}>{p.label}</Link>
            {p.estimated && <abbr title={ESTIMATED}>*</abbr>}
            {s && <small>{s}</small>}
          </span>
        </li>
      )
    })}
  </ul>
)

export const ESTIMATED_NOTE =
  "養成所出身者は同期がそろうよう、期の卒業年（入学の翌年）でまとめています。*はデビュー年が未登録のため、グループの結成年から推定しています。"
