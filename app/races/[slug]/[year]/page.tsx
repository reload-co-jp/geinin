import { notFound } from "next/navigation"
import { NodeDetail } from "@/components/node-detail"
import { raceIds } from "@/lib/db"
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
  return name
    ? {
        title: `${name} ${year} 決勝`,
        description: `${name} ${year}の決勝進出者と順位`,
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
