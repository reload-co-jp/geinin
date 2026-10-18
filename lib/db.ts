// サーバー側（静的生成時）専用。クライアントへは /data/*.json で必要な分だけ配信する
import { db as manual } from "@/data/db"
import yoshimoto from "@/data/yoshimoto.json"
import { buildGraph, indexEdges } from "@/lib/graph"
import { linkInfos, termInfo, type NodeInfo } from "@/lib/node-info"
import type { ActivityStatus, Confidence } from "@/lib/types"
import { mergeYoshimoto, type YoshimotoDump } from "@/lib/yoshimoto"

export const db = mergeYoshimoto(manual, yoshimoto as YoshimotoDump)
export const graph = buildGraph(db)
export const edgeIndex = indexEdges(graph)

export const personById = new Map(db.people.map((p) => [p.id, p]))
export const groupById = new Map(db.groups.map((g) => [g.id, g]))
const agencyById = new Map(db.agencies.map((a) => [a.id, a.name]))
const sourceById = new Map(db.sources.map((s) => [s.id, s]))
const relById = new Map(db.relationships.map((r) => [r.id, r]))

export const agencyName = (id: string | null) =>
  (id && agencyById.get(id)) ?? null

const STATUS_LABEL: Record<ActivityStatus, string> = {
  active: "活動中",
  hiatus: "活動休止",
  retired: "引退",
  deceased: "故人",
  disbanded: "解散",
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "確度高",
  medium: "確度中",
  low: "確度低",
}

const resultsOf = (nodeId: string) => {
  const [kind, id] = nodeId.split(":")
  const groupIds =
    kind === "g"
      ? [id]
      : (edgeIndex.get(nodeId) ?? [])
          .filter((e) => e.kind === "member" || e.kind === "former_member")
          .map((e) => e.target.slice(2))
  return db.competitionResults
    .filter((r) => groupIds.includes(r.group_id))
    .toSorted((a, b) => a.year - b.year)
}

export const nodeInfo = (nodeId: string): NodeInfo | null => {
  const [kind, id] = nodeId.split(":")
  if (kind === "t") return termInfo(graph, edgeIndex, nodeId)
  const person = kind === "p" ? personById.get(id) : undefined
  const group = kind === "g" ? groupById.get(id) : undefined
  const e = person ?? group
  if (!e) return null

  const links = linkInfos(graph, edgeIndex, nodeId).map((l) => {
    const r = l.edgeId.startsWith("r:") ? relById.get(l.edgeId.slice(2)) : null
    return r
      ? {
          ...l,
          rel: {
            description: r.description,
            start_date: r.start_date,
            end_date: r.end_date,
            last_verified_at: r.last_verified_at,
          },
        }
      : l
  })
  const results = resultsOf(nodeId)
  const sourceIds = new Set([
    ...e.source_ids,
    ...links.flatMap((l) =>
      l.rel ? (relById.get(l.edgeId.slice(2))?.source_ids ?? []) : []
    ),
    ...results.flatMap((r) => r.source_ids),
  ])
  const facts: [string, string | null | undefined][] = [
    [
      "種別",
      person
        ? "個人"
        : { combi: "コンビ", trio: "トリオ", unit: "ユニット" }[
            group!.group_type
          ],
    ],
    ["所属事務所", agencyName(e.agency_id)],
    ["活動状況", e.activity_status && STATUS_LABEL[e.activity_status]],
    ["デビュー", person?.debut_date],
    ["生年月日", person?.birth_date],
    [
      "養成所",
      person?.training_school &&
        `${person.training_school}${person.training_school_term ? ` ${person.training_school_term}期` : ""}`,
    ],
    ["結成", group?.formation_date],
    ["解散", group?.dissolution_date],
    ["概要", person?.biography],
  ]

  return {
    id: nodeId,
    name: e.name,
    reading: e.reading,
    aliases: e.aliases,
    facts: facts.filter((f): f is [string, string] => !!f[1]),
    links,
    results: results.map(
      (r) =>
        `${r.competition_name} ${r.year} ${r.stage}${r.rank ? ` ${r.rank === 1 ? "優勝" : `${r.rank}位`}` : ""}${person ? `（${groupById.get(r.group_id)?.name}）` : ""}`
    ),
    sources: [...sourceIds].flatMap((sid) => {
      const s = sourceById.get(sid)
      return s
        ? [
            {
              id: s.id,
              name: s.source_name,
              url: s.source_url,
              checked_at: s.checked_at,
              ...(s.notes && { notes: s.notes }),
            },
          ]
        : []
    }),
  }
}
