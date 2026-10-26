import type {
  Confidence,
  EvidenceType,
  HistoryEntry,
  PartialDate,
} from "@/lib/types"
import type { Program } from "@/lib/programs"
import type { YoutubeChannel } from "@/lib/youtube"
import { linksOf, type EdgeIndex, type EdgeKind, type Graph } from "@/lib/graph"

// 詳細パネル・詳細ページの表示内容。サーバーで組み立て、パネルには静的JSONとして配信する
export type LinkInfo = {
  edgeId: string
  kind: EdgeKind
  other: string
  otherName: string
  // 相手の写真（芸人・コンビのみ）
  otherPhoto?: string
  label: string
  derived: boolean
  confidence: Confidence
  // コンビ在籍期間（メンバーの線のみ）
  period?: string
  rel: {
    description: string
    start_date: PartialDate
    end_date: PartialDate
    last_verified_at: PartialDate
    evidence_type: EvidenceType
  } | null
}

export type NodeInfo = {
  id: string
  name: string
  reading: string
  aliases: string[]
  photo_url?: string | null
  status?: string | null
  biography?: string | null
  // 年齢表示用。日付まで分かるときだけ
  birth_date?: string | null
  // 数字で大きく見せる項目。芸歴は表示時点の年から数える
  career?: {
    kind: "デビュー" | "結成"
    since: number
    until: number | null
  } | null
  finals?: { count: number; best: number | null } | null
  facts: [string, string][]
  // プロフィール本体の出典照合日。null = 未照合、undefined = 対象外（期・開催）
  profileChecked?: PartialDate
  links: LinkInfo[]
  // raceId は決勝のみ（開催ページがあるのは決勝だけ）
  // via: グループとして出場したときのグループ名
  results: {
    year: number
    competition: string
    stage: string
    rank: number | null
    via: string | null
    raceId: string | null
  }[]
  sources: {
    id: string
    name: string
    url: string | null
    checked_at: PartialDate
    notes?: string
  }[]
  youtube?: { fetched_at: string; channels: YoutubeChannel[] }
  // Wikipedia から集めたテレビ出演番組（未照合の二次情報）
  programs?: {
    fetched_at: string
    page: string
    // hasPage: 2組以上が出演していて番組ページがある
    items: (Program & { hasPage: boolean })[]
  }
  history?: HistoryEntry[]
}

export const EVIDENCE_LABEL: Record<EvidenceType, string> = {
  official_profile: "公式プロフィール",
  self_statement: "本人の発言",
  competition_record: "大会記録",
  broadcast_record: "放送記録",
  media_report: "報道",
  encyclopedia: "事典",
}

// 確認済み = 出典と照合済み / 推定 = 確度低 / それ以外は未確認
export const verifyState = (
  confidence: Confidence,
  verifiedAt: PartialDate
): "確認済み" | "未確認" | "推定" =>
  verifiedAt ? "確認済み" : confidence === "low" ? "推定" : "未確認"

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
    ...(g.nodes.get(other)?.photo && {
      otherPhoto: g.nodes.get(other)!.photo!,
    }),
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
