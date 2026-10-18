import Link from "next/link"
import { FC } from "react"
import { db, graph } from "@/lib/db"

export const metadata = { title: "賞レース決勝進出の遍歴" }

const cell = {
  padding: ".35rem .5rem",
  borderBottom: "1px solid var(--line)",
  textAlign: "center",
  whiteSpace: "nowrap",
} as const

// 大会ごとに、決勝へ進んだコンビを初進出順に並べ、年ごとの順位を出す
const competitions = Object.entries(
  Object.groupBy(
    db.competitionResults.filter((r) => r.stage === "決勝"),
    (r) => r.competition_name
  )
).map(([name, results = []]) => {
  const years = [...new Set(results.map((r) => r.year))].sort((a, b) => a - b)
  const rows = Object.entries(Object.groupBy(results, (r) => r.entrant_id))
    .map(([id, rs = []]) => ({
      id,
      name: graph.nodes.get(id)?.label ?? id,
      href: `/${id.startsWith("p:") ? "people" : "groups"}/${id.slice(2)}/`,
      byYear: new Map(rs.map((r) => [r.year, r.rank])),
      first: Math.min(...rs.map((r) => r.year)),
    }))
    .sort((a, b) => a.first - b.first)
  return { name, years, rows }
})

const Page: FC = () => (
  <div
    style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gap: "1rem" }}
  >
    <h2 style={{ fontSize: "1.1rem" }}>賞レース決勝進出の遍歴</h2>
    <p style={{ color: "var(--muted)", fontSize: ".875rem" }}>
      登録済みの決勝結果のみ表示しています。数字は順位、●は順位不明です。
    </p>
    {competitions.map((c) => (
      <section key={c.name} style={{ display: "grid", gap: ".5rem" }}>
        <h3 style={{ fontSize: "1rem" }}>{c.name}</h3>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              background: "var(--surface)",
              fontSize: ".8rem",
            }}
          >
            <thead>
              <tr>
                <th style={{ ...cell, textAlign: "left" }}>出場者</th>
                {c.years.map((y) => (
                  <th key={y} scope="col" style={cell}>
                    {y}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.rows.map((g) => (
                <tr key={g.id}>
                  <th scope="row" style={{ ...cell, textAlign: "left" }}>
                    <Link href={g.href}>{g.name}</Link>
                  </th>
                  {c.years.map((y) => {
                    const rank = g.byYear.get(y)
                    return (
                      <td
                        key={y}
                        style={{
                          ...cell,
                          fontWeight: rank === 1 ? "bold" : undefined,
                          background:
                            rank === 1
                              ? "var(--pop)"
                              : rank !== undefined
                                ? "color-mix(in srgb, var(--accent) 20%, transparent)"
                                : undefined,
                        }}
                      >
                        {rank === undefined
                          ? ""
                          : rank === null
                            ? "●"
                            : rank === 1
                              ? "優勝"
                              : `${rank}位`}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    ))}
  </div>
)

export default Page
