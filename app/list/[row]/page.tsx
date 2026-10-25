import Link from "next/link"
import { notFound } from "next/navigation"
import { agencyName, db, edgeIndex, graph } from "@/lib/db"
import { linksOf } from "@/lib/graph"
import { KanaNav } from "../nav"
import { OTHER, ROWS, rowOf, td, th } from "../shared"

type Props = { params: Promise<{ row: string }> }

const rows = [...ROWS, OTHER]
const byReading = <T extends { reading: string }>(xs: T[], row: string) =>
  xs
    .filter((x) => rowOf(x.reading) === row)
    .toSorted((a, b) => a.reading.localeCompare(b.reading, "ja"))

export const generateStaticParams = () => rows.map((r) => ({ row: r.slug }))

export const generateMetadata = async ({ params }: Props) => {
  const { row } = await params
  return {
    title: `芸人・コンビ一覧（${rows.find((r) => r.slug === row)?.label}）`,
    description: `読みが${rows.find((r) => r.slug === row)?.label}の芸人・コンビ・グループの一覧`,
    alternates: { canonical: `/list/${row}/` },
  }
}

const Page = async ({ params }: Props) => {
  const { row } = await params
  const current = rows.find((r) => r.slug === row)
  if (!current) notFound()
  const people = byReading(db.people, row)
  const groups = byReading(db.groups, row)
  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        display: "grid",
        gap: "2rem",
        fontSize: ".875rem",
      }}
    >
      <h2 className="page-title">芸人・コンビ一覧（{current.label}）</h2>
      <KanaNav current={row} />
      <section>
        <h2 className="section-title">
          グループ（{current.label}・{groups.length}組）
        </h2>
        <ul
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: ".25rem 1rem",
            listStyle: "none",
            padding: 0,
          }}
        >
          {groups.map((g) => (
            <li key={g.id}>
              <Link href={`/groups/${g.id}/`}>{g.name}</Link>
              {g.dissolution_date && (
                <span style={{ color: "var(--muted)" }}>
                  （{g.dissolution_date}解散）
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="section-title">
          芸人（{current.label}・{people.length}人）
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table
            className="stack-table"
            style={{
              borderCollapse: "collapse",
              width: "100%",
              background: "var(--surface)",
            }}
          >
            <thead>
              <tr>
                <th style={th}>芸名</th>
                <th style={th}>所属グループ</th>
                <th style={th}>事務所</th>
                <th style={th}>養成所</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <td style={td} data-label="芸名">
                    <Link href={`/people/${p.id}/`}>{p.name}</Link>
                  </td>
                  <td style={td} data-label="所属グループ">
                    {linksOf(edgeIndex, `p:${p.id}`)
                      .filter(
                        (l) =>
                          l.edge.kind === "member" ||
                          l.edge.kind === "former_member"
                      )
                      .map(
                        (l) =>
                          `${graph.nodes.get(l.other)?.label}${l.edge.kind === "former_member" ? "（元）" : ""}`
                      )
                      .join("、")}
                  </td>
                  <td style={td} data-label="事務所">
                    {agencyName(p.agency_id)}
                  </td>
                  <td style={td} data-label="養成所">
                    {p.training_school &&
                      `${p.training_school} ${p.training_school_term ?? "?"}期`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default Page
