// サーバー側（静的生成時）専用。クライアントへは /data/*.json で必要な分だけ配信する
import { db as manual } from "@/data/db"
import agencies from "@/data/agencies.json"
import debuts from "@/data/debuts.json"
import yoshimoto from "@/data/yoshimoto.json"
import programs from "@/data/programs.json"
import youtube from "@/data/youtube.json"
import xDump from "@/data/x.json"
import livesDump from "@/data/lives.json"
import { livesIndex } from "@/lib/lives"
import { mergeAgencies, type AgencyDump } from "@/lib/agencies"
import { mergeDebuts, type DebutDump } from "@/lib/debuts"
import {
  buildGraph,
  indexEdges,
  parseRaceId,
  programId,
  rankLabel,
  raceId,
  STATUS_LABEL,
} from "@/lib/graph"
import { linkInfos, termInfo, type NodeInfo } from "@/lib/node-info"
import type { Confidence } from "@/lib/types"
import { programDescription, type ProgramsDump } from "@/lib/programs"
import { mergeYoshimoto, type YoshimotoDump } from "@/lib/yoshimoto"
import { youtubeIndex, type YoutubeDump } from "@/lib/youtube"
import { xIndex, type XDump } from "@/lib/x"

export const db = mergeDebuts(
  mergeAgencies(
    mergeYoshimoto(manual, yoshimoto as YoshimotoDump),
    agencies as AgencyDump
  ),
  debuts as DebutDump
)
const programDump = programs as ProgramsDump
export const graph = buildGraph(db, programDump)
export const edgeIndex = indexEdges(graph)

export const personById = new Map(db.people.map((p) => [p.id, p]))
export const groupById = new Map(db.groups.map((g) => [g.id, g]))
const agencyById = new Map(db.agencies.map((a) => [a.id, a.name]))
const sourceById = new Map(db.sources.map((s) => [s.id, s]))
const relById = new Map(db.relationships.map((r) => [r.id, r]))
const membershipById = new Map(
  db.memberships.map((m) => [`m:${m.person_id}:${m.group_id}`, m])
)
const youtubeOf = youtubeIndex(youtube as YoutubeDump)
const xIndexed = xIndex(xDump as XDump)
// 静的書き出しなのでビルド日（日本時間）より前の公演は出さない
const livesOf = livesIndex(
  livesDump,
  new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" })
)

// 同名の芸人・グループ（別人か重複登録かはデータからは判定しない）
const byLabel = Map.groupBy(
  [...graph.nodes.values()].filter(
    (n) => n.kind === "person" || n.kind === "group"
  ),
  (n) => n.label
)
export const sameName = (nodeId: string) =>
  (byLabel.get(graph.nodes.get(nodeId)?.label ?? "") ?? []).filter(
    (n) => n.id !== nodeId
  )

// 本人専用の出典URL（公式プロフィール等）。複数の芸人で共有する総合ページは除く
const sourceUses = Map.groupBy(
  [...db.people, ...db.groups].flatMap((n) => n.source_ids),
  (id) => sourceById.get(id)?.source_url
)
export const ownUrls = (sourceIds: string[]) =>
  sourceIds.flatMap((id) => {
    const url = sourceById.get(id)?.source_url
    return url && sourceUses.get(url)?.length === 1 ? [url] : []
  })

// 個人には本人専用の出典ページ（コンビで共有しないもの）に載るアカウントだけを付ける
export const xOf = (sourceIds: string[], personal: boolean) =>
  xIndexed(
    personal
      ? sourceIds.filter(
          (id) => sourceUses.get(sourceById.get(id)?.source_url)?.length === 1
        )
      : sourceIds,
    personal
  )

export const agencyName = (id: string | null) =>
  (id && agencyById.get(id)) ?? null

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "確度高",
  medium: "確度中",
  low: "確度低",
}

const resultsOf = (nodeId: string) => {
  // 個人は本人のピン出場に加え、所属グループの出場も含める
  const entrants = [
    nodeId,
    ...(nodeId.startsWith("p:")
      ? (edgeIndex.get(nodeId) ?? [])
          .filter((e) => e.kind === "member" || e.kind === "former_member")
          .map((e) => e.target)
      : []),
  ]
  return db.competitionResults
    .filter((r) => entrants.includes(r.entrant_id))
    .toSorted((a, b) => a.year - b.year)
}

