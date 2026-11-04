import { describe, expect, it } from "vitest"
import type { GEdge, GNode, Graph } from "@/lib/graph"
import { groupNodes, placeGroups } from "./groups"

const node = (id: string, kind: GNode["kind"] = "person"): GNode => ({
  id,
  kind,
  label: id,
  agencyId: null,
  year: null,
  status: null,
  photo: null,
  search: id,
})
const edge = (source: string, target: string, kind: GEdge["kind"]): GEdge => ({
  id: `${source}-${target}`,
  source,
  target,
  kind,
  label: kind,
  derived: false,
  confidence: "high",
  verified: true,
  refId: null,
})
const graph = (nodes: GNode[], edges: GEdge[]): Graph => ({
  nodes: new Map(nodes.map((n) => [n.id, n])),
  edges,
})

describe("groupNodes", () => {
  const g = graph(
    ["root", "master", "pupil1", "pupil2", "doki", "grand", "lonely"].map(
      (id) => node(id)
    ),
    [
      edge("master", "root", "master"),
      edge("root", "pupil1", "master"),
      edge("root", "pupil2", "master"),
      edge("root", "doki", "doki"),
      edge("pupil1", "grand", "master"),
    ]
  )

  it("起点との関係ごと、向きごとにまとめる", () => {
    const groups = groupNodes(g, "root")
    expect(groups.map((x) => [x.title, x.ids])).toEqual([
      ["起点", ["root"]],
      ["師匠", ["master"]],
      ["弟子", ["pupil1", "pupil2"]],
      ["同期", ["doki"]],
      ["pupil1 の弟子", ["grand"]],
      ["その他（追加した芸人など）", ["lonely"]],
    ])
  })

  it("全ノードを重ならない位置に置く", () => {
    const { positions, frames } = placeGroups(groupNodes(g, "root"), () => ({
      w: 60,
      h: 60,
    }))
    expect(positions.size).toBe(7)
    const pts = [...positions.values()].map((p) => `${p.x},${p.y}`)
    expect(new Set(pts).size).toBe(7)
    // 各ノードは自分の枠の内側にある
    for (const f of frames)
      for (const id of f.ids) {
        const p = positions.get(id)!
        expect(Math.abs(p.x - f.x)).toBeLessThan(f.w / 2)
        expect(Math.abs(p.y - f.y)).toBeLessThan(f.h / 2)
      }
  })
})
