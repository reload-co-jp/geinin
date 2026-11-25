import Link from "next/link"
import { notFound } from "next/navigation"
import {
  COMPETITIONS,
  PERIOD,
  RANKING_LIMIT,
  rankingBySlug,
  rankings,
} from "@/app/ranking/shared"
import { Conditions, css, RankTable } from "@/app/ranking/table"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { InArticleAd } from "@/components/in-article-ad"
import { JsonLd } from "@/components/json-ld"

type Props = { params: Promise<{ slug: string }> }

const SITE = "https://geinin.reload.co.jp"

export const generateStaticParams = () => rankings.map(({ slug }) => ({ slug }))

export const generateMetadata = async ({ params }: Props) => {
  const { slug } = await params
  const r = rankingBySlug.get(slug)
  if (!r) return {}
  const top = r.rows
    .slice(0, 5)
    .map((x) => `${x.name}（${x.value}${r.unit}）`)
    .join("・")
  return {
    title: `${r.title}（${PERIOD.from}〜${PERIOD.to}年）`,
    description: `${r.title}。M-1グランプリ・キングオブコント・R-1グランプリなど${COMPETITIONS.length}大会の決勝結果から集計。1位から${top}。`,
    alternates: { canonical: `/ranking/${slug}/` },
  }
}

const Page = async ({ params }: Props) => {
  const { slug } = await params
  const r = rankingBySlug.get(slug)
  if (!r) notFound()
  const shown = Math.min(RANKING_LIMIT, r.rows.length)
  return (
    <div className="page">
      <style>{css}</style>
      <Breadcrumbs
        items={[
          ["トップ", "/"],
          ["ランキング", "/ranking/"],
          [r.title, `/ranking/${slug}/`],
        ]}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: r.title,
          itemListOrder: "https://schema.org/ItemListOrderDescending",
          numberOfItems: shown,
          itemListElement: r.rows.slice(0, shown).map((x, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: x.name,
            url: `${SITE}${r.href(x)}`,
          })),
        }}
      />
      <h1 className="page-title">{r.title}</h1>
      <p className="lead">{r.lead}</p>
      <Conditions />
      <InArticleAd />
      <RankTable ranking={r} limit={shown} />
      {r.rows.length > shown && (
        <p className="pf-muted pf-small">
          上位{shown}件を掲載（対象は全{r.rows.length}件）。
        </p>
      )}
      <h2 style={{ fontSize: "1rem", marginTop: "1.5rem" }}>
        ほかのランキング
      </h2>
      <ul className="nd-chips">
        {rankings
          .filter((x) => x.slug !== slug)
          .map((x) => (
            <li key={x.slug}>
              <Link className="chip" href={`/ranking/${x.slug}/`}>
                {x.title}
              </Link>
            </li>
          ))}
      </ul>
    </div>
  )
}

export default Page
