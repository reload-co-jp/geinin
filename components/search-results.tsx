"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { FC } from "react"
import { useGraphData } from "@/components/graph/use-data"
import { graphHref, linksOf, nodeHref, searchNodes } from "@/lib/graph"

const KIND_TAG = { p: "芸人", g: "コンビ", t: "同期" } as const

export const SearchResults: FC = () => {
  const q = useSearchParams().get("q") ?? ""
  const data = useGraphData()
  const hits = data ? searchNodes(data.graph, q) : []
  const name = (id: string) => data?.graph.nodes.get(id)?.label ?? id
  return (
    <div
      style={{ maxWidth: 800, margin: "0 auto", display: "grid", gap: "1rem" }}
    >
      {/* key で URL 変更時に入力値をリセット */}
      <form
        action="/search/"
        role="search"
        key={q}
        style={{ display: "flex", gap: ".5rem" }}
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="芸人名・コンビ名・事務所"
          aria-label="芸人・コンビを検索"
          style={{ flex: 1, minWidth: 0, padding: ".5rem .8rem" }}
        />
        <button>検索</button>
      </form>
      {q && (
        <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>
          {data ? `「${q}」の検索結果 ${hits.length}件` : "読み込み中…"}
        </p>
      )}
      <ul
        style={{ listStyle: "none", padding: 0, display: "grid", gap: ".5rem" }}
      >
        {hits.map((id) => {
          const groups = linksOf(data!.index, id)
            .filter((l) => l.edge.kind === "member")
            .map((l) => name(l.other))
          return (
            <li
              key={id}
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: ".3rem .6rem",
                alignItems: "center",
              }}
            >
              <span
                className="sticker"
                style={{ transform: "none", fontSize: ".65rem" }}
              >
                {KIND_TAG[id[0] as keyof typeof KIND_TAG]}
              </span>
              <Link href={nodeHref(id)}>
                <strong>{name(id)}</strong>
              </Link>
              <span style={{ fontSize: ".78rem", color: "var(--muted)" }}>
                {groups.join("・")}
              </span>
              <Link
                className="chip"
                href={graphHref(id)}
                style={{ marginLeft: "auto" }}
              >
                グラフで開く
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
