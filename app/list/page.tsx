import Link from "next/link"
import { FC } from "react"
import { CONFIDENCE_LABEL, db, personById } from "@/lib/db"
import { EDGE_KINDS } from "@/lib/graph"
import { KanaNav } from "./nav"
import { td, th } from "./shared"
import { InArticleAd } from "@/components/in-article-ad"

export const metadata = {
  title: "芸人・コンビ一覧",
  description: "芸人・グループ・関係性を五十音順にまとめた一覧",
  alternates: { canonical: "/list/" },
}

const name = (id: string) => personById.get(id)?.name

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
    <h2 className="page-title">芸人・コンビ一覧</h2>
    <section>
      <h2 className="section-title">読みの五十音から探す</h2>
      <KanaNav />
      <p className="lead" style={{ marginTop: ".75rem" }}>
        名前で探すときは<Link href="/search/">検索</Link>
        から。芸人 {db.people.length.toLocaleString()}人・コンビ/グループ{" "}
        {db.groups.length.toLocaleString()}組を登録しています。
      </p>
    </section>
    <InArticleAd />
    <section>
      <h2 className="section-title">関係性</h2>
      <p style={{ color: "var(--muted)", marginBottom: ".5rem" }}>
        同期・賞レース競演は登録データから導出するため、ここには含みません。
      </p>
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
              <th style={th}>種類</th>
              <th style={th}>人物</th>
              <th style={th}>内容</th>
              <th style={th}>確度・確認</th>
            </tr>
          </thead>
          <tbody>
            {db.relationships.map((r) => (
              <tr key={r.id}>
                <td style={td} data-label="種類">
                  {EDGE_KINDS[r.relationship_type].label}
                </td>
                <td style={td} data-label="人物">
                  <Link href={`/people/${r.source_person_id}/`}>
                    {name(r.source_person_id)}
                  </Link>{" "}
                  →{" "}
                  <Link href={`/people/${r.target_person_id}/`}>
                    {name(r.target_person_id)}
                  </Link>
                </td>
                <td style={td} data-label="内容">
                  {r.description}
                </td>
                <td style={td} data-label="確度・確認">
                  {CONFIDENCE_LABEL[r.confidence]} /{" "}
                  {r.last_verified_at ? (
                    `確認日 ${r.last_verified_at}`
                  ) : (
                    <span className="pf-badge" data-tone="warn">
                      出典未照合
                    </span>
                  )}
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
