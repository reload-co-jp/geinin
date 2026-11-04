import {
  EDGE_KINDS,
  rankLabel,
  type EdgeKind,
  type GEdge,
  type Graph,
} from "@/lib/graph"

// 項目ごとの配置で使う、関係でまとめたノードの組
export type NodeGroup = {
  key: string
  title: string
  kind: EdgeKind | null
  // 起点からの距離（0 = 起点、Infinity = 起点からたどれない）
  depth: number
  ids: string[]
  // ノードに添える補足（決勝の順位など）
  notes: Map<string, string>
}

const KIND_ORDER = Object.keys(EDGE_KINDS) as EdgeKind[]

// 親から見た相手の呼び名。向きのある関係は向きで分ける
const relName = (g: Graph, e: GEdge, parent: string) => {
  const out = e.source === parent
  const hub = g.nodes.get(parent)?.kind
  switch (e.kind) {
    case "master":
      return out ? "弟子" : "師匠"
    case "senpai_kohai":
      return out ? "後輩" : "先輩"
    case "member":
      return out ? "所属コンビ・グループ" : "メンバー"
    case "former_member":
      return out ? "元コンビ・グループ" : "元メンバー"
    case "doki":
      return "同期"
    case "family":
      return "兄弟・親族"
    case "costar":
      return "共演"
    case "rival":
      return "ライバル"
    case "competition":
      return hub === "race" ? "決勝出場者" : "決勝進出した大会"
    case "tv":
      return hub === "program" ? "出演者" : "出演番組"
  }
}

// 起点から幅優先でたどり、たどり着いた関係（親×関係の呼び名）ごとにまとめる。
// 同じ距離では関係の種類の順（コンビ→師弟→同期…）に優先して親を決める
export const groupNodes = (g: Graph, focus: string): NodeGroup[] => {
  const adj = new Map<string, GEdge[]>()
  for (const e of g.edges) {
    for (const id of [e.source, e.target]) {
      const xs = adj.get(id)
      if (xs) xs.push(e)
      else adj.set(id, [e])
    }
  }
  for (const xs of adj.values())
    xs.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))

  const groups = new Map<string, NodeGroup>()
  const seen = new Set<string>()
  const ranks = new Map<string, number>()
  if (g.nodes.has(focus)) {
    seen.add(focus)
    groups.set("root", {
      key: "root",
      title: "起点",
      kind: null,
      depth: 0,
      ids: [focus],
      notes: new Map(),
    })
  }
  let frontier = g.nodes.has(focus) ? [focus] : []
  for (let d = 1; frontier.length; d++) {
    const next: string[] = []
    for (const parent of frontier) {
      for (const e of adj.get(parent) ?? []) {
        const other = e.source === parent ? e.target : e.source
        if (seen.has(other)) continue
        seen.add(other)
        next.push(other)
        const name = relName(g, e, parent)
        const key = d === 1 ? `1|${name}` : `${d}|${parent}|${name}`
        let group = groups.get(key)
        if (!group) {
          group = {
            key,
            title:
              d === 1
                ? name
                : `${g.nodes.get(parent)?.label ?? parent} の${name}`,
            kind: e.kind,
            depth: d,
            ids: [],
            notes: new Map(),
          }
          groups.set(key, group)
        }
        group.ids.push(other)
        const rank = e.kind === "competition" ? rankLabel(e.rank) : ""
        if (rank) group.notes.set(other, rank)
        if (e.kind === "competition") ranks.set(other, e.rank ?? Infinity)
      }
    }
    frontier = next
  }
  const rest = [...g.nodes.keys()].filter((id) => !seen.has(id))
  if (rest.length)
    groups.set("rest", {
      key: "rest",
      title: "その他（追加した芸人など）",
      kind: null,
      depth: Infinity,
      ids: rest,
      notes: new Map(),
    })
  // 賞レースの出場者は順位順に並べる
  for (const group of groups.values())
    if (group.kind === "competition")
      group.ids.sort(
        (a, b) => (ranks.get(a) ?? Infinity) - (ranks.get(b) ?? Infinity)
      )

  // 距離ごとに、起点直下は関係の種類順、その先は親の並び順を保つ
  return [...groups.values()].sort(
    (a, b) =>
      a.depth - b.depth ||
      (a.depth === 1
        ? KIND_ORDER.indexOf(a.kind!) - KIND_ORDER.indexOf(b.kind!)
        : 0)
  )
}

type Box = { x: number; y: number; w: number; h: number }

export type Placement = {
  // ノードの中心座標
  positions: Map<string, { x: number; y: number }>
  // 枠（中心座標と大きさ）
  frames: (NodeGroup & Box)[]
}

const PAD = 14
const HEADER = 30
const GAP = 28

// 各組を枠内の格子に並べ、枠を行に詰めて配置する。size はノードの外形（ラベル込み）
export const placeGroups = (
  groups: NodeGroup[],
  size: (id: string) => { w: number; h: number }
): Placement => {
  const boxes = groups.map((group) => {
    const dims = group.ids.map(size)
    const cw = Math.max(...dims.map((d) => d.w)) + 12
    const ch = Math.max(...dims.map((d) => d.h)) + 12
    const n = group.ids.length
    const cols = Math.min(n <= 6 ? n : Math.ceil(Math.sqrt(n * 2)), 10)
    const rows = Math.ceil(n / cols)
    return {
      group,
      cw,
      ch,
      cols,
      // 見出し（件数込み）が枠からはみ出さない幅
      w: Math.max(cols * cw, (group.title.length + 4) * 15) + PAD * 2,
      h: HEADER + rows * ch + PAD,
    }
  })
  const area = boxes.reduce((s, b) => s + (b.w + GAP) * (b.h + GAP), 0)
  const maxW = Math.max(...boxes.map((b) => b.w), Math.sqrt(area) * 1.6)

  // 距離が変わるところでは行を改める
  type Row = { items: typeof boxes; w: number; h: number }
  const rows: Row[] = []
  let row: Row | null = null
  let prevDepth = -1
  for (const b of boxes) {
    const depthChanged = b.group.depth !== prevDepth && prevDepth !== 0
    if (!row || row.w + b.w > maxW || (depthChanged && row.items.length)) {
      row = { items: [], w: 0, h: 0 }
      rows.push(row)
    }
    row.items.push(b)
    row.w += b.w + GAP
    row.h = Math.max(row.h, b.h)
    prevDepth = b.group.depth
  }

  const positions = new Map<string, { x: number; y: number }>()
  const frames: Placement["frames"] = []
  let y = 0
  for (const r of rows) {
    let x = (maxW - (r.w - GAP)) / 2
    for (const b of r.items) {
      b.group.ids.forEach((id, i) => {
        const col = i % b.cols
        const line = Math.floor(i / b.cols)
        // 最終行の端数は中央に寄せる
        const inLine = Math.min(b.cols, b.group.ids.length - line * b.cols)
        const offset = (b.w - PAD * 2 - inLine * b.cw) / 2
        positions.set(id, {
          x: x + PAD + offset + col * b.cw + b.cw / 2,
          y: y + HEADER + line * b.ch + b.ch / 2,
        })
      })
      frames.push({
        ...b.group,
        x: x + b.w / 2,
        y: y + b.h / 2,
        w: b.w,
        h: b.h,
      })
      x += b.w + GAP
    }
    y += r.h + GAP
  }
  return { positions, frames }
}
