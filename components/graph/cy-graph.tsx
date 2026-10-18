"use client"

import cytoscape, { type Core } from "cytoscape"
import { FC, useEffect, useRef } from "react"
import { EDGE_KINDS, type Graph } from "@/lib/graph"

const style: cytoscape.StylesheetJson = [
  {
    selector: "node",
    style: {
      label: "data(label)",
      "font-size": 12,
      "text-valign": "bottom",
      "text-margin-y": 4,
      color: "#16121f",
      "text-background-color": "#ffffff",
      "text-background-opacity": 0.8,
      "text-background-padding": "2px",
      "min-zoomed-font-size": 7,
      width: 22,
      height: 22,
      "background-color": "#ffffff",
      "border-width": 2,
      "border-color": "#16121f",
    },
  },
  {
    selector: "node[kind = 'group']",
    style: {
      shape: "round-rectangle",
      width: 34,
      height: 20,
      "background-color": "#ffd60a",
      "font-weight": "bold",
    },
  },
  {
    selector: "node[kind = 'term']",
    style: {
      shape: "diamond",
      width: 26,
      height: 26,
      "background-color": "#a8eef5",
      "border-color": "#0b7f8c",
    },
  },
  {
    selector: "node.root",
    style: { "border-width": 4, "border-color": "#ff3d7f" },
  },
  {
    selector: "node:selected",
    style: { "background-color": "#ff3d7f", "border-color": "#16121f" },
  },
  {
    selector: "edge",
    style: {
      width: 2,
      "curve-style": "bezier",
      label: "",
      "font-size": 9,
      "text-rotation": "autorotate",
      "text-background-color": "#ffffff",
      "text-background-opacity": 0.9,
      "min-zoomed-font-size": 9,
    },
  },
  ...Object.entries(EDGE_KINDS).map(([kind, k]) => ({
    selector: `edge[kind = '${kind}']`,
    style: {
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
  { selector: "edge.hl", style: { label: "data(label)", width: 3 } },
]

type Props = {
  graph: Graph
  roots: string[]
  selected: string | null
  onSelect: (id: string | null) => void
  // 値が変わるたびに全体表示へ戻す
  resetKey: number
}

export const CyGraph: FC<Props> = ({
  graph,
  roots,
  selected,
  onSelect,
  resetKey,
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const cy = useRef<Core>(null)
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  })

  useEffect(() => {
    const c = cytoscape({ container: ref.current, style, maxZoom: 2.5 })
    c.on("tap", "node", (e) => onSelectRef.current(e.target.id()))
    c.on("tap", (e) => e.target === c && onSelectRef.current(null))
    cy.current = c
    return () => c.destroy()
  }, [])

  // 要素の差分だけ入れ替え、既存ノードの位置は保つ
  useEffect(() => {
    const c = cy.current!
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
        .map((n) => ({ group: "nodes" as const, data: { ...n } })),
      ...graph.edges
        .filter((e) => c.getElementById(e.id).empty())
        .map((e) => ({ group: "edges" as const, data: { ...e } })),
    ])
    c.nodes().removeClass("root")
    for (const r of roots) c.getElementById(r).addClass("root")
    if (added.empty() && !removed) return
    // 起点を中心に距離ごとの同心円で配置する
    c.layout({
      name: "breadthfirst",
      roots: roots.slice(0, 1),
      circle: true,
      spacingFactor: 0.75,
      padding: 40,
      animate: added.length < c.elements().length,
      animationDuration: 300,
    }).run()
  }, [graph, roots])

  useEffect(() => {
    cy.current!.fit(undefined, 40)
  }, [resetKey])

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
    c.animate({ center: { eles: n } }, { duration: 250 })
  }, [selected, graph])

  return (
    <div
      ref={ref}
      role="application"
      aria-label="芸人の関係性グラフ"
      style={{ position: "absolute", inset: 0 }}
    />
  )
}
