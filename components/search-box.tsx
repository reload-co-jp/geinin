"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FC, FormEvent, ReactNode, useState } from "react"
import { useGraphData } from "@/components/graph/use-data"
import { graphHref, linksOf, nodeHref, searchNodes } from "@/lib/graph"

const TYPES = [
  { id: "", label: "すべて" },
  { id: "p:", label: "芸人" },
  { id: "g:", label: "コンビ" },
  { id: "t:", label: "同期（期）" },
  { id: "x:", label: "賞レース" },
  { id: "v:", label: "番組" },
] as const

const css = `
.sb { position: relative; flex: 1 1 320px; min-width: 0; }
.sb form { display: flex; align-items: stretch; border: 3px solid var(--text); border-radius: 999px; background: var(--surface); box-shadow: 4px 4px 0 var(--text); overflow: hidden; }
.sb input { flex: 1; min-width: 0; border: 0; padding: .7rem 1.1rem; font-size: 1.05rem; background: transparent; }
.sb input:focus-visible { outline: none; }
.sb form:focus-within { box-shadow: 4px 4px 0 var(--accent); }
.sb form > button { border: 0; border-left: 3px solid var(--text); border-radius: 0; box-shadow: none; background: var(--accent); color: #fff; padding: 0 1.3rem; transform: none; }
.sb[data-compact] input { padding: .45rem .9rem; font-size: .95rem; }
.sb[data-compact] form { box-shadow: 3px 3px 0 var(--text); }
.sb-types { display: flex; gap: .3rem; margin-top: .5rem; flex-wrap: wrap; }
.sb-types button { font-size: .75rem; padding: .1rem .7rem; background: var(--surface); box-shadow: none; border-width: 2px; }
.sb-types button[aria-pressed="true"] { background: var(--text); color: var(--pop); }
.sb-list { position: absolute; left: 0; right: 0; top: calc(100% + .4rem); z-index: 30; list-style: none; padding: 0; max-height: min(60dvh, 420px); overflow: auto; background: var(--surface); border: 3px solid var(--text); border-radius: 14px; box-shadow: 5px 5px 0 var(--text); }
.sb-list li { padding: .55rem .8rem; border-top: 1px solid #1f1d1a22; display: flex; flex-wrap: wrap; gap: .2rem .6rem; align-items: center; }
.sb-list li:first-child { border-top: 0; }
.sb-list .sb-acts { margin-left: auto; display: flex; gap: .3rem; }
.sb-list .sb-acts a, .sb-list .sb-acts button { font-size: .75rem; padding: .15rem .6rem; }
`

const KIND_TAG = { p: "芸人", g: "コンビ", t: "同期", x: "賞レース" } as const

export const SearchBox: FC<{
  compact?: boolean
  // 候補ごとの操作。省略時はグラフ・詳細ページへのリンク
  actions?: (id: string, close: () => void) => ReactNode
  // Enter で先頭候補を選んだとき
  onSubmitHit?: (id: string) => void
}> = ({ compact, actions, onSubmitHit }) => {
  const [q, setQ] = useState("")
  const [type, setType] = useState("")
  const data = useGraphData()
  const router = useRouter()
  const hits = data
    ? searchNodes(data.graph, q)
        .filter((id) => id.startsWith(type))
        .slice(0, 20)
    : []
  const name = (id: string) => data?.graph.nodes.get(id)?.label ?? id
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (onSubmitHit) {
      if (!hits[0]) return
      onSubmitHit(hits[0])
    } else if (q.trim()) router.push(`/search/?q=${encodeURIComponent(q)}`)
    else return
    setQ("")
  }
  return (
    <div className="sb" role="search" data-compact={compact || undefined}>
      <style>{css}</style>
      <form onSubmit={onSubmit}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setQ("")}
          placeholder={
            compact
              ? "芸人・コンビ名・NSC◯期"
              : "芸人名・コンビ名・事務所（例: 有吉、NSC大阪1期）"
          }
          aria-label="芸人・コンビを検索"
          autoComplete="off"
        />
        <button>検索</button>
      </form>
      {!compact && (
        <div className="sb-types" role="group" aria-label="検索対象">
          {TYPES.map((t) => (
            <button
              key={t.id}
              aria-pressed={type === t.id}
              onClick={() => setType(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {q && (
        <ul className="sb-list">
          {!data && <li>読み込み中…</li>}
          {data && hits.length === 0 && <li>「{q}」は見つかりません</li>}
          {hits.map((id) => {
            const links = linksOf(data!.index, id)
            const groups = links
              .filter((l) => l.edge.kind === "member")
              .map((l) => name(l.other))
            const rel = links.find(
              (l) => l.edge.kind !== "member" && l.edge.kind !== "former_member"
            )
            const tag = KIND_TAG[id[0] as keyof typeof KIND_TAG]
            const isRace = id[0] === "x"
            return (
              <li key={id}>
                <span
                  className="sticker"
                  data-tone={
                    id[0] === "p"
                      ? "plain"
                      : id[0] === "t"
                        ? "blue"
                        : isRace
                          ? "plain"
                          : undefined
                  }
                  style={{ transform: "none", fontSize: ".65rem" }}
                >
                  {tag}
                </span>
                <strong>{name(id)}</strong>
                <span style={{ fontSize: ".78rem", color: "var(--muted)" }}>
                  {isRace
                    ? `決勝 ${links.length}組`
                    : `${groups.join("・")}${rel && ` ${rel.label}: ${name(rel.other)}`}`}
                </span>
                <span className="sb-acts">
                  {actions ? (
                    actions(id, () => setQ(""))
                  ) : (
                    <>
                      <Link
                        className="chip"
                        href={graphHref(id)}
                        onClick={() => setQ("")}
                      >
                        グラフで開く
                      </Link>
                      {!id.startsWith("t:") && !id.startsWith("v:") && (
                        <Link className="chip" href={nodeHref(id)}>
                          詳細
                        </Link>
                      )}
                    </>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
