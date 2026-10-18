import type { Confidence, Db, RelationshipType } from "@/lib/types"

export type EdgeKind =
  "member" | "former_member" | RelationshipType | "doki" | "competition"

// 線種は色に頼らず判別できるよう種類ごとに変える。dash は SVG stroke-dasharray / cytoscape line-dash-pattern 共用
export const EDGE_KINDS: Record<
  EdgeKind,
  {
    label: string
    color: string
    dash: number[] | null
    arrow: "triangle" | "tee" | null
  }
> = {
  member: { label: "メンバー", color: "#3d4451", dash: null, arrow: null },
  former_member: {
    label: "元メンバー",
    color: "#8a919c",
    dash: [8, 4],
    arrow: null,
  },
  master: {
    label: "師弟（師匠→弟子）",
    color: "#c0392b",
    dash: null,
    arrow: "triangle",
  },
  doki: {
    label: "同期（養成所の同一期）",
    color: "#2471a3",
    dash: [2, 4],
    arrow: null,
  },
  senpai_kohai: {
    label: "先輩→後輩",
    color: "#7d3c98",
    dash: [8, 4],
    arrow: "triangle",
  },
  family: {
    label: "兄弟・親族",
    color: "#b9770e",
    dash: [8, 3, 2, 3, 2, 3],
    arrow: null,
  },
  costar: { label: "共演", color: "#1e8449", dash: [14, 6], arrow: null },
  competition: {
    label: "賞レース競演",
    color: "#d35400",
    dash: [10, 3, 2, 3],
    arrow: null,
  },
  rival: {
    label: "ライバル（本人公言）",
    color: "#34495e",
    dash: null,
    arrow: "tee",
  },
}

export type GNode = {
  id: string
  kind: "person" | "group" | "term"
  label: string
  agencyId: string | null
  year: number | null
  // 正規化済みの検索対象文字列（名前・読み・別名・事務所・養成所）
  search: string
}

export type GEdge = {
  id: string
  source: string
  target: string
  kind: EdgeKind
  label: string
  // 導出された関係（同期・競演）は個別の出典を持たない
  derived: boolean
  confidence: Confidence
  verified: boolean
  refId: string | null
}

export type Graph = { nodes: Map<string, GNode>; edges: GEdge[] }

const year = (d: string | null) => (d ? Number(d.slice(0, 4)) : null)

const pairs = <T>(xs: T[]) =>
  xs.flatMap((a, i) => xs.slice(i + 1).map((b) => [a, b] as const))

export const normalize = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s・]/g, "")

export const buildGraph = (db: Db): Graph => {
  const agency = new Map(db.agencies.map((a) => [a.id, a.name]))
  const search = (...xs: (string | null | undefined)[]) =>
    xs.filter(Boolean).map(normalize).join("\n")
  const nodes = new Map<string, GNode>()
  for (const p of db.people)
    nodes.set(`p:${p.id}`, {
      id: `p:${p.id}`,
      kind: "person",
      label: p.name,
      agencyId: p.agency_id,
      year: year(p.debut_date),
      search: search(
        p.name,
        p.reading,
        ...p.aliases,
        p.agency_id && agency.get(p.agency_id),
        p.training_school &&
          `${p.training_school}${p.training_school_term ?? ""}期`
      ),
    })
  for (const g of db.groups)
    nodes.set(`g:${g.id}`, {
      id: `g:${g.id}`,
      kind: "group",
      label: g.name,
      agencyId: g.agency_id,
      year: year(g.formation_date),
      search: search(
        g.name,
        g.reading,
        ...g.aliases,
        g.agency_id && agency.get(g.agency_id)
      ),
    })

  const edges: GEdge[] = []
  for (const m of db.memberships) {
    const kind = m.status === "current" ? "member" : "former_member"
    edges.push({
      id: `m:${m.person_id}:${m.group_id}`,
      source: `p:${m.person_id}`,
      target: `g:${m.group_id}`,
      kind,
      label: EDGE_KINDS[kind].label,
      derived: false,
      confidence: "high",
      verified: false,
      refId: null,
    })
  }
  for (const r of db.relationships)
    edges.push({
      id: `r:${r.id}`,
      source: `p:${r.source_person_id}`,
      target: `p:${r.target_person_id}`,
      kind: r.relationship_type,
      label: EDGE_KINDS[r.relationship_type].label,
      derived: false,
      confidence: r.confidence,
      verified: r.last_verified_at !== null,
      refId: r.id,
    })

  // 同期は全ペアだと1期数百人で辺が爆発するため「養成所の期」ノードを介してつなぐ
  for (const p of db.people) {
    if (!p.training_school || !p.training_school_term) continue
    const term = `${p.training_school}${p.training_school_term}期`
    const id = `t:${term}`
    if (!nodes.has(id))
      nodes.set(id, {
        id,
        kind: "term",
        label: term,
        agencyId: null,
        year: null,
        search: normalize(term),
      })
    edges.push({
      id: `d:${p.id}`,
      source: `p:${p.id}`,
      target: id,
      kind: "doki",
      label: term,
      derived: true,
      confidence: "high",
      verified: false,
      refId: null,
    })
  }

  const finals = Map.groupBy(
    db.competitionResults.filter((r) => r.stage === "決勝"),
    (r) => `${r.competition_name} ${r.year}`
  )
  for (const [comp, rs] of finals)
    for (const [a, b] of pairs(rs))
      edges.push({
        id: `c:${a.id}:${b.id}`,
        source: `g:${a.group_id}`,
        target: `g:${b.group_id}`,
        kind: "competition",
        label: `${comp} 決勝`,
        derived: true,
        confidence: "high",
        verified: false,
        refId: null,
      })

  return { nodes, edges }
}

