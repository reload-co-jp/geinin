import Link from "next/link"
import { FC } from "react"
import { races, Schedule, Years } from "@/app/races/shared"
import { FinalsView, YearData } from "@/components/finals-view"

export const metadata = {
  title: "賞レース",
  description:
    "M-1・キングオブコント・R-1・THE SECONDなど賞レースの開催時期と歴代決勝進出者",
  alternates: { canonical: "/races/" },
}

// 年ごとに、その年の各大会の決勝進出者を順位順（不明は末尾）に並べる
const byYear: YearData[] = [
  ...new Set(races.flatMap((r) => r.years.map((y) => y.year))),
]
  .sort((a, b) => b - a)
  .map((year) => ({
    year,
    races: races.flatMap((r) => {
      const y = r.years.find((y) => y.year === year)
      return y
        ? [
            {
              name: r.name,
              href: y.href,
              entries: r.rows
                .filter((g) => g.byYear.has(year))
                .map(({ id, name, href, photo, byYear }) => ({
                  id,
                  name,
                  href,
                  photo,
                  rank: byYear.get(year) ?? null,
                }))
                .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity)),
            },
          ]
        : []
    }),
  }))

const Page: FC = () => (
  <div className="page">
    <h2 className="page-title">賞レース</h2>
    <h3 style={{ fontSize: "1rem" }}>開催時期</h3>
    <p className="lead">例年の目安です。年によって前後します。</p>
    <Schedule />
    <h3 style={{ fontSize: "1rem" }}>歴代決勝</h3>
    <p className="lead">
      登録済みの決勝結果のみ表示しています。大会名から出場者ごとの遍歴表を開けます。
    </p>
    <FinalsView
      years={byYear}
      byCompetition={races.map((r) => (
        <section key={r.slug} className="rc-panel rc-race">
          <h4>
            <Link href={`/races/${r.slug}/`}>{r.name}</Link>{" "}
            <span className="sticker" data-tone="plain">
              {r.years.length}回
            </span>
          </h4>
          {/* ponytail: 直近のみ。全年は大会ページで見る */}
          <Years years={r.years.slice(0, 3)} />
          <Link href={`/races/${r.slug}/`} className="rc-more">
            歴代すべて・記録を見る →
          </Link>
        </section>
      ))}
    />
  </div>
)

export default Page
