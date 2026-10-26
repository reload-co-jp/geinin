import Link from "next/link"
import { FC } from "react"
import { db } from "@/lib/db"
import { InArticleAd } from "@/components/in-article-ad"

export const metadata = {
  title: "事務所から探す",
  description:
    "吉本興業・太田プロ・人力舎・松竹芸能など、所属事務所ごとのお笑い芸人・コンビ一覧",
  alternates: { canonical: "/agencies/" },
}

// 登録数の多い順
const list = db.agencies
  .map((a) => ({
    ...a,
    count:
      db.people.filter((p) => p.agency_id === a.id).length +
      db.groups.filter((g) => g.agency_id === a.id).length,
  }))
  .toSorted((a, b) => b.count - a.count)

const Page: FC = () => (
  <div
    style={{ maxWidth: 960, margin: "0 auto", display: "grid", gap: "1rem" }}
  >
    <h1 className="section-title">事務所から探す（{list.length}社）</h1>
    <ul
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: ".4rem",
        listStyle: "none",
        padding: 0,
      }}
    >
      {list.map((a) => (
        <li key={a.id}>
          <Link className="chip" href={`/agencies/${a.id}/`}>
            {a.name}
            <small>{a.count}</small>
          </Link>
        </li>
      ))}
    </ul>
    <InArticleAd />
  </div>
)

export default Page
