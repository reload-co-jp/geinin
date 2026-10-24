import Link from "next/link"
import { FC } from "react"
import { edgeIndex, graph, programIds } from "@/lib/db"
import { nodeHref } from "@/lib/graph"

export const metadata = {
  title: "テレビ番組から探す",
  description:
    "バラエティなどのテレビ番組ごとに、出演したお笑い芸人・コンビをまとめた一覧（Wikipedia記載の情報）",
  alternates: { canonical: "/programs/" },
}

// 一覧は5組以上が出演した番組に絞る（全件だと1ページが1MBを超える）。
// 2〜4組の番組ページへは各芸人のページからリンクする
const MIN_CAST = 5

// 登録芸人の出演が多い順
const list = programIds
  .map((id) => ({
    id,
    name: graph.nodes.get(id)!.label,
    count: edgeIndex.get(id)?.length ?? 0,
  }))
  .filter((p) => p.count >= MIN_CAST)
  .toSorted((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ja"))

const Page: FC = () => (
  <div
    style={{ maxWidth: 960, margin: "0 auto", display: "grid", gap: "1rem" }}
  >
    <h2 className="section-title">テレビ番組から探す（{list.length}番組）</h2>
    <p style={{ fontSize: ".85rem", color: "var(--muted)" }}>
      登録芸人の{MIN_CAST}組以上が出演した番組（全{programIds.length}
      番組のうち）。出演情報は各芸人の Wikipedia
      記事から集めたもので、出典との照合はしていません。
    </p>
    <ul
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: ".4rem",
        listStyle: "none",
        padding: 0,
      }}
    >
      {list.map((p) => (
        <li key={p.id}>
          <Link className="chip" href={nodeHref(p.id)}>
            {p.name}
            <small>{p.count}組</small>
          </Link>
        </li>
      ))}
    </ul>
  </div>
)

export default Page