export type View = {
  focus: string
  depth: number
  kinds: Set<EdgeKind>
  expanded: string[]
  agencyId: string | null
  decade: number | null
  limit: number
}

// 期ノードは同期をたどる中継点なので絞り込み対象外
const passes = (n: GNode, v: View) =>
  n.kind === "term" ||
  ((!v.agencyId || n.agencyId === v.agencyId) &&
    (v.decade === null ||
      (n.year !== null && Math.floor(n.year / 10) * 10 === v.decade)))

// focus から depth 以内 + 展開済みノードの隣接を返す。絞り込みで外れたノードは辿らない（起点は常に残す）
export const visibleSubgraph = (g: Graph, v: View): Graph => {
  const edges = g.edges.filter((e) => v.kinds.has(e.kind))
  const adj = new Map<string, string[]>()
  const push = (a: string, b: string) => {
    const xs = adj.get(a)
    if (xs) xs.push(b)
    else adj.set(a, [b])
  }
  for (const e of edges) {
    push(e.source, e.target)
    push(e.target, e.source)
  }
  const roots = new Set([v.focus, ...v.expanded])
  const ok = (id: string) => {
    const n = g.nodes.get(id)
    return !!n && (roots.has(id) || passes(n, v))
  }

  const seen = new Set<string>()
  const bfs = (start: string, depth: number) => {
    if (!g.nodes.has(start)) return
    let frontier = [start]
    seen.add(start)
    for (let d = 0; d < depth && frontier.length; d++) {
      const next: string[] = []
      for (const id of frontier)
        for (const nb of adj.get(id) ?? [])
          if (!seen.has(nb) && ok(nb) && seen.size < v.limit) {
            seen.add(nb)
            next.push(nb)
          }
      frontier = next
    }
  }
  bfs(v.focus, v.depth)
  for (const id of v.expanded) bfs(id, 1)

  return {
    nodes: new Map([...seen].map((id) => [id, g.nodes.get(id)!])),
    edges: edges.filter((e) => seen.has(e.source) && seen.has(e.target)),
  }
}

export type EdgeIndex = Map<string, GEdge[]>

export const indexEdges = (g: Graph): EdgeIndex => {
  const index: EdgeIndex = new Map()
  const push = (id: string, e: GEdge) => {
    const xs = index.get(id)
    if (xs) xs.push(e)
    else index.set(id, [e])
  }
  for (const e of g.edges) {
    push(e.source, e)
    push(e.target, e)
  }
  return index
}

export type Link = { edge: GEdge; other: string; label: string }

// ノードに接続する関係を、相手側から見たラベル付きで返す
export const linksOf = (index: EdgeIndex, nodeId: string): Link[] =>
  (index.get(nodeId) ?? []).map((edge) => {
    const out = edge.source === nodeId
    const other = out ? edge.target : edge.source
    const label =
      edge.kind === "master"
        ? out
          ? "弟子"
          : "師匠"
        : edge.kind === "senpai_kohai"
          ? out
            ? "後輩"
            : "先輩"
          : edge.kind === "member" || edge.kind === "former_member"
            ? out
              ? EDGE_KINDS[edge.kind].label.replace("メンバー", "所属")
              : EDGE_KINDS[edge.kind].label
            : edge.kind === "doki" && !out
              ? "同期生"
              : edge.label
    return { edge, other, label }
  })

// 名前の完全一致 → 前方一致 → 部分一致の順
export const searchNodes = (g: Graph, q: string) => {
  const k = normalize(q)
  if (!k) return []
  const rank = (n: GNode) => {
    const name = normalize(n.label)
    return name === k ? 0 : name.startsWith(k) ? 1 : 2
  }
  return [...g.nodes.values()]
    .filter((n) => n.search.includes(k))
    .sort((a, b) => rank(a) - rank(b))
    .map((n) => n.id)
}

// 静的JSONとして配信する形
export type GraphJSON = { nodes: GNode[]; edges: GEdge[] }

export const fromJSON = (j: GraphJSON): Graph => ({
  nodes: new Map(j.nodes.map((n) => [n.id, n])),
  edges: j.edges,
})

export const graphHref = (nodeId: string, query = "") =>
  `/graph/?focus=${encodeURIComponent(nodeId)}${query}`

// 期ノードは個別ページを持たないのでグラフへ
export const nodeHref = (nodeId: string) => {
  const [kind, id] = nodeId.split(":")
  return kind === "p"
    ? `/people/${id}/`
    : kind === "g"
      ? `/groups/${id}/`
      : graphHref(nodeId)
}
