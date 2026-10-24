import type {
  ActivityStatus,
  Confidence,
  Db,
  RelationshipType,
} from "@/lib/types"

export type EdgeKind =
  "member" | "former_member" | RelationshipType | "doki" | "competition"

// 線種・太さ・矢印でも判別できるよう種類ごとに変える。色は色覚多様性に配慮した Okabe-Ito 系。
// dash は SVG stroke-dasharray / cytoscape line-dash-pattern 共用
export const EDGE_KINDS: Record<
  EdgeKind,
  {
    label: string
    color: string
    width: number
    dash: number[] | null
    arrow: "triangle" | "tee" | null
  }
> = {
  member: {
    label: "コンビ・メンバー",
    color: "#1f1d1a",
    width: 5,
    dash: null,
    arrow: null,
  },
  former_member: {
    label: "元メンバー（元コンビ）",
    color: "#7a746b",
    width: 3,
    dash: [9, 5],
    arrow: null,
  },
  master: {
    label: "師弟（師匠→弟子）",
    color: "#d55e00",
    width: 3.5,
    dash: null,
    arrow: "triangle",
  },
  doki: {
    label: "同期（養成所の同一期）",
    color: "#0072b2",
    width: 2,
    dash: [2, 4],
    arrow: null,
  },
  senpai_kohai: {
    label: "先輩→後輩",
    color: "#cc79a7",
    width: 2,
    dash: [8, 4],
    arrow: "triangle",
  },
  family: {
    label: "兄弟・親族",
    color: "#a8780a",
    width: 2.5,
    dash: [8, 3, 2, 3, 2, 3],
    arrow: null,
  },
  costar: {
    label: "共演",
    color: "#009e73",
    width: 1.5,
    dash: [14, 6],
    arrow: null,
  },
  competition: {
    label: "賞レース競演",
    color: "#e69f00",
    width: 2.5,
    dash: [10, 3, 2, 3],
    arrow: null,
  },
  rival: {
    label: "ライバル（本人公言）",
    color: "#56446b",
    width: 2.5,
    dash: null,
    arrow: "tee",
  },
}

export const STATUS_LABEL: Record<ActivityStatus, string> = {
  active: "活動中",
  hiatus: "活動休止",
  retired: "引退",
  deceased: "故人",
  disbanded: "解散",
}

// 探索モード。関係の種類・距離・配置の初期値と説明の組
export type ModeId = "all" | "lineage" | "doki" | "combi" | "race" | "costar"
export const MODES: Record<
  ModeId,
  {
    label: string
    description: string
    kinds: EdgeKind[]
    depth: number
    layout: "radial" | "tree"
  }
> = {
  all: {
    label: "人物相関図",
    description:
      "すべての関係をまとめて表示。起点から距離ごとの同心円に並びます。",
    kinds: Object.keys(EDGE_KINDS) as EdgeKind[],
    depth: 2,
    layout: "radial",
  },
  lineage: {
    label: "師弟系譜",
    description: "師匠→弟子の流れを上から下への系譜ツリーで表示します。",
    kinds: ["master", "senpai_kohai"],
    depth: 3,
    layout: "tree",
  },
  doki: {
    label: "同期・世代",
    description: "養成所の同じ期でつながる同期と、所属コンビを表示します。",
    kinds: ["doki", "member"],
    depth: 2,
    layout: "radial",
  },
  combi: {
    label: "コンビ変遷",
    description:
      "現在のコンビ（太線）と元コンビ（破線）をたどり、結成・解散の流れを追います。",
    kinds: ["member", "former_member"],
    depth: 3,
    layout: "tree",
  },
  race: {
    label: "賞レース競演",
    description:
      "同じ年の決勝で戦った組を、開催（大会×年）ごとにまとめてつなぎます。",
    kinds: ["competition", "member"],
    depth: 2,
    layout: "radial",
  },
  costar: {
    label: "共演ネットワーク",
    description: "共演・ライバル・親族など、番組や私生活での関係を表示します。",
    kinds: ["costar", "rival", "family", "member"],
    depth: 2,
    layout: "radial",
  },
}

