import Link from "next/link"
import { FC } from "react"
import { COMPETITIONS, PERIOD, rankings } from "@/app/ranking/shared"
import { Conditions, css, RankTable } from "@/app/ranking/table"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { InArticleAd } from "@/components/in-article-ad"

export const metadata = {
  title: `賞レースのランキング｜決勝進出回数・優勝回数（${PERIOD.from}〜${PERIOD.to}年）`,
  description: `M-1グランプリ・キングオブコント・R-1グランプリなど${COMPETITIONS.length}大会の決勝結果から集計した、決勝進出回数・優勝回数・芸人別・事務所別のランキング。`,
  alternates: { canonical: "/ranking/" },
}

const SHOWN = 10

const Page: FC = () => (
  <div className="page">
    <style>{css}</style>
    <Breadcrumbs
      items={[
        ["トップ", "/"],
        ["ランキング", "/ranking/"],
      ]}
    />
    <h1 className="page-title">賞レースのランキング</h1>
    <p className="lead">
      当サイトに登録されている賞レースの決勝結果（{PERIOD.from}〜{PERIOD.to}
      年）から集計したランキングです。
    </p>
    <Conditions />
    <InArticleAd />
    {rankings.map((r) => (
      <section key={r.slug} style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem" }}>
          <Link href={`/ranking/${r.slug}/`}>{r.title}</Link>
        </h2>
        <p className="pf-muted pf-small">{r.lead}</p>
        <RankTable ranking={r} limit={SHOWN} />
        <Link href={`/ranking/${r.slug}/`} style={{ fontSize: ".85rem" }}>
          {r.title}をすべて見る →
        </Link>
      </section>
    ))}
  </div>
)

export default Page
