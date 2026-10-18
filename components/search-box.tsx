"use client"

import Link from "next/link"
import { FC, useState } from "react"
import { useGraphData } from "@/components/graph/use-data"
import { graphHref, linksOf, nodeHref, searchNodes } from "@/lib/graph"

export const SearchBox: FC = () => {
  const [q, setQ] = useState("")
  const data = useGraphData()
  const hits = data ? searchNodes(data.graph, q).slice(0, 20) : []
  const name = (id: string) => data?.graph.nodes.get(id)?.label ?? id
  return (
    <div role="search">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="芸人名・コンビ名・事務所・養成所（例: NSC大阪1期）"
        aria-label="芸人を検索"
        style={{
          width: "100%",
          font: "inherit",
          fontSize: "1.1rem",
          padding: ".6rem .8rem",
          border: "2px solid var(--text)",
          borderRadius: 6,
        }}
      />
      {q && (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            marginTop: ".5rem",
            background: "var(--surface)",
            border: "1px solid var(--line)",
          }}
        >
          {!data && <li style={{ padding: ".5rem .75rem" }}>読み込み中…</li>}
          {data && hits.length === 0 && (
            <li style={{ padding: ".5rem .75rem" }}>該当なし</li>
          )}
          {hits.map((id) => {
            const links = linksOf(data!.index, id)
            const groups = links
              .filter((l) => l.edge.kind === "member")
              .map((l) => name(l.other))
            const rel = links.find(
              (l) => l.edge.kind !== "member" && l.edge.kind !== "former_member"
            )
            return (
              <li
                key={id}
                style={{
                  padding: ".5rem .75rem",
                  borderTop: "1px solid var(--line)",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: ".25rem 1rem",
                  alignItems: "baseline",
                }}
              >
                <Link href={graphHref(id)} style={{ fontWeight: "bold" }}>
                  {name(id)}
                </Link>
                <span style={{ fontSize: ".8rem", color: "var(--muted)" }}>
                  {groups.join("・")}
                  {rel && ` ${rel.label}: ${name(rel.other)}`}
                </span>
                {!id.startsWith("t:") && (
                  <Link
                    href={nodeHref(id)}
                    style={{ fontSize: ".8rem", marginLeft: "auto" }}
                  >
                    詳細
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