export type GNode = {
  id: string
  // race = 賞レースの開催（大会×年）を表す中継ノード
  kind: "person" | "group" | "term" | "race"
  label: string
  agencyId: string | null
  year: number | null
  status: ActivityStatus | null
  photo: string | null
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
  // 賞レースの順位（優勝=1）。それ以外は null
  rank?: number | null
}

export type Graph = { nodes: Map<string, GNode>; edges: GEdge[] }

const year = (d: string | null) => (d ? Number(d.slice(0, 4)) : null)

// 名古屋校の旧課程（1993〜2006年）。4月・10月の2期制で、欠けている期は年が不明
const NAGOYA: Record<number, number> = {
  1: 1993,
  2: 1994,
  4: 1996,
  5: 1997,
  8: 1998,
  9: 1999,
  10: 1999,
  11: 2000,
  12: 2000,
  15: 2002,
  16: 2002,
  17: 2003,
  18: 2003,
  19: 2004,
  21: 2005,
  23: 2006,
}

// 養成所の期の入学年。Wikipedia「吉本総合芸能学院」の各校の表による。
// 大阪校の13〜20期は4月・10月の2期制。沖縄校は表がないため未収録
export const termYear = (school: string, k: number): number | null => {
  const y =
    school === "NSC大阪"
      ? k <= 13
        ? 1981 + k
        : k <= 20
          ? 1994 + Math.floor((k - 13) / 2)
          : 1977 + k
      : school === "NSC東京"
        ? 1994 + k
        : school === "NSC福岡"
          ? 2017 + k
          : school === "NSC札幌"
            ? 2019 + k
            : school === "NSC広島"
              ? k <= 2
                ? 2001 + k
                : 2018 + k
              : school === "NSC岡山"
                ? 2002 + k
                : school === "NSC名古屋"
                  ? (NAGOYA[k] ?? null)
                  : null
  // 期数の誤記（例: 東京230期）で未来の年にならないように
  return y && y <= new Date().getFullYear() ? y : null
}

// 賞レースの開催（大会×年）を表すノード。ID は「x:大会名 年」
export const raceId = (competition: string, year: number) =>
  `x:${competition} ${year}`

export const parseRaceId = (id: string) => {
  if (!id.startsWith("x:")) return null
  const s = id.slice(2)
  const i = s.lastIndexOf(" ")
  if (i < 1) return null
  return { competition: s.slice(0, i), year: Number(s.slice(i + 1)) }
}

// 開催ページ /races/{slug}/{年}/ の大会スラッグ
export const raceSlugs: Record<string, string> = {
  "M-1グランプリ": "m1",
  "R-1グランプリ": "r1",
  キングオブコント: "kok",
  "THE SECOND": "the-second",
  ABCお笑いグランプリ: "abc",
  ダブルインパクト: "double-impact",
  ツギクル芸人グランプリ: "tsugikuru",
  おもしろ荘: "omoshiroso",
}

