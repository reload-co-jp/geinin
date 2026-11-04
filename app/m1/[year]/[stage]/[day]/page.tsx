import Link from "next/link"
import { notFound } from "next/navigation"
import { InArticleAd } from "@/components/in-article-ad"
import { m1Prelims } from "@/lib/db"
import { STAGE_SLUGS } from "@/lib/m1"
import { Heat } from "../../../heats"
import {
  daysOf,
  entrantsOf,
  prelimYears,
  SPLIT_AT,
  stageBySlug,
  stagesOf,
  venuesOfDay,
} from "../../../shared"

// 出場組の多い回戦の、日程ごとのページ
type Props = { params: Promise<{ year: string; stage: string; day: string }> }

const dayOf = (year: string, stage: string, day: string) => {
  const s = stageBySlug(stage)
  const y = Number(year)
  if (!s || !stagesOf(y).includes(s)) return null
  const es = entrantsOf(y, s)
  if (es.length <= SPLIT_AT) return null
  const days = daysOf(es)
  const i = days.findIndex((d) => d.slug === day)
  return i < 0
    ? null
    : { y, s, d: days[i], prev: days[i - 1], next: days[i + 1] }
}

export const generateStaticParams = () =>
  prelimYears.flatMap((y) =>
    stagesOf(y).flatMap((s) => {
      const es = entrantsOf(y, s)
      return es.length > SPLIT_AT
        ? daysOf(es).map((d) => ({
            year: String(y),
            stage: STAGE_SLUGS[s],
            day: d.slug,
          }))
        : []
    })
  )

export const generateMetadata = async ({ params }: Props) => {
  const { year, stage, day } = await params
  const hit = dayOf(year, stage, day)
  if (!hit) return {}
  const { s, d } = hit
  const when = d.label
  const venues = venuesOfDay(d.entrants)
    .map(([v]) => v)
    .filter(Boolean)
    .join("・")
  return {
    title: `M-1グランプリ${year} ${s} ${when}${venues ? ` ${venues}` : ""}の出場コンビ`,
    description: `M-1グランプリ${year} ${s}（${when}${venues ? `・${venues}` : ""}）に出場したコンビ${d.entrants.length}組（${d.entrants
      .filter((e) => e.nodeId)
      .slice(0, 5)
      .map((e) => e.name)
      .join("・")}ほか）の一覧`,
    alternates: { canonical: `/m1/${year}/${stage}/${day}/` },
  }
}

const Page = async ({ params }: Props) => {
  const { year, stage, day } = await params
  const hit = dayOf(year, stage, day)
  if (!hit) notFound()
  const { y, s, d, prev, next } = hit
  const base = `/m1/${y}/${stage}/`
  return (
    <div
      style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gap: "1rem" }}
    >
      <p style={{ fontSize: ".75rem" }}>
        <Link href="/">トップ</Link> › <Link href="/races/">賞レース</Link> ›{" "}
        <Link href={`/m1/${y}/`}>M-1グランプリ{y} 予選</Link> ›{" "}
        <Link href={base}>{s}</Link> › {d.label}
      </p>
      <h1 className="page-title">
        M-1グランプリ{y} {s} {d.label}（{d.entrants.length}組）
      </h1>
      <p style={{ fontSize: ".85rem", color: "var(--muted)" }}>
        M-1グランプリ公式サイトのエントリー一覧（プロ、{m1Prelims.fetched_at}
        時点）より。
        {d.date
          ? "この日に出場（予定を含む）したコンビです。"
          : "公式サイトに日程・会場の掲載がない出場コンビです。"}
        当サイトに登録のあるコンビは詳細ページへリンクしています。
      </p>
      {venuesOfDay(d.entrants).map(([v, hs], i) => (
        <div key={v} style={{ display: "contents" }}>
          {i === 1 && <InArticleAd />}
          <Heat title={v || d.label} entrants={hs} />
        </div>
      ))}
      <p className="nd-more">
        {prev && <Link href={`${base}${prev.slug}/`}>← {prev.label}</Link>}
        {prev && " ・ "}
        <Link href={base}>{s}の日程一覧</Link>
        {next && " ・ "}
        {next && <Link href={`${base}${next.slug}/`}>{next.label} →</Link>}
      </p>
    </div>
  )
}

export default Page
