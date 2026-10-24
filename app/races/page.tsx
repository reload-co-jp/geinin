import Link from "next/link"
import { FC } from "react"
import { races, Years } from "@/app/races/shared"

export const metadata = {
  title: "賞レース一覧",
  description: "M-1・キングオブコント・R-1・THE SECONDなどの開催年ごとの決勝ページ一覧",
  alternates: { canonical: "/races/" },
}

const Page: FC = () => (
  <div className="page">
    <h2 style={{ fontSize: "1.1rem" }}>賞レース一覧</h2>
    <p className="lead">大会・開催年ごとの決勝進出者と順位のページです。</p>
    {races.map((r) => (
      <section key={r.slug} style={{ display: "grid", gap: ".5rem" }}>
        <h3 style={{ fontSize: "1rem" }}>
          <Link href={`/races/${r.slug}/`}>{r.name}</Link>
          <span style={{ color: "var(--muted)", fontWeight: "normal" }}>
            {" "}
            {r.years.length}回
          </span>
        </h3>
        <Years years={r.years} />
      </section>
    ))}
  </div>
)

export default Page
