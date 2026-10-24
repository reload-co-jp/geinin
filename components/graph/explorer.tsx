"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { FC, useEffect, useMemo, useRef, useState } from "react"
import { CyGraph } from "@/components/graph/cy-graph"
import { Legend } from "@/components/graph/legend"
import { useGraphData, useNodeInfo } from "@/components/graph/use-data"
import { LineSample } from "@/components/graph/legend"
import { Heading, Profile, RelBadges } from "@/components/profile"
import { SearchBox } from "@/components/search-box"
import {
  EDGE_KINDS,
  linksOf,
  MODES,
  nodeHref,
  visibleSubgraph,
  type EdgeKind,
  type Graph,
  type ModeId,
} from "@/lib/graph"
import type { NodeInfo } from "@/lib/node-info"

const EMPTY: Graph = { nodes: new Map(), edges: [] }

const DEFAULT_FOCUS = "p:sanma"
const KIND_ORDER = Object.keys(EDGE_KINDS)
const DECADES = [1970, 1980, 1990, 2000, 2010, 2020]

const css = `
.ex { display: grid; grid-template-columns: 250px minmax(0, 1fr) 380px; grid-template-rows: auto minmax(0, 1fr); height: calc(100dvh - 6.5rem); min-height: 520px; border: 3px solid var(--line); background: var(--surface); box-shadow: var(--shadow); }
.ex-bar { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: .5rem 1rem; align-items: center; padding: .6rem .75rem; border-bottom: 3px solid var(--line); background: var(--pop); }
.ex-modes { display: flex; gap: .35rem; overflow-x: auto; scrollbar-width: none; padding: 2px 4px 4px 2px; }
.ex-modes button { flex-shrink: 0; font-size: .82rem; padding: .3rem .8rem; background: var(--surface); }
.ex-modes button[aria-pressed="true"] { background: var(--text); color: var(--pop); }
.ex-side { overflow: auto; border-right: 2px solid var(--line); padding: .75rem; display: grid; align-content: start; gap: .9rem; font-size: .82rem; }
.ex-side select { width: 100%; padding: .35rem .5rem; border: 2px solid var(--line); border-radius: 8px; background: var(--surface); }
.ex-side button, .ex-panel button { font-size: .82rem; padding: .3rem .8rem; }
.ex-side summary { display: none; }
.ex-canvas { display: flex; flex-direction: column; min-height: 0; overflow: hidden; background: radial-gradient(circle at 50% 45%, #fffdf6 0 30%, #fbf6ea 70%); }
.ex-stage { position: relative; flex: 1; min-height: 0; }
.ex-bubble { position: relative; z-index: 1; margin: .6rem .75rem 0; align-self: flex-start; max-width: min(560px, calc(100% - 1.5rem)); padding: .5rem .8rem; background: var(--surface); border: 2px solid var(--line); border-radius: 14px; font-size: .78rem; line-height: 1.5; box-shadow: 3px 3px 0 var(--line); }
.ex-bubble::after { content: ""; position: absolute; left: 22px; bottom: -9px; width: 14px; height: 14px; background: var(--surface); border-right: 2px solid var(--line); border-bottom: 2px solid var(--line); transform: rotate(45deg); }
.ex-bubble strong { font-family: var(--display); font-weight: 400; color: var(--accent); }
.ex-bubble a { color: var(--accent); }
.ex-detail { display: inline-flex; align-items: center; gap: .3rem; margin: .5rem 0 .25rem; }
.ex-detail:hover { background: var(--pop); }
.ex-rel-link { font-size: .8rem; white-space: nowrap; }
.ex-panel { overflow: auto; border-left: 2px solid var(--line); padding: 1rem; overscroll-behavior: contain; }
.ex-panel-actions { display: flex; flex-wrap: wrap; gap: .35rem; margin: .75rem 0; }
.ex-panel-actions button[data-tone="blue"] { background: var(--blue); color: #fff; }
.ex-panel-actions button[data-tone="red"] { background: var(--accent); color: #fff; }
.ex-close, .ex-grip { display: none; }
.ex-list { position: absolute; inset: 0; overflow: auto; list-style: none; margin: 0; padding: .5rem .75rem 4rem; display: grid; align-content: start; gap: .3rem; font-size: .85rem; }
.ex-list h3 { display: flex; align-items: center; gap: .4rem; font-size: .8rem; margin: .8rem 0 .3rem; }
.ex-list button { font-size: .82rem; padding: .2rem .7rem; background: var(--surface); box-shadow: none; }
.ex-list li > button + button { margin-left: .3rem; }
.ex-list .ex-list-rel { border-style: dashed; color: var(--muted); }
.zoom { width: 2.5rem; height: 2.5rem; padding: 0; font-size: 1.1rem; background: var(--surface); border-radius: 10px; }
@media (max-width: 1100px) {
  .ex { grid-template-columns: 220px minmax(0, 1fr) 320px; }
}
@media (max-width: 860px) {
  .ex { grid-template-columns: 1fr; grid-template-rows: auto auto minmax(0, 1fr); height: calc(100dvh - 5.5rem); margin: -1rem; border-width: 0; box-shadow: none; }
  .ex-bar { padding: .5rem; gap: .4rem; }
  .ex-bar > [role="search"] { width: 100%; }
  .ex-modes { width: 100%; }
  .ex-side { display: block; border-right: 0; border-bottom: 2px solid var(--line); padding: .25rem .5rem; overflow: auto; }
  .ex-side[open] > * + * { margin-top: .6rem; }
  .ex-side summary { display: block; cursor: pointer; font-weight: 700; padding: .25rem 0; min-height: 2rem; }
  .ex-side:not([open]) > :not(summary) { display: none; }
  .ex-side[open] { max-height: 45dvh; }
  .ex-panel { position: fixed; left: 0; right: 0; bottom: 0; max-height: 52dvh; border: 3px solid var(--line); border-bottom: 0; border-radius: 18px 18px 0 0; background: var(--surface); box-shadow: 0 -6px 0 var(--pop); z-index: 20; padding-top: .5rem; }
  .ex-panel[data-open="false"] { display: none; }
  .ex-grip { display: block; width: 48px; height: 5px; border-radius: 3px; background: var(--muted); margin: 0 auto .5rem; }
  .ex-close { display: inline-flex; align-items: center; justify-content: center; float: right; width: 2.5rem; height: 2.5rem; padding: 0; }
  .ex-bubble { font-size: .72rem; }
  .ex-desc { display: none; }
}
`

