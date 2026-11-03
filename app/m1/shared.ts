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

export type Day = {
  slug: string
  date: string | null
  label: string
  entrants: Entrant[]
}
// 日程の分からない組は多いので、この組数ずつのページに分ける
const NO_DATE_PAGE = 400
export const weekday = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
  weekday: "short",
  timeZone: "UTC",
})
// 日程順。日程の分からない組は最後にまとめる
export const daysOf = (es: Entrant[]): Day[] => {
  const sorted = es.toSorted(
    (a, b) =>
      (a.date ?? "9999").localeCompare(b.date ?? "9999") ||
      (a.venue ?? "").localeCompare(b.venue ?? "")
  )
  const dated = [
    ...Map.groupBy(
      sorted.filter((e) => e.date),
      (e) => e.date!
    ),
  ].map(([date, entrants]) => ({
    slug: date.slice(5).replace("-", ""),
    date,
    label: weekday.format(new Date(date)),
    entrants,
  }))
  const rest = sorted.filter((e) => !e.date)
  const pages = Math.ceil(rest.length / NO_DATE_PAGE)
  const undated = Array.from({ length: pages }, (_, i) => ({
    slug: i ? `${NO_DATE}-${i + 1}` : NO_DATE,
    date: null,
    label: `日程・会場の掲載なし${pages > 1 ? `（${i + 1}/${pages}）` : ""}`,
    entrants: rest.slice(i * NO_DATE_PAGE, (i + 1) * NO_DATE_PAGE),
  }))
  return [...dated, ...undated]
}

// 同じ日の組を会場ごとに分ける
export const venuesOfDay = (es: Entrant[]) => [
  ...Map.groupBy(es, (e) => e.venue ?? ""),
]
