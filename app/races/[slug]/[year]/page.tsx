import { notFound } from "next/navigation"
import { NodeDetail } from "@/components/node-detail"
import { db, graph, raceIds } from "@/lib/db"
import { parseRaceId, raceId, raceSlugs } from "@/lib/graph"

type Props = { params: Promise<{ slug: string; year: string }> }

const nameOf = (slug: string) =>
  Object.keys(raceSlugs).find((k) => raceSlugs[k] === slug)

export const generateStaticParams = () =>
  raceIds.flatMap((id) => {
    const r = parseRaceId(id)
    const slug = r && raceSlugs[r.competition]
    return slug ? [{ slug, year: String(r.year) }] : []
  })

export const generateMetadata = async ({ params }: Props) => {
  const { slug, year } = await params
  const name = nameOf(slug)
  // 「M-1 2023 結果」「M-1 2023 優勝」のような検索語に合わせて優勝者・進出者を出す
  const finals = db.competitionResults
    .filter(
      (r) =>
        r.stage === "決勝" &&
        r.competition_name === name &&
        r.year === Number(year)
    )
    .toSorted((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
  const label = (id: string) => graph.nodes.get(id)?.label ?? id
  const winner = finals.find((r) => r.rank === 1)
  return name
    ? {
        title: `${name}${year} 決勝の結果・順位${winner ? `（優勝: ${label(winner.entrant_id)}）` : ""}`,
        description: `${name}${year}の決勝結果。${winner ? `優勝は${label(winner.entrant_id)}。` : ""}決勝進出者${finals.length}組（${finals
          .slice(0, 10)
          .map((r) => label(r.entrant_id))
          .join("・")}）の順位と各芸人の戦績`,
        alternates: { canonical: `/races/${slug}/${year}/` },
      }
    : {}
}

const Page = async ({ params }: Props) => {
  const { slug, year } = await params
  const name = nameOf(slug)
  const id = name && raceId(name, Number(year))
  if (!id || !raceIds.includes(id)) notFound()
  return <NodeDetail nodeId={id} />
}

export default Page
