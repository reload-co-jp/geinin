import Link from "next/link"
import { notFound } from "next/navigation"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { InArticleAd } from "@/components/in-article-ad"
import { Photo } from "@/components/photo"
import { m1Prelims } from "@/lib/db"
import { STAGE_SLUGS } from "@/lib/m1"
import { Heat, Name } from "../../heats"
import {
  daysOf,
  entrantsOf,
  prelimYears,
  SPLIT_AT,
  stageBySlug,
  stagesOf,
  venuesOfDay,
  weekday,
} from "../../shared"

type Props = { params: Promise<{ year: string; stage: string }> }

export const generateStaticParams = () =>
  prelimYears.flatMap((y) =>
    stagesOf(y).map((s) => ({ year: String(y), stage: STAGE_SLUGS[s] }))
  )

export const generateMetadata = async ({ params }: Props) => {
  const { year, stage } = await params
  const s = stageBySlug(stage)
  if (!s) return {}
  const es = entrantsOf(Number(year), s)
  return {
    title: `M-1グランプリ${year} ${s}の出場コンビ・日程・会場`,
    description: `M-1グランプリ${year} ${s}に出場したコンビ${es.length}組（${es
      .filter((e) => e.nodeId)
      .slice(0, 5)
      .map((e) => e.name)
      .join("・")}ほか）の一覧。日程・会場別`,
    alternates: { canonical: `/m1/${year}/${stage}/` },
  }
}

const Page = async ({ params }: Props) => {
  const { year, stage } = await params
  const y = Number(year)
  const s = stageBySlug(stage)
  if (!s || !stagesOf(y).includes(s)) notFound()
  const es = entrantsOf(y, s)
  const days = daysOf(es)
  // 多い回戦は日程ごとのページへのリンクだけを並べる
  const split = es.length > SPLIT_AT
  const featured = es.filter((e) => e.nodeId && e.photo).slice(0, 24)
  const others = stagesOf(y).filter((x) => x !== s)
  return (
    <div
      style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gap: "1rem" }}
    >
      <Breadcrumbs
        items={[
          ["トップ", "/"],
          ["賞レース", "/races/"],
          ["M-1グランプリ", "/races/m1/"],
          [`M-1グランプリ${y} 予選`, `/m1/${y}/`],
          [s, `/m1/${y}/${stage}/`],
        ]}
      />
      <h1 className="page-title">
        M-1グランプリ{y} {s}（{es.length}組）
      </h1>
      <p style={{ fontSize: ".85rem", color: "var(--muted)" }}>
        M-1グランプリ公式サイトのエントリー一覧（プロ、{m1Prelims.fetched_at}
        時点）より、{s}
        に出場（予定を含む）したコンビ。当サイトに登録のあるコンビは詳細ページへリンクしています。
      </p>
      <ul className="nd-chips">
        {others.map((x) => (
          <li key={x}>
            <Link className="chip" href={`/m1/${y}/${STAGE_SLUGS[x]}/`}>
              {x}
            </Link>
          </li>
        ))}
      </ul>
      {featured.length > 0 && (
        <section>
          <h2 className="pf-section">注目の出場コンビ</h2>
          <ul className="pf-cast">
            {featured.map((e) => (
              <li key={e.url}>
                <Photo src={e.photo} size={56} />
                <span className="pf-cast-body">
                  <Name e={e} />
                  {e.date && (
                    <span className="pf-muted pf-small">
                      {weekday.format(new Date(e.date))} {e.venue}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <InArticleAd />
      {split ? (
        <section>
          <h2 className="pf-section">日程別の出場コンビ</h2>
          <ul className="m1-days">
            {days.map((d) => (
              <li key={d.slug}>
                <Link href={`/m1/${y}/${stage}/${d.slug}/`}>{d.label}</Link>
                <span className="pf-muted pf-small">
                  {" "}
                  {venuesOfDay(d.entrants)
                    .map(([v]) => v)
                    .filter(Boolean)
                    .join("・")}{" "}
                  {d.entrants.length}組
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        days.flatMap((d) =>
          venuesOfDay(d.entrants).map(([v, hs]) => (
            <Heat
              key={`${d.slug}-${v}`}
              title={d.date ? `${d.label} ${v}` : d.label}
              entrants={hs}
            />
          ))
        )
      )}
    </div>
  )
}

export default Page