// 順位のラベル。順位不明は空文字
export const rankLabel = (rank: number | null | undefined) =>
  rank === 1 ? "優勝" : rank ? `${rank}位` : ""

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
      status: p.activity_status,
      photo: p.photo_url ?? null,
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
      status: g.activity_status,
      photo: g.photo_url ?? null,
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
  const termDebuts = new Map<string, number[]>()
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
        year: termYear(p.training_school, p.training_school_term),
        status: null,
        photo: null,
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
    const y = year(p.debut_date)
    if (y) termDebuts.set(id, [...(termDebuts.get(id) ?? []), y])
  }

  // 入学年の表にない期は、期生のデビュー年で最も多い年を入学年とみなす
  for (const [id, ys] of termDebuts)
    nodes.get(id)!.year ??= ys.toSorted(
      (a, b) =>
        ys.filter((v) => v === b).length - ys.filter((v) => v === a).length
    )[0]
  // 養成所を経ていない芸人は、入学年とデビュー年が同じ期の同期とみなす。
  // 期へ直接つなぐと1人が複数校の期に属して見えるため「◯年デビュー」ノードにまとめ、そこから各期へつなぐ
  const termsByYear = Map.groupBy(
    [...nodes.values()].filter((n) => n.kind === "term" && n.year),
    (n) => n.year
  )
  const doki = (id: string, source: string, target: string, label: string) =>
    edges.push({
      id,
      source,
      target,
      kind: "doki",
      label,
      derived: true,
      confidence: "medium",
      verified: false,
      refId: null,
    })
  for (const p of db.people) {
    if (p.training_school) continue
    const y = year(p.debut_date)
    const terms = y && termsByYear.get(y)
    if (!terms) continue
    const label = `${y}年デビュー`
    const id = `t:${label}`
    if (!nodes.has(id)) {
      nodes.set(id, {
        id,
        kind: "term",
        label,
        agencyId: null,
        year: y,
        status: null,
        photo: null,
        search: normalize(label),
      })
      for (const t of terms) doki(`d:${id}:${t.id}`, id, t.id, "同年の期")
    }
    doki(`d:${p.id}`, `p:${p.id}`, id, "同年デビュー")
  }

  // 賞レースは決勝出場同士をすべてつなぐと辺が爆発（1年だけで40本超）するため、
  // 開催（大会×年）を表すノードを中継点に置き、各出場をそこへつなぐ
  const finals = Map.groupBy(
    db.competitionResults.filter((r) => r.stage === "決勝"),
    (r) => `${r.competition_name} ${r.year}`
  )
  for (const [comp, rs] of finals) {
    const i = comp.lastIndexOf(" ")
    const name = comp.slice(0, i)
    const y = Number(comp.slice(i + 1))
    const id = raceId(name, y)
    nodes.set(id, {
      id,
      kind: "race",
      label: `${name} ${y}`,
      agencyId: null,
      year: y,
      status: null,
      photo: null,
      search: search(name, String(y)),
    })
    for (const r of rs)
      edges.push({
        id: `cx:${r.id}`,
        source: r.entrant_id,
        target: id,
        kind: "competition",
        label: `${comp} 決勝`,
        derived: true,
        confidence: "high",
        verified: false,
        refId: null,
        rank: r.rank,
      })
  }

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

// 期ノードは同期をたどる中継点なので絞り込み対象外。
// 開催ノードも事務所は无关で、年代（開催年）でのみ絞り込む
const passes = (n: GNode, v: View) => {
  if (n.kind === "term") return true
  const okAgency =
    n.kind === "race" ? true : !v.agencyId || n.agencyId === v.agencyId
  const okDecade =
    v.decade === null ||
    (n.year !== null && Math.floor(n.year / 10) * 10 === v.decade)
  return okAgency && okDecade
}

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
          : edge.kind === "member"
            ? out
              ? "所属コンビ"
              : "メンバー"
            : edge.kind === "former_member"
              ? out
                ? "元コンビ"
                : "元メンバー"
              : edge.kind === "doki" && !out && edge.confidence === "high"
                ? "同期生"
                : edge.kind === "competition"
                  ? rankLabel(edge.rank) || "決勝進出"
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

// 養成所の期ノードなど個別ページを持たないものはグラフへ
export const nodeHref = (nodeId: string) => {
  const [kind, id] = nodeId.split(":")
  const race = parseRaceId(nodeId)
  const slug = race && raceSlugs[race.competition]
  const debut = nodeId.match(/^t:(\d{4})年デビュー$/)?.[1]
  return kind === "p"
    ? `/people/${id}/`
    : kind === "g"
      ? `/groups/${id}/`
      : slug
        ? `/races/${slug}/${race.year}/`
        : debut
          ? `/doki/${debut}/`
          : graphHref(nodeId)
}