const careerOf = (
  since: string | null,
  until: string | null,
  kind: "デビュー" | "結成"
) =>
  since
    ? {
        kind,
        since: Number(since.slice(0, 4)),
        until: until ? Number(until.slice(0, 4)) : null,
      }
    : null

// "1982-04-01" → "1982年4月1日"。部分日付はある分だけ
const jaDate = (d: string) =>
  /^\d{4}(-\d{2}){0,2}$/.test(d)
    ? d
        .split("-")
        .map((n, i) => `${Number(n)}${"年月日"[i]}`)
        .join("")
    : d

const sourceInfos = (ids: Iterable<string>): NodeInfo["sources"] =>
  [...ids].flatMap((sid) => {
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
  })

// テレビ番組ごとの詳細。出演者と、各出演者の Wikipedia 記事に書かれた期間
const programInfo = (nodeId: string): NodeInfo | null => {
  const node = graph.nodes.get(nodeId)
  if (node?.kind !== "program") return null
  const links = linkInfos(graph, edgeIndex, nodeId).map((l) => {
    const note = programDump.nodes[l.other]?.items.find(
      (p) => p.title === node.label
    )?.note
    return note ? { ...l, period: note } : l
  })
  return {
    id: nodeId,
    name: node.label,
    reading: "テレビ番組（Wikipedia記載・未照合）",
    aliases: [],
    status: null,
    biography: programDescription(node.label, links),
    finals: null,
    facts: [["登録芸人の出演", `${links.length}組`]],
    links,
    results: [],
    sources: [],
  }
}

