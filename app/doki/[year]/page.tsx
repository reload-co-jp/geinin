import Link from "next/link"
import { notFound } from "next/navigation"
import { css, ESTIMATED_NOTE, Names, years } from "@/app/doki/shared"
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
        title: `${year}年デビューの芸人一覧`,
        description: `${year}年にデビューしたお笑い芸人${ps.length}人の同期一覧`,
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
      <p style={{ fontSize: ".85rem" }}>
        <Link href="/doki/">← 同期芸人一覧</Link>
      </p>
      <h2 className="page-title">
        {y}年デビューの芸人
        <span style={{ color: "var(--muted)", fontWeight: "normal" }}>
          {" "}
          {ps.length.toLocaleString()}人
        </span>
      </h2>
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
