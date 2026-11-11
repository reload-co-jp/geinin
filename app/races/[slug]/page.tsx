import { notFound } from "next/navigation"
import { FinalsTable } from "@/app/races/client"
import { races, RaceStats, Records, Years } from "@/app/races/shared"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { InArticleAd } from "@/components/in-article-ad"

type Props = { params: Promise<{ slug: string }> }

export const generateStaticParams = () => races.map(({ slug }) => ({ slug }))

export const generateMetadata = async ({ params }: Props) => {
  const { slug } = await params
  const race = races.find((r) => r.slug === slug)
  return race
    ? {
        title: `${race.name} 歴代優勝者・決勝結果一覧`,
        description: `${race.name}の歴代優勝者と決勝進出者の一覧。${race.years
          .filter((y) => y.winner)
          .slice(0, 5)
          .map((y) => `${y.year}年 ${y.winner!.name}`)
          .join("、")}など、開催年ごとの決勝順位をまとめています`,
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
      <Breadcrumbs
        items={[
          ["トップ", "/"],
          ["賞レース", "/races/"],
          [race.name, `/races/${slug}/`],
        ]}
      />
      <h1 className="page-title">{race.name} 歴代決勝</h1>
      <RaceStats race={race} />
      <Records race={race} />
      <h3 style={{ fontSize: "1rem" }}>歴代王者</h3>
      <Years years={race.years} />
      <InArticleAd />
      <h3 style={{ fontSize: "1rem" }}>決勝進出の遍歴</h3>
      <p className="lead">数字は順位、●は順位不明です。</p>
      <FinalsTable race={race} />
    </div>
  )
}

export default Page