// 賞レースの開催（大会×年）ごとの詳細。決勝出場を順位順に並べる
const raceInfo = (nodeId: string): NodeInfo | null => {
  const parsed = parseRaceId(nodeId)
  if (!parsed) return null
  const { competition, year } = parsed
  const finals = db.competitionResults
    .filter(
      (r) =>
        r.stage === "決勝" &&
        r.competition_name === competition &&
        r.year === year
    )
    .toSorted((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
  const sourceIds = new Set(finals.flatMap((r) => r.source_ids))
  return {
    id: nodeId,
    name: `${competition} ${year} 決勝`,
    reading: "賞レースの決勝",
    aliases: [],
    status: null,
    finals: null,
    facts: [
      ["大会", competition],
      ["年", String(year)],
      ["決勝出場", `${finals.length}組`],
    ],
    links: finals.map((r) => ({
      edgeId: `cx:${r.id}`,
      kind: "competition" as const,
      other: r.entrant_id,
      otherName: graph.nodes.get(r.entrant_id)?.label ?? r.entrant_id,
      label: rankLabel(r.rank) || "決勝進出",
      derived: true,
      confidence: "high" as const,
      rel: null,
    })),
    results: [],
    sources: sourceInfos(sourceIds),
  }
}

// 開催ノードのID一覧（詳細JSONに含めるため）
export const raceIds = [
  ...new Set(
    db.competitionResults
      .filter((r) => r.stage === "決勝")
      .map((r) => raceId(r.competition_name, r.year))
  ),
]

export const nodeInfo = (nodeId: string): NodeInfo | null => {
  const [kind, id] = nodeId.split(":")
  if (kind === "t") return termInfo(graph, edgeIndex, nodeId)
  if (kind === "v") return programInfo(nodeId)
  if (kind === "x") return raceInfo(nodeId)
  const person = kind === "p" ? personById.get(id) : undefined
  const group = kind === "g" ? groupById.get(id) : undefined
  const e = person ?? group
  if (!e) return null
  const channels = youtubeOf(e.source_ids)
  const xAccounts = xOf(e.source_ids, !!person)

  const links = linkInfos(graph, edgeIndex, nodeId).map((l) => {
    const m = membershipById.get(l.edgeId)
    if (m && (m.start_date || m.end_date))
      return { ...l, period: `${m.start_date ?? "?"}〜${m.end_date ?? ""}` }
    const r = l.edgeId.startsWith("r:") ? relById.get(l.edgeId.slice(2)) : null
    return r
      ? {
          ...l,
          rel: {
            description: r.description,
            start_date: r.start_date,
            end_date: r.end_date,
            last_verified_at: r.last_verified_at,
            evidence_type: r.evidence_type,
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
    ["経歴", person?.career_note],
  ]
  const kindLabel = facts[0][1]
  const agency = agencyName(e.agency_id)
  const finals = results.filter((r) => r.stage === "決勝")
  const best = finals
    .filter((r) => r.rank)
    .toSorted((a, b) => a.rank! - b.rank!)[0]
  // biography が未登録のときに登録データから組み立てる紹介文（関係は relationSummary）
  const summary = [
    `${e.name}は、${agency ? `${agency}所属の` : ""}お笑い${person ? "芸人" : kindLabel}。`,
    person?.birth_date && `${jaDate(person.birth_date)}生まれ。`,
    person?.training_school &&
      `${person.training_school}${person.training_school_term ? `${person.training_school_term}期` : ""}出身。`,
    person?.debut_date && `${jaDate(person.debut_date)}デビュー。`,
    group?.formation_date && `${jaDate(group.formation_date)}結成。`,
    group?.dissolution_date && `${jaDate(group.dissolution_date)}解散。`,
    finals.length > 0 &&
      `賞レース決勝に${finals.length}回進出${best ? `（最高成績は${best.year}年${best.competition_name}${rankLabel(best.rank)}）` : ""}。`,
  ]
    .filter(Boolean)
    .join("")

  return {
    id: nodeId,
    name: e.name,
    reading: e.reading,
    aliases: e.aliases,
    photo_url: e.photo_url,
    status: e.activity_status && STATUS_LABEL[e.activity_status],
    biography: person?.biography ?? summary,
    birth_date:
      e.activity_status !== "deceased" &&
      /^\d{4}-\d{2}-\d{2}$/.test(person?.birth_date ?? "")
        ? person!.birth_date
        : null,
    career: careerOf(
      person?.debut_date ?? group?.formation_date ?? null,
      group?.dissolution_date ?? null,
      person ? "デビュー" : "結成"
    ),
    finals: results.length
      ? {
          count: results.filter((r) => r.stage === "決勝").length,
          best:
            results
              .flatMap((r) => (r.rank ? [r.rank] : []))
              .sort((a, b) => a - b)[0] ?? null,
        }
      : null,
    facts: facts.filter((f): f is [string, string] => !!f[1]),
    agencyId: e.agency_id,
    profileChecked:
      e.source_ids
        .map((sid) => sourceById.get(sid)?.checked_at)
        .filter((d): d is string => !!d)
        .toSorted()
        .at(-1) ?? null,
    links,
    results: results.map((r) => ({
      year: r.year,
      competition: r.competition_name,
      stage: r.stage,
      rank: r.rank,
      via:
        r.entrant_id !== nodeId
          ? (graph.nodes.get(r.entrant_id)?.label ?? null)
          : null,
      raceId: r.stage === "決勝" ? raceId(r.competition_name, r.year) : null,
    })),
    sources: sourceInfos(sourceIds),
    ...(channels.length && {
      youtube: { fetched_at: youtube.fetched_at, channels },
    }),
    ...(xAccounts.length && {
      x: { fetched_at: xDump.fetched_at, accounts: xAccounts },
    }),
    ...(livesOf(nodeId).length && {
      lives: {
        fetched_at: livesDump.fetched_at,
        items: livesOf(nodeId),
      },
    }),
    ...(e.history?.length && { history: e.history }),
    ...(nodeId in programDump.nodes && {
      programs: {
        fetched_at: programDump.fetched_at,
        page: programDump.nodes[nodeId].page,
        items: programDump.nodes[nodeId].items.map((p) => ({
          ...p,
          hasPage: graph.nodes.has(programId(p.title)),
        })),
      },
    }),
  }
}

// 番組ページを持つ番組（2組以上が出演）
export const programIds = [...graph.nodes.values()]
  .filter((n) => n.kind === "program")
  .map((n) => n.id)
