import Link from "next/link"
import { FC } from "react"
import { db, edgeIndex, graph, groupById, personById } from "@/lib/db"
import { nodeHref, termYear } from "@/lib/graph"

export const metadata = { title: "同期芸人一覧" }

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

const SHOWN = 5
const ESTIMATED = "デビュー年は養成所の入学年またはグループの結成年から推定"

const groupsOf = Map.groupBy(db.memberships, (m) => m.person_id)
// デビュー年が未登録なら、養成所の入学年→所属グループの最初の結成年で補う
const debut = (id: string) => {
  const p = personById.get(id.slice(2))!
  const term =
    p.training_school &&
    p.training_school_term &&
    (graph.nodes.get(`t:${p.training_school}${p.training_school_term}期`)
      ?.year ??
      termYear(p.training_school, p.training_school_term))
  const formed = (groupsOf.get(p.id) ?? [])
    .map((m) => groupById.get(m.group_id)?.formation_date)
    .filter((d) => d != null)
    .map((d) => Number(d.slice(0, 4)))
  const y = p.debut_date
    ? Number(p.debut_date.slice(0, 4))
    : term || (formed.length ? Math.min(...formed) : null)
  return y ? { y, estimated: !p.debut_date } : null
}

const people = [...graph.nodes.values()]
  .filter((n) => n.kind === "person")
  .flatMap((n) => {
    const d = debut(n.id)
    return d ? [{ ...n, ...d }] : []
  })
const unknown = db.people.length - people.length

const years = [...Map.groupBy(people, (n) => n.y)]
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

const css = `
.doki { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr)); gap: .5rem; }
.doki li { display: flex; gap: .4rem; align-items: center; }
.doki img, .doki .ph { width: 40px; height: 40px; object-fit: cover; flex-shrink: 0; background: var(--line); }
.doki li > span { min-width: 0; overflow-wrap: anywhere; }
.doki small { display: block; color: var(--muted); font-size: .75rem; }
.doki abbr { color: var(--muted); text-decoration: none; }
`

const Names: FC<{ ps: (typeof years)[number][1] }> = ({ ps }) => (
  <ul className="doki">
    {ps.map((p) => {
      const s = school(p.id)
      return (
        <li key={p.id}>
          {p.photo ? (
            <img src={p.photo} alt="" loading="lazy" />
          ) : (
            <span className="ph" />
          )}
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

const Page: FC = () => (
  <div className="page">
    <style>{css}</style>
    <h2 style={{ fontSize: "1.1rem" }}>同期芸人一覧</h2>
    <p className="lead">
      デビュー年が同じ芸人を、賞レース成績や共演の多い順に並べています。名前の下は出身養成所と期です。
      *はデビュー年が未登録のため、養成所の入学年またはグループの結成年から推定しています。
      {unknown > 0 &&
        `デビュー年を推定できない${unknown.toLocaleString()}人は載せていません。`}
    </p>
    {years.map(([year, ps]) => (
      <section
        key={year}
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
          padding: ".5rem",
          fontSize: ".875rem",
          display: "grid",
          gap: ".25rem",
        }}
      >
        <h3 style={{ fontSize: "inherit" }}>
          {year}年デビュー
          <span style={{ color: "var(--muted)", fontWeight: "normal" }}>
            {" "}
            {ps.length.toLocaleString()}人
          </span>
        </h3>
        <Names ps={ps.slice(0, SHOWN)} />
        {ps.length > SHOWN && (
          <details style={{ fontSize: ".8rem" }}>
            <summary style={{ cursor: "pointer", color: "var(--muted)" }}>
              ほか{(ps.length - SHOWN).toLocaleString()}人
            </summary>
            <Names ps={ps.slice(SHOWN)} />
          </details>
        )}
      </section>
    ))}
  </div>
)

export default Page
