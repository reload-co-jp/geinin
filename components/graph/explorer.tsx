"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { FC, FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { CyGraph } from "@/components/graph/cy-graph"
import { Legend } from "@/components/graph/legend"
import { useGraphData, useNodeInfo } from "@/components/graph/use-data"
import { Heading, Profile } from "@/components/profile"
import {
  EDGE_KINDS,
  nodeHref,
  searchNodes,
  visibleSubgraph,
  type EdgeKind,
  type Graph,
} from "@/lib/graph"

const EMPTY: Graph = { nodes: new Map(), edges: [] }

const ALL_KINDS = Object.keys(EDGE_KINDS) as EdgeKind[]
const DEFAULT_FOCUS = "p:sanma"
const DECADES = [1970, 1980, 1990, 2000, 2010, 2020]

const css = `
.ex { display: grid; grid-template-columns: minmax(0, 1fr) 360px; grid-template-rows: auto auto minmax(0, 1fr); height: calc(100dvh - 7rem); min-height: 480px; border: 3px solid var(--line); background: var(--surface); box-shadow: var(--shadow); }
.ex-bar { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; padding: .5rem; border-bottom: 3px solid var(--line); background: var(--pop); }
.ex-bar select, .ex-bar input { font-size: .85rem; padding: .25rem .5rem; border: 2px solid var(--line); border-radius: 999px; background: var(--surface); }
.ex-bar button, .ex-panel button { font-size: .85rem; padding: .25rem .75rem; }
.ex-bar button { background: var(--surface); }
.ex-bar button, .ex-panel button { cursor: pointer; }
.ex-canvas { position: relative; min-height: 0; }
.ex-panel { grid-row: 2 / 4; grid-column: 2; overflow: auto; border-left: 1px solid var(--line); padding: 1rem; }
.ex-legend { grid-column: 1; border-bottom: 1px solid var(--line); padding: .4rem .5rem; }
.ex-legend summary { font-size: .8rem; cursor: pointer; }
.ex-close { display: none; }
@media (max-width: 768px) {
  .ex { grid-template-columns: 1fr; height: calc(100dvh - 6rem); }
  .ex-panel { grid-row: auto; grid-column: auto; position: fixed; left: 0; right: 0; bottom: 0; max-height: 60dvh; border: 1px solid var(--line); border-radius: 12px 12px 0 0; background: var(--surface); box-shadow: 0 -4px 16px rgba(0,0,0,.15); z-index: 10; }
  .ex-panel[data-open="false"] { display: none; }
  .ex-close { display: inline-block; float: right; }
}
`

