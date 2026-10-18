import Link from "next/link"
import { FC } from "react"
import { CONFIDENCE_LABEL, db, personById } from "@/lib/db"
import { EDGE_KINDS } from "@/lib/graph"
import { OTHER, ROWS, rowOf, td, th } from "./shared"

export const metadata = { title: "一覧" }

const name = (id: string) => personById.get(id)?.name
const counts = new Map(
  [...Map.groupBy([...db.people, ...db.groups], (x) => rowOf(x.reading))].map(
    ([k, v]) => [k, v.length]
  )
)

const Page: FC = () => (
  <div
    style={{
      maxWidth: 1000,
      margin: "0 auto",
      display: "grid",
      gap: "2rem",
      fontSize: ".875rem",
    }}
  >
    <section>
      <h2 style={{ fontSize: "1.1rem", marginBottom: ".5rem" }}>
        芸人・グループ（読みの五十音順）
      </h2>
      <ul
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: ".5rem 1.25rem",
          listStyle: "none",
          padding: 0,
          fontSize: "1rem",
        }}
      >
        {[...ROWS, OTHER].map((r) => (
          <li key={r.slug}>
            <Link href={`/list/${r.slug}/`}>{r.label}</Link>{" "}
            <span style={{ color: "var(--muted)", fontSize: ".8rem" }}>
              {counts.get(r.slug) ?? 0}
            </span>
          </li>
        ))}
      </ul>
    </section>
    <section>
      <h2 style={{ fontSize: "1.1rem", marginBottom: ".5rem" }}>関係性</h2>
      <p style={{ color: "var(--muted)", marginBottom: ".5rem" }}>
        同期・賞レース競演は登録データから導出するため、ここには含みません。
      </p>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            background: "var(--surface)",
          }}
        >
          <thead>
            <tr>
              <th style={th}>種類</th>
              <th style={th}>人物</th>
              <th style={th}>内容</th>
              <th style={th}>確度・確認</th>
            </tr>
          </thead>
          <tbody>
            {db.relationships.map((r) => (
              <tr key={r.id}>
                <td style={td}>{EDGE_KINDS[r.relationship_type].label}</td>
                <td style={td}>
                  <Link href={`/people/${r.source_person_id}/`}>
                    {name(r.source_person_id)}
                  </Link>{" "}
                  →{" "}
                  <Link href={`/people/${r.target_person_id}/`}>
                    {name(r.target_person_id)}
                  </Link>
                </td>
                <td style={td}>{r.description}</td>
                <td style={td}>
                  {CONFIDENCE_LABEL[r.confidence]} /{" "}
                  {r.last_verified_at
                    ? `確認日 ${r.last_verified_at}`
                    : "出典未照合"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  </div>
)

export default Page
