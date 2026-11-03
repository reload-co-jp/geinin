import { graph, m1NodeOf, m1Prelims } from "@/lib/db"
import {
  PRELIM_STAGES,
  STAGE_SLUGS,
  type M1Prelim,
  type PrelimStage,
} from "@/lib/m1"

// 予選の記録がある年（新しい順）と、年ごとの回戦
export const prelimYears = [
  ...new Set(m1Prelims.results.map((p) => p.year)),
].toSorted((a, b) => b - a)

export const stagesOf = (year: number) =>
  PRELIM_STAGES.filter((s) =>
    m1Prelims.results.some((p) => p.year === year && p.stage === s)
  )

export const stageBySlug = (slug: string) =>
  (Object.entries(STAGE_SLUGS) as [PrelimStage, string][]).find(
    ([, s]) => s === slug
  )?.[0]

// 出場組と、当サイトに登録があればそのノード
export type Entrant = M1Prelim & { nodeId: string | null; photo: string | null }
export const entrantsOf = (year: number, stage: PrelimStage): Entrant[] =>
  m1Prelims.results
    .filter((p) => p.year === year && p.stage === stage)
    .map((p) => {
      const nodeId = m1NodeOf(p.url, p.name)
      return {
        ...p,
        nodeId,
        photo: (nodeId && graph.nodes.get(nodeId)?.photo) ?? null,
      }
    })

// 出場組が多い回戦は、日程ごとのページ /m1/{年}/{回戦}/{MMDD}/ に分ける
export const SPLIT_AT = 600
export const NO_DATE = "other"

export type Day = { slug: string; date: string | null; entrants: Entrant[] }
// 日程順。日程の分からない組は最後にまとめる
export const daysOf = (es: Entrant[]): Day[] =>
  [
    ...Map.groupBy(
      es.toSorted(
        (a, b) =>
          (a.date ?? "9999").localeCompare(b.date ?? "9999") ||
          (a.venue ?? "").localeCompare(b.venue ?? "")
      ),
      (e) => e.date ?? ""
    ),
  ].map(([date, entrants]) => ({
    slug: date ? date.slice(5).replace("-", "") : NO_DATE,
    date: date || null,
    entrants,
  }))

// 同じ日の組を会場ごとに分ける
export const venuesOfDay = (es: Entrant[]) => [
  ...Map.groupBy(es, (e) => e.venue ?? ""),
]
