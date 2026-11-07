import Link from "next/link"
import { notFound } from "next/navigation"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { InArticleAd } from "@/components/in-article-ad"
import { m1Prelims } from "@/lib/db"
import { STAGE_SLUGS } from "@/lib/m1"
import { entrantsOf, prelimYears, stagesOf } from "../shared"

type Props = { params: Promise<{ year: string }> }

export const generateStaticParams = () =>
  prelimYears.map((y) => ({ year: String(y) }))

export const generateMetadata = async ({ params }: Props) => {
  const { year } = await params
  return {
    title: `M-1グランプリ${year} 予選の結果・出場コンビ`,
    description: `M-1グランプリ${year}の予選（${stagesOf(Number(year)).join("・")}）に出場したコンビの一覧と日程・会場`,
    alternates: { canonical: `/m1/${year}/` },
  }
}

const Page = async ({ params }: Props) => {
  const y = Number((await params).year)
  if (!prelimYears.includes(y)) notFound()
  const stages = stagesOf(y)
  return (
    <div
      style={{ maxWidth: 960, margin: "0 auto", display: "grid", gap: "1rem" }}
    >
      <Breadcrumbs
        items={[
          ["トップ", "/"],
          ["賞レース", "/races/"],
          ["M-1グランプリ", "/races/m1/"],
          [`M-1グランプリ${y} 予選`, `/m1/${y}/`],
        ]}
      />
      <h1 className="page-title">M-1グランプリ{y} 予選</h1>
      <p style={{ fontSize: ".85rem", color: "var(--muted)" }}>
        M-1グランプリ公式サイトのエントリー一覧（プロ、{m1Prelims.fetched_at}
        時点）より。回戦ごとに、出場（予定を含む）したコンビを日程・会場別にまとめています。
      </p>
      <ul className="nd-chips">
        {stages.toReversed().map((s) => (
          <li key={s}>
            <Link className="chip" href={`/m1/${y}/${STAGE_SLUGS[s]}/`}>
              {s}
              <small>{entrantsOf(y, s).length}組</small>
            </Link>
          </li>
        ))}
      </ul>
      <InArticleAd />
      {prelimYears.length > 1 && (
        <p style={{ fontSize: ".85rem" }}>
          ほかの年:{" "}
          {prelimYears
            .filter((x) => x !== y)
            .map((x, i) => (
              <span key={x}>
                {i > 0 && "・"}
                <Link href={`/m1/${x}/`}>{x}</Link>
              </span>
            ))}
        </p>
      )}
    </div>
  )
}

export default Page
