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
