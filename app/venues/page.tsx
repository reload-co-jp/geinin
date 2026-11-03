import Link from "next/link"
import { FC } from "react"
import { InArticleAd } from "@/components/in-article-ad"
import { livesFetchedAt, venues } from "@/lib/db"
import { VENUE_MIN_LIVES } from "@/lib/venues"

export const metadata = {
  title: "劇場・ライブ会場から探す",
  description:
    "お笑いの劇場・ライブ会場ごとに、公演スケジュールとよく出演する芸人をまとめた一覧",
  alternates: { canonical: "/venues/" },
}

// 都道府県ごと。公演の多い県から
const byPrefecture = [
  ...Map.groupBy(venues, (v) => v.prefecture ?? "その他"),
].toSorted(
  (a, b) =>
    b[1].reduce((n, v) => n + v.lives.length, 0) -
    a[1].reduce((n, v) => n + v.lives.length, 0)
)

const Page: FC = () => (
  <div
    style={{ maxWidth: 960, margin: "0 auto", display: "grid", gap: "1rem" }}
  >
    <h1 className="section-title">
      劇場・ライブ会場から探す（{venues.length}か所）
    </h1>
    <p style={{ fontSize: ".85rem", color: "var(--muted)" }}>
      FANYチケットと各事務所の公演情報（{livesFetchedAt}時点）に
      {VENUE_MIN_LIVES}公演以上が載っている会場。
    </p>
    <InArticleAd />
    {byPrefecture.map(([pref, vs]) => (
      <section key={pref}>
        <h2 className="pf-section">{pref}</h2>
        <ul
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: ".4rem",
            listStyle: "none",
            padding: 0,
          }}
        >
          {vs.map((v) => (
            <li key={v.slug}>
              <Link className="chip" href={`/venues/${v.slug}/`}>
                {v.label}
                <small>{v.lives.length}公演</small>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    ))}
  </div>
)

export default Page
