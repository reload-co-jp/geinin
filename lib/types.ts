// 日付は "1982" / "1982-04" / "1982-04-01" の部分日付を許容する。不明は null。
export type PartialDate = string | null

export type Confidence = "high" | "medium" | "low"

export type EvidenceType =
  | "official_profile"
  | "self_statement"
  | "competition_record"
  | "broadcast_record"
  | "media_report"
  | "encyclopedia"

export type ActivityStatus =
  "active" | "hiatus" | "retired" | "deceased" | "disbanded"

export type Source = {
  id: string
  source_name: string
  source_url: string | null
  source_type: "official" | "competition_official" | "encyclopedia" | "media"
  published_at: PartialDate
  // null = 出典の内容と照合していない
  checked_at: PartialDate
  notes?: string
}

export type Agency = { id: string; name: string }

// データの更新履歴。新しい順に並べる
export type HistoryEntry = { date: string; note: string }

export type Person = {
  id: string
  name: string
  reading: string
  aliases: string[]
  agency_id: string | null
  debut_date: PartialDate
  birth_date: PartialDate
  training_school: string | null
  training_school_term: number | null
  biography: string | null
  // 公式プロフィールの経歴欄（原文）
  career_note?: string | null
  activity_status: ActivityStatus | null
  photo_url?: string | null
  history?: HistoryEntry[]
  source_ids: string[]
}

export type Group = {
  id: string
  name: string
  reading: string
  aliases: string[]
  group_type: "combi" | "trio" | "unit"
  formation_date: PartialDate
  dissolution_date: PartialDate
  agency_id: string | null
  activity_status: ActivityStatus | null
  photo_url?: string | null
  history?: HistoryEntry[]
  source_ids: string[]
}

export type Membership = {
  person_id: string
  group_id: string
  role: string | null
  start_date: PartialDate
  end_date: PartialDate
  status: "current" | "former"
}

// 同期・賞レース競演は Person / CompetitionResult から導出するため登録しない
export type RelationshipType =
  "master" | "senpai_kohai" | "family" | "costar" | "rival"

export type Relationship = {
  id: string
  // master: source=師匠 target=弟子 / senpai_kohai: source=先輩 target=後輩
  source_person_id: string
  target_person_id: string
  relationship_type: RelationshipType
  start_date: PartialDate
  end_date: PartialDate
  description: string
  evidence_type: EvidenceType
  confidence: Confidence
  source_ids: string[]
  last_verified_at: PartialDate
}

export type CompetitionResult = {
  id: string
  competition_name: string
  year: number
  // 出場者のノード id。コンビ・トリオは "g:<group id>"、ピン芸人は "p:<person id>"
  entrant_id: string
  stage: "決勝" | "準決勝" | "準々決勝"
  rank: number | null
  score: number | null
  source_ids: string[]
}

export type Db = {
  sources: Source[]
  agencies: Agency[]
  people: Person[]
  groups: Group[]
  memberships: Membership[]
  relationships: Relationship[]
  competitionResults: CompetitionResult[]
}
