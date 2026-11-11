import Link from "next/link"
import { notFound } from "next/navigation"
import { css, ESTIMATED_NOTE, Names, years } from "@/app/doki/shared"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { InArticleAd } from "@/components/in-article-ad"

type Props = { params: Promise<{ year: string }> }

const byYear = new Map(years)

export const generateStaticParams = () =>
  years.map(([y]) => ({ year: String(y) }))

export const generateMetadata = async ({ params }: Props) => {
  const { year } = await params
  const ps = byYear.get(Number(year))
  return ps
    ? {
        // 「2010年組」「〇〇 同期」のような検索語に合わせ、主な芸人名も添える
        title: `${year}年デビューの同期芸人一覧（${year}年組・${ps.length}人）`,
        description: `${year}年にデビューしたお笑い芸人${ps.length}人の同期一覧。${ps
          .slice(0, 8)
          .map((p) => p.label)
          .join("・")}${ps.length > 8 ? "ほか" : ""}。出身養成所・期も掲載`,
        alternates: { canonical: `/doki/${year}/` },
      }
    : {}
}

const Page = async ({ params }: Props) => {
  const { year } = await params
  const y = Number(year)
  const ps = byYear.get(y)
  if (!ps) notFound()
  const i = years.findIndex(([v]) => v === y)
  const [prev, next] = [years[i - 1]?.[0], years[i + 1]?.[0]]
  return (
    <div className="page">
      <style>{css}</style>
      <Breadcrumbs
        items={[
          ["トップ", "/"],
          ["同期", "/doki/"],
          [`${y}年デビュー`, `/doki/${y}/`],
        ]}
      />
      <h1 className="page-title">
        {y}年デビューの芸人
        <span style={{ color: "var(--muted)", fontWeight: "normal" }}>
          {" "}
          {ps.length.toLocaleString()}人
        </span>
      </h1>
      <p className="lead">
        賞レース成績や共演の多い順に並べています。名前の下は出身養成所と期です。
        {ESTIMATED_NOTE}
      </p>
      <InArticleAd />
      <Names ps={ps} />
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: ".85rem",
        }}
      >
        {prev ? <Link href={`/doki/${prev}/`}>← {prev}年</Link> : <span />}
        {next && <Link href={`/doki/${next}/`}>{next}年 →</Link>}
      </nav>
    </div>
  )
}

export default Page
