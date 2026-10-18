"use client"

import cytoscape, { type Core } from "cytoscape"
import { FC, useEffect, useRef, useState } from "react"
import {
  EDGE_KINDS,
  STATUS_LABEL,
  type GEdge,
  type GNode,
  type Graph,
} from "@/lib/graph"

const INK = "#1f1d1a"

const style: cytoscape.StylesheetJson = [
  {
    selector: "node",
    style: {
      label: "data(display)",
      "font-size": 13,
      "font-weight": "bold",
      "font-family": '"M PLUS Rounded 1c", "Hiragino Sans", sans-serif',
      "text-valign": "center",
      "text-halign": "center",
      "text-wrap": "wrap",
      "line-height": 1.2,
      color: INK,
      "min-zoomed-font-size": 6,
      shape: "ellipse",
      width: "data(w)",
      height: "data(h)",
      "background-color": "#ffffff",
      "border-width": 2,
      "border-color": INK,
    },
  },
  {
    selector: "node[kind = 'group']",
    style: {
      shape: "round-rectangle",
      "background-color": "#ffcf24",
      "border-width": 3,
    },
  },
  {
    selector: "node[kind = 'term']",
    style: {
      shape: "tag",
      "background-color": "#dde9fb",
      "border-color": "#1f6fd1",
      color: "#174f96",
      "font-size": 12,
    },
  },
  // 写真があれば顔を出し、名前は下に置く
  {
    selector: "node[?photo]",
    style: {
      shape: "ellipse",
      "background-image": "data(photo)",
      "background-fit": "cover",
      // CORS ヘッダの無い外部画像も描けるようにする（"null" は実装にあるが型に無い）
      "background-image-crossorigin": "null" as "anonymous",
      "text-valign": "bottom",
      "text-margin-y": 4,
      "text-background-color": "#ffffff",
      "text-background-opacity": 0.85,
      "text-background-padding": "2px",
      "text-background-shape": "roundrectangle",
    },
  },
  // 活動中以外は輪郭を破線にして状態ラベルと併せて伝える
  {
    selector:
      "node[status = 'disbanded'], node[status = 'retired'], node[status = 'deceased'], node[status = 'hiatus']",
    style: { "border-style": "dashed" },
  },
  {
    selector: "node.root",
    style: {
      "background-color": "#d9342b",
      color: "#ffffff",
      "font-size": 17,
      "border-width": 4,
    },
  },
  // 写真の起点は名前が白地に乗るので文字色を戻す
  { selector: "node.root[?photo]", style: { color: INK } },
  {
    selector: "node.hover",
    style: {
      "underlay-color": "#ffcf24",
      "underlay-opacity": 0.7,
      "underlay-padding": 6,
      "underlay-shape": "ellipse",
    },
  },
  {
    selector: "node:selected",
    style: {
      "border-color": "#1f6fd1",
      "border-width": 5,
      "underlay-color": "#ffcf24",
      "underlay-opacity": 1,
      "underlay-padding": 10,
      "underlay-shape": "ellipse",
    },
  },
  {
    selector: "edge",
    style: {
      "curve-style": "bezier",
      label: "",
      "font-size": 10,
      "font-weight": "bold",
      color: INK,
      "text-rotation": "autorotate",
      "text-background-color": "#ffffff",
      "text-background-opacity": 1,
      "text-background-padding": "2px",
      "text-border-width": 1,
      "text-border-color": INK,
      "text-border-opacity": 1,
      "min-zoomed-font-size": 8,
      "arrow-scale": 1.3,
    },
  },
  ...Object.entries(EDGE_KINDS).map(([kind, k]) => ({
    selector: `edge[kind = '${kind}']`,
    style: {
      width: k.width,
      "line-color": k.color,
      "target-arrow-color": k.color,
      "source-arrow-color": k.color,
      "line-style": k.dash ? ("dashed" as const) : ("solid" as const),
      ...(k.dash && { "line-dash-pattern": k.dash }),
      ...(k.arrow && { "target-arrow-shape": k.arrow }),
      ...(k.arrow === "tee" && { "source-arrow-shape": "tee" as const }),
    },
  })),
  { selector: "edge[confidence != 'high']", style: { opacity: 0.55 } },
  { selector: ".faded", style: { opacity: 0.12 } },
  { selector: "edge.hl", style: { label: "data(label)", "z-index": 10 } },
  {
    selector: "edge:selected",
    style: {
      label: "data(label)",
      "underlay-color": "#ffcf24",
      "underlay-opacity": 1,
      "underlay-padding": 4,
    },
  },
]

