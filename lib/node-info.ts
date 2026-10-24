import type { Confidence, HistoryEntry, PartialDate } from "@/lib/types"
import { linksOf, type EdgeIndex, type EdgeKind, type Graph } from "@/lib/graph"

// 詳細パネル・詳細ページの表示内容。サーバーで組み立て、パネルには静的JSONとして配信する
export type LinkInfo = {
  edgeId: string
  kind: EdgeKind
  other: string
  otherName: string
  label: string
  derived: boolean
  confidence: Confidence
  rel: {
    description: string
    start_date: PartialDate
    end_date: PartialDate
    last_verified_at: PartialDate
  } | null
}

export type NodeInfo = {
  id: string
  name: string
  reading: string
  aliases: string[]
  photo_url?: string | null
  status?: string | null
  // 数字で大きく見せる項目。芸歴は表示時点の年から数える
  career?: {
    kind: "デビュー" | "結成"
    since: number
    until: number | null
  } | null
  finals?: { count: number; best: number | null } | null
  facts: [string, string][]
  links: LinkInfo[]
  results: string[]
  sources: {
    id: string
    name: string
    url: string | null
    checked_at: PartialDate
    notes?: string
  }[]
  history?: HistoryEntry[]
}

export const linkInfos = (
  g: Graph,
  index: EdgeIndex,
  nodeId: string
): LinkInfo[] =>
  linksOf(index, nodeId).map(({ edge, other, label }) => ({
    edgeId: edge.id,
    kind: edge.kind,
    other,
    otherName: g.nodes.get(other)?.label ?? other,
    label,
    derived: edge.derived,
    confidence: edge.confidence,
    rel: null,
  }))

// 期ノードは個別データを持たないのでグラフだけから作る
export const termInfo = (
  g: Graph,
  index: EdgeIndex,
  nodeId: string
): NodeInfo => ({
  id: nodeId,
  name: g.nodes.get(nodeId)?.label ?? nodeId,
  reading: nodeId.endsWith("デビュー") ? "同年デビュー" : "養成所の期",
  aliases: [],
  facts: [],
  links: linkInfos(g, index, nodeId),
  results: [],
  sources: [],
})

// 詳細JSONはノード毎だと静的生成が数千件になるため、ハッシュで分割してまとめて配信する
export const NODE_SHARDS = 64
export const nodeShard = (nodeId: string) => {
  let h = 0
  for (let i = 0; i < nodeId.length; i++)
    h = (h * 31 + nodeId.charCodeAt(i)) >>> 0
  return h % NODE_SHARDS
}
