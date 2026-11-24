import Link from "next/link"
import { FC } from "react"
import { terms } from "@/app/nsc/shared"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { InArticleAd } from "@/components/in-article-ad"

export const metadata = {
  title: "NSCの期別 芸人一覧｜大阪・東京ほか各校の同期",
  description: `吉本総合芸能学院（NSC）の大阪・東京・名古屋・福岡などの校舎ごとに、期別の出身芸人をまとめた一覧（${terms.length}期・${terms.reduce((n, t) => n + t.members.length, 0).toLocaleString()}人）。公式プロフィール・Wikipediaに期の記載がある芸人だけを掲載。`,
  alternates: { canonical: "/nsc/" },
}

const schools = [...Map.groupBy(terms, (t) => t.school)]

const Page: FC = () => (
  <div className="page">
    <Breadcrumbs
      items={[
        ["トップ", "/"],
        ["同期", "/doki/"],
        ["NSCの期別一覧", "/nsc/"],
      ]}
    />
    <h1 className="page-title">NSCの期別 芸人一覧</h1>
    <p className="lead">
      吉本総合芸能学院（NSC）の期ごとに、出身芸人をまとめています。吉本興業の公式プロフィールまたは
      Wikipedia
      に「NSC東京28期」のような期の記載がある芸人だけを数えています。デビュー年ごとの同期は
      <Link href="/doki/">同期芸人一覧</Link>をご覧ください。
    </p>
    <InArticleAd />
    {schools.map(([school, ts]) => (
      <section key={school} style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem" }}>
          {school}
          <span style={{ color: "var(--muted)", fontWeight: "normal" }}>
            {" "}
            {ts.length}期・
            {ts.reduce((n, t) => n + t.members.length, 0).toLocaleString()}人
          </span>
        </h2>
        <ul className="nd-chips">
          {ts.map((t) => (
            <li key={t.href}>
              <Link className="chip" href={t.href}>
                {t.term}期
                <small>
                  {t.year && `${t.year}${t.yearEstimated ? "?" : ""}年 `}
                  {t.members.length}人
                </small>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    ))}
  </div>
)

export default Page