// 名前を枠の中に収めるため、文字数から大きさを決める
const nodeData = (n: GNode, root: boolean) => {
  const status =
    n.status && n.status !== "active" ? STATUS_LABEL[n.status] : null
  const em = root ? 17 : n.kind === "term" ? 12 : 13
  const chars = Math.max(n.label.length, status ? status.length + 2 : 0)
  if (n.photo) {
    const size = root ? 76 : 56
    return {
      ...n,
      display: status ? `${n.label}\n［${status}］` : n.label,
      w: size,
      h: size,
    }
  }
  return {
    ...n,
    display: status ? `${n.label}\n［${status}］` : n.label,
    w: Math.max(chars * em + (n.kind === "person" ? 30 : 22), 52),
    h: (status ? 2.4 : 1.2) * em + (root ? 26 : 20),
  }
}

const reduceMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches

type Tip = { x: number; y: number; title: string; body: string }

type Props = {
  graph: Graph
  roots: string[]
  layout: "radial" | "tree"
  selected: string | null
  onSelect: (id: string | null) => void
  // ホバー時に出す関係の概要
  summarize: (id: string) => string
  nodeName: (id: string) => string
}

export const CyGraph: FC<Props> = ({
  graph,
  roots,
  layout,
  selected,
  onSelect,
  summarize,
  nodeName,
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const cy = useRef<Core>(null)
  const [tip, setTip] = useState<Tip | null>(null)
  const latest = useRef({ onSelect, summarize, nodeName })
  useEffect(() => {
    latest.current = { onSelect, summarize, nodeName }
  })

  useEffect(() => {
    const c = cytoscape({
      container: ref.current,
      style,
      maxZoom: 2.5,
      minZoom: 0.15,
    })
    c.on("tap", "node", (e) => {
      setTip(null)
      latest.current.onSelect(e.target.id())
    })
    c.on("tap", (e) => {
      if (e.target !== c) return
      setTip(null)
      latest.current.onSelect(null)
    })
    c.on("mouseover", "node", (e) => {
      const n = e.target
      n.addClass("hover")
      const p = n.renderedPosition()
      setTip({
        x: p.x,
        y: p.y + n.renderedOuterHeight() / 2 + 8,
        title: n.data("label"),
        body: latest.current.summarize(n.id()),
      })
    })
    c.on("mouseout", "node", (e) => {
      e.target.removeClass("hover")
      setTip(null)
    })
    // 線は選んだときだけ詳しい関係を出す
    c.on("tap", "edge", (e) => {
      const d = e.target.data() as GEdge
      const { nodeName } = latest.current
      const p = e.renderedPosition ?? e.target.renderedMidpoint()
      setTip({
        x: p.x,
        y: p.y + 12,
        title: `${nodeName(d.source)} ${EDGE_KINDS[d.kind].arrow === "triangle" ? "→" : "―"} ${nodeName(d.target)}`,
        body: `${EDGE_KINDS[d.kind].label}${d.label !== EDGE_KINDS[d.kind].label ? `：${d.label}` : ""}${d.derived ? "（登録データから導出）" : d.confidence !== "high" ? "（確度：中以下）" : ""}`,
      })
    })
    c.on("pan zoom", () => setTip(null))
    cy.current = c
    return () => c.destroy()
  }, [])

  // 要素の差分だけ入れ替え、既存ノードの位置は保つ
  useEffect(() => {
    const c = cy.current!
    const rootSet = new Set(roots.slice(0, 1))
    const ids = new Set([
      ...graph.nodes.keys(),
      ...graph.edges.map((e) => e.id),
    ])
    const removed = c
      .elements()
      .filter((el) => !ids.has(el.id()))
      .remove().length
    const added = c.add([
      ...[...graph.nodes.values()]
        .filter((n) => c.getElementById(n.id).empty())
        .map((n) => ({
          group: "nodes" as const,
          data: nodeData(n, rootSet.has(n.id)),
        })),
      ...graph.edges
        .filter((e) => c.getElementById(e.id).empty())
        .map((e) => ({ group: "edges" as const, data: { ...e } })),
    ])
    // 起点が変わったらラベルの大きさも付け直す
    c.nodes().forEach((n) => {
      const isRoot = rootSet.has(n.id())
      if (n.hasClass("root") !== isRoot)
        n.data(nodeData(graph.nodes.get(n.id())!, isRoot))
    })
    c.nodes().removeClass("root")
    for (const r of roots) c.getElementById(r).addClass("root")
    if (added.empty() && !removed && c.scratch("layout") === layout) return
    c.scratch("layout", layout)
    const animate = !reduceMotion() && added.length < c.elements().length
    const focus = c.getElementById(roots[0])
    // 師弟は系譜の頂点（師匠側）から下へ流す
    const treeRoots = c
      .nodes()
      .roots()
      .filter((n) => n.outgoers("edge[kind = 'master']").nonempty())
    if (animate) added.nodes().style("opacity", 0)
    c.layout({
      name: "breadthfirst",
      roots: (layout === "tree" && treeRoots.nonempty()
        ? treeRoots
        : focus
      ).map((n) => n.id()),
      directed: layout === "tree" && treeRoots.nonempty(),
      circle: layout === "radial",
      spacingFactor: layout === "radial" ? 0.8 : 0.9,
      avoidOverlap: true,
      nodeDimensionsIncludeLabels: true,
      padding: 40,
      animate,
      animationDuration: 400,
      animationEasing: "ease-out-cubic",
      stop: () => {
        if (animate)
          added
            .nodes()
            .animate({ style: { opacity: 1 } }, { duration: 250 })
            .removeStyle("opacity")
      },
    }).run()
  }, [graph, roots, layout])

  useEffect(() => {
    const c = cy.current!
    c.elements().removeClass("faded hl").unselect()
    if (!selected) return
    const n = c.getElementById(selected)
    if (n.empty()) return
    n.select()
    const near = n.closedNeighborhood()
    c.elements().not(near).addClass("faded")
    near.edges().addClass("hl")
    if (reduceMotion()) c.center(n)
    else c.animate({ center: { eles: n } }, { duration: 300 })
  }, [selected, graph])

  const zoom = (f: number) => {
    const c = cy.current!
    c.zoom({
      level: c.zoom() * f,
      renderedPosition: { x: c.width() / 2, y: c.height() / 2 },
    })
  }

  return (
    <>
      <div
        ref={ref}
        role="application"
        aria-label="芸人の関係性グラフ"
        style={{ position: "absolute", inset: 0, touchAction: "none" }}
      />
      {tip && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            left: tip.x,
            top: tip.y,
            transform: "translateX(-50%)",
            maxWidth: 260,
            padding: ".4rem .65rem",
            background: "var(--text)",
            color: "#fff",
            fontSize: ".78rem",
            lineHeight: 1.5,
            borderRadius: 8,
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          <strong style={{ color: "var(--pop)" }}>{tip.title}</strong>
          {tip.body && <div>{tip.body}</div>}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          right: ".75rem",
          bottom: ".75rem",
          display: "grid",
          gap: ".35rem",
          zIndex: 1,
        }}
      >
        <button className="zoom" onClick={() => zoom(1.25)} aria-label="拡大">
          ＋
        </button>
        <button className="zoom" onClick={() => zoom(0.8)} aria-label="縮小">
          −
        </button>
        <button
          className="zoom"
          onClick={() => cy.current!.fit(undefined, 40)}
          aria-label="全体を表示"
          title="全体を表示"
        >
          ⤢
        </button>
      </div>
    </>
  )
}
