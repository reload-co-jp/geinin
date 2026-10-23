import Link from "next/link"
import { FC } from "react"
import { db, edgeIndex, graph, personById } from "@/lib/db"
import { nodeHref } from "@/lib/graph"

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

// 人物ノードの year はデビュー年
const years = [
  ...Map.groupBy(
    [...graph.nodes.values()].filter((n) => n.kind === "person" && n.year),
    (n) => n.year!
  ),
]
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

const Names: FC<{ ps: (typeof years)[number][1] }> = ({ ps }) =>
  ps.map((p, i) => {
    const s = school(p.id)
    return (
      <span key={p.id}>
        {i > 0 && "・"}
        <Link href={nodeHref(p.id)}>{p.label}</Link>
        {s && (
          <span style={{ color: "var(--muted)", fontSize: ".75rem" }}>
            （{s}）
          </span>
        )}
      </span>
    )
  })

const Page: FC = () => (
  <div className="page">
    <h2 style={{ fontSize: "1.1rem" }}>同期芸人一覧</h2>
    <p className="lead">
      デビュー年が同じ芸人を、賞レース成績や共演の多い順に並べています。括弧内は出身養成所と期です。
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
        <div>
          <Names ps={ps.slice(0, SHOWN)} />
        </div>
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