// 師匠・同期・元コンビなど、選んだ人物から次の探索へ進むための導線
const nextSteps = (info: NodeInfo) => {
  const first = (pred: (l: NodeInfo["links"][number]) => boolean) =>
    info.links.find(pred)
  return {
    master: first((l) => l.kind === "master" && l.label === "師匠"),
    pupil: first((l) => l.kind === "master" && l.label === "弟子"),
    doki: first((l) => l.kind === "doki"),
    former: info.links.some((l) => l.kind === "former_member"),
    race: info.links.some((l) => l.kind === "competition") || !!info.finals,
  }
}

export const Explorer: FC = () => {
  const params = useSearchParams()
  const sideRef = useRef<HTMLDetailsElement>(null)
  // スマホではグラフ領域を優先し絞り込みを畳んでおく
  useEffect(() => {
    if (matchMedia("(max-width: 860px)").matches) sideRef.current!.open = false
  }, [])
  const data = useGraphData()
  const graph = data?.graph ?? EMPTY
  const nodeName = (id: string) => graph.nodes.get(id)?.label ?? id
  const focusParam = params.get("focus")
  const focus =
    focusParam && (!data || graph.nodes.has(focusParam))
      ? focusParam
      : DEFAULT_FOCUS
  const modeParam = params.get("mode")
  const mode: ModeId =
    modeParam && modeParam in MODES ? (modeParam as ModeId) : "all"
  const depth = Number(params.get("depth") ?? MODES[mode].depth)
  const kindsParam = params.get("kinds")
  const kinds = useMemo(
    () =>
      new Set(
        kindsParam === null
          ? MODES[mode].kinds
          : (kindsParam.split(",").filter((k) => k in EDGE_KINDS) as EdgeKind[])
      ),
    [kindsParam, mode]
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
  const edgeParam = params.get("edge")
  const edge = useMemo(
    () => (edgeParam ? graph.edges.find((e) => e.id === edgeParam) : undefined),
    [edgeParam, graph]
  )
  const listView = params.get("view") === "list"

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
  // 線の説明・根拠は始点ノードの詳細JSONに含まれる
  const edgeInfo = useNodeInfo(data, edge?.source ?? null)
  const edgeLink = edgeInfo?.links.find((l) => l.edgeId === edge?.id)
  const listEdges = useMemo(
    () =>
      sub.edges.toSorted(
        (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
      ),
    [sub]
  )
  const roots = useMemo(() => [focus, ...expanded], [focus, expanded])
  const [notice, setNotice] = useState("")

  const setFocus = (id: string, m?: ModeId) =>
    update({
      focus: id,
      ex: null,
      sel: id,
      edge: null,
      ...(m && { mode: m === "all" ? null : m, kinds: null, depth: null }),
    })
  const addToGraph = (id: string) => {
    if (sub.nodes.has(id)) return update({ sel: id, edge: null })
    update({ ex: [...expanded, id].join(","), sel: id, edge: null })
  }
  const setMode = (m: ModeId) =>
    update({ mode: m === "all" ? null : m, kinds: null, depth: null })
  const toggleKind = (k: EdgeKind) => {
    const next = new Set(kinds)
    if (next.has(k)) next.delete(k)
    else next.add(k)
    update({ kinds: [...next].join(",") })
  }
  const share = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setNotice("URLをコピーしました")
  }
  // ホバー時の概要: 関係の種類ごとの件数
  const summarize = (id: string) => {
    if (!data) return ""
    const links = linksOf(data.index, id)
    // 開催ノードは順位ごとの数より出場数を出したほうが分かりやすい
    if (id.startsWith("x:")) return `決勝出場 ${links.length}組`
    const counts = new Map<string, number>()
    for (const l of links) counts.set(l.label, (counts.get(l.label) ?? 0) + 1)
    return [...counts]
      .slice(0, 5)
      .map(([k, n]) => `${k} ${n}`)
      .join(" / ")
  }

  const steps = info && nextSteps(info)

  return (
    <>
      <style>{css}</style>
      <div className="ex">
        <div className="ex-bar">
          <SearchBox
            compact
            onSubmitHit={(id) => setFocus(id)}
            actions={(id, close) => (
              <>
                <button
                  onClick={() => {
                    close()
                    setFocus(id)
                  }}
                >
                  起点にする
                </button>
                <button
                  onClick={() => {
                    close()
                    addToGraph(id)
                  }}
                  style={{ background: "var(--surface)" }}
                >
                  ＋グラフに追加
                </button>
                {!id.startsWith("t:") && (
                  <Link className="chip" href={nodeHref(id)} onClick={close}>
                    詳細
                  </Link>
                )}
              </>
            )}
          />
          <div className="ex-modes" role="group" aria-label="表示モード">
            {(Object.keys(MODES) as ModeId[]).map((m) => (
              <button
                key={m}
                aria-pressed={m === mode}
                onClick={() => setMode(m)}
              >
                {MODES[m].label}
              </button>
            ))}
          </div>
          <button
            aria-pressed={listView}
            onClick={() => update({ view: listView ? null : "list" })}
            style={{ fontSize: ".82rem", padding: ".3rem .8rem" }}
          >
            {listView ? "グラフで見る" : "一覧で見る"}
          </button>
        </div>

        <details className="ex-side" ref={sideRef} open>
          <summary>絞り込み・凡例</summary>
          <label style={{ display: "grid", gap: ".2rem" }}>
            起点からの距離
            <select
              value={depth}
              onChange={(e) => update({ depth: e.target.value })}
            >
              {[1, 2, 3].map((d) => (
                <option key={d} value={d}>
                  {d}ステップ
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: ".2rem" }}>
            事務所
            <select
              value={agencyId ?? ""}
              onChange={(e) => update({ agency: e.target.value || null })}
            >
              <option value="">すべての事務所</option>
              {data?.agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: ".2rem" }}>
            年代（デビュー・結成）
            <select
              value={decade ?? ""}
              onChange={(e) => update({ decade: e.target.value || null })}
            >
              <option value="">すべての年代</option>
              {DECADES.map((d) => (
                <option key={d} value={d}>
                  {d}年代
                </option>
              ))}
            </select>
          </label>
          <Legend kinds={kinds} onToggle={toggleKind} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".35rem" }}>
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
              条件をリセット
            </button>
            <button onClick={share} style={{ background: "var(--surface)" }}>
              URL共有
            </button>
          </div>
          <p style={{ color: "var(--muted)", fontSize: ".75rem" }}>
            ○個人 ▭コンビ・グループ ◇養成所の期 ⬡賞レースの決勝（開催）。
            破線の枠は解散・引退など。ドラッグで移動、ホイール・ピンチで拡大縮小。線を選ぶと関係の詳細を表示。半透明の線は確度が中以下。
          </p>
        </details>

        <div className="ex-canvas">
          <p className="ex-bubble" role="status">
            <strong>{MODES[mode].label}</strong>{" "}
            {!data
              ? "データ読み込み中…"
              : notice || (
                  <>
                    {focus.startsWith("t:") || focus.startsWith("x:") ? (
                      nodeName(focus)
                    ) : (
                      <Link href={nodeHref(focus)}>{nodeName(focus)}</Link>
                    )}{" "}
                    から {sub.nodes.size}件（全
                    {graph.nodes.size.toLocaleString()}件）
                    <span className="ex-desc">。{MODES[mode].description}</span>
                  </>
                )}
          </p>
          <div className="ex-stage">
            {listView ? (
              // グラフを操作しにくい環境向けに、表示中の関係を同じ条件で一覧にする
              <ul className="ex-list">
                {listEdges.map((e, i) => (
                  <li key={e.id}>
                    {listEdges[i - 1]?.kind !== e.kind && (
                      <h3>
                        <LineSample kind={e.kind} />
                        {EDGE_KINDS[e.kind].label}
                      </h3>
                    )}
                    <button
                      onClick={() => update({ sel: e.source, edge: null })}
                    >
                      {nodeName(e.source)}
                    </button>
                    <button
                      className="ex-list-rel"
                      onClick={() => update({ edge: e.id, sel: null })}
                    >
                      {e.label}
                      {EDGE_KINDS[e.kind].arrow === "triangle" ? " →" : ""}
                    </button>
                    <button
                      onClick={() => update({ sel: e.target, edge: null })}
                    >
                      {nodeName(e.target)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <CyGraph
                graph={sub}
                roots={roots}
                layout={MODES[mode].layout}
                selected={selected}
                onSelect={(id) => update({ sel: id, edge: null })}
                onSelectEdge={(id) => update({ edge: id, sel: null })}
                summarize={summarize}
                nodeName={nodeName}
                showRanks={mode === "race"}
              />
            )}
          </div>
        </div>

        <aside
          className="ex-panel"
          data-open={selected || edge ? "true" : "false"}
          aria-label="選択中の詳細"
        >
          <div className="ex-grip" aria-hidden="true" />
          {edge && !selected ? (
            <>
              <button
                className="ex-close"
                onClick={() => update({ edge: null })}
                aria-label="閉じる"
              >
                ×
              </button>
              <p className="sticker" data-tone="plain">
                関係
              </p>
              <h2 style={{ fontSize: "1.3rem", background: "none" }}>
                {nodeName(edge.source)}
                {EDGE_KINDS[edge.kind].arrow === "triangle" ? " → " : " ― "}
                {nodeName(edge.target)}
              </h2>
              <p
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: ".4rem",
                  fontSize: ".85rem",
                  fontWeight: 800,
                  margin: ".5rem 0",
                }}
              >
                <LineSample kind={edge.kind} />
                {EDGE_KINDS[edge.kind].label}
                {edge.label !== EDGE_KINDS[edge.kind].label &&
                  `（${edge.label}）`}
              </p>
              {edgeLink ? (
                <>
                  <div
                    style={{ display: "flex", gap: ".25rem", flexWrap: "wrap" }}
                  >
                    <RelBadges link={edgeLink} />
                  </div>
                  {edgeLink.rel?.description && (
                    <p style={{ fontSize: ".875rem", marginTop: ".6rem" }}>
                      {edgeLink.rel.description}
                    </p>
                  )}
                  {edgeLink.period && (
                    <p style={{ fontSize: ".8rem" }}>在籍 {edgeLink.period}</p>
                  )}
                </>
              ) : (
                <p style={{ fontSize: ".8rem", color: "var(--muted)" }}>
                  {edge.derived ? "登録データから導出した関係" : "読み込み中…"}
                </p>
              )}
              <div className="ex-panel-actions">
                {[edge.source, edge.target].map((id) => (
                  <button
                    key={id}
                    onClick={() => update({ sel: id, edge: null })}
                  >
                    {nodeName(id)}を見る
                  </button>
                ))}
              </div>
              {!edge.derived && (
                <p style={{ fontSize: ".75rem", color: "var(--muted)" }}>
                  出典は{nodeName(edge.source)}
                  の詳細ページに掲載しています。
                </p>
              )}
            </>
          ) : selected && info && steps ? (
            <>
              <button
                className="ex-close"
                onClick={() => update({ sel: null })}
                aria-label="閉じる"
              >
                ×
              </button>
              <Heading info={info} />
              {!selected.startsWith("t:") && !selected.startsWith("x:") && (
                <p className="ex-detail">
                  <Link className="chip" href={nodeHref(selected)}>
                    {info.name} の詳細ページ →
                  </Link>
                </p>
              )}
              <div className="ex-panel-actions">
                {selected !== focus && (
                  <button data-tone="red" onClick={() => setFocus(selected)}>
                    ここを起点にする
                  </button>
                )}
                {steps.master && (
                  <button
                    data-tone="blue"
                    onClick={() => setFocus(steps.master!.other, "lineage")}
                  >
                    師匠をたどる
                  </button>
                )}
                {!steps.master && steps.pupil && (
                  <button
                    data-tone="blue"
                    onClick={() => setFocus(selected, "lineage")}
                  >
                    弟子の系譜を見る
                  </button>
                )}
                {steps.doki && (
                  <button onClick={() => setFocus(steps.doki!.other, "doki")}>
                    同期をもっと見る
                  </button>
                )}
                {steps.former && (
                  <button onClick={() => setFocus(selected, "combi")}>
                    元コンビを表示
                  </button>
                )}
                {steps.race && (
                  <button onClick={() => setFocus(selected, "race")}>
                    {selected.startsWith("x:")
                      ? "出場者を見る"
                      : "賞レースの競演"}
                  </button>
                )}
                {!expanded.includes(selected) && selected !== focus && (
                  <button
                    onClick={() => addToGraph(selected)}
                    style={{ background: "var(--surface)" }}
                  >
                    関連を展開
                  </button>
                )}
              </div>
              <Profile
                info={info}
                renderOther={(l) => (
                  <>
                    <button
                      onClick={() => addToGraph(l.other)}
                      style={{ background: "var(--surface)" }}
                    >
                      {l.otherName}
                    </button>
                    {!l.other.startsWith("t:") && (
                      <Link className="ex-rel-link" href={nodeHref(l.other)}>
                        詳細
                      </Link>
                    )}
                  </>
                )}
              />
            </>
          ) : (
            <div style={{ fontSize: ".875rem", color: "var(--muted)" }}>
              {selected ? (
                "読み込み中…"
              ) : (
                <>
                  <p className="sticker" style={{ marginBottom: ".75rem" }}>
                    つかいかた
                  </p>
                  <ol
                    style={{
                      paddingLeft: "1.2rem",
                      display: "grid",
                      gap: ".4rem",
                    }}
                  >
                    <li>名前の枠を選ぶと、その芸人の関係が強調されます。</li>
                    <li>線を選ぶと、どんな関係かを表示します。</li>
                    <li>上のモードで師弟・同期・コンビ変遷などに切り替え。</li>
                    <li>
                      賞レースは六角形の「開催」にまとめられます。選ぶと出場者が順位で並びます。
                    </li>
                    <li>
                      選んだ芸人の「詳細ページ」から、詳しいプロフィールへ。
                    </li>
                    <li>検索から「＋グラフに追加」で人物をつなげて表示。</li>
                  </ol>
                </>
              )}
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