export const Explorer: FC = () => {
  const params = useSearchParams()
  // スマホではグラフ領域を優先し凡例を畳んでおく
  const legendRef = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (matchMedia("(max-width: 768px)").matches)
      legendRef.current!.open = false
  }, [])
  const data = useGraphData()
  const graph = data?.graph ?? EMPTY
  const nodeName = (id: string) => graph.nodes.get(id)?.label ?? id
  const focusParam = params.get("focus")
  const focus =
    focusParam && (!data || graph.nodes.has(focusParam))
      ? focusParam
      : DEFAULT_FOCUS
  const depth = Number(params.get("depth") ?? 2)
  const kindsParam = params.get("kinds")
  const kinds = useMemo(
    () =>
      new Set(
        kindsParam === null
          ? ALL_KINDS
          : (kindsParam.split(",").filter((k) => k in EDGE_KINDS) as EdgeKind[])
      ),
    [kindsParam]
  )
  const exParam = params.get("ex")
  const expanded = useMemo(
    () =>
      exParam ? exParam.split(",").filter((id) => graph.nodes.has(id)) : [],
    [exParam, graph]
  )
  const agencyId = params.get("agency")
  const decade = params.get("decade") ? Number(params.get("decade")) : null
  const selected = params.get("sel")

  // URLが唯一の状態。history.replaceState は Next の useSearchParams に反映される
  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k)
      else next.set(k, v)
    }
    window.history.replaceState(null, "", `?${next}`)
  }

  const sub = useMemo(
    () =>
      visibleSubgraph(graph, {
        focus,
        depth,
        kinds,
        expanded,
        agencyId,
        decade,
        limit: 80,
      }),
    [graph, focus, depth, kinds, expanded, agencyId, decade]
  )
  const info = useNodeInfo(data, selected)
  const roots = useMemo(() => [focus, ...expanded], [focus, expanded])
  const [resetKey, setResetKey] = useState(0)
  const [notice, setNotice] = useState("")

  const setFocus = (id: string) => update({ focus: id, ex: null, sel: id })
  const visit = (id: string) => {
    if (!sub.nodes.has(id)) update({ ex: [...expanded, id].join(","), sel: id })
    else update({ sel: id })
  }
  const toggleKind = (k: EdgeKind) => {
    const next = new Set(kinds)
    if (next.has(k)) next.delete(k)
    else next.add(k)
    update({
      kinds: next.size === ALL_KINDS.length ? null : [...next].join(","),
    })
  }
  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = new FormData(e.currentTarget).get("q") as string
    const hit = searchNodes(graph, q)[0]
    if (!hit) return setNotice(`「${q}」は見つかりません`)
    setNotice("")
    if (sub.nodes.has(hit)) update({ sel: hit })
    else setFocus(hit)
  }
  const share = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setNotice("URLをコピーしました")
  }

  return (
    <>
      <style>{css}</style>
      <div className="ex">
        <div className="ex-bar">
          <form
            onSubmit={onSearch}
            role="search"
            style={{ display: "flex", gap: ".25rem" }}
          >
            <input
              name="q"
              placeholder="芸人・コンビ名・NSC◯期"
              aria-label="芸人・コンビ名で検索"
            />
            <button>検索</button>
          </form>
          <label>
            距離{" "}
            <select
              value={depth}
              onChange={(e) => update({ depth: e.target.value })}
            >
              {[1, 2, 3].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <select
            aria-label="事務所で絞り込み"
            value={agencyId ?? ""}
            onChange={(e) => update({ agency: e.target.value || null })}
          >
            <option value="">全事務所</option>
            {data?.agencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            aria-label="年代で絞り込み"
            value={decade ?? ""}
            onChange={(e) => update({ decade: e.target.value || null })}
          >
            <option value="">全年代</option>
            {DECADES.map((d) => (
              <option key={d} value={d}>
                {d}年代デビュー・結成
              </option>
            ))}
          </select>
          <button onClick={() => setResetKey((k) => k + 1)}>全体表示</button>
          <button
            onClick={() =>
              update({
                ex: null,
                sel: null,
                agency: null,
                decade: null,
                kinds: null,
                depth: null,
              })
            }
          >
            リセット
          </button>
          <button onClick={share}>URL共有</button>
          <span
            role="status"
            style={{ fontSize: ".8rem", color: "var(--muted)" }}
          >
            {!data
              ? "データ読み込み中…"
              : notice ||
                `起点: ${nodeName(focus)} / ${sub.nodes.size}件表示（全${graph.nodes.size}件）`}
          </span>
        </div>
        <details className="ex-legend" open ref={legendRef}>
          <summary>凡例・表示切替 / 操作方法</summary>
          <Legend kinds={kinds} onToggle={toggleKind} />
          <p
            style={{
              fontSize: ".75rem",
              color: "var(--muted)",
              marginTop: ".25rem",
            }}
          >
            ○個人 ▭グループ
            ◇養成所の期（同期はここでつながる）。ドラッグで移動、ホイール・ピンチで拡大縮小。ノードを選ぶと関係を強調。半透明の線は確度が中以下。
          </p>
        </details>
        <div className="ex-canvas">
          <CyGraph
            graph={sub}
            roots={roots}
            selected={selected}
            onSelect={(id) => update({ sel: id })}
            resetKey={resetKey}
          />
        </div>
        <aside
          className="ex-panel"
          data-open={selected ? "true" : "false"}
          aria-label="選択中の詳細"
        >
          {selected && info ? (
            <>
              <button
                className="ex-close"
                onClick={() => update({ sel: null })}
                aria-label="閉じる"
              >
                ×
              </button>
              <Heading info={info} />
              <div
                style={{
                  display: "flex",
                  gap: ".25rem",
                  flexWrap: "wrap",
                  margin: ".5rem 0",
                }}
              >
                {selected !== focus && (
                  <button onClick={() => setFocus(selected)}>
                    ここを起点にする
                  </button>
                )}
                {!expanded.includes(selected) && selected !== focus && (
                  <button
                    onClick={() =>
                      update({ ex: [...expanded, selected].join(",") })
                    }
                  >
                    関連を展開
                  </button>
                )}
                <Link
                  href={nodeHref(selected)}
                  style={{ fontSize: ".85rem", alignSelf: "center" }}
                >
                  詳細ページ →
                </Link>
              </div>
              <Profile
                info={info}
                renderOther={(l) => (
                  <button
                    onClick={() => visit(l.other)}
                    style={{ fontWeight: "bold" }}
                  >
                    {l.otherName}
                  </button>
                )}
              />
            </>
          ) : (
            <p style={{ fontSize: ".875rem", color: "var(--muted)" }}>
              {selected
                ? "読み込み中…"
                : "ノードを選択すると詳細を表示します。"}
            </p>
          )}
        </aside>
      </div>
    </>
  )
}
