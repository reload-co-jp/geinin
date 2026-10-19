import Link from "next/link"
import { FC } from "react"
import { db as manual } from "@/data/db"
import { edgeIndex, graph } from "@/lib/db"
import { graphHref, linksOf } from "@/lib/graph"

export const metadata = { title: "有名人の多い同期" }

const manualIds = new Set(manual.people.map((p) => `p:${p.id}`))

// 手入力で登録した芸人を有名人とみなし、その人数が多い期から並べる
const terms = [...graph.nodes.values()]
  .filter((n) => n.kind === "term")
  .map((n) => {
    const members = linksOf(edgeIndex, n.id).map((l) => l.other)
    return {
      id: n.id,
      label: n.label,
      count: members.length,
      notable: members
        .filter((m) => manualIds.has(m))
        .map((m) => ({ id: m, name: graph.nodes.get(m)?.label ?? m })),
    }
  })
  .filter((t) => t.notable.length > 0)
  .toSorted((a, b) => b.notable.length - a.notable.length || b.count - a.count)

const Page: FC = () => (
  <div
    style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gap: "1rem" }}
  >
    <h2 style={{ fontSize: "1.1rem" }}>有名人の多い同期</h2>
    <p style={{ color: "var(--muted)", fontSize: ".875rem" }}>
      主要芸人として登録した人の多い養成所の期を並べています。
      期の名前を押すと、同期をグラフでたどれます。
    </p>
    <ol style={{ display: "grid", gap: ".75rem", paddingLeft: "1.5rem" }}>
      {terms.map((t) => (
        <li key={t.id} style={{ display: "grid", gap: ".25rem" }}>
          <div>
            <Link href={graphHref(t.id, "&mode=doki")}>{t.label}</Link>
            <span style={{ color: "var(--muted)", fontSize: ".8rem" }}>
              {" "}
              主要 {t.notable.length}人 / 登録 {t.count.toLocaleString()}人
            </span>
          </div>
          <div style={{ fontSize: ".85rem" }}>
            {t.notable.map((p, i) => (
              <span key={p.id}>
                {i > 0 && "・"}
                <Link href={`/people/${p.id.slice(2)}/`}>{p.name}</Link>
              </span>
            ))}
          </div>
        </li>
      ))}
    </ol>
  </div>
)

export default Page
