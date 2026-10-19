import Link from "next/link"
import { FC } from "react"
import { db as manual } from "@/data/db"
import { edgeIndex, graph } from "@/lib/db"
import { graphHref, linksOf } from "@/lib/graph"

export const metadata = { title: "養成所の同期一覧" }

const cell = {
  padding: ".35rem .5rem",
  borderBottom: "1px solid var(--line)",
  textAlign: "left",
  verticalAlign: "top",
} as const

const manualIds = new Set(manual.people.map((p) => `p:${p.id}`))

// 期ノードのラベルは「養成所名+期数+期」
const terms = [...graph.nodes.values()]
  .filter((n) => n.kind === "term" && n.label.endsWith("期"))
  .map((n) => {
    const members = linksOf(edgeIndex, n.id)
      .filter((l) => l.label === "同期生")
      .map((l) => l.other)
    return {
      id: n.id,
      label: n.label,
      school: n.label.replace(/\d+期$/, ""),
      year: n.year,
      count: members.length,
      notable: members
        .filter((m) => manualIds.has(m))
        .map((m) => ({ id: m, name: graph.nodes.get(m)?.label ?? m })),
    }
  })

// 行は入学年（不明は末尾）、列は養成所（期の多い順）
const schools = [...Map.groupBy(terms, (t) => t.school)]
  .toSorted((a, b) => b[1].length - a[1].length)
  .map(([s]) => s)
const years = [...Map.groupBy(terms, (t) => t.year)].toSorted(
  ([a], [b]) => (a ?? Infinity) - (b ?? Infinity)
)

const Page: FC = () => (
  <div
    style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gap: "1rem" }}
  >
    <h2 style={{ fontSize: "1.1rem" }}>養成所の同期一覧</h2>
    <p style={{ color: "var(--muted)", fontSize: ".875rem" }}>
      養成所の期を入学年ごとに並べています。入学年は Wikipedia
      の各校の表により、載っていない期は期生のデビュー年から推定しています。
      期の名前を押すと、同期をグラフでたどれます。
    </p>
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
            <th style={{ ...cell, whiteSpace: "nowrap" }}>入学年</th>
            {schools.map((s) => (
              <th key={s} scope="col" style={{ ...cell, whiteSpace: "nowrap" }}>
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {years.map(([year, ts]) => (
            <tr key={year ?? "unknown"}>
              <th scope="row" style={{ ...cell, whiteSpace: "nowrap" }}>
                {year ?? "不明"}
              </th>
              {schools.map((s) => (
                <td key={s} style={cell}>
                  {ts
                    .filter((t) => t.school === s)
                    .map((t) => (
                      <div key={t.id} style={{ minWidth: "8rem" }}>
                        <Link href={graphHref(t.id, "&mode=doki")}>
                          {t.label}
                        </Link>
                        <span style={{ color: "var(--muted)" }}>
                          {" "}
                          {t.count.toLocaleString()}人
                        </span>
                        {t.notable.length > 0 && (
                          <div>
                            {t.notable.map((p, i) => (
                              <span key={p.id}>
                                {i > 0 && "・"}
                                <Link href={`/people/${p.id.slice(2)}/`}>
                                  {p.name}
                                </Link>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

export default Page
