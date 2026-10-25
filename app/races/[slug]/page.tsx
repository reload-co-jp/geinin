import Link from "next/link"
import { notFound } from "next/navigation"
import { FinalsTable } from "@/app/races/client"
import { races, Records, Years } from "@/app/races/shared"

type Props = { params: Promise<{ slug: string }> }

export const generateStaticParams = () => races.map(({ slug }) => ({ slug }))

export const generateMetadata = async ({ params }: Props) => {
  const { slug } = await params
  const race = races.find((r) => r.slug === slug)
  return race
    ? {
        title: `${race.name} 歴代決勝`,
        description: `${race.name}の歴代優勝者と開催年ごとの決勝ページ一覧`,
        alternates: { canonical: `/races/${slug}/` },
      }
    : {}
}

const Page = async ({ params }: Props) => {
  const { slug } = await params
  const race = races.find((r) => r.slug === slug)
  if (!race) notFound()
  return (
    <div className="page">
      <Link href="/races/">← 賞レース</Link>
      <h2 style={{ fontSize: "1.1rem" }}>{race.name} 歴代決勝</h2>
      <Years years={race.years} />
      <Records race={race} />
      <h3 style={{ fontSize: "1rem" }}>決勝進出の遍歴</h3>
      <p className="lead">数字は順位、●は順位不明です。</p>
      <FinalsTable race={race} />
    </div>
  )
}

export default Page
